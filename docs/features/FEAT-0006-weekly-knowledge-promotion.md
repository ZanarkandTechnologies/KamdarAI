---
title: Promote qualified knowledge to long-term memory
status: active
execution_modes: [frozen, private-local, operated-v4]
production_mode: proposal-only
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-31
tags: [company-os, feature, weekly, knowledge, promotion]
feature_id: FEAT-0006
feature_key: weekly.knowledge-promotion
system_id: SYS-0001
category: knowledge
public: true
surfaces:
  - automations/weekly-operating-review.md
  - templates/issue.md
  - templates/decision.md
  - templates/sop.md
source_refs:
  - workspace.hermes.md
  - tickets/archive/TASK-0006/data-model-gap-report.md
evidence_refs:
  - evals/weekly/suite.json
known_limits: "Local long-term memory is canonical; only a configured private destination may receive a one-way provider copy after local read-back."
---

# Promote qualified knowledge to long-term memory

The Company OS reviews candidates from the frozen all-Project Notes set and
promotes only evidence-backed Problems, Decisions, and employee workflows into
local long-term memory. Provider databases are optional secondary views, not
canonical memory.

## Why it exists

The company needs durable knowledge that can be found and reused, without
turning unverified notes or one-off observations into official policy.

## Trigger and inputs

Frozen Project Notes, source links, targeted existing destination records,
owner and approver authority, privacy/write policy, quality checks, and Project
relations. Weekly never rescans raw Work or Meetings.

## Pipeline signature

```text
promote_weekly_knowledge(candidates, authority, destination_records, project_relations)
  -> local Issue[] + Decision[] + EmployeeSOP[]
     + optional configured provider copies
```

`frozen` records the disposition. Local application writes the passed candidate
under `memory/`. `operated-v4` may copy it to an explicitly configured private
destination with a receipt; production remains proposal-only.

## Flow

```text
Project Notes candidate + source evidence
              │
              ▼
check future value, destination, dedupe, authority, privacy, and write policy
              │
              ▼
Promote | Duplicate | Monitor | Dismiss
              │
              ▼
Local Issue / Decision / Employee SOP memory
              │
       configured private copy only
```

## State changes and artifacts

- Records an explicit disposition and reason for every reviewed candidate.
- Creates one local canonical record only for an approved candidate, carrying
  its Project relations and source provenance. An Issue preserves the affected
  workflow step, dated Before/economics baseline, measurement gaps and next
  test. An employee SOP preserves the observed steps, timing/volume baseline,
  exceptions, controls, and improvement verification.
- Keeps unpromoted candidates in weekly report history with the exact gap.

## Downstream application

Problems become local Issue Memory; precedents become Decision Memory; repeated
workflows become local SOP Memory after review. Proprietary project-specific
facts remain in the immutable Project report history. Each promoted result
links to its source Projects and note keys.

A canonical Decision is deliberately rare. It must preserve future reuse value:
recurring customer handling, a Project operating standard, monetary or material
risk authority, a recurring cross-team tradeoff, or a costly-to-reverse
precedent. Weekly compares two or three real options, records the selected
option and accepted tradeoff, and preserves rationale, authority, consequences,
and the evidence threshold that would reopen it. Routine sequencing and next
actions remain `project_only` in the report.

## Failure modes

Missing authority, source quality, future value, relation, or dedupe result
blocks local promotion. Missing provider configuration means local-only; an
incomplete binding or failed private-destination proof blocks only the copy.
The automation never uses a report mention as proof that memory was written.

## Proof contract

`FEAT-0006` asserts one artifact and one destination result for each route,
correct template and Project relation, candidate disposition, source provenance,
and receipt-backed application only after gates pass.

## Example

The supplier variance becomes an Issue with a severity and containment owner;
the approved safety-stock tradeoff becomes a Decision; and a repeated
reconciliation sequence becomes a reviewed employee SOP candidate. The stock-format
constraint stays on the Project page with its Meeting source and review trigger.
