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
            print("Account not found.")
            return

        user_id = user["_id"]

        print("\n========== PRESCRIPTIONS ==========")

        prescriptions = await db.prescriptions.find({
            "user_id": user_id
        }).sort("created_at", -1).to_list(length=None)

        for prescription in prescriptions:
            print(
                f"\nID: {prescription['_id']}\n"
                f"Demo: {prescription.get('is_demo', False)}\n"
                f"Doctor: {prescription.get('doctor_name')}\n"
                f"Date: {prescription.get('prescribed_date')}"
            )

            for medicine in prescription.get("medicines", []):
                print(
                    f"  Medicine: {medicine.get('name')}, "
                    f"times={medicine.get('times')}, "
                    f"duration={medicine.get('duration_days')}"
                )

        print("\n========== TODAY'S REMINDERS ==========")

        today = date.today().isoformat()

        reminders = await db.reminders.find({
            "user_id": user_id,
            "scheduled_date": today
        }).sort([
            ("scheduled_time", 1),
            ("medicine_name", 1)
        ]).to_list(length=None)

        for reminder in reminders:
            prescription = await db.prescriptions.find_one({
                "_id": reminder["prescription_id"],
                "user_id": user_id
            })

            print(
                f"{reminder['scheduled_time']} | "
                f"{reminder['medicine_name']} | "
                f"status={reminder['status']} | "
                f"demo_reminder={reminder.get('is_demo', False)} | "
                f"demo_prescription={prescription.get('is_demo', False) if prescription else 'MISSING'} | "
                f"prescription_id={reminder['prescription_id']}"
            )

        print("\n========== END ==========")

    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
