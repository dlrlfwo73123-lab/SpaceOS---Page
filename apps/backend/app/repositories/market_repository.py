"""Repository interface for market-statistics lookups.

This is the seam where a future live data source (Seoul Open Data API,
commercial-district big-data API, etc.) would be plugged in. Today only
`MockMarketRepository` exists, backed by `app/data/mock_market.py` — there is
no live implementation and no credential to enable one. Callers (e.g.
`app/api/v1/recommendations.py`) should depend on `MarketRepository`, not on
`mock_market` directly, so swapping in a live repository later doesn't touch
the scoring/explanation pipeline.
"""

from __future__ import annotations

from typing import Protocol


class MarketRepository(Protocol):
    def get_stats(
        self,
        gu_code: str,
        dong_code: str,
        industry_code: str,
        dong_count: int = 5,
    ) -> dict[str, float]: ...


class MockMarketRepository:
    """The only implementation wired up. Always mock data — see module docstring."""

    def __init__(self, adapter: "MarketAdapter | None" = None) -> None:
        if adapter is None:
            from app.adapters.market_adapter import MockMarketAdapter

            adapter = MockMarketAdapter()
        self._adapter = adapter

    def get_stats(
        self,
        gu_code: str,
        dong_code: str,
        industry_code: str,
        dong_count: int = 5,
    ) -> dict[str, float]:
        return self._adapter.fetch(gu_code, dong_code, industry_code, dong_count=dong_count)
