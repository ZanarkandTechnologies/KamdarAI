---
title: Carry commitments into next week
status: active
execution_modes: [frozen, operated-v4]
production_mode: proposal-only
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-29
tags: [company-os, feature, weekly, planning]
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
  - tickets/archive/TASK-0006/data-model-gap-report.md
evidence_refs:
  - evals/weekly/suite.json
known_limits: "Only operated-v4 may apply receipt-backed Project attention updates in the eval root; production updates remain proposal-only. Weekly does not mutate Work."
---

# Carry commitments into next week

The Company OS turns approved owner attention and unresolved Work into one
explicit Project attention checklist that retains the same linked Work IDs,
rather than clearing lists, mutating Work, or creating a parallel Project plan
file.

The next weekly Project draft is therefore a refreshed view, not an empty
reset. Open Work survives by stable ID; completed or cancelled Work leaves the
new open-work view but remains in finalized report history. Work created from a
new Meeting commitment joins the same view on the next Daily reconciliation.

## Why it exists

Weekly reports only matter when their decisions change the next actions people
will take. The plan must stay attached to the records that own the work.

## Trigger and inputs

Finalized Project reports, their evidenced open-Work rows, approved
commitments, Project relations, responsible owners, dependencies, and review
dates. Weekly does not rescan raw Work; Daily must have reconciled those rows
before the cutoff.

## Pipeline signature

```text
plan_next_week(final_project_reports, unresolved_work, commitments, relations)
  -> project_attention_replacements[] + mutation_receipts[]
     + Project application
```

`frozen` produces an inspectable in-place patch plan. `operated-v4` applies the
reviewed patch only to the named v4 records and records the receipt; production
remains proposal-only.

## Flow

```text
final Project reports + evidenced open-Work rows
                    │
                    ▼
select approved commitments and carry-forward decisions
                    │
                    ▼
replace canonical Project attention with the merged open-work checklist
                    │
                    ▼
record diff + mutation receipt | proposal gap
```

```text
Weekly output
  = complete canonical Project attention replacement

First Daily run of the new week
  = create private Project report from live bounded Work
  + carry unresolved requests, blockers, and artifacts
  + start empty current-week narrative sections
```

## State changes and artifacts

- Updates Project current context, main blocker, next action, health, and
  review date in place.
- Preserves linked Work IDs in the Project attention replacement but does not
  patch, create, close, or delete canonical Work. Meeting intake and ordinary
  Work management remain the only owners of those mutations.
- Retains a record diff and receipt; creates zero freeform Project-plan Markdown
  files.
- Leaves next-report creation to the first bounded Daily run of the new week.
  Closed Work is absent from that new open-work view without being deleted from
  Work or from the prior finalized report.

## Downstream application

The configured provider applies the reviewed Project attention replacement.
The next Daily cycle reads that Project context together with live bounded Work;
reports reference those owners rather than maintaining an alternate task list.

## Failure modes

Unapproved commitments, absent owners, unclear dependencies, or missing Project
relations remain proposed. Existing Work is never cleared, replaced, or deleted
just to start a new week.

A documentation response received after the weekly cutoff updates the live
Work review state and appears in the next week's accumulating report. It does
not trigger a rewrite of already finalized Project, Department, or Company
reports.

## Proof contract

`FEAT-0007` asserts approved source evidence, the Project attention diff, real
Project relation IDs, no duplicate Project-plan file, and correct
distinction between proposed and applied changes.

## Example

The replenishment Project retains its unresolved supplier dependency, updates
its next action to a named inventory review, and preserves the linked open Work
ID in its attention checklist instead of opening an unrelated plan. The Work
record itself is not mutated by Weekly.
