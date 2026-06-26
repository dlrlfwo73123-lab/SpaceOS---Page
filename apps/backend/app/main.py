from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.billing import router as billing_router
from app.api.v1.buildings import router as buildings_router
from app.api.v1.data_sources import router as data_sources_router
from app.api.v1.districts import router as districts_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.reference import router as reference_router
from app.core.config import settings

app = FastAPI(title="SpaceOS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


API_VERSION = "0.1.0"


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "data_mode": settings.data_mode,
        "version": API_VERSION,
    }


app.include_router(districts_router, prefix="/api/v1")
app.include_router(buildings_router, prefix="/api/v1")
app.include_router(recommendations_router, prefix="/api/v1")
app.include_router(data_sources_router, prefix="/api/v1")
app.include_router(reference_router, prefix="/api/v1")
app.include_router(billing_router, prefix="/api/v1")
