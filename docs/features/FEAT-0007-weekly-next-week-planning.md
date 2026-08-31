---
title: Carry unresolved Project Notes into next week
status: active
execution_modes: [frozen, private-local]
production_mode: private-local
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-31
tags: [company-os, feature, weekly, planning]
feature_id: FEAT-0007
feature_key: weekly.next-week-planning
system_id: SYS-0001
category: planning
public: true
surfaces: [automations/weekly-operating-review.md, templates/project-week-notes.md]
source_refs: [workspace.hermes.md, tickets/archive/TASK-0019/ticket.md]
evidence_refs: [tests/unit/scripts/test_project_week_notes.py]
known_limits: "Weekly initializes private notes and never mutates source Work."
---

# Carry unresolved Project Notes into next week

## Why it exists

Keep open commitments and unanswered documentation questions visible across a
week boundary without mutating the frozen source week.

## Trigger and inputs

After successful consolidation, Weekly receives the newest complete Work and
documentation-question snapshots from each Project.

## Pipeline signature

`consolidated Project Notes -> unresolved selection -> next-week Project Notes`

## Flow

Weekly does not clear a shared report or replace a public Project checklist. It
selects the newest complete Work and documentation-question snapshots from the
frozen set and initializes one next-week notes file per Project.

```text
latest Work snapshot + latest documentation question
                         |
          open / blocked / question open / artifact unaccepted?
                 | yes                         | no
                 v                             v
      next week Carry-forward items       report history only
```

## State changes and artifacts

The frozen source stays immutable. Weekly creates source-linked Carry-forward
items in the next week only for unresolved Work, open questions, or unaccepted
artifacts.

## Downstream application

An accepted completed outcome with sufficient documentation does not carry
forward. Late answers arrive through the next Daily run under the original Work
ID. The prior frozen files and finalized reports never change.

## Failure modes

Carry-forward requires a validated consolidation receipt. Exact reruns are
source-key duplicates. Divergent snapshots tied at the same source timestamp
block consolidation rather than choosing one arbitrarily.

## Proof contract

Filesystem tests cover open-item carry, closed-item omission, late answers,
exact reruns, and immutable archived source files.

## Example

An unanswered quality question for `TASK-101` appears in next week's CMT notes;
once answered and accepted, it disappears from the following carry-forward.
