from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import get_db
from app.schemas import NotificationPreferences, Token, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_doc_to_out(doc: dict) -> UserOut:
    return UserOut(
        id=str(doc["_id"]),
        name=doc["name"],
        email=doc["email"],
        age=doc.get("age"),
        gender=doc.get("gender"),
        height_cm=doc.get("height_cm"),
        weight_kg=doc.get("weight_kg"),
        created_at=doc["created_at"],
        notification_preferences=NotificationPreferences(
            **doc.get("notification_preferences", {})
        ),
    )


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate):
    db = get_db()

    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    now = datetime.now(timezone.utc)
    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "hashed_password": hash_password(payload.password),
        "age": payload.age,
        "gender": payload.gender.value if payload.gender else None,
        "height_cm": payload.height_cm,
        "weight_kg": payload.weight_kg,
        "created_at": now,
        "notification_preferences": NotificationPreferences().model_dump(),
    }
    result = await db.users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    token = create_access_token(subject=str(result.inserted_id))
    return Token(access_token=token, user=_user_doc_to_out(user_doc))


@router.post("/login", response_model=Token)
async def login(payload: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": payload.email})

    if not user or not verify_password(payload.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password"
        )

    token = create_access_token(subject=str(user["_id"]))
    return Token(access_token=token, user=_user_doc_to_out(user))


@router.get("/me", response_model=UserOut)
async def read_current_user(current_user: dict = Depends(get_current_user)):
    return _user_doc_to_out(current_user)