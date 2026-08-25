---
title: Chase delayed work once, with context
status: active
execution_modes: [source-contract]
production_mode: proposal-only
owner: KamdarAI
created_at: 2026-08-21
updated_at: 2026-08-25
tags: [kamdar, feature, daily, outreach]
feature_id: FEAT-0003
feature_key: daily.project-control
system_id: SYS-0001
category: outreach
public: true
surfaces:
  - automations/daily-operating-update.md
  - automations/templates/current-weekly-draft.md
  - skills/daily-project-control/SKILL.md
  - skills/dispatch-employee-messages/SKILL.md
  - templates/person.md
source_refs:
  - workspace.hermes.md
  - tickets/TASK-0007/ticket.md
evidence_refs:
  - skills/daily-project-control/evals/evals.json
  - evals/filesystem/scripts/run-task0007-fixture-automation.mjs
known_limits: "No delivery adapter is shipped. Production employee contact remains proposal-only."
---

# Chase delayed work once, with context

Kamdar detects dated, stale, or blocked Work once from the Daily context. It
records its evidence-bound PM, risk, and cost findings in the current Weekly
Draft, then prepares one accountable-owner message through the preferred-channel
dispatcher.

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

    run_daily_project_control(context_diff_path, current_weekly_draft_path,
                              dispatch_mode = prepare, output_path)
      -> project-control-plan.json + same current Weekly Draft
         + channel dispatch result | no_finding | configuration_gap | conflict

[Daily Project Control](../../skills/daily-project-control/SKILL.md) owns the
control judgment and its nested
[preferred-channel dispatcher](../../skills/dispatch-employee-messages/SKILL.md).
Prepare makes no channel call; send can invoke only the selected channel skill.

## Flow

    one Daily context + current Weekly Draft
                     ↓
           daily-project-control
             ├→ PM attention + combined problem definitions in the same Draft
             └→ grouped message proposal → dispatcher → prepared / sent / blocked

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
directly. The dispatcher is the only communication boundary and returns a
prepared result by default or a safe channel receipt after an observed send.

## Failure modes

Healthy or fresh Work is no_finding. Missing dates, cause, cost inputs, owner,
approved route, or Draft becomes an explicit gap. The pipeline never invents a
message, provider URL, cost estimate, or contact endpoint.

## Proof contract

Local normal, hard, and boundary evals cover a dated blocked Work item with a
sourced MYR variance, an unapproved route with unknown cost, and healthy-work
suppression. The fixture proves direct Draft updates are idempotent and that no
message is sent in prepare mode.

## Example

One Work item is blocked for three days with a sourced MYR 300 variance. The
plan records the calculation, adds source-linked PM, risk, and cost entries to
the Draft, and proposes one request to the verified owner. If the approved
endpoint is missing, the finding remains useful but delivery is blocked.
