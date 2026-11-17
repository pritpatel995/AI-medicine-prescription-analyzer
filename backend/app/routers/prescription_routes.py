from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import get_current_user
from app.database import get_db
from app.schemas import PrescriptionCreate, PrescriptionOut, PrescriptionUpdate

router = APIRouter(prefix="/api/prescriptions", tags=["prescriptions"])



def _to_out(doc: dict) -> PrescriptionOut:
    return PrescriptionOut(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        doctor_name=doc.get("doctor_name"),
        clinic_name=doc.get("clinic_name"),
        prescribed_date=doc.get("prescribed_date"),
        medicines=doc.get("medicines", []),
        raw_ocr_text=doc.get("raw_ocr_text"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        is_demo=doc.get("is_demo", False),
        
    )




def _object_id_or_404(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")


@router.post("", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
async def create_prescription(
    payload: PrescriptionCreate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    now = datetime.now(timezone.utc)

    doc = {
        "user_id": ObjectId(current_user["id"]),
        "doctor_name": payload.doctor_name,
        "clinic_name": payload.clinic_name,
        "prescribed_date": payload.prescribed_date,
        "medicines": [m.model_dump() for m in payload.medicines],
        "raw_ocr_text": payload.raw_ocr_text,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.prescriptions.insert_one(doc)
    doc["_id"] = result.inserted_id

    await _schedule_reminders_for_prescription(db, current_user["id"], doc)

    return _to_out(doc)


@router.get("", response_model=list[PrescriptionOut])
async def list_prescriptions(current_user: dict = Depends(get_current_user)):
    db = get_db()
    cursor = db.prescriptions.find({"user_id": ObjectId(current_user["id"])}).sort("created_at", -1)
    return [_to_out(doc) async for doc in cursor]

@router.post("/demo-data/seed")
async def seed_demo_prescriptions(
    current_user: dict = Depends(get_current_user),
):
    """
    Create fictional prescription history for the logged-in user.
    Demo records are isolated from real prescriptions and do not
    generate medication reminders.
    """
    from datetime import date, datetime, timedelta, timezone

    db = get_db()
    user_oid = ObjectId(current_user["id"])

    # Prevent duplicate demo records for the same user.
    existing_count = await db.prescriptions.count_documents(
        {
            "user_id": user_oid,
            "is_demo": True,
        }
    )

    if existing_count > 0:
        return {
            "message": "Demo prescription history already exists.",
            "inserted_count": 0,
            "existing_count": existing_count,
        }

    today = date.today()
    now = datetime.now(timezone.utc)

    # Six fictional prescriptions spread across 35 days.
    demo_records = [
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
                    "instructions": "May cause drowsiness",
                    "duration_days": 5,
                },
                {
                    "name": "Paracetamol",
                    "dosage": "500 mg",
                    "form": "tablet",
                    "frequency": "As needed",
                    "times": ["09:00", "15:00", "21:00"],
                    "instructions": "Use only as directed",
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
                    "instructions": "Take before breakfast",
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
                    "instructions": "Take in the evening",
                    "duration_days": 5,
                },
                {
                    "name": "Vitamin C",
                    "dosage": "500 mg",
                    "form": "tablet",
                    "frequency": "Once daily",
                    "times": ["09:00"],
                    "instructions": "Take after breakfast",
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
                    "instructions": "Take before breakfast",
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
                    "instructions": "Take at the same time each day",
                    "duration_days": 30,
                },
            ],
        },
    ]

    documents = []

    for record in demo_records:
        prescribed_date = today - timedelta(days=record["days_ago"])

        # Use historical timestamps so records appear in chronological order.
        created_at = now - timedelta(days=record["days_ago"])

        documents.append(
            {
                "user_id": user_oid,
                "doctor_name": record["doctor_name"],
                "clinic_name": record["clinic_name"],
                "prescribed_date": prescribed_date,
                "medicines": record["medicines"],
                "raw_ocr_text": (
                    "FICTIONAL DEMONSTRATION RECORD - "
                    "sample prescription data for Rx Analyzer testing."
                ),
                "is_demo": True,
                "created_at": created_at,
                "updated_at": created_at,
            }
        )

    result = await db.prescriptions.insert_many(documents)

    return {
        "message": "Demo prescription history created successfully.",
        "inserted_count": len(result.inserted_ids),
        "date_range_days": 35,
        "demo_only": True,
    }

@router.get("/{prescription_id}", response_model=PrescriptionOut)
async def get_prescription(prescription_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    oid = _object_id_or_404(prescription_id)
    doc = await db.prescriptions.find_one({"_id": oid, "user_id": ObjectId(current_user["id"])})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")
    return _to_out(doc)


@router.patch("/{prescription_id}", response_model=PrescriptionOut)
async def update_prescription(
    prescription_id: str,
    payload: PrescriptionUpdate,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    oid = _object_id_or_404(prescription_id)

    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    if "medicines" in update_data and update_data["medicines"] is not None:
        update_data["medicines"] = [m if isinstance(m, dict) else m.model_dump() for m in update_data["medicines"]]
    update_data["updated_at"] = datetime.now(timezone.utc)

    result = await db.prescriptions.find_one_and_update(
        {"_id": oid, "user_id": ObjectId(current_user["id"])},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")

    if "medicines" in update_data:
        await db.reminders.delete_many({"prescription_id": oid, "user_id": ObjectId(current_user["id"])})
        await _schedule_reminders_for_prescription(db, current_user["id"], result)

    return _to_out(result)


@router.delete("/{prescription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prescription(prescription_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    oid = _object_id_or_404(prescription_id)

    result = await db.prescriptions.delete_one({"_id": oid, "user_id": ObjectId(current_user["id"])})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prescription not found")

    await db.reminders.delete_many({"prescription_id": oid, "user_id": ObjectId(current_user["id"])})


# ---------------------------------------------------------------------------
# Helper: generate reminder documents for a prescription's medicine schedule
# ---------------------------------------------------------------------------

async def _schedule_reminders_for_prescription(
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
