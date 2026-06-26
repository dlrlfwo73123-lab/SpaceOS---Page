"""Stub data-ingestion job entrypoint.

This is NOT scheduled anywhere (no cron, no Celery beat, no background
task registered in `app/main.py`). It exists so the shape of a future
ingestion pipeline is visible in the codebase: pull from a `MarketAdapter`,
write to `data_ingestion_runs` / `metric_snapshots` (see
`db/migrations/0001_initial.sql`), and stamp a real `as_of` timestamp.

Running this today is a no-op against mock data — it does not write to any
database, because no database is connected in this environment. Wiring this
up for real requires: a live `MarketAdapter` implementation, a database
connection, and a scheduler (cron/Celery/etc.) to invoke `run()` on a cadence.
"""

from __future__ import annotations

from app.adapters.market_adapter import MockMarketAdapter


def run(adapter: MockMarketAdapter | None = None) -> dict[str, str]:
    """Stub run — fetches one sample via the adapter and returns a status dict.

    Does not persist anything. Calling this manually is safe but has no
    side effects beyond the in-process call.
    """
    adapter = adapter or MockMarketAdapter()
    adapter.fetch(gu_code="11680", dong_code="11680103", industry_code="ALL")
    return {
        "status": "stub_not_persisted",
        "note": "no database connected; ingestion job is not scheduled anywhere",
    }


if __name__ == "__main__":
    print(run())
