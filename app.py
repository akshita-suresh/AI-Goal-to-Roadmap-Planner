import json
import os
import re
from typing import Any

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request

load_dotenv()
app = Flask(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/"
    f"{GEMINI_MODEL}:generateContent"
)

SYSTEM_INSTRUCTIONS = """
You are RoadmapAI, a practical learning and goal-planning assistant.
Create a realistic, personalized roadmap from the user's details.
Do not reveal private chain-of-thought or hidden reasoning. Give brief, useful
rationales only. Never guarantee outcomes. Prefer free or official resources
and use real URLs only when you are confident they exist. If uncertain, provide
a search URL rather than inventing a specific page.

Return ONLY valid JSON matching this schema:
{
  "title": "short roadmap title",
  "summary": "2-3 sentence overview",
  "estimated_duration": "human-readable duration",
  "weekly_time": "estimated weekly time",
  "success_metrics": ["measurable result", "..."],
  "phases": [
    {
      "name": "phase name",
      "duration": "e.g. Weeks 1-2",
      "objective": "what the user should achieve",
      "tasks": [
        {
          "title": "specific action",
          "details": "short explanation of what to do",
          "time": "e.g. 30 min",
          "type": "Learn | Practice | Build | Review",
          "resource_name": "resource name or search suggestion",
          "resource_url": "valid URL or empty string",
          "done": false
        }
      ],
      "milestone": "observable milestone"
    }
  ],
  "weekly_routine": ["a practical recurring habit", "..."],
  "risks_and_tips": ["likely obstacle and how to handle it", "..."]
}

Create 3-6 phases, with 2-5 tasks per phase. Keep tasks specific, realistic,
and appropriate to the user's current level and time budget. Sequence
prerequisites sensibly. Use the requested deadline as a constraint, not a
promise. If the goal is broad, make reasonable assumptions and mention them
briefly in the summary. Keep JSON strings valid and do not use markdown fences.
"""

def extract_json(text: str) -> dict[str, Any]:
    """Parse model output, tolerating accidental markdown fences."""
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("The AI response did not contain a JSON object.")
    return json.loads(cleaned[start:end + 1])


@app.get("/")
def home():
    return render_template("index.html", ai_configured=bool(GEMINI_API_KEY))


@app.get("/api/health")
def health():
    return jsonify({"ok": True, "ai_configured": bool(GEMINI_API_KEY)})


@app.post("/api/roadmap")
def create_roadmap():
    data = request.get_json(silent=True) or {}
    goal = str(data.get("goal", "")).strip()
    level = str(data.get("level", "Beginner")).strip()
    deadline = str(data.get("deadline", "Flexible")).strip()
    hours = data.get("hours_per_week", 5)
    interests = str(data.get("interests", "")).strip()

    if len(goal) < 8:
        return jsonify({"error": "Please describe your goal in at least 8 characters."}), 400
    if len(goal) > 800:
        return jsonify({"error": "Please keep your goal under 800 characters."}), 400
    try:
        hours = float(hours)
        if not 1 <= hours <= 60:
            raise ValueError
    except (TypeError, ValueError):
        return jsonify({"error": "Weekly study time must be between 1 and 60 hours."}), 400

    if not GEMINI_API_KEY:
        return jsonify({
            "error": "Gemini API key is not configured. Copy .env.example to .env, add your key, and restart the server."
        }), 503

    user_details = {
        "goal": goal,
        "current_level": level,
        "deadline": deadline,
        "hours_per_week": hours,
        "interests_or_constraints": interests or "None provided"
    }
    prompt = (
        SYSTEM_INSTRUCTIONS
        + "\n\nBuild the roadmap using these user details:\n"
        + json.dumps(user_details, ensure_ascii=False)
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.4,
            "responseMimeType": "application/json"
        }
    }

    try:
        response = requests.post(
            GEMINI_URL,
            params={"key": GEMINI_API_KEY},
            json=payload,
            timeout=60
        )
        if response.status_code >= 400:
            # Avoid returning the API key or raw request details to the browser.
            message = "The AI provider rejected the request. Check your API key, model access, and quota."
            try:
                provider_message = response.json().get("error", {}).get("message", "")
                if provider_message:
                    message += f" Provider message: {provider_message[:220]}"
            except ValueError:
                pass
            return jsonify({"error": message}), 502

        body = response.json()
        candidates = body.get("candidates", [])
        if not candidates:
            return jsonify({"error": "The AI did not return a roadmap. Please try again."}), 502

        parts = candidates[0].get("content", {}).get("parts", [])
        model_text = "\n".join(part.get("text", "") for part in parts)
        roadmap = extract_json(model_text)

        if not isinstance(roadmap.get("phases"), list) or not roadmap["phases"]:
            raise ValueError("The roadmap structure was incomplete.")
        return jsonify({"roadmap": roadmap})

    except requests.Timeout:
        return jsonify({"error": "The AI request timed out. Please try again."}), 504
    except requests.RequestException:
        return jsonify({"error": "Could not connect to the AI service. Check your internet connection."}), 502
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return jsonify({"error": "The AI returned an unexpected format. Please generate the roadmap again."}), 502


if __name__ == "__main__":
    app.run(debug=True, port=5000)
