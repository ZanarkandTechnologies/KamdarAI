---
title: Company OS feature docs
status: active
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-31
refs:
  - ../systems/company-os.md
  - ../../automations/README.md
  - ../../evals/daily/suite.json
  - ../../evals/weekly/suite.json
---

# Company OS feature docs

Each `FEAT-*` page describes one Company OS capability and links it to proof.
The [Company OS system spec](../systems/company-os.md) explains how the
capabilities work together. Automation files define cadence and procedure.
The Daily and Weekly eval suites contain the runnable assertions and identify
the feature proved by each case.

One Daily run reads the defined source window once and appends source-linked
observations to one private Project Notes file per active Project. One Weekly
run freezes the complete set, builds reports and persistent entity projections,
then carries unresolved notes forward. Feature boundaries organize behavior
and proof; they do not create extra scans or schedules.

## Required feature contract

Every feature page contains these sections in this order:

```text
Why it exists → Trigger and inputs → Pipeline signature → Flow → State changes and artifacts
→ Downstream application → Failure modes → Proof contract → Example
```

`Pipeline signature` declares the function-shaped boundary for the feature:
inputs, outputs, and its downstream application. `Flow` is the one ASCII
explanation a buyer can expand from the UI.
The registry and assertions resolve the document through their existing
`feature_id`; they do not duplicate its buyer-facing summary.

```text
assertion.feature_id → feature registry doc path → feature Markdown
                                                ├─ render explanation + signature + Flow
                                                └─ group records/files/behavior/receipts
```

## Operating modes

Every feature supports the same source-of-truth distinction:

| Mode | Meaning |
| --- | --- |
| `frozen` | Local deterministic evidence only. It performs no network or external write. |
| `operated-v4` | Applies the reviewed effect only to the isolated client reference environment and resolved private eval routes, then preserves redacted receipts. |
| production | Remains proposal-only. It is not selected by the operated eval command. |

Feature pages may describe an intended downstream system, but a provider is
`applied` or `sent` only when the operated-v4 receipt proves it. A Markdown
artifact, draft, or frozen receipt is not external delivery proof.

## Feature map

| ID | Feature | Cadence | Current proof state |
| --- | --- | --- | --- |
| `FEAT-0001` | [Append current Work to Project Notes](FEAT-0001-daily-project-memory.md) | Daily | Per-Project append, dedupe, conflict, and freeze proof |
| `FEAT-0002` | [Ask for the missing information](FEAT-0002-daily-documentation-quality.md) | Daily | Type-specific field request and Work comment proof |
| `FEAT-0003` | [Follow up on delayed or blocked Work](FEAT-0003-daily-progress-chasing.md) | Daily | Private Project evidence plus an approved owner route |
| `FEAT-0004` | [Append grounded operating knowledge](FEAT-0004-daily-knowledge-candidate-capture.md) | Daily | Source-linked workflow samples, problem baselines or owned gaps, and Decisions in Project Notes |
| `FEAT-0005` | [Build weekly reports from frozen Project Notes](FEAT-0005-weekly-operating-reports.md) | Weekly | Project → Department → Company reports |
| `FEAT-0006` | [Promote qualified knowledge to long-term memory](FEAT-0006-weekly-knowledge-promotion.md) | Weekly | Authority-gated local Employee/SOP/Decision/Issue Memory with optional private provider copies |
| `FEAT-0007` | [Carry unresolved Project Notes into next week](FEAT-0007-weekly-next-week-planning.md) | Weekly | Consolidation-gated next-week initialization without Work mutation |
| `FEAT-0010` | [Turn Meeting commitments into accountable Work](FEAT-0010-meeting-commitment-intake.md) | Event workflow | Explicit Meeting commitments become canonical, deduplicated Task records |
| `FEAT-0011` | [Install and verify the Company OS from one entry point](FEAT-0011-seamless-deployment-and-verification.md) | Install / update | Implemented local contract; clean Windows/Notion/Cloudflare operation pending |

## Update rule

1. Change the owning feature page when the capability contract changes.
2. Change the system page when feature membership or cross-feature flow changes.
3. Change the automation file when cadence, procedure, or write authority changes.
4. Tag each eval row with exactly one `feature_id`; the UI groups `records`,
   `files`, `behavior`, and `applications/receipts` beneath the resolved doc.
   Do not split source reads to match UI groups.
5. Run the repository tests listed in the root README.

The active product registry contains eight ROI-bearing workflows plus one
in-progress deployment platform capability. Delivery is
an optional integration after the Company report; safety, receipts, and rerun
behavior are acceptance requirements on every workflow rather than features.
