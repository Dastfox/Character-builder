# Character-builder

This repository contains a minimal example of a character builder for the **Mappa Mundi** tabletop RPG built entirely with **Angular**. Earlier versions used a FastAPI backend but the application is now completely static. All data and validation logic are handled in the browser.

## Frontend

The `frontend/` directory contains a minimal Angular project. Install dependencies and start the development server:

```bash
cd frontend
npm install
npm start
```

Open `http://localhost:4200` to view the app.

## Export

After creating a character you can download a PDF sheet directly from the interface.
The PDF uses `Character_Sheet.png` as a background template if the file is present.
The front-end displays the same sheet filled with the character data and provides
a **Download PDF** button once a character is saved.