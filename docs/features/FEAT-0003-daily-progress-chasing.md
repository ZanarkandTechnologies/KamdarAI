---
title: Follow up on delayed or blocked Work
status: active
execution_modes: [source-contract]
production_mode: proposal-only
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-31
tags: [company-os, feature, daily, outreach]
feature_id: FEAT-0003
feature_key: daily.project-control
system_id: SYS-0001
category: outreach
public: true
surfaces: [automations/daily-operating-update.md, templates/project-week-notes.md, templates/person.md]
source_refs: [workspace.hermes.md, tickets/archive/TASK-0019/ticket.md]
evidence_refs: [tests/unit/schemas/test_daily_review_result.py, tests/harness/evals/test_validate_eval_run.py]
known_limits: "Production delivery still requires an approved route and write authority."
---

# Follow up on delayed or blocked Work

## Why it exists

Send one precise owner follow-up when the evidence shows that dated Work is
delayed, blocked, or at risk. Keep the same evidence in private Project Notes.

## Trigger and inputs

Daily receives dated Work snapshots, owner bindings, blocker state, and the
approved delivery route.

## Pipeline signature

`current Work -> Project Notes + weekly_progress_chases[]`

## Flow

Daily uses one source snapshot for both private Project Notes and progress
questions. It appends the current Work/problem observation to Project Notes,
then prepares one factual question only when a dated target is stale, blocked,
or threatened.

```text
current Work evidence
      +--------------------+
      |                    |
      v                    v
Project Notes       weekly_progress_chases[]
private append      exact Work comment
                    or approved direct route
```

## State changes and artifacts

The Project note is private memory. By default a chase is a comment proposal for
each exact linked Work item. An explicitly configured employee-follow-up route
may replace Work comments, but no recipient or generic channel is inferred.

## Downstream application

The message starts with the target and date, states the observed risk, and asks
for the blocker, recovery plan, and revised commitment. Documentation-quality
questions stay on the Work item and are not duplicated in a chase. A missing
exact Work URL, timestamp, or approved direct destination blocks only delivery;
the private source-linked note remains useful.

## Failure modes

Unknown owner, missing dated evidence, an unresolved Work URL, an unapproved
direct route, or failed provider read-back prevents delivery without discarding
the Project note.

## Proof contract

An isolated eval-sink receipt proves routing and provider read-back, not human
or employee delivery.

## Example

If `TASK-204` is still In Progress after its due date, the system records its
current snapshot and asks its owner for the blocker and revised commitment.
