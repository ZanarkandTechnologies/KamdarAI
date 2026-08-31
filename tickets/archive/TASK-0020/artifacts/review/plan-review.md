---
review_type: implementation-plan
ticket_id: TASK-0020
reviewed_at: 2026-08-28
verdict: pass
tas: TAS-A
rubric_families: [implementation-plan, eval-quality, integration-readiness, evidence-quality]
---

# TASK-0020 plan review

## Verdict

Pass-ready for implementation. No hard-gate failures remain.

## Reviewed boundary

- Doctor fetches configured data through read-only operations, runs tool-free
  AI generation, validates and renders previews, and records zero downstream
  calls.
- Daily, Weekly, and Meeting Intake each split into `prepare` and explicit
  `deliver` stages.
- Installed `.hermes.md` owns the per-cadence delivery switch; enabling it does
  not override destination or write authority.
- `verify`, live connectivity, doctor, fixture doctor, prepare, and deliver
  have distinct user-facing meanings.
- Preview evals and delivery-contract tests retain separate proof surfaces.
- The non-technical summary has exactly three aggregate states:
  `WORKING`, `I DON'T KNOW — NOT ENOUGH INFORMATION`, and `FAILED`, mapped to
  exit 0, 1, and 2.
- Each selected feature resolves to valuable output, no change needed, not
  enough information, or an observed runner failure with evidence.
- Empty outputs cannot pass without complete coverage proving no change; missing
  evidence produces structured gaps; produced files must pass a value gate.
- Compact eval scenarios preserve feature-specific proof as fixture-owned
  reference points or shared invariants.

## Implementation checkpoint

First prove the shared schemas and `setup.py doctor --fixtures` render the exact
`WORKING`, `I DON'T KNOW — NOT ENOUGH INFORMATION`, and `FAILED` summaries with
`downstream_calls: 0`. Only then add configured-source fetch and live model
execution.

## Required rereview

Rerun implementation, eval-quality, integration-readiness, and evidence-quality
review after implementation using the ticket's Done / Proof checks.
