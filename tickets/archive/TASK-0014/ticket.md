---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0014
title: Create canonical Task tickets from new Meeting commitments
status: complete
claimed_by: codex-root
created_at: 2026-08-27T07:10:00Z
updated_at: 2026-08-27T07:10:00Z
depends_on: [TASK-0013]
ui_scope: true
feature_refs: [FEAT-0010]
---

# TASK-0014: Create canonical Task tickets from new Meeting commitments

## Summary

Add one event workflow that reads a newly completed Meeting, converts only its
explicit accountable commitments into canonical Task records, verifies each
record against `templates/task.md`, and creates no duplicate on an unchanged
rerun. The seed Meeting is fixture input, not a scored setup feature.

## Scope

- In: Meeting commitment extraction, required-field gates, Task-template
  rendering, source relation, idempotent provider application, runnable evals,
  and dossier projection.
- Out: inferring work from general notes, creating Decisions/SOPs/Issues, and
  scoring whether the isolated database was seeded.

## Delta

> **Before:** Daily reads embedded Meetings for Project memory and weekly
> knowledge, but no workflow creates canonical Task records from commitments.
>
> **After:** A new Meeting Intake workflow creates one Task per complete
> commitment, blocks incomplete commitments, and proves template fidelity and
> deduplication.
>
> **Example:** `TASK-204` contains two named commitments. The workflow creates
> `TASK-307` and `TASK-308` with the canonical Task fields and Meeting source;
> an unchanged rerun creates zero additional records.

## Contract Diagram

```text
[new completed Meeting]
          |
          v
[explicit Commitments only] --> [required owner/project/due/action gate]
                                        | pass              | fail
                                        v                   v
                              [render task.md]       [blocked commitment]
                                        |
                                        v
                              [dedupe action key]
                                        |
                                        v
                              [create + read back Work]
```

## Done

- [x] FEAT-0010 and its automation contract are discoverable.
- [x] The result schema cannot represent an unowned or undated Task creation.
- [x] The canonical seed includes one representative new Meeting and no
  pre-created output Tasks.
- [x] Happy path, missing-field boundary, and unchanged-rerun cases are runnable.
- [x] The dossier renders FEAT-0010 from seed input without scoring setup.
- [x] Focused tests and independent review pass.

## QA Strategy

```yaml
proof_weight: hybrid
checks:
  - node --test evals/filesystem/tests/meeting-commitment-intake.test.mjs
  - node --test evals/filesystem/tests/seed-evidence-viewer.test.mjs
  - python3 -m unittest discover -s tests -p 'test_*.py' -v
evidence_paths: [tickets/TASK-0014/progress.md, tickets/TASK-0014/artifacts/review/]
final_checkpoint: independent implementation and eval review
residual_risk: Provider creation remains unproved until an isolated operated run supplies Notion read-back links.
```

## State

- Current: complete; local workflow proof and independent review pass.
- Next: operate FEAT-0010 in an isolated Notion root when provider-level output links and a feature verdict are required.
- Blockers: none.
