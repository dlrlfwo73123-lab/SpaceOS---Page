from __future__ import annotations

from pydantic import BaseModel


class DongRef(BaseModel):
    code: str
    name: str


class GuRef(BaseModel):
    code: str
    name: str
    dongs: list[DongRef]


class IndustryRef(BaseModel):
    code: str
    name: str


class IndustryCategory(BaseModel):
    """대/중/소분류 체계 — 현재는 대분류만 실제 데이터로 채워져 있고, 중/소분류는
    아직 매핑 데이터가 없어 null로 둔다 (있는 것처럼 임의로 채우지 않음).
    """

    industry_code: str
    classification_version: str
    large_code: str
    large_name: str
    medium_code: str | None
    medium_name: str | None
    small_code: str | None
    small_name: str | None
    effective_from: str
    effective_to: str | None
