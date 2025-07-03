# Character-builder

This repository contains a minimal example of a character builder for the **Mappa Mundi** tabletop RPG. It uses **FastAPI** for the backend and a lightweight **Angular** front‑end.

The backend exposes endpoints to fetch licences, skills and interactions, create characters and export a character sheet to PDF. The front‑end provides a simple form to enter character information.

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Frontend

The `frontend/` directory contains a minimal Angular project. Install dependencies and start the development server:

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:4200` to view the app.

## Export

After creating a character you can download a PDF sheet from `/characters/{id}/export`.
The PDF uses `Character Sheet.png` as a background template if the file is present.
