from fastapi import FastAPI

from app.db import db_is_up
from app.engine import ENGINE_VERSION
from app.routers import analyses, calc

APP_VERSION = "1.0.0"

app = FastAPI(title="IDIRA Modern PAM Migration Value API", version=APP_VERSION)
app.include_router(calc.router)
app.include_router(analyses.router)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "db": "up" if db_is_up() else "down",
        "app_version": APP_VERSION,
        "engine_version": ENGINE_VERSION,
    }
