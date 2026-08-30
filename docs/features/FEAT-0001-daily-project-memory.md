---
title: Append current Work to private Project Notes
status: active
execution_modes: [source-contract, private-local]
production_mode: private-local
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-31
tags: [company-os, feature, daily, memory]
feature_id: FEAT-0001
feature_key: daily.project-memory
system_id: SYS-0001
category: memory
public: true
surfaces: [automations/daily-operating-update.md, templates/project-week-notes.md]
source_refs: [workspace.hermes.md, tickets/TASK-0019/ticket.md]
evidence_refs: [tests/test_project_week_notes.py]
known_limits: "Provider publication is separate; Project Notes remain private workspace state."
---

# Append current Work to private Project Notes

## Why it exists

Keep one private, source-linked operating memory per Project without rewriting
public records or maintaining separate Daily entity files.

## Trigger and inputs

Daily receives active Projects plus bounded changed, open, and Done-unreviewed
Work with owners, dates, evidence, and source revisions.

## Pipeline signature

`DailyContextDiff -> project_note_updates[] -> append results by project_id`

## Flow

Daily turns one bounded context into complete Work, completion, and
documentation snapshots grouped by Project. The deterministic writer derives
each note key and appends it to that Project's current-week file.

```text
Projects + changed/open/Done-unreviewed Work
                    |
                    v
          project_note_updates[]
                    |
          group by exact project_id
                    |
                    v
weeks/<week>/project-notes/project--<id>.md
```

## State changes and artifacts

An exact source revision is a no-op. Different content under the same note key
is a conflict and leaves that Project file unchanged. Other Projects in the
same Daily result may still succeed. A frozen week rejects new appends.

## Downstream application

Notes keep sourced status, timestamps, staleness basis, owner, blocker, next
action, documentation state, and artifact evidence. They never infer employee
effort, intent, personality, or a performance rating. Daily does not edit the
public Project narrative, Employee Memory, SOPs, Decisions, Issues, or reports.

## Failure modes

Missing Project identity, invalid payloads, key conflicts, or a frozen week
block that Project append without rolling back successful unrelated Projects.

## Proof contract

Proof covers per-Project files, zero-write reruns, conflicts, missing coverage,
freeze, consolidation, and carry-forward.

## Example

Two source revisions for Aisha's `TASK-101` append two snapshots to CMT notes;
the same revision rerun writes nothing.
