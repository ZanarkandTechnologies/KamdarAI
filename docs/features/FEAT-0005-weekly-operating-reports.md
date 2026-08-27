---
title: Turn the current Weekly Draft into an operating review
status: active
execution_modes: [source-contract, isolated-task0007-seed]
production_mode: proposal-only
owner: KamdarAI
created_at: 2026-08-21
updated_at: 2026-08-25
tags: [kamdar, feature, weekly, reporting]
feature_id: FEAT-0005
feature_key: weekly.report-finalization
system_id: SYS-0001
category: reporting
public: true
surfaces:
  - automations/weekly-operating-review.md
  - templates/current-weekly-draft.md
  - templates/weekly-report.md
  - templates/area-operating-rollup.md
  - templates/company-operating-rollup.md
source_refs:
  - workspace.hermes.md
  - tickets/TASK-0007/ticket.md
evidence_refs:
  - evals/filesystem/scripts/run-task0007-reference-automation.mjs
  - evals/filesystem/scripts/operate-task0007-notion-seed.mjs
known_limits: "Production report publication and executive delivery remain proposal-only."
---

# Turn the current Weekly Draft into an operating review

Kamdar turns the one current Weekly Draft into Project, Department, and Company
reports. The Draft is accumulated by Daily pipelines during the week; Weekly
reads it once and never re-synthesizes or edits its five anchors.

## Why it exists

Leadership needs a concise source-linked view of outcomes, open attention, and
problems worth solving. The hierarchy separates Project evidence from
Department and Company attention without copying raw Work into every report.

## Trigger and inputs

Weekly receives the current Draft and a canonical Project snapshot used only to
route known Project and Department relations. Missing routing remains a visible
gap; it does not trigger a Daily rescan or inferred relation.

## Pipeline signature

    WeeklyReviewResult + current Project Report Drafts
      -> finalized Project, Department, and Company reports
         | no_finding | configuration_gap | blocked

The [Weekly automation](../../automations/weekly-operating-review.md) owns report
rendering, promotion review, authorized publication, and delivery.

## Flow

    Daily owns source-keyed Draft entries
      Decisions / SOPs / PM / risks / cost
                       ↓
         current Weekly Draft, read only
                       ↓
    Project reports → Department reports → Company report
                       ↓
       reviewed promotion and delivery plans

## State changes and artifacts

- Renders a finalization plan and the Project to Department to Company Markdown
  hierarchy under the caller-owned output root.
- Every report item traces to a Draft source key. Department and Company
  rollups aggregate report references rather than raw Work or Meeting text.
- Proposed Decisions and SOPs remain Proposed until authority, recurrence,
  owner, proof, and destination review pass.
- The input Draft remains unchanged; final reports are immutable for that week.

## Downstream application

The source contract stops after local report rendering. The isolated TASK-0007
Notion seed can prove report-page publication with receipts, but it does not
publish the Draft itself and it does not authorize production writes.

## Failure modes

Missing or malformed Draft, absent Project routing, unresolved reporting
destination, or a Final target selected for mutation becomes a named gap.
Finalization never searches raw Daily sources to paper over missing input.

## Proof contract

The feature evals cover normal Draft finalization, unapproved Decision/SOP
candidates, and a missing Draft. The deterministic runner proves a direct
Draft rerun is zero-write and then produces the hierarchy. The isolated operator
proves guarded Project-memory application and four finalized report pages only.

## Example

Two Projects share the same current Draft. Weekly renders two Project reports,
one unassigned Department rollup when routing is missing, and one Company
report. The missing Department relation remains a source gap instead of an
invented assignment.
