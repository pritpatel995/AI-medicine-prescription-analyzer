from pathlib import Path

path = Path("app/routers/prescription_routes.py")
source = path.read_text(encoding="utf-8")

start_marker = "async def _schedule_reminders_for_prescription("
if start_marker not in source:
    raise SystemExit("ERROR: Reminder-generation function was not found.")

new_function = '''async def _schedule_reminders_for_prescription(
    db,
    user_id: str,
    prescription_doc: dict,
) -> None:
    """
    Generate reminders within the prescribed course duration.
    Avoid inserting duplicate reminder records.
    """
    from datetime import date, datetime, timedelta
    from bson import ObjectId

    today = date.today()
    is_demo = prescription_doc.get("is_demo", False)
    prescribed_date = prescription_doc.get("prescribed_date")

    if isinstance(prescribed_date, datetime):
        prescribed_day = prescribed_date.date()
    elif isinstance(prescribed_date, date):
        prescribed_day = prescribed_date
    else:
        prescribed_day = today

    start_day = prescribed_day if is_demo else today
    reminder_end = start_day

    reminder_docs = []

    for medicine in prescription_doc.get("medicines", []):
        medicine_name = medicine.get("name", "Medicine")
        duration = max(0, int(medicine.get("duration_days") or 1))
        times = medicine.get("times") or []

        if duration == 0 or not times:
            continue

        end_day = start_day + timedelta(days=duration - 1)
        last_day = min(end_day, today)

        if start_day > today or last_day < start_day:
            continue

        for offset in range((last_day - start_day).days + 1):
            scheduled_day = start_day + timedelta(days=offset)

            for scheduled_time in times:
                try:
                    datetime.strptime(scheduled_time, "%H:%M")
                except (TypeError, ValueError):
                    continue

                reminder = {
                    "user_id": ObjectId(user_id),
                    "prescription_id": prescription_doc["_id"],
                    "medicine_name": medicine_name,
                    "scheduled_time": scheduled_time,
                    "scheduled_date": scheduled_day.isoformat(),
                    "status": "pending",
                    "taken_at": None,
                }

                if is_demo:
                    reminder["is_demo"] = True

                identity = {
                    "user_id": reminder["user_id"],
                    "prescription_id": reminder["prescription_id"],
                    "medicine_name": reminder["medicine_name"],
                    "scheduled_date": reminder["scheduled_date"],
                    "scheduled_time": reminder["scheduled_time"],
                }

                if is_demo:
                    identity["is_demo"] = True

                await db.reminders.update_one(
                    identity,
                    {"$setOnInsert": reminder},
                    upsert=True,
                )
'''

source = source[:source.index(start_marker)] + new_function + "\\n"
path.write_text(source, encoding="utf-8")

print("Reminder-generation function updated successfully.")
