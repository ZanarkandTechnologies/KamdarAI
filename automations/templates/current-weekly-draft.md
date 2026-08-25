---
artifact_type: kamdar-current-weekly-draft
artifact_version: "0.2.0"
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
into useful problem definitions. Include the observed condition, operating
impact, evidence, recurrence, next proof, and monetary basis only when sourced.

<!-- GOLDEN EXAMPLE — replace every fact below.
### Supplier formats prevent one reliable replenishment comparison

- **Problem:** Three supplier files use incompatible product and quantity columns, requiring the same manual remapping before every review.
- **Impact / risk:** Five-store rollout approval is blocked and the remaining weekly comparison target is likely to slip by two days.
- **Cost consequence:** MYR 1,800 actual against MYR 1,500 planned; +MYR 300, based on recorded TASK-101 values.
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

Record reusable methods with their trigger, steps, output, owner or approval
state, and evidence that the method worked or recurred. Mark candidates as
Proposed until weekly review confirms reuse and ownership.

<!-- GOLDEN EXAMPLE — replace every fact below.
### Normalise supplier counts before rollout review — Proposed

- **Trigger:** A supplier count file is submitted for replenishment comparison.
- **Method:** Retain the original, map its columns to the signed baseline, validate totals, and attach the normalised file to the Work item.
- **Output:** One traceable comparison-ready file.
- **Reuse evidence:** Applied to three supplier files during W34; owner approval remains missing.
- **Evidence:** [TASK-105](notion://TASK-105)
END GOLDEN EXAMPLE -->

No grounded SOP yet.

## Draft receipt

- `daily_contexts:` none yet
- `source_gaps:` none yet
