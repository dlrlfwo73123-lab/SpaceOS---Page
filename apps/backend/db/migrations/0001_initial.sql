-- 0001_initial.sql — Proposed PostGIS schema for SpaceOS's live data layer.
--
-- STATUS: schema-as-code only. There is no PostgreSQL/PostGIS instance
-- configured anywhere in this repo or its deploy pipeline (GitHub Pages
-- frontend + a stateless FastAPI backend that reads from in-memory mock
-- generators). This migration is NOT applied anywhere and the running
-- application does NOT connect to a database. It exists so the proposed
-- schema is reviewable and ready to apply once a real Postgres+PostGIS
-- instance and a migration runner (e.g. alembic) are actually provisioned.
-- Until then, every table here is aspirational, not live infrastructure.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ── 행정구역 참조 ──────────────────────────────────────────────
CREATE TABLE regions (
    gu_code     VARCHAR(10) PRIMARY KEY,
    gu_name     VARCHAR(50) NOT NULL,
    dong_code   VARCHAR(10),
    dong_name   VARCHAR(50)
);

CREATE TABLE region_boundaries (
    id          BIGSERIAL PRIMARY KEY,
    region_code VARCHAR(10) NOT NULL REFERENCES regions(gu_code),
    level       VARCHAR(10) NOT NULL CHECK (level IN ('gu', 'dong')),
    geom        GEOMETRY(MultiPolygon, 4326) NOT NULL,
    source      VARCHAR(100) NOT NULL,
    as_of       DATE NOT NULL
);
CREATE INDEX region_boundaries_geom_idx ON region_boundaries USING GIST (geom);

-- ── 업종 참조 ──────────────────────────────────────────────────
CREATE TABLE industry_codes (
    code        VARCHAR(10) PRIMARY KEY,
    name        VARCHAR(100) NOT NULL
);

CREATE TABLE industry_code_mappings (
    id              BIGSERIAL PRIMARY KEY,
    industry_code   VARCHAR(10) NOT NULL REFERENCES industry_codes(code),
    external_system VARCHAR(50) NOT NULL,   -- e.g. '소상공인시장진흥공단'
    external_code   VARCHAR(50) NOT NULL
);

-- ── 데이터 출처/적재/품질 감사 ──────────────────────────────────
CREATE TABLE data_sources (
    id                       VARCHAR(50) PRIMARY KEY,
    label                    VARCHAR(100) NOT NULL,
    intended_source          VARCHAR(200) NOT NULL,
    refresh_cadence          VARCHAR(20) NOT NULL,
    status                   VARCHAR(10) NOT NULL CHECK (status IN ('mock', 'live')),
    live_adapter_implemented BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE data_ingestion_runs (
    id           BIGSERIAL PRIMARY KEY,
    source_id    VARCHAR(50) NOT NULL REFERENCES data_sources(id),
    started_at   TIMESTAMPTZ NOT NULL,
    finished_at  TIMESTAMPTZ,
    status       VARCHAR(20) NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'partial')),
    rows_ingested INTEGER,
    error_summary TEXT
);

CREATE TABLE data_quality_checks (
    id                BIGSERIAL PRIMARY KEY,
    ingestion_run_id  BIGINT NOT NULL REFERENCES data_ingestion_runs(id),
    completeness_score NUMERIC(4,3),
    coverage_score      NUMERIC(4,3),
    consistency_score   NUMERIC(4,3),
    note                TEXT
);

CREATE TABLE metric_snapshots (
    id          BIGSERIAL PRIMARY KEY,
    region_code VARCHAR(10) NOT NULL REFERENCES regions(gu_code),
    industry_code VARCHAR(10) REFERENCES industry_codes(code),
    source_id   VARCHAR(50) NOT NULL REFERENCES data_sources(id),
    metric_key  VARCHAR(50) NOT NULL,
    value       NUMERIC,
    as_of       DATE NOT NULL,
    is_demo     BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX metric_snapshots_lookup_idx ON metric_snapshots (region_code, industry_code, metric_key, as_of);

-- ── 점포/이력 ──────────────────────────────────────────────────
CREATE TABLE businesses (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(200),
    industry_code VARCHAR(10) REFERENCES industry_codes(code),
    building_id   BIGINT,             -- FK added after buildings table below
    floor         INTEGER,
    status        VARCHAR(20) NOT NULL CHECK (
        status IN ('confirmed-open', 'confirmed-closed', 'observed-open',
                   'temporarily-closed', 'inferred-closed', 'unknown')
    ),
    source_id     VARCHAR(50) REFERENCES data_sources(id),
    is_demo       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE business_status_events (
    id            BIGSERIAL PRIMARY KEY,
    business_id   BIGINT NOT NULL REFERENCES businesses(id),
    event_type    VARCHAR(30) NOT NULL CHECK (
        event_type IN ('first-observed', 'official-opening', 'industry-change',
                       'temporary-closure', 'official-closure', 'reopening')
    ),
    event_date    DATE NOT NULL,
    -- close_reason is intentionally nullable with no default value: a real
    -- closure reason must come from a verified source. Never populate this
    -- with an inferred/template string and present it as fact.
    close_reason  TEXT,
    close_reason_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    source_id     VARCHAR(50) REFERENCES data_sources(id),
    is_demo       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── 건물/층/유닛 ──────────────────────────────────────────────
CREATE TABLE buildings (
    id            BIGSERIAL PRIMARY KEY,
    external_id   VARCHAR(100),
    name          VARCHAR(200),
    region_code   VARCHAR(10) REFERENCES regions(gu_code),
    geom          GEOMETRY(Point, 4326),
    floor_count   INTEGER,
    built_year    INTEGER,
    source_id     VARCHAR(50) REFERENCES data_sources(id),
    is_demo       BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX buildings_geom_idx ON buildings USING GIST (geom);
ALTER TABLE businesses ADD CONSTRAINT businesses_building_fk
    FOREIGN KEY (building_id) REFERENCES buildings(id);

CREATE TABLE building_floors (
    id          BIGSERIAL PRIMARY KEY,
    building_id BIGINT NOT NULL REFERENCES buildings(id),
    level       INTEGER NOT NULL,
    area_sqm    NUMERIC(8,2),
    UNIQUE (building_id, level)
);

CREATE TABLE rentable_units (
    id              BIGSERIAL PRIMARY KEY,
    building_floor_id BIGINT NOT NULL REFERENCES building_floors(id),
    vacancy_status  VARCHAR(30) NOT NULL CHECK (
        vacancy_status IN ('verified-vacant', 'listing-available',
                           'inferred-vacancy', 'suitability-only', 'unknown')
    ),
    area_sqm        NUMERIC(8,2),
    source_id       VARCHAR(50) REFERENCES data_sources(id),
    is_demo         BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE property_listings (
    id              BIGSERIAL PRIMARY KEY,
    rentable_unit_id BIGINT REFERENCES rentable_units(id),
    deposit_won     BIGINT,
    rent_monthly_won BIGINT,
    listed_at       DATE,
    source_id       VARCHAR(50) REFERENCES data_sources(id),
    is_demo         BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── 추천 실행 기록 ─────────────────────────────────────────────
CREATE TABLE recommendation_runs (
    id            BIGSERIAL PRIMARY KEY,
    mode          VARCHAR(10) NOT NULL CHECK (mode IN ('region', 'industry')),
    requested_at  TIMESTAMPTZ NOT NULL,
    is_demo       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE recommendation_items (
    id              BIGSERIAL PRIMARY KEY,
    run_id          BIGINT NOT NULL REFERENCES recommendation_runs(id),
    rank            INTEGER NOT NULL,
    region_code     VARCHAR(10) REFERENCES regions(gu_code),
    industry_code   VARCHAR(10) REFERENCES industry_codes(code),
    total_score     NUMERIC(5,2) NOT NULL,
    confidence      NUMERIC(4,3) NOT NULL
);

CREATE TABLE recommendation_evidence (
    id          BIGSERIAL PRIMARY KEY,
    item_id     BIGINT NOT NULL REFERENCES recommendation_items(id),
    kind        VARCHAR(20) NOT NULL CHECK (kind IN ('evidence', 'risk', 'limitation')),
    text        TEXT NOT NULL
);

-- ── 사용자/요금제 (결제 연동 없음 — 스키마만) ──────────────────
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscription_plans (
    id                  VARCHAR(20) PRIMARY KEY,  -- matches PRICING_HYPOTHESIS_V1 tier ids
    name                VARCHAR(50) NOT NULL,
    monthly_price_won   BIGINT
);

CREATE TABLE subscriptions (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id),
    plan_id     VARCHAR(20) NOT NULL REFERENCES subscription_plans(id),
    status      VARCHAR(20) NOT NULL CHECK (status IN ('active', 'canceled', 'pending')),
    started_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    -- No payment_provider_ref column: no payment provider is integrated.
    -- Per CLAUDE.md, this table must stay schema-only until one is wired up.
);

CREATE TABLE usage_events (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id),
    event_type  VARCHAR(50) NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
