"""Centralized environment-driven configuration.

Consolidates the `os.getenv()` reads that were previously scattered across
`main.py`/`ai_explainer.py`/`seoul_open_data.py` into one place. Every field
has an explicit, safe default (never a wildcard CORS origin, never an AI key
baked into source) — missing env vars degrade to mock/disabled behavior
rather than raising at import time, since this codebase must keep working
without any live credentials configured.
"""

from __future__ import annotations

import os

from pydantic import BaseModel


def _split_csv(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


class Settings(BaseModel):
    environment: str = "development"

    # ALLOWED_ORIGINS: comma-separated list of allowed CORS origins.
    # Never wildcard "*" in code that ships to production — defaults to
    # localhost dev origins only when unset.
    allowed_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]

    # DATA_MODE: every data path in this codebase is mock-only today (no live
    # adapter is wired up) — see app/adapters/market_adapter.py.
    data_mode: str = "mock"

    database_url: str | None = None

    # AI_API_KEY must stay server-side only — never sent to the frontend.
    ai_provider: str | None = None
    ai_api_key: str | None = None
    ai_model: str | None = None

    seoul_open_data_api_key: str = ""

    @property
    def ai_configured(self) -> bool:
        return bool(self.ai_api_key)

    @property
    def seoul_open_data_configured(self) -> bool:
        return bool(self.seoul_open_data_api_key)


def load_settings() -> Settings:
    allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
    return Settings(
        environment=os.getenv("ENVIRONMENT", "development"),
        allowed_origins=(
            _split_csv(allowed_origins_env)
            if allowed_origins_env
            else ["http://localhost:5173", "http://127.0.0.1:5173"]
        ),
        data_mode=os.getenv("DATA_MODE", "mock"),
        database_url=os.getenv("DATABASE_URL") or None,
        ai_provider=os.getenv("AI_PROVIDER") or None,
        ai_api_key=os.getenv("AI_API_KEY") or None,
        ai_model=os.getenv("AI_MODEL") or None,
        seoul_open_data_api_key=os.getenv("SEOUL_OPEN_DATA_API_KEY", ""),
    )


settings = load_settings()
