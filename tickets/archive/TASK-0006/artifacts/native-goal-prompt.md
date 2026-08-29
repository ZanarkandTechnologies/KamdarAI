---
kind: native-goal-prompt
ticket_id: TASK-0006
compiled_from_ticket_updated_at: 2026-08-21T22:15:00+08:00
approval: operator-approved-implementation-2026-08-21
---

/goal Run the following files as one Goal Packet.

Files:

- `tickets/TASK-0006/ticket.md`
- `tickets/TASK-0006/program.md`
- `tickets/TASK-0006/progress.md`
- `tickets/TASK-0006/ascii-prototype.md`
- `tickets/TASK-0006/seed-contract.md`
- `tickets/TASK-0006/data-model-gap-report.md`
- `evals/evals.json`
- `evals/filesystem/scripts/template-first-kamdar.mjs`
- `evals/filesystem/scripts/live-kamdar-poc.mjs`
- `evals/filesystem/ui/index.html`

Task: Complete only TASK-0006 Scope: In and Done conditions. The ticket's
external-send gate wins: no new Notion mutation, Gmail/Drive action, Telegram
send, or v2/v3 archive occurs without a later exact `operated-send` approval
written to `progress.md`.

Logging: Read `program.md`, then `ticket.md`, then only the latest 80 lines of
`progress.md`. Keep initial context at 300 lines where possible and block above
400. After every material phase append observation, evidence, learning,
decision, remaining_budget, and next_action to `progress.md`.

Metric: Use the ticket Done conditions and QA Strategy. Require deterministic
checks, read-only integration preflight, browser/ASCII comparison, independent
QA/evidence/visual review, demo, drift review, and completion review. Ground
Notion relation/view implementation in current official documentation.

After each turn: observe -> choose_next(objective, evidence, eligible_moves,
remaining_budget) -> execute | diagnose | report_now | request_feedback | stop
-> act -> verify -> write_back. Use `goal-drift-reviewer` at the mid-point and
before completion. Do not self-certify UI, integration, or completion claims.

Approval: Implementation is approved. Provider sends and live v4 mutations are
not approved until the exact payload/route/idempotency receipt is recorded.
