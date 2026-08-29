# Native Goal Prompt — TASK-0003

```text
/goal Run the following files as one Goal Packet.
Files:
- tickets/TASK-0003/ticket.md
- tickets/TASK-0003/program.md
- tickets/TASK-0003/progress.md
- tickets/TASK-0002/ascii-prototype.md
- evals/evals.json
- evals/filesystem/scripts/template-first-kamdar.mjs
- evals/filesystem/ui/index.html
- evals/filesystem/tests/template-first-kamdar.test.mjs

First read program.md; it owns the executable loop policy. Then read ticket.md;
it owns the scope and proof contract. Read only the latest 80 lines of
progress.md initially. The ticket plus program plus progress must target 300
lines and never exceed 400; load the accepted ASCII or source files only for a
named evidence gap.

Task: Complete only TASK-0003 Scope: In and Done / Proof. Preserve the frozen,
provider-free boundary. Do not make a fake operated result link or add
assertions for currently unproved features merely to improve coverage.

Logging: append a compact structured progress receipt after each material turn.

Metric: satisfy the ticket's deterministic, browser/API, visual, independent
review, and demo proof route. Grounding is local-only because the work extends
existing vanilla HTML and Node code without new external APIs or dependencies.

After each turn: observe -> choose_next(objective, evidence, eligible_moves,
remaining_budget) -> execute | diagnose | report_now | request_feedback | stop
-> act -> verify -> write_back. Request an independent drift/review lane at the
ticket QA checkpoint. Before stop_complete, record QA evidence, browser capture,
demo, completion review, and packet-fresh ticket/progress links. If any gate is
missing or stale, revise or stop blocked rather than self-certifying.

Approval: approved by the operator on 2026-08-21; compiled from ticket
`updated_at: 2026-08-21T16:12:00+08:00`. Regenerate this packet if the ticket
scope or proof contract changes.
```
