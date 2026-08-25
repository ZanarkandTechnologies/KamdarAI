---
skill: apply-project-diffs
date: 2026-08-24
change_type: initial_contract
owner: TASK-0007
status: draft_unrun
review_route: skill-contract-review
eval_required: true
---

# Skill Audit

## Boundary

- **Before:** Project-memory reasoning and provider mutation lived in one broad
  Daily route.
- **After:** a dedicated integration applies a reviewed patch only after source,
  identity, idempotency, and expected-current-value guards.
- **Excluded:** content judgment, context collection, merge resolution, and any
  non-Project provider mutation.

## Proof state

- Local receipt contract, a sanitized applied golden, and normal/hard/boundary
  eval rows are present.
- JSON parsing and first-load line-budget checks are required before review.
- A profile-backed preflight/adapter run and independent judge verdict remain
  required; this audit does not claim a live Project mutation is ready.
