
from datetime import date, datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.auth import get_current_user
from app.database import get_db
from app.schemas import DailyAdherence, ReminderOut, ReminderStatusUpdate

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


def _to_out(doc: dict) -> ReminderOut:
    return ReminderOut(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        prescription_id=str(doc["prescription_id"]),
        medicine_name=doc["medicine_name"],
        scheduled_time=doc["scheduled_time"],
        scheduled_date=date.fromisoformat(doc["scheduled_date"]),
        status=doc["status"],
        taken_at=doc.get("taken_at"),
    )


@router.get("", response_model=list[ReminderOut])
async def list_reminders(
    for_date: date = Query(default_factory=date.today),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    cursor = db.reminders.find({
        "user_id": ObjectId(current_user["id"]),
        "scheduled_date": for_date.isoformat(),
    }).sort("scheduled_time", 1)

    return [_to_out(doc) async for doc in cursor]


@router.patch("/{reminder_id}", response_model=ReminderOut)
async def update_reminder_status(
    reminder_id: str,
    payload: ReminderStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    try:
        reminder_oid = ObjectId(reminder_id)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found",
        )

    user_oid = ObjectId(current_user["id"])

    update_data = {
        "status": payload.status.value,
        "taken_at": (
            datetime.now(timezone.utc)
            if payload.status.value == "taken"
            else None
        ),
    }

    result = await db.reminders.find_one_and_update(
        {
            "_id": reminder_oid,
            "user_id": user_oid,
        },
        {"$set": update_data},
        return_document=True,
    )

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found",
        )

    return _to_out(result)


@router.delete(
    "/{reminder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_scheduled_medicine(
    reminder_id: str,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_oid = ObjectId(current_user["id"])

    try:
        reminder_oid = ObjectId(reminder_id)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found",
        )

    # Find the selected reminder belonging to the current user.
    reminder = await db.reminders.find_one({
        "_id": reminder_oid,
        "user_id": user_oid,
    })

    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found",
        )

    prescription_oid = reminder["prescription_id"]
    medicine_name = reminder["medicine_name"]

    # Find the related prescription.
    prescription = await db.prescriptions.find_one({
        "_id": prescription_oid,
        "user_id": user_oid,
    })

    if prescription:
        medicines = prescription.get("medicines", [])

        # Remove the matching medicine from the prescription.
        updated_medicines = [
            medicine
            for medicine in medicines
            if medicine.get("name", "").strip().casefold()
            != medicine_name.strip().casefold()
        ]

        await db.prescriptions.update_one(
            {
                "_id": prescription_oid,
                "user_id": user_oid,
            },
            {
                "$set": {
                    "medicines": updated_medicines,
                    "updated_at": datetime.now(timezone.utc),
                }
            },
        )

    # Remove all scheduled reminders for this medicine
    # within this prescription.
    await db.reminders.delete_many({
        "user_id": user_oid,
        "prescription_id": prescription_oid,
        "medicine_name": medicine_name,
    })

    # HTTP 204 must return an empty response.
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/adherence", response_model=DailyAdherence)
async def get_daily_adherence(
    for_date: date = Query(default_factory=date.today),
    current_user: dict = Depends(get_current_user),
):
    db = get_db()

    cursor = db.reminders.find({
        "user_id": ObjectId(current_user["id"]),
        "scheduled_date": for_date.isoformat(),
    })

    total = taken = skipped = missed = pending = 0

    async for doc in cursor:
        total += 1

        if doc["status"] == "taken":
            taken += 1
        elif doc["status"] == "skipped":
            skipped += 1
        elif doc["status"] == "missed":
            missed += 1
        else:
            pending += 1

    return DailyAdherence(
        date=for_date,
        total=total,
        taken=taken,
        skipped=skipped,
        missed=missed,
        pending=pending,
    )

