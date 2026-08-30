---
title: Append grounded operating knowledge to Project Notes
status: active
execution_modes: [source-contract, private-local]
production_mode: private-local
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-31
tags: [company-os, feature, daily, knowledge]
feature_id: FEAT-0004
feature_key: daily.knowledge-capture
system_id: SYS-0001
category: knowledge
public: true
surfaces: [automations/daily-operating-update.md, templates/project-week-notes.md, automations/weekly-operating-review.md]
source_refs: [workspace.hermes.md, tickets/TASK-0019/ticket.md]
evidence_refs: [tests/test_project_note_reducers.py]
known_limits: "Daily observes; Weekly alone promotes or changes persistent entities."
---

# Append grounded operating knowledge to Project Notes

## Why it exists

Capture useful operating signals once, near their source, while reserving
persistent entity changes for the complete Weekly evidence set.

## Trigger and inputs

Daily receives complete Work and Meeting evidence, artifact links, measured
timing when available, and explicit workflow identities.

## Pipeline signature

`Daily evidence -> knowledge_notes[] -> Project Notes -> Weekly disposition`

## Flow

Daily extracts source-backed Problems, inefficiencies, Decisions, and workflow
samples once, then appends them to the owning Project Notes file.

```text
complete Work + Meeting evidence
              |
              v
project_note_updates[].knowledge_notes[]
       | problem / decision / workflow_key
       v
private Project Notes
       |
       v Weekly only
Issue / Decision / SOP disposition
```

## State changes and artifacts

Daily creates immutable candidate notes. It does not update an Issue, Decision,
SOP, or approved baseline.

## Downstream application

A problem names the affected workflow step, dated measurement window, observed
time/wait/volume, sourced cost formula or explicit gap, confidence, and next
proof. A workflow sample needs an explicit stable `workflow_key`; one sample
never becomes a baseline. A Decision preserves choice, tradeoff, authority, and
review trigger. Weak or incomplete evidence remains a visible gap and is not
promoted automatically.

## Failure modes

Exact source revisions deduplicate; conflicting note identity leaves the
Project file unchanged.

## Proof contract

Reducer tests cover cross-Project workflow grouping, insufficient samples,
approval-gated baseline proposals, and conflict-safe updates.

## Example

Accepted catalogue exports in two Projects can share
`workflow_key: catalogue-export`; their sourced durations remain separate SOP
samples until Weekly evaluates them together.
