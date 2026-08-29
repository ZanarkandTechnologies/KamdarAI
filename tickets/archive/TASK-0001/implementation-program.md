---
kind: goal-program
ticket_id: TASK-0001
status: complete
created_at: 2026-08-21T13:21:32+08:00
compiled_from_ticket_updated_at: 2026-08-21T13:24:48+08:00
generated_prompt: tickets/TASK-0001/artifacts/implementation-goal-prompt.md
approval: approved-by-operator-2026-08-21
completed_at: 2026-08-21T14:05:00+08:00
---

# TASK-0001 implementation Goal Program

## Mode and boundary

- `mode:` `completed_goal`
- `trigger:` explicit operator request to implement, run, compare, and repair
- `budget:` no numeric budget supplied; use native Goal without a token budget
  and stop only at the defined completion/block conditions
- `authority:` local source, ignored frozen-run outputs, and local UI only
- `forbidden:` live Notion/Drive/Gmail/Telegram writes, database creation,
  installer apply, schedules, credential/session changes, and deletion outside
  ignored generated run roots

## Metric and provider

- `provider:` hybrid — deterministic `evals/evals.json` assertion verdicts,
  ASCII-to-artifact comparison, and independent QA/visual/agent/review judgment
- `success:` every declared file and behavior assertion passes; the known Drive
  absence is rendered as an observed source gap rather than invented evidence
- `guards:` fixture is sanitized; templates are read from `templates/`; Daily
  precedes Weekly; outputs stay under ignored run roots; final reports immutable
- `anti_metrics:` a green legacy 37-check POC, assertion count without ASCII
  comparison, synthetic template text, or provider activity

## Decision backbone

`observe -> choose_next(objective, evidence, eligible_moves, remaining_budget) -> execute | diagnose | report_now | request_feedback | stop -> act -> verify -> write_back`

Prefer the smallest failing assertion or ASCII discrepancy. Use `lean-check`
before adding code. Use `goal-drift-reviewer` after the first end-to-end run and
before completion; regenerate this packet if ticket, suite, or proof scope drifts.

## Critical path and proof

1. Validate the fixture/template registry and the `evals/evals.json` schema.
2. Run Daily; inspect Project evidence, hidden Meeting extraction, follow-up
   proposals, the known source gap, and no-write receipt.
3. Run Weekly from Daily output; inspect one modified Project draft, one created
   Project report, Area rollups, Company rollup, and final-report immutability.
4. Score the root assertion contract and render its rows in the local UI.
5. Compare generated files, expanded content, trace, gaps, and UI states to
   `ascii-prototype.md`; repair/re-run until the provider is satisfied.
6. Capture `qa-tester`, `visual-qa`, `agent-qa-test`, narrated `demo`, drift,
   and independent completion review evidence before completion.

## Context and logging

- First load: full ticket, full program, and latest 80 lines of progress only.
  Target 300 lines; hard block above 400 until duplicated context is compacted.
- After every material turn append `observation`, `evidence`, `learning`,
  `decision`, `remaining_budget`, and `next_action` to implementation progress.
- Grounding: local-only implementation; templates, ASCII, and current harness
  are the maintained source of truth. No external dependency/API choice is in
  scope.

## Stop conditions

- `complete_when:` all ticket Done conditions, critical-path proof, visual
  screenshot, QA/agent/review evidence, demo, and completion review pass.
- `stop_now:` external provider mutation, scope expansion, secret exposure,
  unexpected writes outside ignored runs, or template/assertion divergence that
  requires an unapproved product decision.
- `blocked_when:` the same non-inferable blocker persists for three Goal turns
  after safe diagnosis; record the exact missing decision/evidence.
- `check_in_program:` not applicable — this is immediate implementation work.
