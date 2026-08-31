---
ticket_id: TASK-0020
updated_at: 2026-08-31
---

# TASK-0020 progress

- Added strict Pydantic Stage 2 plan and receipt contracts.
- Stage 1 now writes a complete `delivery-plan.json` and binds it into the
  immutable cadence handoff.
- Added `setup.py deliver` review/apply UX with disabled-by-default policy,
  workspace/result/plan hash gates, exact-target blocking, configured Hermes
  provider toolsets, messaging-guard routing, redacted receipts, and rerun
  idempotency.
- Setup now offers **Prepare only** or **Reviewed Stage 2** and configures the
  cadence policy without authorizing production.
- Added Decisions and SOP destination roles to the provider catalog and runtime
  distribution.
- Offline QA: 217 tests passed, 2 explicit live lanes skipped; workspace and
  packaged eval validation passed.
- Remaining proof: one separately authorized operated isolated-eval run across
  the exact reviewed providers. No external Stage 2 action was run here.
