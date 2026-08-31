---
title: Build weekly reports from frozen Project Notes
status: active
execution_modes: [source-contract, private-local]
production_mode: proposal-only
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-31
tags: [company-os, feature, weekly, reporting]
feature_id: FEAT-0005
feature_key: weekly.report-finalization
system_id: SYS-0001
category: reporting
public: true
surfaces: [automations/weekly-operating-review.md, templates/project-week-notes.md, templates/weekly-report.md, templates/area-operating-rollup.md, templates/company-operating-rollup.md]
source_refs: [workspace.hermes.md, tickets/archive/TASK-0019/ticket.md]
evidence_refs: [tests/unit/schemas/test_weekly_and_meeting_contracts.py, tests/harness/evals/test_validate_eval_run.py]
known_limits: "Reports are locally canonical; authenticated provider copies and executive delivery remain separately gated."
---

# Build weekly reports from frozen Project Notes

## Why it exists

Produce one complete, reproducible weekly view from private accumulated notes
without rescanning raw Work or exposing intermediate management state.

## Trigger and inputs

Weekly receives the expected active Project index, every current-week Project
Notes file, prior reports, and targeted Person/SOP records.

## Pipeline signature

`all Project Notes -> freeze -> local reports/entity memory -> optional provider copies`

## Flow

Weekly locks the week, requires exactly one valid notes file for every active
Project, hashes the complete set, and writes one immutable freeze manifest.
Raw Work and Meetings are forbidden at this stage.

```text
all active Project Notes --freeze--> immutable weekly context
                                      |
                 +--------------------+------------------+
                 |                    |                  |
                 v                    v                  v
          Project reports      Employee / SOP      Issue / Decision
                 |
                 v
Area reports -> Company report -> approved outbound
```

## State changes and artifacts

The freeze manifest fixes the input set. Validated outputs include reports,
targeted entity updates, carry-forward instructions, and a consolidation
receipt after required read-back.

## Downstream application

Project reports cite source note keys; Area and Company reports cite downstream
reports rather than rescanning raw sources. Missing Project coverage blocks a
complete Company finalization. Prior Final reports remain immutable. Failed
projection leaves the frozen set retryable and persistent records unchanged.
Every Final report is written under the local week before an optional configured
Reports destination receives a one-way copy. A missing Reports binding is
local-only, not a configuration gap.

## Failure modes

Missing coverage, hash drift, tied divergent snapshots, invalid entity keys, or
version conflicts block the affected consolidation path.

## Proof contract

The reference automation and Weekly suites prove frozen input, report hierarchy,
cross-Project reducers, idempotent retry, and guarded application offline.

## Example

Project A and Project B notes for the same employee produce two Project reports
and one deduplicated Employee Memory update.

After guarded outputs validate and read back, Weekly writes the consolidation
receipt and initializes next week's unresolved items.
