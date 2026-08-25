---
kind: goal-program
ticket_id: TASK-0003
status: complete
created_at: 2026-08-21T15:05:00+08:00
compiled_from_ticket_updated_at: 2026-08-21T16:12:00+08:00
generated_prompt: tickets/TASK-0003/artifacts/native-goal-prompt.md
approval: operator-approved-2026-08-21
---

# TASK-0003 Goal Program

## Goal Mode

- `mode:` `active_goal`
- `trigger:` native Goal over one approved local UI implementation ticket
- `files:` ticket, program, latest progress, accepted ASCII, eval contract,
  runner, UI, and focused tests
- `budget:` no numerical budget supplied; continue only while an unresolved
  Done condition has an executable local check

## Metric Provider

- `provider:` hybrid — deterministic frozen scenario plus independent
  implementation/evidence and browser-visible review
- `direction:` ticket Done / Proof passes without implying unproved feature or
  provider success
- `guards:` no provider call, no external write, no new dependency, no fake
  result link, no live source mutation, no unapproved scope expansion
- `anti_metrics:` total assertion count, raw tool trace visibility, or visual
  polish without feature-level evidence

## Decision Backbone

`observe -> choose_next(objective, evidence, eligible_moves, remaining_budget) -> execute | diagnose | report_now | request_feedback | stop -> act -> verify -> write_back`

Use the first unresolved Done condition whose evidence can be obtained locally.
When a test, browser state, or review contradicts the ticket, diagnose and
repair only the named seam; do not compensate with a fake passing state.

## Proof Policy

- `critical_path:` contract metadata → feature-aware frozen trace → grouped UI
  and showcase → focused tests → frozen server/API run → browser expansion and
  screenshots → independent QA/visual/evidence review → demo capture →
  completion review
- `proof_weight:` deterministic eval + API/browser sanity + visual evidence +
  independent QA/review + concise demo capture
- `self_certification:` prohibited for final evidence and completion

## Context / Logging

Initial load is full ticket/program plus the latest 80 progress lines; target
300 lines and hard-block above 400. Read the ASCII and source files only for a
named implementation or evidence need. At each material phase append
`observation`, `evidence`, `learning`, `decision`, `remaining_budget`, and
`next_action` to `progress.md`. Recompile this packet if ticket scope, QA, or
proof policy changes.

## Stop Conditions

- `complete_when:` every Done / Proof checkbox passes, current packet matches
  the ticket, and required independent receipts exist.
- `stop_now:` a provider call/write is requested, source metadata is unsafe to
  expose, an external result link would be invented, or scope shifts into new
  automation behavior.
- `blocked_when:` the same non-inferable source or tool gap prevents an
  executable local proof across three Goal turns.

## Final Checkpoint

Run ordered local checks, browser/API evidence, independent QA/visual review,
demo capture, drift/completion review, and ticket/progress writeback before
`stop_complete`. Grounding is local-only because this change uses existing
vanilla HTML/Node surfaces and introduces no external API or library.
