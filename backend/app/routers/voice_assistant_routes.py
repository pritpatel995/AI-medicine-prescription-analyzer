
from datetime import date, datetime
from zoneinfo import ZoneInfo

import httpx
from bson import ObjectId
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/api/voice-assistant", tags=["voice-assistant"])

INDIA_TZ = ZoneInfo("Asia/Kolkata")
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "llama3.2"


class AssistantQuestion(BaseModel):
    question: str = Field(min_length=1, max_length=1000)


def current_india_time():
    return datetime.now(INDIA_TZ)


def format_time(value):
    if not value:
        return "Time not specified"
    try:
        return datetime.strptime(value, "%H:%M").strftime("%I:%M %p")
    except (TypeError, ValueError):
        return str(value)


@router.post("/ask")
async def ask_assistant(
    payload: AssistantQuestion,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_id = ObjectId(current_user["id"])

    now = current_india_time()
    today = date.today().isoformat()

    # Retrieve only the logged-in user's reminders for today.
    cursor = db.reminders.find({
        "user_id": user_id,
        "scheduled_date": now.date().isoformat(),
    }).sort("scheduled_time", 1)

    reminders = [item async for item in cursor]

    # Retrieve only the logged-in user's prescription history.
    prescription_cursor = db.prescriptions.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(20)

    prescriptions = [item async for item in prescription_cursor]

    reminder_data = []
    for item in reminders:
        reminder_data.append({
            "medicine": item.get("medicine_name", "Medicine"),
            "time": format_time(item.get("scheduled_time")),
            "status": item.get("status", "pending"),
            "scheduled_time": item.get("scheduled_time"),
        })

    prescription_data = []
    for item in prescriptions:
        prescription_data.append({
            "doctor": item.get("doctor_name"),
            "clinic": item.get("clinic_name"),
            "prescribed_date": str(item.get("prescribed_date", "")),
            "medicines": [
                {
                    "name": medicine.get("name"),
                    "dosage": medicine.get("dosage"),
                    "frequency": medicine.get("frequency"),
                    "times": medicine.get("times", []),
                }
                for medicine in item.get("medicines", [])
            ],
        })

    pending = [
        item for item in reminder_data
        if item["status"] == "pending"
    ]

    upcoming = [
        item for item in reminder_data
        if item["status"] == "pending"
        and item["scheduled_time"]
        and item["scheduled_time"] >= now.strftime("%H:%M")
    ]

    next_reminder = upcoming[0] if upcoming else None

    context = {
        "current_date": now.date().isoformat(),
        "current_time": now.strftime("%I:%M %p"),
        "today_reminders": reminder_data,
        "pending_count": len(pending),
        "next_reminder": next_reminder,
        "prescription_count": len(prescriptions),
        "prescriptions": prescription_data,
    }

    prompt = f"""
You are the Rx Analyzer medicine reminder assistant.

Answer the user's question using ONLY the supplied data.
Never invent medicine names, doses, schedules, or reminder statuses.
If the data does not contain the answer, say that you cannot determine it.
Do not diagnose conditions or recommend changing a prescribed dose.
Do not tell the user to take a medicine if the data does not establish that it is due.
Keep the answer concise, friendly, and easy to understand.
Distinguish pending reminders from overdue reminders. The data does not
include a calculated overdue status, so do not claim a reminder is overdue.
Use the date and time supplied below.

CURRENT DATA:
{context}

USER QUESTION:
{payload.question}

Give a direct answer in plain text.
"""

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
            },
        )
        response.raise_for_status()
        result = response.json()

    return {
        "answer": result.get(
            "response",
            "Sorry, I couldn't generate a response.",
        ).strip(),
        "current_time": now.isoformat(),
    }

