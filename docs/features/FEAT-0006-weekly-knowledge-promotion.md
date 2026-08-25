---
title: Promote only knowledge that earned a home
status: active
execution_modes: [frozen, operated-v4]
production_mode: proposal-only
owner: KamdarAI
created_at: 2026-08-21
updated_at: 2026-08-24
tags: [kamdar, feature, weekly, knowledge, promotion]
feature_id: FEAT-0006
feature_key: weekly.knowledge-promotion
system_id: SYS-0001
category: knowledge
public: true
surfaces:
  - automations/weekly-operating-review.md
  - templates/issue.md
  - templates/decision.md
  - templates/skill.md
source_refs:
  - workspace.hermes.md
  - tickets/TASK-0006/data-model-gap-report.md
evidence_refs:
  - evals/evals.json
known_limits: "Only operated-v4 may apply a reviewed canonical record in the eval root after authority, privacy, dedupe, and receipt checks; production remains proposal-only."
---

# Promote only knowledge that earned a home

Kamdar reviews every Daily candidate and promotes only evidence-backed Problems,
Decisions, and SOP/Skill signals to the correct canonical record.

## Why it exists

The company needs durable knowledge that can be found and reused, without
turning unverified notes or one-off observations into official policy.

## Trigger and inputs

Staged Daily candidates, source links, existing destination records, owner and
approver authority, privacy/write policy, quality checks, and Project relations.

## Pipeline signature

```text
promote_weekly_knowledge(candidates, authority, destination_records, project_relations)
  -> Work/Issue[] + Decision[] + Skill/SOP[]
     + Notion/wiki application
```

`frozen` records the disposition and proposed destination only. `operated-v4`
applies a passed candidate to the corresponding v4 record with a receipt;
production remains proposal-only.

## Flow

```text
staged candidate + source evidence
              │
              ▼
check future value, destination, dedupe, authority, privacy, and write policy
              │
              ▼
Promote | Duplicate | Monitor | Dismiss
              │
              ▼
Issue / Decision / Skill-SOP record + receipt
```

## State changes and artifacts

- Records an explicit disposition and reason for every reviewed candidate.
- Creates one mapped canonical record only for an approved candidate, carrying
  its Project relations and source provenance.
- Keeps unpromoted candidates in weekly report history with the exact gap.

## Downstream application

Problems become Issue records; precedents become Decisions; repeated workflows
become Skills/SOPs or wiki records after review. Proprietary project-specific
facts remain in the Project knowledge section, source-linked and reviewable,
until a later explicit wiki extraction proves cross-project reuse. Each promoted
result links to its source Projects.

## Failure modes

Missing authority, source quality, future value, destination, relation, privacy
approval, or dedupe result blocks promotion. The automation never uses a report
mention as proof that a canonical record was created.

## Proof contract

`FEAT-0006` asserts one artifact and one destination result for each route,
correct template and Project relation, candidate disposition, source provenance,
and receipt-backed application only after gates pass.

## Example

The supplier variance becomes an Issue with a severity and containment owner;
the approved safety-stock tradeoff becomes a Decision; and a repeated
reconciliation sequence becomes a reviewed SOP candidate. The stock-format
constraint stays on the Project page with its Meeting source and review trigger.
