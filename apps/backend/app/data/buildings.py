"""Gold-layer access for building floor composition.

Same placeholder seam as `gold.py`: deterministic pseudo-data keyed off the
building id, standing in for a curated Gold table until a real
warehouse/lakehouse connection is wired up.
"""

from __future__ import annotations

from datetime import date

_INDUSTRIES: tuple[str, ...] = (
    "카페", "음식점", "편의점", "미용실", "의류", "약국", "학원", "사무실",
)


def _floor_count(building_id: str) -> int:
    """Deterministic floor count in [4, 8] derived from the building id."""
    return 4 + (sum(ord(c) for c in building_id) % 5)


def _floor_industry(building_id: str, level: int) -> str:
    digest = sum(ord(c) for c in building_id) + level * 7
    return _INDUSTRIES[digest % len(_INDUSTRIES)]


def _floor_vacant(building_id: str, level: int) -> bool:
    """~25% of floors come back vacant, deterministically."""
    digest = sum(ord(c) * (i + 1) for i, c in enumerate(building_id)) + level * 13
    return digest % 4 == 0


def get_building_floors(building_id: str) -> list[dict]:
    """Return Gold-layer floor-by-floor occupancy for a building.

    Powers the 3D digital twin: each floor carries its `level`, current
    `industry`, and whether it is `vacant`.
    """
    count = _floor_count(building_id)
    return [
        {
            "level": level,
            "industry": _floor_industry(building_id, level),
            "vacant": _floor_vacant(building_id, level),
        }
        for level in range(1, count + 1)
    ]


# Buildings with a captured/scanned 3D model. Unlike floor occupancy, most
# buildings won't have one, so this is a registry rather than a generator.
_BUILDING_MODELS: dict[str, str] = {
    "demo-building": "/models/demo-building.glb",
}


def get_building_model(building_id: str) -> dict | None:
    """Return the GLB model URL for a building, or None if none is captured."""
    model_url = _BUILDING_MODELS.get(building_id)
    if model_url is None:
        return None
    return {"building_id": building_id, "model_url": model_url}


_STORE_NAMES: tuple[str, ...] = (
    "블루보틀", "스타벅스", "공차", "올리브영", "다이소", "GS25", "CU",
    "파리바게뜨", "미르헤어", "준오헤어", "탑에듀", "한강순두부", "교촌치킨",
    "스킨이즈", "유니클로",
)
_DONG_SUFFIXES: tuple[str, ...] = ("역삼점", "강남점", "신논현점")
_EVENTS: tuple[str, ...] = ("신규입점", "폐업", "업종변경")

# Stand-in for a future LLM summarization call (e.g. POST /api/v1/ai/summarize):
# a short, deterministic "AI 요약" of why a store closed.
_CLOSE_REASON_SUMMARIES: tuple[str, ...] = (
    "임대료 인상과 매출 감소가 겹쳐 수익성이 악화됐습니다.",
    "인근 경쟁 점포의 신규 진입으로 고객 이탈이 심화됐습니다.",
    "온라인 채널과의 경쟁으로 오프라인 매출이 줄었습니다.",
    "원가 상승과 플랫폼 수수료 부담으로 영업이익이 적자로 전환됐습니다.",
    "운영자 개인 사정으로 흑자 상태에서 자진 폐업했습니다.",
)


def _hash(building_id: str, salt: int) -> int:
    return sum(ord(c) * (i + 1) for i, c in enumerate(building_id)) + salt


def _shift_month(year: int, month: int, delta: int) -> tuple[int, int]:
    idx = year * 12 + (month - 1) + delta
    return idx // 12, idx % 12 + 1


def get_building_history(building_id: str) -> list[dict]:
    """Deterministic store-occupancy timeline for a building, newest first.

    Each entry models a 신규입점/폐업/업종변경 event. 폐업 entries carry a
    `close_reason_summary` — a placeholder for a future LLM-generated
    summary of the closure reason.
    """
    count = 4 + (_hash(building_id, 0) % 4)
    cursor_year, cursor_month = date.today().year, date.today().month

    events = []
    for i in range(count):
        h = _hash(building_id, i * 31 + 7)
        event = _EVENTS[h % len(_EVENTS)]
        industry = _INDUSTRIES[h % len(_INDUSTRIES)]
        store_name = f"{_STORE_NAMES[h % len(_STORE_NAMES)]} {_DONG_SUFFIXES[h % len(_DONG_SUFFIXES)]}"
        floor = 1 + (h % 5)
        op_months = 6 + (h % 30)
        rent_monthly = 300 + (h % 50) * 10

        cursor_year, cursor_month = _shift_month(cursor_year, cursor_month, -(1 + h % 3))
        is_closed = event == "폐업"

        if is_closed:
            open_year, open_month = _shift_month(cursor_year, cursor_month, -op_months)
            close_date = f"{cursor_year:04d}-{cursor_month:02d}-01"
        else:
            open_year, open_month = cursor_year, cursor_month
            close_date = None

        events.append(
            {
                "date": f"{cursor_year:04d}-{cursor_month:02d}",
                "store_name": store_name,
                "floor": floor,
                "industry": industry,
                "event": event,
                "open_date": f"{open_year:04d}-{open_month:02d}-01",
                "close_date": close_date,
                "op_months": op_months if is_closed else None,
                "rent_monthly": rent_monthly,
                "close_reason_summary": (
                    _CLOSE_REASON_SUMMARIES[h % len(_CLOSE_REASON_SUMMARIES)] if is_closed else None
                ),
            }
        )

    return events
