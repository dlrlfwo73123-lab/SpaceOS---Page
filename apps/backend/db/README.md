# db/migrations

`0001_initial.sql` is a **proposed** PostGIS schema, not live infrastructure.

- Nothing in this repo connects to a PostgreSQL instance. The FastAPI
  backend (`app/main.py`) is stateless and reads from in-memory mock
  generators (`app/data/mock_market.py`, `app/data/buildings.py`).
- This file is not run by any test, CI step, or app startup path.
- Before it can be applied for real: provision a Postgres+PostGIS instance,
  add a migration runner (alembic recommended, since the app already uses
  Pydantic v2/FastAPI), add a `DATABASE_URL` env var and SQLAlchemy models
  mirroring these tables, and replace `app/data/*` mock reads with real
  repository queries (see `app/repositories/` for the interface this would
  plug into).
