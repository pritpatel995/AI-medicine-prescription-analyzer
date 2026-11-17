"""
Pydantic models: request/response schemas for auth, prescriptions, and reminders.
"""
from __future__ import annotations

from datetime import datetime, date
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator
from sympy import python


# ---------------------------------------------------------------------------
# Shared / util
# ---------------------------------------------------------------------------

class PyObjectId(str):
    """String-typed ObjectId wrapper so MongoDB _id serializes cleanly to JSON."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        return str(v)


# ---------------------------------------------------------------------------
# Auth / User
# ---------------------------------------------------------------------------

class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"
    prefer_not_to_say = "prefer_not_to_say"


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    age: Optional[int] = Field(default=None, ge=0, le=120)
    gender: Optional[Gender] = None
    height_cm: Optional[float] = Field(default=None, gt=0, le=300)
    weight_kg: Optional[float] = Field(default=None, gt=0, le=500)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    age: Optional[int] = None
    gender: Optional[Gender] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    created_at: datetime
    notification_preferences: "NotificationPreferences"


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class TokenPayload(BaseModel):
    sub: str  # user id
    exp: int


class NotificationPreferences(BaseModel):
    enabled: bool = True
    sound: bool = True
    reminder_lead_minutes: int = 0


class UserUpdate(BaseModel):
    name: Optional[str] = None
    notification_preferences: Optional[NotificationPreferences] = None


# ---------------------------------------------------------------------------
# Prescription / Medicine
# ---------------------------------------------------------------------------

class MedicineForm(str, Enum):
    tablet = "tablet"
    capsule = "capsule"
    syrup = "syrup"
    injection = "injection"
    drops = "drops"
    ointment = "ointment"
    inhaler = "inhaler"
    other = "other"


class Medicine(BaseModel):
    name: str
    dosage: Optional[str] = None            # e.g. "500mg"
    form: MedicineForm = MedicineForm.tablet
    frequency: Optional[str] = None         # e.g. "twice daily"
    times: List[str] = Field(default_factory=list)   # 24hr "HH:MM" strings
    instructions: Optional[str] = None      # e.g. "after food"
    duration_days: Optional[int] = None

    @field_validator("times")
    @classmethod
    def validate_times(cls, v: List[str]) -> List[str]:
        for t in v:
            parts = t.split(":")
            if len(parts) != 2 or not (0 <= int(parts[0]) <= 23) or not (0 <= int(parts[1]) <= 59):
                raise ValueError(f"Invalid 24hr time string: {t}")
        return v


class PrescriptionCreate(BaseModel):
    doctor_name: Optional[str] = None
    clinic_name: Optional[str] = None
    prescribed_date: Optional[date] = None
    medicines: List[Medicine]
    raw_ocr_text: Optional[str] = None
    source_image_id: Optional[str] = None



class PrescriptionOut(BaseModel):
    id: str
    user_id: str
    doctor_name: Optional[str] = None
    clinic_name: Optional[str] = None
    prescribed_date: Optional[date] = None
    medicines: List[Medicine]
    raw_ocr_text: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    is_demo: bool = False




class PrescriptionUpdate(BaseModel):
    doctor_name: Optional[str] = None
    clinic_name: Optional[str] = None
    prescribed_date: Optional[date] = None
    medicines: Optional[List[Medicine]] = None


# ---------------------------------------------------------------------------
# OCR / LLM extraction result (internal pipeline contract)
# ---------------------------------------------------------------------------

class ExtractedPrescription(BaseModel):
    """Strict JSON schema the local LLM must return, validated before use."""
    doctor_name: Optional[str] = None
    clinic_name: Optional[str] = None
    medicines: List[Medicine] = Field(default_factory=list)
    confidence_notes: Optional[str] = None


class ScanResponse(BaseModel):
    raw_ocr_text: str
    extracted: ExtractedPrescription
    source_image_id: str
    ocr_lines: List[dict] = Field(default_factory=list)
    ocr_average_confidence: Optional[float] = None


# ---------------------------------------------------------------------------
# Reminder / Adherence log
# ---------------------------------------------------------------------------

class ReminderStatus(str, Enum):
    pending = "pending"
    taken = "taken"
    skipped = "skipped"
    missed = "missed"


class ReminderOut(BaseModel):
    id: str
    user_id: str
    prescription_id: str
    medicine_name: str
    scheduled_time: str      # "HH:MM"
    scheduled_date: date
    status: ReminderStatus
    taken_at: Optional[datetime] = None


class ReminderStatusUpdate(BaseModel):
    status: ReminderStatus


class DailyAdherence(BaseModel):
    date: date
    total: int
    taken: int
    skipped: int
    missed: int
    pending: int

    @property
    def adherence_pct(self) -> float:
        return round((self.taken / self.total) * 100, 1) if self.total else 0.0
