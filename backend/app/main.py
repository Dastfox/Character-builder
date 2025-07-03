from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict
import io
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

# Placeholder skill and interaction data
SKILLS: Dict[str, List[str]] = {
    # Using a subset of the official skill list for brevity
    "Archivist": [
        "Local Knowledge",
        "Geography",
        "Twitcher",
        "Wanderer",
        "Behaviourist",
    ],
    "Diviner": [
        "Whispers",
        "Intentions",
        "Patterns",
        "Presence",
        "Memories",
    ],
    "Fixer": [
        "Relationships",
        "Resourceful",
        "People Watcher",
        "Steady Hands",
        "Inner Workings",
    ],
    "Guardian": [
        "Wide Ranging",
        "Awareness",
        "Sixth Sense",
        "Quick Thinking",
        "Keen Eyed",
    ],
}

INTERACTIONS: Dict[str, List[str]] = {
    "Archivist": ["Diagnose", "Sketch", "Study", "Take Samples", "Talk"],
    "Diviner": ["Gift", "Read", "Sing", "Soothe", "Touch"],
    "Fixer": ["Bait", "Gift", "Provoke", "Read", "Touch"],
    "Guardian": ["Explore", "Feed", "Play", "Protect", "Provoke"],
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

characters: Dict[int, Character] = {}
next_id = 1

@app.get("/licenses", response_model=List[str])
def get_licenses():
    return LICENSES

@app.get("/skills/{license}", response_model=List[str])
def get_skills(license: str):
    return SKILLS.get(license, [])

@app.get("/interactions/{license}", response_model=List[str])
def get_interactions(license: str):
    return INTERACTIONS.get(license, [])

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

    # validate selected skills
    allowed_skills = SKILLS.get(char.license, [])
    if any(s not in allowed_skills for s in char.skills):
        raise HTTPException(status_code=400, detail="Invalid skill for licence")
    if len(char.skills) != 4:
        raise HTTPException(status_code=400, detail="Choose exactly four starting skills")

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
