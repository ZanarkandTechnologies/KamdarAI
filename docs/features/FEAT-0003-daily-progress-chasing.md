---
title: Chase delayed work once, with context
status: active
execution_modes: [source-contract]
production_mode: proposal-only
owner: KamdarAI
created_at: 2026-08-21
updated_at: 2026-08-26
tags: [kamdar, feature, daily, outreach]
feature_id: FEAT-0003
feature_key: daily.project-control
system_id: SYS-0001
category: outreach
public: true
surfaces:
  - automations/daily-operating-update.md
  - templates/current-weekly-draft.md
  - templates/person.md
source_refs:
  - workspace.hermes.md
  - tickets/TASK-0007/ticket.md
evidence_refs:
  - evals/filesystem/scripts/run-task0007-reference-automation.mjs
known_limits: "Fictional eval People have no personal endpoint. Isolated-eval delivery goes only to the operator-owned Telegram sink and never proves employee delivery."
---

# Chase delayed work once, with context

Kamdar detects dated, stale, or blocked Work once from the Daily context. It
records its evidence-bound PM, risk, and cost findings in the current Weekly
Draft, then prepares one accountable-owner message for direct Daily delivery.

## Why it exists

An owner needs a factual request tied to accountable Work, not an unexplained
progress message or several competing reminders. Leadership also needs the
same evidence in the Weekly review.

## Trigger and inputs

The Daily collector supplies Project, Work, and People-route snapshots in one
context JSON plus the current Weekly Draft. A finding needs dated evidence of
an overdue commitment, explicit blocker, or threshold breach; a status label
alone is not enough.

## Pipeline signature

    DailyReviewResult.weekly_progress_chases + knowledge_updates
      -> authorized message + current Report Draft update
         | no_finding | configuration_gap | conflict | blocked

The [Daily automation](../../automations/daily-operating-update.md) owns the
control judgment, Report Draft update, and authorized delivery boundary.

## Flow

    one Daily context + current Weekly Draft
                     ↓
           daily-project-control
             ├→ PM attention + combined problem definitions in the same Draft
             └→ grouped message proposal → Daily direct delivery
                                           → prepared / delivered / blocked

## State changes and artifacts

- Creates one project-control-plan JSON proposal.
- Directly source-key upserts PM attention and Problems and inefficiencies
  only. The latter combines problems, inefficiencies, risks, blockers, and
  sourced cost consequences. Equal content is a duplicate; a conflict leaves the
  whole local Draft batch unchanged.
- Calculates duration from named timestamps and cost only from recorded plan
  and actual values. Unsupported inputs stay unknown.
- Groups work by an approved preferred channel. A missing or unapproved route
  is blocked; it never chooses a fallback.

## Downstream application

The current Weekly Draft is local Markdown, so this pipeline updates it
directly. The Daily automation is the only communication boundary. It returns
a prepared result by default, `delivered_to_eval_sink` only when the direct
provider message ID and returned destination match the configured eval route.
Provider acceptance is neither employee delivery nor proof that the operator
saw it.

## Failure modes

Healthy or fresh Work is no_finding. Missing dates, cause, cost inputs, owner,
approved route, or Draft becomes an explicit gap. The pipeline never invents a
message, provider URL, cost estimate, or contact endpoint.

## Proof contract

Local normal, hard, and boundary evals cover a dated blocked Work item with a
sourced MYR variance, an unapproved route with unknown cost, and healthy-work
suppression. The unified source-safe case requires one Aisha chase to be routed
only after Person lookup and represented as an eval-sink delivery with an exact
payload hash, provider message ID, and destination-bound route match, never as
employee delivery or human-visible receipt. A real operated claim additionally
requires the matching private Telegram receipt;
the committed `example.test` golden is only the expected contract. Prepare mode
still proves zero message sends.

## Example

One Work item is blocked for three days with a sourced MYR 300 variance. The
plan records the calculation, adds source-linked PM, risk, and cost entries to
the Draft, and proposes one request to the verified owner. If the approved
endpoint is missing, the finding remains useful but delivery is blocked.
