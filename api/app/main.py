from fastapi import FastAPI

from app.db import db_is_up
from app.routers import calc

app = FastAPI(title="CyberArk PAM Value Analyzer API", version="1.0.0")
app.include_router(calc.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "db": "up" if db_is_up() else "down"}
