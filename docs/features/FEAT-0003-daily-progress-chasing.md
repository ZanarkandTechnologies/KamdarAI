---
title: Chase threatened Work from the same Project evidence
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
source_refs: [workspace.hermes.md, tickets/TASK-0019/ticket.md]
evidence_refs: [tests/test_pydantic_daily_contracts.py, tests/test_validate_eval_run.py]
known_limits: "Production delivery still requires an approved route and write authority."
---

# Chase threatened Work from the same Project evidence

## Why it exists

Turn observable delivery risk into one precise owner follow-up while preserving
the same evidence in private Project memory.

## Trigger and inputs

Daily receives dated Work snapshots, owner bindings, blocker state, and the
approved delivery route.

## Pipeline signature

`current Work -> Project Notes + weekly_progress_chases[]`

## Flow

Daily uses one source snapshot for both private PM memory and any owner chase.
It appends the current Work/problem observation to Project Notes, then prepares
one factual message only when a dated target is stale, blocked, or threatened.

```text
current Work evidence
      +--------------------+
      |                    |
      v                    v
Project Notes       weekly_progress_chases[]
private append      approved route or blocked
```

## State changes and artifacts

The Project note is private memory; a chase is an outbound proposal until its
route and authority validate.

## Downstream application

The message starts with the target and date, states the observed risk, and asks
for the blocker, recovery plan, and revised commitment. Documentation-quality
questions stay on the Work item and are not duplicated in a chase. Missing
owner, timestamp, or approved destination blocks only delivery; the private
source-linked note remains useful.

## Failure modes

Unknown owner, missing dated evidence, an unapproved route, or failed provider
read-back prevents delivery without discarding the Project note.

## Proof contract

An isolated eval-sink receipt proves routing and provider read-back, not human
or employee delivery.

## Example

If `TASK-204` is still In Progress after its due date, the system records its
current snapshot and asks its owner for the blocker and revised commitment.
