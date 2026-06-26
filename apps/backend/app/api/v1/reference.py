"""Reference-data endpoints: 구/동 and 업종 lookups.

Administrative codes here are placeholders pending a swap to the official
행정안전부 API — see the note in `app/data/seoul.py`. These endpoints exist
so the frontend can stop hardcoding `lib/seoul.ts` independently of the
backend and instead treat the backend as the single source of truth.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.data.seoul import INDUSTRY_CODES, SEOUL_GU
from app.schemas.reference import GuRef, IndustryCategory, IndustryRef

router = APIRouter()

# IndustryCategory classification: only large category data exists today
# (INDUSTRY_CODES is large-category granularity). Medium/small subdivisions
# are left null rather than fabricated, pending a real KSIC mapping table.
_INDUSTRY_CLASSIFICATION_VERSION = "KSIC-large-only-mock-v1"


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


@router.get("/industries/{industry_code}/category", response_model=IndustryCategory)
def get_industry_category(industry_code: str) -> IndustryCategory:
    for industry in INDUSTRY_CODES:
        if industry["code"] == industry_code:
            return IndustryCategory(
                industry_code=industry_code,
                classification_version=_INDUSTRY_CLASSIFICATION_VERSION,
                large_code=industry["code"],
                large_name=industry["name"],
                medium_code=None,
                medium_name=None,
                small_code=None,
                small_name=None,
                effective_from="2024-01-01",
                effective_to=None,
            )
    raise HTTPException(status_code=404, detail="industry not found")
