---
kind: skill-maintenance-audit
skill: daily-project-control
date: 2026-08-25
mode: interface-change
before_ref: proposal-only-control-plan
after_ref: direct-current-weekly-draft-control
status: structurally-verified
---

# Daily Project Control direct-Draft maintenance

## Change

The pipeline now consumes the current Weekly Draft and directly owns its PM
attention, Risks and blockers, and Cost impact anchors. It still emits the
same control-plan JSON and delegates messages only through the preferred-channel
dispatcher.

## Preserved constraints

- One supplied Daily context remains the only evidence input; no provider scan
  is introduced.
- Staleness, cost variance, owner route, and dispatch rules remain grounded.
- Decisions/SOPs, Project memory, final reports, direct sends, and provider
  reads remain outside this pipeline.

## New checks

- The Draft must be Draft state, match the current week, and expose all anchors.
- Source-keyed PM/Risk/Cost updates are atomic; duplicate content is zero-write
  and changed same-key content is conflict.
- The JSON plan distinguishes a local Draft outcome from a prepared or delivered
  channel result.

## Evidence

- Normal/hard/boundary eval suite: evals/evals.json.
- Direct-Draft deterministic proof: evals/filesystem/scripts/run-task0007-fixture-automation.mjs.
- Static package inspection: evals/filesystem/scripts/run-task0007-skill-evals.mjs.

## Remaining gate

Profile-backed calibration remains draft_unrun. A structural pass does not
claim a real channel send or live provider effect.
