---
ticket: TASK-0007
review_focus: architecture
reviewed_at: 2026-08-25
verdict: pass
overall_tas: TAS-A
rubrics_used:
  - spec-contract
  - integration-readiness
  - evidence-quality
---

# Daily Pipeline Architecture Review

## Summary

Verdict: revise before architecture acceptance.

The rewritten ticket matches the requested direction: one Daily evidence-only
collector, four focused Daily artifact skills, documentation message plans,
Project knowledge and weekly-attention diffs, Decisions/SOP candidates staged into the Weekly draft,
merged PM chasing/block-cost control, and Weekly finalization absorbing
next-week and executive report behavior.

The plan is not approval-ready yet because two implementation-critical
boundaries remain ambiguous enough to create duplicate scans or conflicting
Weekly draft writes.

## Search Scope

- `tickets/TASK-0007/ticket.md`
- `tickets/TASK-0007/architecture.md`
- neighboring feature/automation references for Daily scan, Weekly ownership,
  FEAT-0007/0008 absorption, and safety mode consistency

## Findings

### 1. Supplemental skill inputs can accidentally reintroduce duplicate scans

Severity: blocking for architecture acceptance.

Evidence:

- The collector is correctly specified as one bounded fetch that emits
  `daily-context-diff-YYYY-MM-DD.md` in `ticket.md`.
- Some skill signatures still accept separate live-looking inputs:
  `daily_project_memory(context_diff, project_record)`,
  `daily_project_control(context_diff, project_work_state, weekly_draft)`, and
  `finalize_weekly_review(current_weekly_draft, final_project_reports)`.

Why it matters:

The user's requested architecture depends on one Daily evidence collector.
If `project_record`, `project_work_state`, or `weekly_draft` can be fetched by
the artifact skill, implementers can recreate the old duplicate-scan problem
while still claiming each skill consumes `context_diff`.

Smallest repair:

State that every Daily artifact skill receives only collector-produced snapshots
or extracted files, never provider handles. Rename the signatures to make this
unambiguous, for example:

```text
daily_project_memory(context_diff, project_snapshot_from_context)
daily_project_control(context_diff, work_snapshot_from_context, weekly_draft_snapshot_from_context)
```

Add an acceptance check that artifact-skill tests fail on any provider read.

### 2. Multiple Weekly draft diffs have no deterministic ordering or conflict policy

Severity: blocking for architecture acceptance.

Evidence:

- `daily-weekly-report-contribution` emits `weekly-report-diff.md`.
- `daily-project-control` also emits a Weekly-report contribution inside
  `project-control-plan.json`.
- Both flow into `apply-weekly-report-diff`, but the ticket does not define
  section ownership, merge order, or duplicate/conflict handling.

Why it matters:

The Weekly draft is the single Daily accumulation point. Without stable section
anchors and merge ordering, a later integration can overwrite, duplicate, or
misplace evidence from another Daily artifact. That would make the architecture
look isolated at the skill layer but unreliable at the convergence point.

Smallest repair:

Define Weekly draft section ownership and ordering before implementation:

```text
daily-weekly-report-contribution -> Decisions / SOP staging sections
daily-project-control -> Risks / blockers / PM attention / cost-impact sections
apply-weekly-report-diff -> append by stable section anchor + source-id idempotency key
```

Also state whether `apply-weekly-report-diff` consumes the two diffs separately
in a fixed order or after an explicit merge artifact.

## Passed Checks

- No universal schema registry is introduced. JSON is scoped to local patch or
  contact-plan artifacts, while Markdown is used for inspectable evidence,
  message plans, and report diffs.
- The Daily collector is correctly automation-owned and evidence-only.
- Artifact skills are separated from integration skills, and provider effects
  remain behind identity, authority, idempotency, operating-mode, and receipt
  checks.
- Project knowledge and `This week's attention` are correctly separated:
  proprietary source-linked facts stay in the Project, while attention remains
  a weekly checklist.
- FEAT-0007 and FEAT-0008 are intentionally absorbed into Weekly finalization,
  not left as independent skills.
- Weekly promotion occurs after finalization, not during Daily capture.

## TAS

- `spec-contract`: TAS-B. The story and scope are coherent, but input and
  ordering boundaries still require implementer inference.
- `integration-readiness`: TAS-B. Safety posture is directionally strong, but
  the Weekly convergence edge and no-rescan boundary are under-specified.
- `evidence-quality`: TAS-B. This is an architecture review only; the ticket
  correctly defers fixture and operated-v4 proof to implementation.

## Next Action

Revise the ticket before approval by making two contract changes:

1. Declare all Daily skill inputs as collector-produced snapshots, with no
   provider reads allowed inside artifact skills.
2. Define Weekly draft section ownership, merge ordering, and idempotency for
   the two Daily paths that write Weekly-report diffs.

## Re-review Addendum

Reviewed again on 2026-08-24 after the two requested repairs.

Verdict: pass for architecture acceptance.

Updated TAS:

- `spec-contract`: TAS-A.
- `integration-readiness`: TAS-A for architecture acceptance.
- `evidence-quality`: TAS-A for architecture-review evidence; implementation
  proof remains correctly deferred to the ticket's Done/proof contract.
- Overall: TAS-A.

Prior blocker 1 is repaired. `ticket.md` now states that
`daily-context-diff-YYYY-MM-DD.md` contains named snapshots under stable
headings, that Daily artifact skills receive only this context file plus local
or static templates, and that provider preflight reads are allowed only inside
integration skills. The individual skill signatures were reduced to
`daily_project_memory(context_diff)`,
`daily_weekly_report_contribution(context_diff)`, and
`daily_project_control(context_diff)`, with Project, Work, and Weekly-draft
state read from embedded snapshots.

Prior blocker 2 is repaired. The ticket now defines a single ordered
`apply-weekly-report-diff` integration call after both Weekly contributors
finish. It assigns section ownership, applies knowledge before control, uses
`(weekly-draft ID, source ID, contribution kind)` as the idempotency key, and
returns `conflict` without overwriting on material disagreement. The architecture
diagram now also names "snapshots only; no provider handles" and "apply Weekly
draft once" with fixed order and conflict behavior.

Remaining approval blockers: none.

## 2026-08-25 final re-review — four Daily pipelines

This addendum supersedes the prior review's now-retired description of a
Weekly-draft snapshot inside the Daily collector and a shared Daily final-draft
application. The collector remains one Daily JSON context and contains no
Weekly target. A Daily contribution has a source-and-kind key; its guarded
child adds the verified draft ID only after narrow target preflight.

Verdict: pass. Overall TAS: TAS-A. No remaining architecture blocker.

- Daily directly calls exactly four semantic pipelines: Project memory,
  documentation quality, Project control, and Weekly-report contribution.
- Project memory owns Project knowledge/weekly-attention application;
  documentation and control own preferred-channel dispatch; the contribution
  pipeline owns its Decision/SOP-only current-draft staging child.
- Project control retains PM attention, risk/blocker, and cost evidence.
  Weekly reconciles those with already-staged Decision/SOP contributions, then
  finalizes reports and promotes reviewed candidates.
- `prepare` has no provider effect. The Daily automation names no raw
  integration call. Missing target/adapter/receipt and source-key conflicts
  remain safe non-write results.

Evidence reviewed: `automations/daily-operating-update.md`,
`automations/weekly-operating-review.md`, the two contribution packages,
`weekly-report-synthesis`, FEAT-0004, TASK-0007, and
`tests/test_daily_pipeline_skills.py`. The contract suite passed after the
reviewed correction.
