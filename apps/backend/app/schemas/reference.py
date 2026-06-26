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
