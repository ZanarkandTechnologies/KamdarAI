---
skill: daily-knowledge-capture
date: 2026-08-25
change_type: behavior
owner: skill-maintenance
status: pending-proof
review_route: reviewer
before_ref: daily-weekly-report-contribution
after_ref: direct-current-weekly-draft-update
reasoning_basis: first_principles
proof_artifacts: [automations/examples/golden/current-weekly-draft-2026-W34.md]
eval_required: yes
---

# Direct Draft maintenance audit

## Change

- Before: rendered a contribution and delegated a Draft application.
- After: source-keyed Decisions/SOPs edit the supplied local Draft directly.
- Why: the Draft is already Markdown; an unreviewed intermediate artifact and
  second mutation boundary only duplicate ownership.
- Tradeoff accepted: direct local writes require exact anchor markers and a
  whole-batch conflict stop.

## Binary rubric

| Check | Verdict | Evidence |
| --- | --- | --- |
| first_load_sufficiency | pass | N1–N5 name direct input, anchors, conflict, and outcome. |
| reference_load_precision | pass | shared Draft template and package golden only. |
| maintenance_locality | pass | source-key ownership stays in this pipeline. |
| composition_clarity | pass | no Draft integration remains. |
| behavior_compared | pending | run normal/hard/boundary suite after fixture rewrite. |

## Proof

- Focused source/eval checks plus direct Draft idempotency/conflict fixture.
- Independent contract review remains required before readiness.
