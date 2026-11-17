import asyncio
from datetime import date
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings


async def main():
    client = AsyncIOMotorClient(settings.mongo_uri)

    try:
        await client.admin.command("ping")
        db = client[settings.mongo_db_name]

        email = input("Enter your test account email: ").strip().lower()

        user = await db.users.find_one({
            "email": {"$regex": f"^{email}$", "$options": "i"}
        })

        if not user:
            print("Account not found. No changes made.")
            return

        user_id = user["_id"]
        today = date.today().isoformat()

        prescriptions = await db.prescriptions.find({
            "user_id": user_id,
            "is_demo": True
        }).to_list(length=None)

        if not prescriptions:
            print("No demo prescriptions found. No changes made.")
            return

        # Latest demo prescription first.
        prescriptions.sort(
            key=lambda p: p.get("prescribed_date") or p.get("created_at"),
            reverse=True
        )

        # Map each medicine/time combination to the latest prescription
        # that actually contains it and whose course includes today.
        active_owner = {}

        for prescription in prescriptions:
            prescribed_date = prescription.get("prescribed_date")

            if hasattr(prescribed_date, "date"):
                prescribed_date = prescribed_date.date()

            if prescribed_date is None:
                continue

            for medicine in prescription.get("medicines", []):
                duration = max(0, int(medicine.get("duration_days") or 1))
                if duration == 0:
                    continue

                course_end = prescribed_date.fromordinal(
                    prescribed_date.toordinal() + duration - 1
                )

                if not (prescribed_date <= date.today() <= course_end):
                    continue

                name = (medicine.get("name") or "").strip().casefold()

                for scheduled_time in medicine.get("times") or []:
                    key = (name, scheduled_time)

                    if key not in active_owner:
                        active_owner[key] = prescription["_id"]

        today_reminders = await db.reminders.find({
            "user_id": user_id,
            "scheduled_date": today,
            "is_demo": True
        }).to_list(length=None)

        to_delete = []

        for reminder in today_reminders:
            key = (
                (reminder.get("medicine_name") or "").strip().casefold(),
                reminder.get("scheduled_time")
            )

            owner_id = active_owner.get(key)

            # Keep only the reminder associated with the latest active
            # demo prescription for the same medicine/time.
            if owner_id is not None and reminder.get("prescription_id") != owner_id:
                to_delete.append(reminder)

            # Expired or unmatched demo reminders for today are also removed.
            elif owner_id is None:
                to_delete.append(reminder)

        print(f"\nToday's date: {today}")
        print(f"Demo prescriptions retained: {len(prescriptions)}")
        print(f"Today's demo reminders inspected: {len(today_reminders)}")
        print(f"Demo reminders marked for removal: {len(to_delete)}")

        for reminder in to_delete:
            print(
                f"  {reminder.get('scheduled_time')} | "
                f"{reminder.get('medicine_name')} | "
                f"{reminder.get('prescription_id')}"
            )

        confirm = input(
            "\nType CLEAN to remove only these today's demo reminders: "
        ).strip()

        if confirm != "CLEAN":
            print("Cancelled. No changes made.")
            return

        deleted = 0

        for reminder in to_delete:
            result = await db.reminders.delete_one({
                "_id": reminder["_id"],
                "user_id": user_id,
                "is_demo": True,
                "scheduled_date": today
            })
            deleted += result.deleted_count

        print(f"\nRemoved {deleted} overlapping/expired demo reminders.")
        print("Prescriptions and historical reminders were not deleted.")
        print("Non-demo reminders were not changed.")

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
