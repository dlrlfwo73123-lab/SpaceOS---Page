# Rules for working on SpaceOS

- Never fabricate data: no invented closure reasons, revenue/rent/deposit
  figures, vacancy confirmation, permit eligibility, facility availability,
  causal claims, sample sizes, sources, or AI results. If real data is
  missing, say so explicitly in the UI/API ("데이터 없음", "확인 필요",
  "제한된 데이터로 산출" etc.) rather than inventing a plausible-looking value.
- Never present demo/mock data as if it were real. Anywhere mock data is
  used, show a visible demo-data indicator and never let a mock ID
  (e.g. `mock-building-001`) appear in a response presented as live data.
- Don't halt work just because an external API key or credential is
  missing — build the adapter/schema/mock-mode/tests/docs anyway, and
  clearly label what still needs a live key, live data, or production
  deployment to actually function.
- LLM/AI components must never directly decide rankings or scores. AI is
  explanation-only, validated against a fixed JSON schema, with a
  deterministic non-AI fallback. AI keys are server-side only.
- No real payment integration without explicit instruction — payment UI
  may exist but must be disabled/"준비 중" until a real billing provider is
  wired up.
- `ALLOWED_ORIGINS`-style CORS config must stay env-driven, never a
  wildcard in code that ships to production.
- Don't delete or rewrite existing working features wholesale — only
  remove/refactor the parts that directly conflict with a given requirement.
- When reporting on a multi-part task, separate explicitly what's actually
  done vs. mock-verified vs. blocked on a live key/data/deployment. Don't
  describe unfinished work as complete.
