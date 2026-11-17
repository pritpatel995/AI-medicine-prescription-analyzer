
import asyncio
from datetime import date, datetime, time, timedelta, timezone

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings


DEMO_PRESCRIPTIONS = [
    {
        "days_ago": 35,
        "doctor_name": "Dr. Aarav Mehta",
        "clinic_name": "Sunrise Family Clinic",
        "medicines": [
            {
                "name": "Metformin",
                "dosage": "500 mg",
                "form": "tablet",
                "frequency": "Twice daily",
                "times": ["08:00", "20:00"],
                "instructions": "Take with meals",
                "duration_days": 30,
            },
            {
                "name": "Vitamin D3",
                "dosage": "1000 IU",
                "form": "tablet",
                "frequency": "Once daily",
                "times": ["09:00"],
                "instructions": "Take after breakfast",
                "duration_days": 30,
            },
        ],
    },
    {
        "days_ago": 28,
        "doctor_name": "Dr. Nisha Shah",
        "clinic_name": "City Care Medical Centre",
        "medicines": [
            {
                "name": "Cetirizine",
                "dosage": "10 mg",
                "form": "tablet",
                "frequency": "Once daily",
                "times": ["21:00"],
                "instructions": "Evening dose",
                "duration_days": 5,
            },
            {
                "name": "Paracetamol",
                "dosage": "500 mg",
                "form": "tablet",
                "frequency": "As needed",
                "times": [],
                "instructions": "As-needed demonstration entry",
                "duration_days": 3,
            },
        ],
    },
    {
        "days_ago": 21,
        "doctor_name": "Dr. Aarav Mehta",
        "clinic_name": "Sunrise Family Clinic",
        "medicines": [
            {
                "name": "Metformin",
                "dosage": "500 mg",
                "form": "tablet",
                "frequency": "Twice daily",
                "times": ["08:00", "20:00"],
                "instructions": "Take with meals",
                "duration_days": 30,
            },
            {
                "name": "Vitamin D3",
                "dosage": "1000 IU",
                "form": "tablet",
                "frequency": "Once daily",
                "times": ["09:00"],
                "instructions": "Take after breakfast",
                "duration_days": 30,
            },
            {
                "name": "Omeprazole",
                "dosage": "20 mg",
                "form": "capsule",
                "frequency": "Once daily",
                "times": ["07:30"],
                "instructions": "Before breakfast",
                "duration_days": 14,
            },
        ],
    },
    {
        "days_ago": 14,
        "doctor_name": "Dr. Nisha Shah",
        "clinic_name": "City Care Medical Centre",
        "medicines": [
            {
                "name": "Cetirizine",
                "dosage": "10 mg",
                "form": "tablet",
                "frequency": "Once daily",
                "times": ["21:00"],
                "instructions": "Evening dose",
                "duration_days": 5,
            },
            {
                "name": "Vitamin C",
                "dosage": "500 mg",
                "form": "tablet",
                "frequency": "Once daily",
                "times": ["09:00"],
                "instructions": "After breakfast",
                "duration_days": 10,
            },
        ],
    },
    {
        "days_ago": 7,
        "doctor_name": "Dr. Aarav Mehta",
        "clinic_name": "Sunrise Family Clinic",
        "medicines": [
            {
                "name": "Metformin",
                "dosage": "500 mg",
                "form": "tablet",
                "frequency": "Twice daily",
                "times": ["08:00", "20:00"],
                "instructions": "Take with meals",
                "duration_days": 30,
            },
            {
                "name": "Vitamin D3",
                "dosage": "2000 IU",
                "form": "tablet",
                "frequency": "Once daily",
                "times": ["09:00"],
                "instructions": "Take after breakfast",
                "duration_days": 30,
            },
            {
                "name": "Omeprazole",
                "dosage": "20 mg",
                "form": "capsule",
                "frequency": "Once daily",
                "times": ["07:30"],
                "instructions": "Before breakfast",
                "duration_days": 7,
            },
        ],
    },
    {
        "days_ago": 1,
        "doctor_name": "Dr. Aarav Mehta",
        "clinic_name": "Sunrise Family Clinic",
        "medicines": [
            {
                "name": "Metformin",
                "dosage": "500 mg",
                "form": "tablet",
                "frequency": "Twice daily",
                "times": ["08:00", "20:00"],
                "instructions": "Take with meals",
                "duration_days": 30,
            },
            {
                "name": "Vitamin D3",
                "dosage": "2000 IU",
                "form": "tablet",
                "frequency": "Once daily",
                "times": ["09:00"],
                "instructions": "Take after breakfast",
                "duration_days": 30,
            },
            {
                "name": "Amlodipine",
                "dosage": "5 mg",
                "form": "tablet",
                "frequency": "Once daily",
                "times": ["08:30"],
                "instructions": "Sample demonstration entry",
                "duration_days": 30,
            },
        ],
    },
]


def make_demo_status(scheduled_date: date, scheduled_time: str, medicine_name: str):
    """
    Generate deterministic demonstration statuses.

    Past dates receive simulated taken/missed statuses.
    Today's reminders remain pending so the dashboard can display them.

    These statuses are fictional and must not be interpreted as actual
    medication adherence.
    """
    today = date.today()

    if scheduled_date >= today:
        return "pending", None

    seed_value = (
        scheduled_date.toordinal()
        + sum(ord(char) for char in scheduled_time)
        + sum(ord(char) for char in medicine_name)
    )

    # Simulate approximately 75% taken and 25% missed.
    if seed_value % 4 == 0:
        return "missed", None

    taken_time = datetime.combine(
        scheduled_date,
        datetime.strptime(scheduled_time, "%H:%M").time(),
        tzinfo=timezone.utc,
    )

    return "taken", taken_time


async def main():
    client = AsyncIOMotorClient(settings.mongo_uri)

    try:
        db = client[settings.mongo_db_name]

        # Verify that MongoDB is reachable.
        await client.admin.command("ping")

        print(f"Connected to database: {settings.mongo_db_name}")

        email = input(
            "Enter the email address of your Rx Analyzer test account: "
        ).strip().lower()

        if not email:
            print("Email is required. No data was inserted.")
            return

        user = await db.users.find_one(
            {"email": {"$regex": f"^{email}$", "$options": "i"}}
        )

        if not user:
            print("No account found for that email. No data was inserted.")
            return

        user_id = user["_id"]
        today = date.today()
        now = datetime.now(timezone.utc)

        # Reuse existing demo prescriptions instead of creating duplicates.
        existing_prescriptions = await db.prescriptions.find(
            {
                "user_id": user_id,
                "is_demo": True,
            }
        ).to_list(length=None)

        if existing_prescriptions:
            print(
                f"Found {len(existing_prescriptions)} existing demonstration "
                "prescriptions. They will be reused."
            )
            prescriptions = existing_prescriptions

        else:
            documents = []

            for record in DEMO_PRESCRIPTIONS:
                days_ago = record["days_ago"]
                prescribed_day = today - timedelta(days=days_ago)
                created_at = now - timedelta(days=days_ago)

                documents.append(
                    {
                        "user_id": user_id,
                        "doctor_name": record["doctor_name"],
                        "clinic_name": record["clinic_name"],
                        "prescribed_date": datetime.combine(
                            prescribed_day,
                            time.min,
                            tzinfo=timezone.utc,
                        ),
                        "medicines": record["medicines"],
                        "raw_ocr_text": (
                            "Fictional demonstration record for software "
                            "testing. Not a real medical prescription."
                        ),
                        "is_demo": True,
                        "created_at": created_at,
                        "updated_at": created_at,
                    }
                )

            result = await db.prescriptions.insert_many(documents)

            prescriptions = await db.prescriptions.find(
                {
                    "_id": {"$in": result.inserted_ids},
                    "user_id": user_id,
                }
            ).to_list(length=None)

            print(f"Inserted {len(result.inserted_ids)} prescriptions.")

        # Build the desired reminder history for the last 35 days.
        desired_reminders = {}

        history_start = today - timedelta(days=34)

        for prescription in prescriptions:
            prescribed_date = prescription.get("prescribed_date")

            if isinstance(prescribed_date, datetime):
                prescribed_date = prescribed_date.date()

            if not prescribed_date:
                continue

            for medicine in prescription.get("medicines", []):
                medicine_name = medicine.get("name", "Medicine")
                duration = max(0, int(medicine.get("duration_days") or 1))
                times = medicine.get("times") or []

                # As-needed medicines have no fixed-time reminders.
                for day_offset in range(duration):
                    scheduled_date = prescribed_date + timedelta(
                        days=day_offset
                    )

                    if scheduled_date < history_start or scheduled_date > today:
                        continue

                    for scheduled_time in times:
                        try:
                            datetime.strptime(scheduled_time, "%H:%M")
                        except (TypeError, ValueError):
                            print(
                                "Skipping invalid time "
                                f"{scheduled_time!r} for {medicine_name}."
                            )
                            continue

                        status_value, taken_at = make_demo_status(
                            scheduled_date,
                            scheduled_time,
                            medicine_name,
                        )

                        key = (
                            str(prescription["_id"]),
                            medicine_name,
                            scheduled_date.isoformat(),
                            scheduled_time,
                        )

                        desired_reminders[key] = {
                            "user_id": user_id,
                            "prescription_id": prescription["_id"],
                            "medicine_name": medicine_name,
                            "scheduled_time": scheduled_time,
                            "scheduled_date": scheduled_date.isoformat(),
                            "status": status_value,
                            "taken_at": taken_at,
                            "is_demo": True,
                        }

        # Upsert by reminder identity so rerunning the script does not
        # create duplicate reminder rows.
        created_count = 0
        updated_count = 0

        for reminder in desired_reminders.values():
            identity = {
                "user_id": reminder["user_id"],
                "prescription_id": reminder["prescription_id"],
                "medicine_name": reminder["medicine_name"],
                "scheduled_date": reminder["scheduled_date"],
                "scheduled_time": reminder["scheduled_time"],
                "is_demo": True,
            }

            existing = await db.reminders.find_one(identity)

            if existing:
                # Preserve a status already changed from the app.
                # Only fill missing demonstration metadata.
                if "is_demo" not in existing:
                    await db.reminders.update_one(
                        {"_id": existing["_id"]},
                        {"$set": {"is_demo": True}},
                    )
                updated_count += 1
                continue

            await db.reminders.insert_one(reminder)
            created_count += 1

        # Remove old demo reminder entries outside the intended 35-day
        # window, but leave real reminders untouched.
        cleanup_result = await db.reminders.delete_many(
            {
                "user_id": user_id,
                "is_demo": True,
                "scheduled_date": {"$lt": history_start.isoformat()},
            }
        )

        print("\nDemonstration history is ready.")
        print(f"Account: {user.get('email', 'test account')}")
        print(f"Demonstration prescriptions: {len(prescriptions)}")
        print(f"Reminder records created: {created_count}")
        print(f"Existing reminder records retained: {updated_count}")
        print(f"Old demonstration reminders removed: {cleanup_result.deleted_count}")
        print("Timeline: 35 calendar days, including today.")
        print("Today's reminders remain pending.")
        print("Historical adherence statuses are simulated.")
        print("All generated records are internally marked is_demo=True.")
        print(
            "\nNote: This script creates backend reminder records only. "
            "It does not schedule phone notifications."
        )

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())

