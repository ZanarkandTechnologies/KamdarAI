---
skill: weekly-report-finalization
date: 2026-08-25
change_type: behavior
owner: skill-maintenance
status: pending-proof
review_route: reviewer
before_ref: weekly-report-synthesis
after_ref: current-weekly-draft-finalization
reasoning_basis: first_principles
proof_artifacts: [automations/examples/golden/current-weekly-draft-2026-W34.md]
eval_required: yes
---

# Weekly finalization maintenance audit

## Change

- Before: re-synthesized a five-anchor Draft diff from Daily artifacts.
- After: reads the current Draft and produces final reports without changing it.
- Why: Daily owns accumulation; Weekly owns finalization and reviewed promotion.
- Tradeoff accepted: routing facts are an explicit local input rather than a provider search.

## Binary rubric

| Check | Verdict | Evidence |
| --- | --- | --- |
| first_load_sufficiency | pass | N1–N5 expose input, routing, promotion, outputs, and no-write edge. |
| maintenance_locality | pass | all Draft accumulation leaves this package. |
| composition_clarity | pass | no Draft integration or second diff remains. |
| behavior_compared | pending | rerun direct-Draft normal/hard/boundary evidence. |

## Proof

- Deterministic local Draft update/finalization fixture plus source-key rerun.
- Independent contract review remains required before readiness.
