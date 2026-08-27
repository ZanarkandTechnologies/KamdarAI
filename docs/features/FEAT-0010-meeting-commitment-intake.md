---
title: Turn Meeting commitments into accountable Work
status: active
execution_modes: [source-contract, frozen, operated-v4]
production_mode: proposal-only
owner: KamdarAI
created_at: 2026-08-27
updated_at: 2026-08-27
tags: [kamdar, feature, meeting, work]
feature_id: FEAT-0010
feature_key: meeting.commitment-intake
system_id: SYS-0001
category: workflow
public: true
surfaces:
  - automations/meeting-commitment-intake.md
  - templates/meeting.md
  - templates/task.md
source_refs:
  - workspace.hermes.md
  - tickets/TASK-0014/ticket.md
evidence_refs:
known_limits: "Live provider creation requires a separately authorized operated run."
---

# Turn Meeting commitments into accountable Work

## Why it exists

Meeting commitments should enter the existing Work system with owners, dates,
and provenance instead of remaining as prose that Project reporting cannot
track.

## Trigger and inputs

One newly completed Meeting, its linked Project, and the People named in its
explicit Commitments section.

## Pipeline signature

```text
completed Meeting + linked Project/People + current Work index
  -> created Tasks + duplicates + blocked commitments + provider read-back
```

## Flow

```text
Meeting Commitments -> required-field gate -> task.md render -> dedupe -> create/read back
                              |
                              +-----------------------> blocked, no invented field
```

## State changes and artifacts

Each complete commitment may create one canonical Task. The Task preserves its
Meeting source, Project, owner, due date, and idempotency key. The Meeting is
not rewritten except for an optional linked Work view supplied by its template.

## Downstream application

Daily Project memory and Weekly reporting consume the created Work normally;
they do not need a second Meeting-specific task list.

## Failure modes

Missing owner, Project, action, due date, source relation, write authority, or
read-back blocks creation. General discussion, Decisions, and SOP observations
are not treated as commitments. An unchanged rerun is a duplicate.

## Proof contract

The workflow eval covers complete commitment creation, incomplete commitment
blocking, Task-template fidelity, source preservation, and rerun idempotency.
Database seeding is fixture setup and contributes no assertion.

## Example

A Meeting assigns Jun to publish the approved store banner pack by Friday. The
workflow creates one Task linked to the same Project and Meeting. A note saying
"consider improving the handoff" creates nothing.
