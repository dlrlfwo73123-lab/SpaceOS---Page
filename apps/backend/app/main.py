from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.districts import router as districts_router

app = FastAPI(title="SpaceOS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(districts_router, prefix="/api/v1")
