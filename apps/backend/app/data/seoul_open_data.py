"""Client for the Seoul Open Data Plaza (data.seoul.go.kr) commercial-district APIs.

Not wired into any route yet — `get_market_stats` in `gold.py` and the
frontend's `marketData.ts` still serve seeded mock data. Once a real key is
issued (https://data.seoul.go.kr → 인증키 신청 → "우리마을가게 상권분석서비스"),
set SEOUL_OPEN_DATA_API_KEY and call `fetch_district_stats` from the route
that should switch over; this module's signature won't need to change.
"""

from __future__ import annotations

import httpx

from app.core.config import settings

API_KEY = settings.seoul_open_data_api_key
BASE_URL = "http://openapi.seoul.go.kr:8088"

# 우리마을가게 상권분석서비스 dataset id (서비스명/구 단위 상권 통계)
DATASET = "VwsmTrdarFlpopQq"


class SeoulOpenDataError(RuntimeError):
    pass


def is_configured() -> bool:
    return settings.seoul_open_data_configured


def fetch_district_stats(gu_code: str, start: int = 1, end: int = 5) -> dict:
    """Fetch raw commercial-district stats for a 자치구 code.

    Raises SeoulOpenDataError if no API key is configured or the upstream
    call fails — callers should catch this and fall back to mock data.
    """
    if not is_configured():
        raise SeoulOpenDataError("SEOUL_OPEN_DATA_API_KEY is not set")

    url = f"{BASE_URL}/{API_KEY}/json/{DATASET}/{start}/{end}/{gu_code}"
    response = httpx.get(url, timeout=10)
    response.raise_for_status()
    return response.json()
