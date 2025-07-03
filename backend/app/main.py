from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import io
import json
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

app = FastAPI(title="Mappa Mundi Character Builder")

# Allow requests from the front-end during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ABILITIES = ["Observation", "Exploration", "Deduction", "Traversal"]
LICENSES = ["Archivist", "Diviner", "Fixer", "Guardian"]


class SkillDetail(BaseModel):
    name: str
    license: str
    ability: str
    description: str
    level: str
    specialisation: Optional[str] = None


ROOT_DIR = Path(__file__).resolve().parents[2]
with open(ROOT_DIR / "skills_with_details.json", "r", encoding="utf-8") as f:
    ALL_SKILLS: List[SkillDetail] = [SkillDetail(**s) for s in json.load(f)]

# Map licence -> list of SkillDetail
SKILLS_BY_LICENSE: Dict[str, List[SkillDetail]] = {}
for s in ALL_SKILLS:
    SKILLS_BY_LICENSE.setdefault(s.license, []).append(s)

INTERACTIONS: Dict[str, List[str]] = {
    "Archivist": ["Diagnose", "Sketch", "Study", "Take Samples", "Talk"],
    "Diviner": ["Gift", "Read", "Sing", "Soothe", "Touch"],
    "Fixer": ["Bait", "Gift", "Provoke", "Read", "Touch"],
    "Guardian": ["Explore", "Feed", "Play", "Protect", "Provoke"],
}

# Starting skill distribution rules per licence
SKILL_RULES: Dict[str, Dict[str, int]] = {
    "Archivist": {"Observation": 2, "Deduction": 1, "Exploration": 1},
    "Diviner": {"Deduction": 2, "Observation": 1, "Exploration": 1},
    "Fixer": {"Deduction": 2, "Exploration": 1, "Observation": 1},
    "Guardian": {"Traversal": 2, "Exploration": 1, "Observation": 1},
}

# Map skill name -> detail for quick lookups
SKILL_MAP: Dict[str, SkillDetail] = {s.name: s for s in ALL_SKILLS}

# Load scenario questions used for the guided character creation
with open(ROOT_DIR / "backend" / "data" / "scenario_questions.json", "r", encoding="utf-8") as f:
    SCENARIO_QUESTIONS = json.load(f)

# Short licence descriptions presented after scenario creation
LICENSE_DESCRIPTIONS: Dict[str, str] = {
    "Archivist": (
        "Training: Strength in Observation, Weakness in Traversal. "
        "Starting Skills: Two Observation skills, one Deduction skill, one Exploration skill. "
        "Interactions: Choose three from Diagnose, Sketch, Study, Take Samples, Talk."
    ),
    "Diviner": (
        "Training: Strength and Weakness determined by Fate. "
        "Starting Skills: Two Deduction skills, one Observation skill, one Exploration skill. "
        "Interactions: Choose three from Gift, Read, Sing, Soothe, Touch."
    ),
    "Fixer": (
        "Training: Strength in Deduction, Weakness in Traversal. "
        "Starting Skills: Two Deduction skills, one Exploration skill, one Observation skill. "
        "Interactions: Choose three from Bait, Gift, Provoke, Read, Touch."
    ),
    "Guardian": (
        "Training: Strength in Traversal, Weakness in Deduction. "
        "Starting Skills: Two Traversal skills, one Exploration skill, one Observation skill. "
        "Interactions: Choose three from Explore, Feed, Play, Protect, Provoke."
    ),
}

class AbilityDice(BaseModel):
    Observation: str = Field(default="")
    Exploration: str = Field(default="")
    Deduction: str = Field(default="")
    Traversal: str = Field(default="")

class Character(BaseModel):
    id: int | None = None
    name: str
    description: str = ""
    license: str
    abilities: AbilityDice
    skills: List[str] = []
    interactions: List[str] = []


class ScenarioAnswers(BaseModel):
    name: str
    description: str
    answers: Dict[str, str]

characters: Dict[int, Character] = {}
next_id = 1

@app.get("/licenses", response_model=List[str])
def get_licenses():
    return LICENSES

@app.get("/skills", response_model=List[SkillDetail])
def list_skills(license: str | None = None, ability: str | None = None, level: str | None = None):
    skills = ALL_SKILLS
    if license:
        skills = [s for s in skills if s.license == license]
    if ability:
        skills = [s for s in skills if s.ability == ability]
    if level:
        skills = [s for s in skills if s.level == level]
    return skills

@app.get("/skills/{license}", response_model=List[str])
def get_skills(license: str):
    return [s.name for s in SKILLS_BY_LICENSE.get(license, [])]

@app.get("/interactions/{license}", response_model=List[str])
def get_interactions(license: str):
    return INTERACTIONS.get(license, [])


@app.get("/scenario/questions")
def get_scenario_questions():
    """Return the list of guided creation questions."""
    return SCENARIO_QUESTIONS


@app.post("/scenario/build")
def build_from_scenario(data: ScenarioAnswers):
    """Create a character based on answers to scenario questions."""
    license_scores: Dict[str, int] = {l: 0 for l in LICENSES}
    skills: List[str] = []
    interactions: List[str] = []
    ability_choice: str | None = None
    answers = data.answers

    option_lookup: Dict[str, Dict[str, Dict]] = {}
    for q in SCENARIO_QUESTIONS:
        option_lookup[q["id"]] = {o["id"]: o for o in q.get("options", [])}

    for qid, oid in answers.items():
        option = option_lookup.get(qid, {}).get(oid)
        if not option:
            continue
        if "license" in option:
            license_scores[option["license"]] += 1
        if "ability" in option:
            ability_choice = option["ability"]
        if "skill" in option:
            if option["skill"] not in skills:
                skills.append(option["skill"])
        if "interaction" in option:
            if option["interaction"] not in interactions:
                interactions.append(option["interaction"])

    license = max(license_scores.items(), key=lambda x: x[1])[0]

    # determine ability dice
    abil_map = {a: "" for a in ABILITIES}
    training = {
        "Archivist": {"strength": "Observation", "weakness": "Traversal"},
        "Fixer": {"strength": "Deduction", "weakness": "Traversal"},
        "Guardian": {"strength": "Traversal", "weakness": "Deduction"},
    }
    rules = training.get(license)
    if license == "Diviner":
        strength = ability_choice or "Deduction"
        weakness = next(a for a in ABILITIES if a != strength)
        abil_map[strength] = "d6"
        abil_map[weakness] = "d4"
    else:
        if rules:
            abil_map[rules["strength"]] = "d6"
            abil_map[rules["weakness"]] = "d4"
        if ability_choice and ability_choice not in (rules["strength"], rules["weakness"]):
            abil_map[ability_choice] = "d6"
    # fill remaining
    for a in ABILITIES:
        if not abil_map[a]:
            abil_map[a] = "d4" if list(abil_map.values()).count("d4") < 2 else "d6"
    abilities = AbilityDice(**abil_map)

    # ensure selected skills are valid starting skills for the licence and
    # satisfy the required ability distribution
    allowed = [
        s for s in SKILLS_BY_LICENSE.get(license, []) if s.level == "starting"
    ]
    allowed_names = [s.name for s in allowed]
    skills = [s for s in skills if s in allowed_names]

    rule = SKILL_RULES.get(license, {})
    ability_counts: Dict[str, int] = {a: 0 for a in ABILITIES}
    for s in skills:
        ability = SKILL_MAP.get(s).ability
        ability_counts[ability] += 1

    by_ability: Dict[str, List[str]] = {}
    for s in allowed:
        by_ability.setdefault(s.ability, []).append(s.name)

    for ability, required in rule.items():
        choices = [n for n in by_ability.get(ability, []) if n not in skills]
        while ability_counts.get(ability, 0) < required and choices:
            skills.append(choices.pop(0))
            ability_counts[ability] += 1

    if len(skills) < 4:
        for s in allowed_names:
            if len(skills) >= 4:
                break
            if s not in skills:
                skills.append(s)

    if len(interactions) < 3:
        defaults = INTERACTIONS.get(license, [])
        for i in defaults:
            if len(interactions) >= 3:
                break
            if i not in interactions:
                interactions.append(i)

    char = Character(
        name=data.name,
        description=data.description,
        license=license,
        abilities=abilities,
        skills=skills,
        interactions=interactions,
    )
    created = create_character(char)
    result = created.model_dump()
    result["license_description"] = LICENSE_DESCRIPTIONS.get(license, "")
    return result

@app.post("/characters", response_model=Character)
def create_character(char: Character):
    global next_id
    if char.license not in LICENSES:
        raise HTTPException(status_code=400, detail="Invalid license")

    # validate ability dice: only D4 or D6, two of each
    dice = {k: v.strip().lower() for k, v in char.abilities.model_dump().items()}
    counts = {"d4": 0, "d6": 0}
    for die in dice.values():
        if die not in counts:
            raise HTTPException(status_code=400, detail="Abilities must use D4 or D6")
        counts[die] += 1
    if counts["d4"] != 2 or counts["d6"] != 2:
        raise HTTPException(status_code=400, detail="Assign exactly two D4 and two D6 to abilities")

    # enforce strength and weakness for most licences
    training = {
        "Archivist": {"strength": "Observation", "weakness": "Traversal"},
        "Fixer": {"strength": "Deduction", "weakness": "Traversal"},
        "Guardian": {"strength": "Traversal", "weakness": "Deduction"},
    }
    rules = training.get(char.license)
    if rules:
        if dice[rules["strength"]] != "d6" or dice[rules["weakness"]] != "d4":
            raise HTTPException(
                status_code=400,
                detail=f"{char.license} requires {rules['strength']} d6 and {rules['weakness']} d4",
            )

    # validate selected skills (only starting level allowed on creation)
    allowed_skills = [
        s.name
        for s in SKILLS_BY_LICENSE.get(char.license, [])
        if s.level == "starting"
    ]
    if any(s not in allowed_skills for s in char.skills):
        raise HTTPException(status_code=400, detail="Invalid skill for licence")
    if len(char.skills) != 4:
        raise HTTPException(status_code=400, detail="Choose exactly four starting skills")

    # enforce ability distribution for starting skills
    ability_counts: Dict[str, int] = {a: 0 for a in ABILITIES}
    for s in char.skills:
        detail = SKILL_MAP.get(s)
        if detail:
            ability_counts[detail.ability] += 1
    rule = SKILL_RULES.get(char.license)
    if rule:
        for ability, required in rule.items():
            if ability_counts.get(ability, 0) != required:
                needed = ", ".join(f"{n} {a}" for a, n in rule.items())
                raise HTTPException(
                    status_code=400,
                    detail=f"{char.license} requires {needed} starting skills",
                )

    # validate interactions
    allowed_interactions = INTERACTIONS.get(char.license, [])
    if any(i not in allowed_interactions for i in char.interactions):
        raise HTTPException(status_code=400, detail="Invalid interaction for licence")
    if len(char.interactions) != 3:
        raise HTTPException(status_code=400, detail="Choose exactly three interactions")

    char.id = next_id
    next_id += 1
    characters[char.id] = char
    return char

@app.get("/characters/{char_id}", response_model=Character)
def get_character(char_id: int):
    char = characters.get(char_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    return char

@app.get("/characters/{char_id}/export")
def export_character(char_id: int):
    char = characters.get(char_id)
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=letter)

    # draw empty sheet as a background if available
    try:
        pdf.drawImage("Character Sheet.png", 0, 0, width=letter[0], height=letter[1])
    except Exception:
        pass

    pdf.drawString(50, 750, f"Name: {char.name}")
    pdf.drawString(50, 730, f"Description: {char.description}")
    pdf.drawString(50, 710, f"License: {char.license}")
    y = 690
    pdf.drawString(50, y, "Abilities:")
    for ability, die in char.abilities.model_dump().items():
        y -= 20
        pdf.drawString(70, y, f"{ability}: {die}")
    y -= 20
    pdf.drawString(50, y, "Skills: " + ", ".join(char.skills))
    y -= 20
    pdf.drawString(50, y, "Interactions: " + ", ".join(char.interactions))
    pdf.showPage()
    pdf.save()
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=character_{char_id}.pdf"})
