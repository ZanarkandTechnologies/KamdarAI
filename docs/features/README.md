---
title: Kamdar feature docs
status: active
owner: KamdarAI
created_at: 2026-08-21
updated_at: 2026-08-21
refs:
  - ../systems/kamdar-company-os.md
  - ../../automations/README.md
  - ../../evals/daily/suite.json
  - ../../evals/weekly/suite.json
---

# Kamdar feature docs

Each `FEAT-*` page owns one buyer-visible capability of the Kamdar manager and
is the canonical explanation rendered above that feature's grouped proof. The
[Kamdar Company OS system spec](../systems/kamdar-company-os.md) owns how the
features run together; automation files own cadence and procedure;
The Daily and Weekly eval suites own runnable assertions and tag each case with
the feature it proves.

One Daily run reads the bounded source window once and produces several feature
outcomes. Its knowledge and control pipelines directly accumulate disjoint,
source-keyed anchors in one current Weekly Draft. One Weekly run reads that
Draft, builds reports, and prepares reviewed promotions. Feature boundaries
organize behavior and proof; they do not create extra scans or schedules.

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
| `operated-v4` | Applies the reviewed effect only to the isolated Kamdar AI · Eval Demo v4 root and resolved private eval routes, then preserves redacted receipts. |
| production | Remains proposal-only. It is not selected by the operated eval command. |

Feature pages may describe an intended downstream system, but a provider is
`applied` or `sent` only when the operated-v4 receipt proves it. A Markdown
artifact, draft, or frozen receipt is not external delivery proof.

## Feature map

| ID | Feature | Cadence | Current proof state |
| --- | --- | --- | --- |
| `FEAT-0001` | [Keep Project pages current](FEAT-0001-daily-project-memory.md) | Daily | Project record patch and Meeting commitment proposals |
| `FEAT-0002` | [Ask for the missing information](FEAT-0002-daily-documentation-quality.md) | Daily | Type-specific field request and Work comment proof |
| `FEAT-0003` | [Chase delayed work once](FEAT-0003-daily-progress-chasing.md) | Daily | Direct PM/risk/cost Draft entries plus grouped owner outreach |
| `FEAT-0004` | [Accumulate workflow and problem baselines](FEAT-0004-daily-knowledge-candidate-capture.md) | Daily | Source-linked current-workflow observations, measurable problem baselines or owned gaps, and Decisions in the current Weekly Draft |
| `FEAT-0005` | [Company operating review](FEAT-0005-weekly-operating-reports.md) | Weekly | Project → Department → Company reports |
| `FEAT-0006` | [Promote earned knowledge](FEAT-0006-weekly-knowledge-promotion.md) | Weekly | Authority-gated employee SOP promotion to the existing SOPs database and problem promotion to Issues in existing Work |
| `FEAT-0007` | [Carry commitments into next week](FEAT-0007-weekly-next-week-planning.md) | Weekly | Canonical Project and Work updates |
| `FEAT-0010` | [Turn Meeting commitments into accountable Work](FEAT-0010-meeting-commitment-intake.md) | Event workflow | Explicit Meeting commitments become canonical, deduplicated Task records |

## Update rule

1. Change the owning feature page when the capability contract changes.
2. Change the system page when feature membership or cross-feature flow changes.
3. Change the automation file when cadence, procedure, or write authority changes.
4. Tag each eval row with exactly one `feature_id`; the UI groups `records`,
   `files`, `behavior`, and `applications/receipts` beneath the resolved doc.
   Do not split source reads to match UI groups.
5. Run the repository tests listed in the root README.

The active product registry contains eight ROI-bearing workflows. Delivery is
an optional integration after the Company report; safety, receipts, and rerun
behavior are acceptance requirements on every workflow rather than features.
