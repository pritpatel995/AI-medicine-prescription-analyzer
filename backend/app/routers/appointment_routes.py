
from datetime import datetime, timezone, timedelta
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.auth import get_current_user
from app.database import get_db


router = APIRouter(
    prefix="/api/appointments",
    tags=["appointments"]
)


# =========================================================
# APPOINTMENT REQUEST MODEL
# =========================================================

class AppointmentPayload(BaseModel):
    doctor_name: str = Field(min_length=1, max_length=120)
    specialty: Optional[str] = Field(default=None, max_length=120)
    appointment_date: str
    appointment_time: str
    clinic_name: Optional[str] = Field(default=None, max_length=200)
    address: Optional[str] = Field(default=None, max_length=500)
    phone: Optional[str] = Field(default=None, max_length=40)
    notes: Optional[str] = Field(default=None, max_length=2000)

    @field_validator("appointment_date")
    @classmethod
    def valid_date(cls, value):
        try:
            datetime.strptime(value, "%Y-%m-%d")
        except ValueError:
            raise ValueError("appointment_date must be YYYY-MM-DD")
        return value

    @field_validator("appointment_time")
    @classmethod
    def valid_time(cls, value):
        try:
            datetime.strptime(value, "%H:%M")
        except ValueError:
            raise ValueError(
                "appointment_time must be HH:MM in 24-hour format"
            )
        return value


# =========================================================
# SERIALIZATION AND ID VALIDATION
# =========================================================

def serialize(doc):
    return {
        "id": str(doc["_id"]),
        "doctor_name": doc.get("doctor_name", ""),
        "specialty": doc.get("specialty"),
        "appointment_date": doc.get("appointment_date"),
        "appointment_time": doc.get("appointment_time"),
        "clinic_name": doc.get("clinic_name"),
        "address": doc.get("address"),
        "phone": doc.get("phone"),
        "notes": doc.get("notes"),
        "created_at": doc.get("created_at"),
        "updated_at": doc.get("updated_at"),
    }


def oid_or_404(value):
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )


# =========================================================
# GET ALL APPOINTMENTS
# =========================================================

@router.get("")
async def list_appointments(
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    user_oid = ObjectId(current_user["id"])

    cursor = db.appointments.find(
        {"user_id": user_oid}
    ).sort([
        ("appointment_date", 1),
        ("appointment_time", 1)
    ])

    return [serialize(doc) async for doc in cursor]


# =========================================================
# CREATE APPOINTMENT
# =========================================================

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentPayload,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    now = datetime.now(timezone.utc)

    doc = payload.model_dump()

    doc.update({
        "user_id": ObjectId(current_user["id"]),
        "created_at": now,
        "updated_at": now,
    })

    result = await db.appointments.insert_one(doc)
    doc["_id"] = result.inserted_id

    return serialize(doc)


# =========================================================
# SEED 9 PAST + 2 UPCOMING DEMO APPOINTMENTS
# =========================================================

@router.post("/seed-demo")
async def seed_demo_appointments(
    current_user: dict = Depends(get_current_user)
):
    db = get_db()
    user_id = ObjectId(current_user["id"])

    # Do not create duplicate sample appointments.
    existing_count = await db.appointments.count_documents({
        "user_id": user_id
    })

    if existing_count > 0:
        return {
            "message": "Appointments already exist. No sample data added.",
            "added": 0,
            "past": 0,
            "upcoming": 0,
        }

    today = datetime.now(timezone.utc).date()
    now = datetime.now(timezone.utc)

    samples = [
        {
            "doctor_name": "Dr. Rajesh Mehta",
            "specialty": "General Physician",
            "days_ago": 165,
            "appointment_time": "10:30",
            "clinic_name": "Mehta Multispeciality Clinic",
            "address": "Navrangpura, Ahmedabad",
            "phone": "9876543210",
            "notes": "General health checkup and blood pressure review.",
        },
        {
            "doctor_name": "Dr. Neha Shah",
            "specialty": "Dermatologist",
            "days_ago": 143,
            "appointment_time": "11:00",
            "clinic_name": "Skin Care Clinic",
            "address": "Satellite, Ahmedabad",
            "phone": "9876543211",
            "notes": "Skin consultation and follow-up advice.",
        },
        {
            "doctor_name": "Dr. Amit Patel",
            "specialty": "Dentist",
            "days_ago": 128,
            "appointment_time": "16:00",
            "clinic_name": "Patel Dental Care",
            "address": "Maninagar, Ahmedabad",
            "phone": "9876543212",
            "notes": "Dental checkup and cleaning.",
        },
        {
            "doctor_name": "Dr. Priya Desai",
            "specialty": "Ophthalmologist",
            "days_ago": 111,
            "appointment_time": "12:00",
            "clinic_name": "Vision Eye Clinic",
            "address": "Vastrapur, Ahmedabad",
            "phone": "9876543213",
            "notes": "Eye examination and vision assessment.",
        },
        {
            "doctor_name": "Dr. Kunal Joshi",
            "specialty": "Cardiologist",
            "days_ago": 94,
            "appointment_time": "10:00",
            "clinic_name": "Heart Care Centre",
            "address": "Bodakdev, Ahmedabad",
            "phone": "9876543214",
            "notes": "Routine cardiovascular consultation.",
        },
        {
            "doctor_name": "Dr. Riya Trivedi",
            "specialty": "Orthopedic",
            "days_ago": 77,
            "appointment_time": "15:30",
            "clinic_name": "Ortho Care Clinic",
            "address": "Thaltej, Ahmedabad",
            "phone": "9876543215",
            "notes": "Joint pain assessment and mobility review.",
        },
        {
            "doctor_name": "Dr. Manish Soni",
            "specialty": "ENT Specialist",
            "days_ago": 58,
            "appointment_time": "11:30",
            "clinic_name": "City ENT Clinic",
            "address": "Paldi, Ahmedabad",
            "phone": "9876543216",
            "notes": "Ear, nose, and throat consultation.",
        },
        {
            "doctor_name": "Dr. Pooja Amin",
            "specialty": "Nutritionist",
            "days_ago": 39,
            "appointment_time": "17:00",
            "clinic_name": "Healthy Life Centre",
            "address": "Prahlad Nagar, Ahmedabad",
            "phone": "9876543217",
            "notes": "Diet assessment and nutrition planning.",
        },
        {
            "doctor_name": "Dr. Chirag Patel",
            "specialty": "General Physician",
            "days_ago": 14,
            "appointment_time": "09:30",
            "clinic_name": "Shree Health Clinic",
            "address": "Gota, Ahmedabad",
            "phone": "9876543218",
            "notes": "Follow-up consultation and general health review.",
        },
        {
            "doctor_name": "Dr. Rajesh Mehta",
            "specialty": "General Physician",
            "days_ahead": 12,
            "appointment_time": "10:30",
            "clinic_name": "Mehta Multispeciality Clinic",
            "address": "Navrangpura, Ahmedabad",
            "phone": "9876543210",
            "notes": "Sample upcoming health checkup.",
        },
        {
            "doctor_name": "Dr. Neha Shah",
            "specialty": "Dermatologist",
            "days_ahead": 24,
            "appointment_time": "11:00",
            "clinic_name": "Skin Care Clinic",
            "address": "Satellite, Ahmedabad",
            "phone": "9876543211",
            "notes": "Sample upcoming skin consultation.",
        },
    ]

    documents = []

    for sample in samples:
        if "days_ago" in sample:
            appointment_date = today - timedelta(
                days=sample["days_ago"]
            )
        else:
            appointment_date = today + timedelta(
                days=sample["days_ahead"]
            )

        documents.append({
            "user_id": user_id,
            "doctor_name": sample["doctor_name"],
            "specialty": sample["specialty"],
            "appointment_date": appointment_date.strftime("%Y-%m-%d"),
            "appointment_time": sample["appointment_time"],
            "clinic_name": sample["clinic_name"],
            "address": sample["address"],
            "phone": sample["phone"],
            "notes": sample["notes"],
            "created_at": now,
            "updated_at": now,
        })

    await db.appointments.insert_many(documents)

    return {
        "message": "Sample appointments created successfully.",
        "added": len(documents),
        "past": 9,
        "upcoming": 2,
    }


# =========================================================
# UPDATE APPOINTMENT
# =========================================================

@router.patch("/{appointment_id}")
async def update_appointment(
    appointment_id: str,
    payload: AppointmentPayload,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()

    query = {
        "_id": oid_or_404(appointment_id),
        "user_id": ObjectId(current_user["id"]),
    }

    existing = await db.appointments.find_one(query)

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    updates = payload.model_dump()
    updates["updated_at"] = datetime.now(timezone.utc)

    await db.appointments.update_one(
        query,
        {"$set": updates}
    )

    existing.update(updates)

    return serialize(existing)


# =========================================================
# DELETE APPOINTMENT
# =========================================================

@router.delete(
    "/{appointment_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user)
):
    db = get_db()

    result = await db.appointments.delete_one({
        "_id": oid_or_404(appointment_id),
        "user_id": ObjectId(current_user["id"]),
    })

    if not result.deleted_count:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

