import asyncio
from collections import defaultdict
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

        reminders = await db.reminders.find({
            "user_id": user_id,
            "is_demo": True,
        }).to_list(length=None)

        print(f"\nDemo reminder records found: {len(reminders)}")

        groups = defaultdict(list)

        for reminder in reminders:
            key = (
                reminder.get("prescription_id"),
                reminder.get("medicine_name"),
                reminder.get("scheduled_date"),
                reminder.get("scheduled_time"),
            )
            groups[key].append(reminder)

        duplicates = [
            group for group in groups.values()
            if len(group) > 1
        ]

        print(f"Duplicate groups found: {len(duplicates)}")

        if not duplicates:
            print("No duplicate demo reminders found.")
            return

        print("\nPreview of duplicates:")
        for group in duplicates:
            first = group[0]
            print(
                f"{first.get('scheduled_date')} "
                f"{first.get('scheduled_time')} | "
                f"{first.get('medicine_name')} | "
                f"{len(group)} matching records"
            )

        confirm = input(
            "\nType CLEAN to remove duplicate demo reminder records only: "
        ).strip()

        if confirm != "CLEAN":
            print("Cancelled. No changes made.")
            return

        deleted = 0

        for group in duplicates:
            # Prefer a reminder with a completed status so history is retained.
            group.sort(
                key=lambda item: (
                    item.get("status") in ("taken", "missed", "skipped"),
                    item.get("taken_at") is not None,
                ),
                reverse=True,
            )

            for duplicate in group[1:]:
                result = await db.reminders.delete_one({
                    "_id": duplicate["_id"],
                    "user_id": user_id,
                    "is_demo": True,
                })
                deleted += result.deleted_count

        print(f"\nDuplicate demo reminders removed: {deleted}")
        print("Non-demo reminders and prescriptions were not changed.")

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
