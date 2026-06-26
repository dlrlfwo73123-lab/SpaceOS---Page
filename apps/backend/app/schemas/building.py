"""Building / floor / store-history response shapes.

`status` uses a fixed vocabulary so callers can tell a confirmed, observed
record apart from an inferred or simply unknown one:
  confirmed-open / confirmed-closed  - verified against a live registry (none exists yet)
  observed-open                      - a record exists showing the store trading
  inferred-closed                    - closure inferred from the mock event timeline, not confirmed
  temporarily-closed                 - reported as temporarily shut, not a final closure
  unknown                            - no data either way

Every record produced by `app/data/buildings.py` today is mock, so status is
never `confirmed-*` — only `observed-open` / `inferred-closed` are ever
emitted, and `is_demo` is always true.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

BuildingHistoryStatus = Literal[
    "confirmed-open",
    "confirmed-closed",
    "observed-open",
    "temporarily-closed",
    "inferred-closed",
    "unknown",
]

BuildingHistoryEventType = Literal["신규입점", "폐업", "업종변경"]


class BuildingFloor(BaseModel):
    level: int
    industry: str
    vacant: bool


class BuildingModel(BaseModel):
    building_id: str
    model_url: str


class BuildingHistoryEvent(BaseModel):
    date: str
    store_name: str
    floor: int
    industry: str
    event: BuildingHistoryEventType
    status: BuildingHistoryStatus
    open_date: str
    close_date: str | None
    op_months: int | None
    rent_monthly: int
    close_reason_summary: str | None
    is_demo: bool
