# SpaceOS Implementation Plan & Status

This document tracks the large multi-phase redesign requested for SpaceOS
(deterministic recommendation engine, data provenance model, demo/live data
separation, Street View removal, pricing hypothesis, etc.). It is written to
be honest about what is **code-complete**, what is **mock-verified only**,
and what is **out of scope for this pass** — per the project's no-fabrication
rule, nothing here should be read as "done" unless it actually is.

## 0. Naver Map Client ID — flagged discrepancy

Three different Client ID values have appeared across this project's history:

| Source | Value |
|---|---|
| `.github/workflows/deploy.yml` (live, pre-this-change) | `3a91WbDxtOPaPehOXqhl` |
| PR #16 (user-confirmed from NCP console screenshot) | `x8gtogoy1i` |
| Latest spec request | `9nbzrvj8qj` |

**This change does not pick one.** Instead, `VITE_NAVER_CLIENT_ID` is now
sourced entirely from the `NAVER_MAP_CLIENT_ID` GitHub Repository Variable
(see Phase 8), and `NaverMap.tsx` shows an explicit error state if it is
unset rather than silently hardcoding any of the three values. **Action
required from the user:** set the `NAVER_MAP_CLIENT_ID` repository variable
to whichever value is actually registered in the NCP console alongside the
deployed GitHub Pages URL as an allowed Web 서비스 URL — only the user can
confirm which one that is.

## 1. Done in this pass (code-complete)

- **Street View / Panorama fully removed**: `NaverMap.tsx`, `StoreHistory.tsx`,
  `loadNaverMaps.ts` (dropped `&submodules=panorama`), `types/naver-maps.d.ts`
  (`NaverPanoramaInstance` type removed). Verified via:
  `rg -n "demo-building|streetView|streetViewOpen|Panorama|panoramaRef|panoramaContainerRef|submodules=panorama|거리뷰" apps/frontend/src apps/backend/app`
  — only remaining hits are an unrelated comment fragment and a pre-existing
  `app/data/buildings.py` mock-asset path mapping (see §3).
- **`demo-building` removed from interactive code paths**: `DashboardPage.tsx`
  now initializes `selectedBuildingId` to `null` (was `'demo-building'`);
  `NaverMap.tsx`'s map-click handler no longer calls
  `onSelectBuilding('demo-building')` on arbitrary clicks (TODO comment left
  pointing at real building-marker wiring once live building data exists);
  `VacancyHeatmap.tsx`'s click handler no longer falls back to `'demo-building'`
  when a feature has no `grid_id`.
- **CORS wildcard removed**: `apps/backend/app/main.py` now reads
  `ALLOWED_ORIGINS` (comma-separated) from the environment, defaulting to
  localhost-only dev origins instead of `["*"]`. Added a `/health` endpoint.
- **Naver Client ID and API base URL are env-driven, not hardcoded**:
  `NaverMap.tsx` reads `VITE_NAVER_CLIENT_ID` with no hardcoded fallback
  value and shows an explicit "Client ID 설정 필요" error state if unset;
  `lib/api.ts` now builds its base URL from `VITE_API_BASE_URL` (falls back
  to a relative path for local dev via the existing Vite proxy);
  `.github/workflows/deploy.yml` now injects both from
  `vars.NAVER_MAP_CLIENT_ID` / `vars.API_BASE_URL` Repository Variables
  instead of a literal string.
- Frontend build (`npm run build` — `tsc -b && vite build`) passes after all
  of the above changes.

## 2. Verification commands run

```
rg -n "demo-building|streetView|streetViewOpen|Panorama|panoramaRef|panoramaContainerRef|submodules=panorama|거리뷰" apps/frontend/src apps/backend/app
rg -n "mulberry32|rngFor|Math\.random" apps/frontend/src apps/backend/app
git grep -n -E "AI_API_KEY=.+|CLIENT_SECRET=.+|SERVICE_KEY=.+" -- ':!*.example'
```

Results: no live Street View/Panorama/demo-building code remains (see §3 for
the one residual mock-asset path); no secrets found committed outside
`.example` files; the seeded-RNG synthetic data generator (`mulberry32`/
`rngFor` in `lib/marketData.ts` and `lib/api.ts`) **is still present and still
wired into the production render path** — see §3, this is the largest
remaining gap.

## 3. Explicitly NOT done in this pass (deferred)

This was an extremely large specification (deterministic scoring/confidence
engine, full provenance/store-history/building-matching data model, FastAPI
recommendation endpoints, AI explanation service, pricing/entitlements,
PostGIS schema, ingestion adapters, dong-polygon map layer, full test suite).
Implementing all of it correctly in one pass was not realistic without
either fabricating untested code or silently cutting corners on the
no-fabrication rule. What remains, explicitly:

- **Backend recommendation engine** (`services/scoring.py`,
  `services/confidence.py`, `adapters/mock.py`,
  `api/v1/recommendations.py` with `POST /by-region` / `POST /by-industry`,
  weight/confidence formulas, pytest coverage) — **not implemented**. The
  frontend's region/industry recommendation flow (`LandingPage` →
  `RegionAnalysisPage`/`IndustryAnalysisPage` → `AnalysisResultPage`) still
  calls the seeded-PRNG synthetic generator in `lib/api.ts`/`lib/marketData.ts`
  directly from the browser, with no server-side scoring and no demo-data
  banner distinguishing it from real output. This is a direct violation of
  the "never silently present mock data as real" rule as it stands today —
  flagging it here rather than leaving it unstated.
- **Data provenance / store-history / building-matching schemas**
  (`DataProvenance`, vacancy-status enum, building/floor/unit model) — not
  implemented as TypeScript/Pydantic types yet.
- **AI explanation service** (provider interface, JSON-schema validation,
  deterministic fallback template) — not implemented.
- **Pricing page / `PRICING_HYPOTHESIS_V1` / entitlements API** — not
  implemented.
- **`docs/` set beyond this file** — not written.
- **`CLAUDE.md` permanent rule set** — see separate file added alongside this
  plan (kept intentionally short — only the rules that are durable and
  unambiguous).
- One residual mock-asset reference: `apps/backend/app/data/buildings.py:53`
  maps `"demo-building"` to a placeholder `.glb` model path used by the old
  dashboard's 3D twin demo. This is inert now that `DashboardPage` no longer
  auto-selects `demo-building`, but the mapping entry itself was left in
  place rather than deleted, since `BuildingTwin` may still reference it as
  a named demo fixture; flagged here rather than silently left unexplained.

## 4. Recommended next steps, in priority order

1. Decide the real Naver Client ID (§0) and set the `NAVER_MAP_CLIENT_ID`
   repository variable.
2. Build the backend recommendation engine (§3, first bullet) and rewire the
   frontend's `useRegionRecommendation`/`useIndustryRecommendation` hooks to
   call it instead of the in-browser PRNG, with an explicit demo-mode banner
   for as long as `DATA_MODE=mock`.
3. Everything else in §3, roughly in the order listed.
