---
title: Carry commitments into next week
status: active
execution_modes: [frozen, operated-v4]
production_mode: proposal-only
owner: KamdarAI
created_at: 2026-08-21
updated_at: 2026-08-21
tags: [kamdar, feature, weekly, planning]
feature_id: FEAT-0007
feature_key: weekly.next-week-planning
system_id: SYS-0001
category: planning
public: true
surfaces:
  - automations/weekly-operating-review.md
  - templates/project.md
  - templates/task.md
source_refs:
  - workspace.hermes.md
  - tickets/TASK-0006/data-model-gap-report.md
evidence_refs:
  - evals/weekly/suite.json
known_limits: "Only operated-v4 may apply receipt-backed Project and Work updates in the eval root; production updates remain proposal-only."
---

# Carry commitments into next week

Kamdar turns approved owner attention and unresolved Work into explicit next
commitments on the same Project and Work records rather than clearing lists or
creating a parallel Project plan file.

## Why it exists

Weekly reports only matter when their decisions change the next actions people
will take. The plan must stay attached to the records that own the work.

## Trigger and inputs

Finalized Project reports, unresolved Work, approved commitments, Project
relations, responsible owners, dependencies, and review dates.

## Pipeline signature

```text
plan_next_week(final_project_reports, unresolved_work, commitments, relations)
  -> project_patches[] + work_patches[] + mutation_receipts[]
     + Notion Project/Work application
```

`frozen` produces an inspectable in-place patch plan. `operated-v4` applies the
reviewed patch only to the named v4 records and records the receipt; production
remains proposal-only.

## Flow

```text
final Project reports + unresolved Work
                    │
                    ▼
select approved commitments and carry-forward decisions
                    │
                    ▼
patch canonical Project next action/context + linked Work commitments
                    │
                    ▼
record diff + mutation receipt | proposal gap
```

## State changes and artifacts

- Updates Project current context, main blocker, next action, health, and
  review date in place.
- Updates or creates linked Work only where an approved commitment calls for it.
- Retains a record diff and receipt; creates zero freeform Project-plan Markdown
  files.

## Downstream application

Notion applies the reviewed Project/Work patch. The next Daily cycle reads that
canonical state; reports reference it rather than maintaining an alternate list.

## Failure modes

Unapproved commitments, absent owners, unclear dependencies, or missing Project
relations remain proposed. Existing Work is never cleared, replaced, or deleted
just to start a new week.

## Proof contract

`FEAT-0007` asserts approved source evidence, Project and Work record diffs,
real Project relation IDs, no duplicate Project-plan file, and correct
distinction between proposed and applied changes.

## Example

The replenishment Project retains its unresolved supplier dependency, updates
its next action to a named inventory review, and gives the linked owner Task a
new due date and confirmation requirement instead of opening an unrelated plan.
