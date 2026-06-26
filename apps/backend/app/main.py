import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.buildings import router as buildings_router
from app.api.v1.districts import router as districts_router
from app.api.v1.recommendations import router as recommendations_router

app = FastAPI(title="SpaceOS API")

# ALLOWED_ORIGINS: comma-separated list of allowed origins (env-driven).
# Defaults to localhost dev origins only — never wildcard "*" in production.
_allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = (
    [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
    if _allowed_origins_env
    else ["http://localhost:5173", "http://127.0.0.1:5173"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


app.include_router(districts_router, prefix="/api/v1")
app.include_router(buildings_router, prefix="/api/v1")
app.include_router(recommendations_router, prefix="/api/v1")
