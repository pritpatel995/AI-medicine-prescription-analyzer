import asyncio
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
            print("Account not found.")
            return

        user_id = user["_id"]

        prescriptions = await db.prescriptions.count_documents({
            "user_id": user_id,
            "is_demo": True
        })

        reminders = await db.reminders.count_documents({
            "user_id": user_id,
            "is_demo": True
        })

        from datetime import date

        today = date.today().isoformat()

        today_reminders = await db.reminders.count_documents({
            "user_id": user_id,
            "scheduled_date": today
        })

        print("\n========== RX ANALYZER VERIFICATION ==========")
        print(f"Database: {settings.mongo_db_name}")
        print(f"Demo prescriptions: {prescriptions}")
        print(f"Demo reminder records: {reminders}")
        print(f"Today's reminder records (all types): {today_reminders}")
        print("==============================================")

        cursor = db.reminders.find({
            "user_id": user_id,
            "scheduled_date": today
        }).sort("scheduled_time", 1)

        print("\nToday's schedule:")
        found = False

        async for reminder in cursor:
            found = True
            print(
                f"{reminder['scheduled_time']} | "
                f"{reminder['medicine_name']} | "
                f"{reminder['status']}"
            )

        if not found:
            print("No reminders scheduled for today.")

    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(main())
