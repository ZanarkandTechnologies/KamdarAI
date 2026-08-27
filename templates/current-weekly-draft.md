---
artifact_type: kamdar-current-weekly-draft
artifact_version: "1.0.0"
week: "{{WEEK}}"
state: draft
draft_version: 0
last_updated: null
---

# Current Weekly Draft — {{WEEK}}

This template is the authored shape for the current-week Notion Report Draft.
Each Daily run reads that entire Report and the validated Daily Review JSON,
returns a complete replacement Report body, increments `draft_version` by
exactly one, and sets `last_updated` to the run timestamp. Preserve still-current
content and source IDs; do not append raw Work or Meeting transcripts.

## PM attention

List only interventions needing accountable follow-up this week. Each item needs
an owner, current state, due or review condition, exact ask, and source evidence.

<!-- GOLDEN EXAMPLE — replace every fact below.
### TASK-103 — confirm the supplier normalisation rule

- **Owner:** Jun Wong.
- **State:** Blocked for three calendar days; due 2026-08-26.
- **Why now:** The remaining store comparisons cannot finish until the rule is confirmed.
- **Ask:** Confirm the approved column map and revised completion time today.
- **Evidence:** [TASK-103](notion://TASK-103)
END GOLDEN EXAMPLE -->

No PM intervention yet.

## Problems and inefficiencies

Combine related problems, inefficiencies, risks, blockers, and cost consequences
into useful problem definitions. Include the affected workflow and step,
measurement window, observed condition, operating impact, recurrence/volume,
time and wait loss, cost formula only when sourced, confidence, measurement
owner/gaps, next proof, and evidence.

<!-- GOLDEN EXAMPLE — replace every fact below.
### Supplier formats prevent one reliable replenishment comparison

- **Problem:** Three supplier files use incompatible product and quantity columns, requiring the same manual remapping before every review.
- **Workflow / step:** Supplier replenishment comparison / normalise incoming count file.
- **Baseline:** W34; six files per week; 35 active rework minutes per affected file.
- **Impact / risk:** Five-store rollout approval is blocked and the remaining weekly comparison target is likely to slip by two days.
- **Cost consequence:** 6 × 35/60 × MYR 42 = MYR 147/week, using the approved loaded hourly-cost basis.
- **Confidence / gaps:** Medium; confirm the next two file timings before promotion.
- **Next proof:** Jun confirms the standard import map and Nur completes two remaining store comparisons by 2026-08-28.
- **Evidence:** [TASK-101](notion://TASK-101), [TASK-105](notion://TASK-105)
END GOLDEN EXAMPLE -->

No grounded problem definition yet.

## Decisions

Record decisions another person will need later: choice, rationale, alternatives
or tradeoff, authority, evidence, and review trigger. Mark unapproved candidates
as Proposed.

<!-- GOLDEN EXAMPLE — replace every fact below.
### Hold the five-store rollout until counts are normalised — Proposed

- **Choice:** Do not approve rollout until every supplier count uses the signed baseline format.
- **Reason / tradeoff:** A two-day delay is preferable to approving from incomparable counts.
- **Authority:** Not supplied; the weekly review must confirm the decision owner.
- **Review trigger:** Reconsider after the final two store comparisons are attached.
- **Evidence:** [Meeting 042](notion://MEETING-042), [TASK-105](notion://TASK-105)
END GOLDEN EXAMPLE -->

No grounded decision yet.

## SOPs

Record the current employee workflow even when it is informal, inefficient, or
not yet reusable. Include trigger, actors, ordered steps, systems, handoffs,
frequency/volume, active and waiting time, exceptions, output, evidence window,
confidence, and measurement gaps. Mark it Observed or Proposed until Weekly
confirms authority and reuse for canonical SOP promotion.

<!-- GOLDEN EXAMPLE — replace every fact below.
### Normalise supplier counts before rollout review — Proposed

- **Trigger:** A supplier count file is submitted for replenishment comparison.
- **Actors / systems:** Nur receives the supplier spreadsheet, normalises it in the approved workbook, and hands the comparison to Jun for review.
- **Ordered method:** Retain the original; map columns; validate totals; attach the normalised file; request review.
- **Output:** One traceable comparison-ready file.
- **Baseline:** Six files/week; 35 active minutes/file; wait time not yet measured.
- **Exceptions:** Unmapped product code returns to the supplier owner before comparison.
- **Reuse evidence:** Applied to three supplier files during W34; owner approval remains missing.
- **Evidence:** [TASK-105](notion://TASK-105)
END GOLDEN EXAMPLE -->

No grounded SOP yet.

## Draft receipt

- `daily_contexts:` none yet
- `source_gaps:` none yet
