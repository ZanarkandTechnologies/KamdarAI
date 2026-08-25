---
skill: daily-documentation-quality
date: 2026-08-24
change_type: new-skill
owner: KamdarAI
status: draft_unrun
review_route: thin-slice-review
reasoning_basis: TASK-0007 artifact boundary
proof_artifacts:
  - SKILL.md
  - templates/employee-message-plan.md
  - ../../automations/examples/golden/daily-context-diff-2026-08-24.json
  - examples/golden/employee-message-plan.md
  - evals/evals.json
eval_required: yes
---

# Initial Daily Documentation Quality Skill Audit

## Owner decision

The Daily collector owns the single source scan. This skill owns the judgment
and one reviewable employee-message plan; `dispatch-employee-messages` will own
provider routing, delivery, and receipts. The old per-Work
`daily-documentation-request` is a predecessor, not a second runtime call.

## Rejected placements

- **Automation prompt:** it would mix collection, documentation judgment, and
  provider delivery, making the artifact hard to evaluate independently.
- **Delivery integration:** it must not decide missing fields or compose
  operational requests from provider preflight data.
- **Generic shared schema:** the local Markdown template, golden, and eval are
  sufficient for this initial human-reviewable artifact.

## Initial contract checks

| Check | Result | Evidence |
| --- | --- | --- |
| Stable trigger | pass | One Daily context diff plus static templates |
| Distinct output | pass | `kamdar-employee-message-plan` Markdown |
| Provider-free boundary | pass | SKILL.md forbids fetch/send/receipt claims |
| Golden calibration | pass | Source JSON and fully rendered plan are local |
| Normal/hard/boundary evals | drafted | `evals/evals.json`; not yet executed |
| Candidate/no-skill comparison | pending | Required before readiness |

## Remaining proof

Run the normal fixture against the direct unstructured-Daily baseline, retain
both plans and a judge verdict, then fix and rerun the smallest failing eval.
