---
title: Deliver the completed company review to the owner
status: active
execution_modes: [frozen, operated-v4]
production_mode: proposal-only
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-29
tags: [company-os, feature, weekly, distribution]
feature_id: FEAT-0008
feature_key: weekly.distribution
system_id: SYS-0001
category: distribution
public: true
surfaces:
  - automations/weekly-operating-review.md
  - templates/executive-distribution.md
  - templates/company-operating-rollup.md
source_refs:
  - workspace.hermes.md
  - tickets/archive/TASK-0006/data-model-gap-report.md
evidence_refs:
  - evals/weekly/suite.json
known_limits: "Only operated-v4 may send the finalized Company artifact to the resolved private eval Telegram route with a receipt; production delivery remains proposal-only."
---

# Deliver the completed company review to the owner

The Company OS turns the final Company report into one concise owner message and sends
it through the approved Telegram route only after all Project and Department
reports are complete.

## Why it exists

The owner needs a short, actionable company view with links to the detailed
report—not a flood of project-level messages or a draft presented as final.

## Trigger and inputs

Finalized Company report, its seven Department sections, approved owner route,
report link, payload hash, provider readiness, and idempotency key.

## Pipeline signature

```text
distribute_company_review(final_company_report, owner_route, provider_state, prior_receipts)
  -> executive_message_artifact + Telegram delivery receipt
```

`frozen` renders the exact executive artifact but never contacts Telegram.
`operated-v4` sends only the finalized hash-matched artifact to the resolved
private eval route and records the receipt; production remains proposal-only.

## Flow

```text
final Project reports → final Department rollups → final Company report
                                                    │
                                                    ▼
render executive-distribution Markdown with seven Department sections
                                                    │
                                                    ▼
verify owner route + payload hash + idempotency key
                                                    │
                                                    ▼
Telegram send receipt | blocked route | skipped duplicate
```

## State changes and artifacts

- Creates one executive-distribution Markdown artifact referencing the Company
  report.
- Records route key, report hash, provider message ID, timestamp, chat hash,
  and idempotency result after an approved send.

## Downstream application

Telegram sends the exact artifact only to the private, allowlisted Demo Owner
route. The owner follows the included report links for Project/Department detail.

## Failure modes

An incomplete report hierarchy, unresolved route, mismatched payload hash, or
reused idempotency key blocks or skips delivery. A Daily draft never counts as
this Weekly Company-report delivery.

## Proof contract

`FEAT-0008` asserts report-order preconditions, seven named Department sections,
approved route, report/payload hash match, redacted provider receipt, and a
second-run `skipped` result for the same action key.

## Example

After the weekly Company report is finalized, one owner Telegram message names
the main result, risks, owner attention, next priorities, and every Department
section with a link back to the report; it cannot send while any rollup is Draft.
