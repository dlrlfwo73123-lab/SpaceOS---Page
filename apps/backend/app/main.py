import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.buildings import router as buildings_router
from app.api.v1.data_sources import router as data_sources_router
from app.api.v1.districts import router as districts_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.reference import router as reference_router

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


API_VERSION = "0.1.0"


@app.get("/health")
def health() -> dict:
    # DATA_MODE: every data path in this codebase is mock-only today (no live
    # adapter is wired up) — see app/adapters/market_adapter.py. This is not
    # yet a real env-driven toggle since there is nothing to switch to.
    return {
        "status": "ok",
        "data_mode": os.getenv("DATA_MODE", "mock"),
        "version": API_VERSION,
    }


app.include_router(districts_router, prefix="/api/v1")
app.include_router(buildings_router, prefix="/api/v1")
app.include_router(recommendations_router, prefix="/api/v1")
app.include_router(data_sources_router, prefix="/api/v1")
app.include_router(reference_router, prefix="/api/v1")
