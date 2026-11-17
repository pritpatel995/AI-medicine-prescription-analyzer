import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import close_connection, connect_and_init_indexes
from app.routers import auth_routes, prescription_routes, reminder_routes, scan_routes, appointment_routes
from app.routers import voice_assistant_routes
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_and_init_indexes()
    yield
    await close_connection()


app = FastAPI(
    title="Rx Analyzer API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(scan_routes.router)
app.include_router(prescription_routes.router)
app.include_router(reminder_routes.router)
app.include_router(appointment_routes.router)
app.include_router(voice_assistant_routes.router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
