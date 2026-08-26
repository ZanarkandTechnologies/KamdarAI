---
title: Accumulate workflow and problem baselines in the Weekly Draft
status: active
execution_modes: [source-contract]
production_mode: proposal-only
owner: KamdarAI
created_at: 2026-08-21
updated_at: 2026-08-25
tags: [kamdar, feature, daily, knowledge]
feature_id: FEAT-0004
feature_key: daily.knowledge-capture
system_id: SYS-0001
category: knowledge
public: true
surfaces:
  - automations/daily-operating-update.md
  - automations/templates/current-weekly-draft.md
  - skills/daily-knowledge-capture/SKILL.md
  - automations/weekly-operating-review.md
  - skills/weekly-report-finalization/SKILL.md
source_refs:
  - workspace.hermes.md
  - tickets/TASK-0007/ticket.md
evidence_refs:
  - skills/daily-knowledge-capture/evals/evals.json
  - evals/filesystem/scripts/run-task0007-fixture-automation.mjs
known_limits: "Daily writes only its local Markdown anchors. It does not promote knowledge or call a provider."
---

# Accumulate grounded knowledge in the Weekly Draft

Kamdar extracts source-backed Decisions, current employee workflow observations,
and measurable problem baselines from Daily Work and Meeting context. It writes
them into the supplied current Weekly Draft. A workflow may be observed before
it is approved or reusable; Weekly owns promotion into canonical SOP and Issue
records.

## Why it exists

Important choices and repeatable methods otherwise disappear inside Work items.
The Draft is a small, source-keyed weekly accumulation record, not a second
wiki or a review queue.

## Trigger and inputs

The one Daily collector supplies complete Work and embedded Meeting snapshots.
The pipeline receives the already-created current Draft for that week. It does
not scan for another Draft or call a provider.

## Pipeline signature

    capture_daily_knowledge(context_diff_path, current_weekly_draft_path)
      -> same current_weekly_draft_path | applied | duplicate | conflict |
         no_finding | configuration_gap

[Daily Knowledge Capture](../../skills/daily-knowledge-capture/SKILL.md) owns
Decisions and SOPs only. It uses the shared
[current Draft template](../../automations/templates/current-weekly-draft.md).

## Flow

    complete Daily Work + Meeting snapshots
                     ↓
    Daily context → daily-knowledge-capture
                     ↓
    current Weekly Draft, same file
      Decisions + SOPs source-keyed entries
                     ↓
    Weekly finalization reads it; promotion remains review-gated

## State changes and artifacts

- Writes only the supplied local current Weekly Draft Markdown file.
- A Decision needs a concrete choice plus an alternative or tradeoff. A workflow
  observation needs trigger, actors, ordered steps, systems/handoffs, timing and
  volume or explicit measurement gaps, output, evidence window, and confidence.
  Reuse and authority are Weekly promotion gates, not Daily observation gates.
- A problem baseline names the affected workflow step, measurement window,
  recurrence/volume, time or wait loss, direct-cost formula when grounded,
  confidence, measurement owner, and any missing measurements.
- Entries use decision:source_id or sop:source_id. Equal content is a
  duplicate; changed content under the same key is a conflict with no partial
  file update.
- Missing authority, owner, recurrence, or proof stays visible as a Proposed
  review gap.

## Downstream application

Weekly finalization reads the completed Draft and builds the Project to
Department to Company hierarchy. It never re-extracts Daily evidence or writes
these anchors again. Promotion is a separate reviewed step.

## Failure modes

A generic suggestion, weak recurrence, absent complete evidence, wrong-week
Draft, missing Draft, or material source-key conflict becomes no_finding,
configuration_gap, or conflict. No generic Docs/Research record, provider
receipt, message, or promotion is created.

## Proof contract

Normal, hard, and boundary evals cover a grounded Decision/SOP pair, a weak
idea that must not pollute the Draft, and a missing Draft. The deterministic
fixture proves a source-keyed zero-write rerun before Weekly reads the same
file.

## Example

A Meeting says not to approve a rollout until supplier counts are normalised,
and two Work items show the same comparison failure. Daily writes one Proposed
Decision and one Proposed SOP into the current Draft. Their authority and proof
gaps remain explicit until Weekly review.
