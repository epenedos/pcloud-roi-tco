from fastapi import FastAPI

from app.db import db_is_up

app = FastAPI(title="CyberArk PAM Value Analyzer API", version="1.0.0")


@app.get("/api/health")
def health():
    return {"status": "ok", "db": "up" if db_is_up() else "down"}
