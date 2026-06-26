"""Registry of data sources backing each metric group.

This is metadata only — it describes what SOURCE *would* back each metric
in a live deployment, and what is actually wired up right now (which, as of
this pass, is the mock generator in `mock_market.py` for every metric).
Nothing here fabricates a connection that doesn't exist: `status` is always
"mock" until a real adapter is implemented under `app/adapters/`.
"""

from __future__ import annotations

DATA_SOURCES: list[dict] = [
    {
        "id": "floating-population",
        "label": "유동인구",
        "intended_source": "서울 열린데이터광장 - 생활인구",
        "refresh_cadence": "monthly",
        "status": "mock",
        "live_adapter_implemented": False,
    },
    {
        "id": "vacancy-rate",
        "label": "공실률",
        "intended_source": "소상공인시장진흥공단 상가업소 DB",
        "refresh_cadence": "quarterly",
        "status": "mock",
        "live_adapter_implemented": False,
    },
    {
        "id": "store-open-close",
        "label": "개업/폐업률",
        "intended_source": "국세청 사업자등록 현황",
        "refresh_cadence": "monthly",
        "status": "mock",
        "live_adapter_implemented": False,
    },
    {
        "id": "revenue-index",
        "label": "매출 지수",
        "intended_source": "소상공인시장진흥공단 상권정보 매출 통계",
        "refresh_cadence": "quarterly",
        "status": "mock",
        "live_adapter_implemented": False,
    },
    {
        "id": "survival-rate",
        "label": "3년 생존율",
        "intended_source": "소상공인시장진흥공단 상권정보 생존율 통계",
        "refresh_cadence": "quarterly",
        "status": "mock",
        "live_adapter_implemented": False,
    },
    {
        "id": "rent-per-33",
        "label": "3.3㎡당 임대시세",
        "intended_source": "한국부동산원 상업용 부동산 임대동향",
        "refresh_cadence": "quarterly",
        "status": "mock",
        "live_adapter_implemented": False,
    },
]


def all_sources() -> list[dict]:
    return DATA_SOURCES


def source_by_id(source_id: str) -> dict | None:
    for s in DATA_SOURCES:
        if s["id"] == source_id:
            return s
    return None
