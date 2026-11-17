"""
Async MongoDB client (Motor) and collection index bootstrap.
"""
import logging

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

logger = logging.getLogger("rx_analyzer.database")

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongo_uri)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    global _db
    if _db is None:
        _db = get_client()[settings.mongo_db_name]
    return _db


async def connect_and_init_indexes() -> None:
    """Called once on FastAPI startup. Creates indexes idempotently."""
    db = get_db()

    await db.users.create_index("email", unique=True)
    await db.appointments.create_index([("user_id", 1), ("appointment_date", 1), ("appointment_time", 1)])

    await db.prescriptions.create_index([("user_id", 1), ("created_at", -1)])

    await db.reminders.create_index(
        [("user_id", 1), ("scheduled_date", 1), ("scheduled_time", 1)]
    )
    await db.reminders.create_index(
        [("user_id", 1), ("prescription_id", 1)]
    )

    logger.info("MongoDB indexes ensured on: users, prescriptions, reminders, appointments")


async def close_connection() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
