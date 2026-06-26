"""Adapter interface for external market-data providers.

A `MarketRepository` (see `app/repositories/market_repository.py`) is meant to
depend on a `MarketAdapter`, not on a concrete data source. Today the only
adapter implemented is `MockMarketAdapter`, which wraps the deterministic
mock generator in `app/data/mock_market.py`. No live adapter (e.g. for the
Seoul Open Data commercial-district API) exists in this codebase yet — adding
one means implementing this same `MarketAdapter` protocol against a real
HTTP client and an `AI_API_KEY`-style credential, then swapping the
repository's adapter instance. Nothing in `services/scoring.py` or the API
layer needs to change.
"""

from __future__ import annotations

from typing import Protocol


class MarketAdapter(Protocol):
    def fetch(
        self,
        gu_code: str,
        dong_code: str,
        industry_code: str,
        dong_count: int = 5,
    ) -> dict[str, float]: ...


class MockMarketAdapter:
    """The only adapter wired up. Always returns mock/demo data."""

    def fetch(
        self,
        gu_code: str,
        dong_code: str,
        industry_code: str,
        dong_count: int = 5,
    ) -> dict[str, float]:
        from app.data.mock_market import get_market_stats

        return get_market_stats(gu_code, dong_code, industry_code, dong_count=dong_count)
