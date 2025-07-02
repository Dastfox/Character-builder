from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict
import io
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

app = FastAPI(title="Mappa Mundi Character Builder")

ABILITIES = ["Observation", "Exploration", "Deduction", "Traversal"]
LICENSES = ["Archivist", "Diviner", "Fixer", "Guardian"]

# Placeholder skill and interaction data
SKILLS: Dict[str, List[str]] = {
    "Archivist": ["Local Knowledge", "Cartographer's Tools", "Biologist"],
    "Diviner": ["Whispers", "Cartomancer", "Ossiomancer"],
    "Fixer": ["Tinker", "Mechanic", "Smuggler"],
    "Guardian": ["Protector", "Warrior", "Bodyguard"],
}

INTERACTIONS: Dict[str, List[str]] = {
    "Archivist": ["Research", "Analyse", "Catalog"],
    "Diviner": ["Predict", "Read Bones", "Interpret"],
    "Fixer": ["Negotiate", "Repair", "Trade"],
    "Guardian": ["Defend", "Intimidate", "Lead"],
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
