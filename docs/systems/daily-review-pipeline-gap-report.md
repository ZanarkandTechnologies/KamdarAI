---
title: Daily Project Review pipeline gap report
status: proposed
owner: KamdarAI
created_at: 2026-08-25
system_id: SYS-0001
feature_refs:
  - FEAT-0001
  - FEAT-0002
  - FEAT-0003
  - FEAT-0004
refs:
  - ../../automations/daily-operating-update.md
  - ../../docs/features/FEAT-0001-daily-project-memory.md
  - ../../docs/features/FEAT-0002-daily-documentation-quality.md
  - ../../docs/features/FEAT-0003-daily-progress-chasing.md
  - ../../docs/features/FEAT-0004-daily-knowledge-candidate-capture.md
  - kamdar-test-seed-caseboards.md
---

# Daily Project Review pipeline gap report

## Target

One bounded daily review should reconcile Project progress, request only the
information that is necessary, chase threatened weekly targets, and extract
reusable learning without duplicate messages or competing writers.

```text
run_daily_project_review(context, weekly_draft, mode = prepare)
  -> Project patch + consolidated outreach plan + learning ledger + receipt
```

## Current contract

The Daily automation calls four independent pipelines. FEAT-0001 patches the
Project body; FEAT-0002 prepares documentation requests for changed Work;
FEAT-0003 prepares owner follow-up for stale or blocked Work and writes PM,
risk, and cost anchors to the Draft; FEAT-0004 extracts Decision/SOP material
to that same Draft.

## Gaps

| Area | Status | Severity | Why it misses the intended behavior | Fix owner |
| --- | --- | --- | --- | --- |
| FEAT-0001 Project reconciliation | weak | important | The current case has only a generic context/action pair, not a dated weekly target checklist, linked work evidence, prior-day state, or a named blocker history. | Project template, collector, seed, skill, eval |
| FEAT-0002 completion quality | misplaced | blocker | It asks for mapped-field gaps in all changed Work. It cannot distinguish a completed ticket with an unsupported decision from a merely sparse Note. | Work templates, collector, seed, skill, eval |
| FEAT-0003 weekly delivery control | missing | blocker | It detects stale Work, but cannot forecast a Project target miss because targets are not linked to Work or measured against time remaining. | Project body contract, collector, seed, skill, eval |
| FEAT-0004 learning capture | ambiguous | important | It extracts directly from raw Daily evidence and has no completion-quality handoff for missing rationale, outcome, evidence, or recurrence. | learning skill, weekly contract, seed, eval |
| Composition | overbroad | blocker | FEAT-0002 and FEAT-0003 can contact the same person about the same record; FEAT-0003 and FEAT-0004 independently mutate adjacent weekly state. | daily orchestrator and shared outreach/draft batch |

## Recommended boundary

Keep the feature IDs and focused evals. Stop scheduling them as separate
top-level pipelines. Run them as ordered phases of one **Daily Project Review**
with one message planner and one local commit batch.

```text
Daily context
  ├─ 1. FEAT-0001: reconcile Project knowledge, weekly checklist, blockers
  ├─ 2. FEAT-0002: quality-gate Work completed today; ask semantic questions
  ├─ 3. FEAT-0003: forecast weekly-target delivery; chase accountable owners
  └─ 4. FEAT-0004: extract Problem / Decision / Inefficiency / SOP candidates
                                  only from quality-sufficient evidence
                                      ↓
               one Project patch + one consolidated outreach plan
                       + one daily learning / Weekly-Draft batch
```

| Feature | Inputs and exclusive output | Does not own |
| --- | --- | --- |
| FEAT-0001 | Prior Project body; changed Work/Meetings; writes Project `Project knowledge`, checked/added weekly targets, and named blocker/review state. | Messaging or generic task copies |
| FEAT-0002 | Only Work that transitioned to Done in the local day; writes precise completion-quality questions. | Stale-work chasing or learning promotion |
| FEAT-0003 | Project target checklist linked to Work, current progress, dates, and time remaining; writes delivery-risk follow-up intents. | Documentation-quality questions |
| FEAT-0004 | Quality-sufficient Done-today records; writes source-linked learning candidates. Insufficient evidence hands off to FEAT-0002. | Independent chasing or promotion |

## Required seed shape

For the primary Project, seed five dated weekly targets, each linked to Work;
one already completed with source evidence, one completed today but missing
decision rationale, one stalled with an explicit blocker, one progressing too
slowly for week end, and one healthy control. Seed prior-day Project body text,
full Work bodies, status-transition timestamps, ownership/routes, and a daily
learning ledger/Draft baseline. The private overlay continues to replace only
Project names and Departments with the approved scrape-derived values.

## Verification

- FEAT-0001 checks off only the target proven complete, adds the new target,
  and updates a sourced blocker/review item.
- FEAT-0002 asks a completed-ticket owner for the missing decision rationale at
  its exact page section; a complete ticket produces no request.
- FEAT-0003 forecasts the target miss and adds one recovery question, not a
  duplicate FEAT-0002 question.
- FEAT-0004 emits candidates only after the quality gate passes; otherwise it
  records a handoff.
- A combined-run eval proves one owner receives one consolidated outreach item
  and the batch is conflict-safe and idempotent.

Grounding: local feature contracts, skills, templates, collector schema, and
eval configuration. No external source is needed for this repository-internal
workflow decision.
