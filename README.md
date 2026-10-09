# RoadmapAI — AI Goal-to-Roadmap Planner

RoadmapAI turns a user's goal into a personalized plan with phases, tasks, time estimates, milestones, learning resources, success metrics, and practical tips.

## Features

- Personalized AI roadmap using the Gemini API
- User inputs for current skill level, target timeline, weekly hours, and constraints
- Phased plan with actionable tasks and milestones
- Interactive task checkboxes and live progress percentage
- Export a roadmap as a Markdown file
- Save a copy of a roadmap in the browser's local storage
- Flask backend, request validation, error handling, and API key kept server-side
- Responsive dark dashboard UI

## Tech stack

- Frontend: HTML, CSS, vanilla JavaScript
- Backend: Python, Flask
- AI: Google Gemini API
- Data exchange: JSON
- Local persistence: browser local storage

## Requirements

- Python 3.10+
- Internet connection
- Gemini API key from Google AI Studio

## Run locally in VS Code

### 1. Open the project

Extract this folder and open `ai-goal-roadmap-planner` in VS Code.

### 2. Create a virtual environment

**Windows PowerShell:**

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

If PowerShell blocks activation, you can use Command Prompt:

```bat
.venv\Scripts\activate.bat
```

**macOS/Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

```bash
python -m pip install -r requirements.txt
```

### 4. Configure the API key

1. Get an API key from [Google AI Studio](https://aistudio.google.com/apikey).
2. Copy `.env.example` and name the copy `.env`.
3. Open `.env` and replace `your_gemini_api_key_here` with your key.

Example:

```env
GEMINI_API_KEY=your_actual_key_here
GEMINI_MODEL=gemini-2.5-flash
```

Never commit `.env` or expose the key in frontend JavaScript. `.gitignore` excludes it.

### 5. Start the app

```bash
python app.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser. Keep the terminal running while you use the app.

## How it works

1. The user submits a goal and planning preferences in the frontend.
2. JavaScript sends the form data to `POST /api/roadmap`.
3. Flask validates the request and creates instructions for the Gemini API.
4. Gemini returns a structured JSON roadmap.
5. Flask parses and validates the response, then sends it to the frontend.
6. The frontend renders phases and tasks. Checkbox changes update the progress bar.
7. Users can save a copy in browser storage or export a Markdown version.

## API endpoints

- `GET /` — serves the web application
- `GET /api/health` — checks server status and whether an API key is configured
- `POST /api/roadmap` — generates a roadmap

Example request:

```json
{
  "goal": "Learn Java and build a small project",
  "level": "Some basics",
  "deadline": "3 months",
  "hours_per_week": 5,
  "interests": "Prefer free resources and hands-on practice"
}
```

## Concepts from the Generative AI workshop

- **Prompt engineering:** the backend prompt specifies the roadmap structure, constraints, and quality expectations.
- **LLM API integration:** Flask securely calls Gemini and handles its response.
- **Structured generation:** the model is asked to return JSON, which the frontend can render predictably.
- **AI application architecture:** separates the user interface, backend logic, and AI provider.
- **Progress tracking:** the generated plan becomes an interactive workflow rather than a one-time answer.

You do not need to force GANs, CNNs, or RNNs into this project. They solve different kinds of problems and would add complexity without improving this use case. Likewise, don't claim CrewAI or LangGraph is used unless you actually implement an agent workflow with it.

## Limitations and next improvements

This starter version uses browser local storage; saved plans do not sync across devices and can be cleared by the user. Generated resource links should be reviewed. AI output can be inaccurate, so treat the roadmap as a draft.

Good next steps for a stronger portfolio version:
1. Add a roadmap history screen to reload locally saved plans.
2. Add an edit/regenerate feature for a single phase.
3. Add tests for the Flask endpoints and JSON parsing.
4. Add user accounts and a database only if cross-device persistence is needed.
5. Optionally introduce a LangGraph workflow later, for example: goal clarification → roadmap generation → quality check → final plan. Keep the first version simple and working.

## GitHub checklist

- Add screenshots of the landing page and a generated roadmap to the repository README.
- Include `.env.example`, but never upload `.env`.
- Test with at least three different goals and time budgets.
- Be ready to explain the request flow, prompt design, JSON parsing, API error handling, and progress calculation.
