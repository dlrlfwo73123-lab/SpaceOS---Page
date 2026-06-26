"""Reference-data endpoints: 구/동 and 업종 lookups.

Administrative codes here are placeholders pending a swap to the official
행정안전부 API — see the note in `app/data/seoul.py`. These endpoints exist
so the frontend can stop hardcoding `lib/seoul.ts` independently of the
backend and instead treat the backend as the single source of truth.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.data.seoul import INDUSTRY_CODES, SEOUL_GU
from app.schemas.reference import GuRef, IndustryRef

router = APIRouter()


@router.get("/regions", response_model=list[GuRef])
def list_regions() -> list[GuRef]:
    return [GuRef(**gu) for gu in SEOUL_GU]


@router.get("/regions/{gu_code}", response_model=GuRef)
def get_region(gu_code: str) -> GuRef:
    for gu in SEOUL_GU:
        if gu["code"] == gu_code:
            return GuRef(**gu)
    raise HTTPException(status_code=404, detail="region not found")


@router.get("/industries", response_model=list[IndustryRef])
def list_industries() -> list[IndustryRef]:
    return [IndustryRef(**i) for i in INDUSTRY_CODES]
