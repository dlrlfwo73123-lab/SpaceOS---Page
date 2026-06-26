from app.adapters.market_adapter import MockMarketAdapter
from app.jobs.ingestion_job import run as run_ingestion_job
from app.repositories.market_repository import MockMarketRepository


def test_mock_market_repository_returns_stats_dict():
    repo = MockMarketRepository()
    stats = repo.get_stats("11680", "11680103", "ALL", dong_count=5)
    assert isinstance(stats, dict)
    assert len(stats) > 0


def test_mock_market_adapter_matches_repository_output():
    repo = MockMarketRepository()
    adapter = MockMarketAdapter()
    repo_stats = repo.get_stats("11680", "11680103", "F45", dong_count=5)
    adapter_stats = adapter.fetch("11680", "11680103", "F45", dong_count=5)
    assert repo_stats == adapter_stats


def test_ingestion_job_stub_does_not_persist():
    result = run_ingestion_job()
    assert result["status"] == "stub_not_persisted"
