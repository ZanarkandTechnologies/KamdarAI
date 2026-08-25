---
ticket_id: TASK-0005
kind: native-goal-prompt
compiled_from_ticket_updated_at: 2026-08-21T17:42:00+08:00
approval: approved-by-operator-2026-08-21
---

# TASK-0005 native Goal launcher

```text
/goal Run the following files as one Goal Packet.
Files:
- tickets/TASK-0005/ticket.md
- tickets/TASK-0005/program.md
- tickets/TASK-0005/progress.md
- tickets/TASK-0005/ascii-prototype.md
- evals/evals.json
- evals/filesystem/fixtures/template-first-kamdar/snapshot.json
- evals/filesystem/scripts/template-first-kamdar.mjs
- evals/filesystem/scripts/live-kamdar-poc.mjs
- evals/filesystem/ui/index.html
- workspace.hermes.md

Task: Complete only TASK-0005 Scope: In and Done / Proof. Preserve Scope: Out:
use the isolated v4 namespace only, never mutate real Kamdar records, and never
claim external delivery without its receipt.

Logging: Read program.md first, ticket.md second, and only the latest 80
progress lines initially. After each material turn append observation, evidence,
learning, decision, remaining_budget, and next_action to progress.md.

Metric: Satisfy the hybrid provider and ordered proof policy in program.md. The
ticket QA Strategy wins on conflict. Use independent QA, visual/evidence review,
and demo proof before completion.

After each turn: observe -> choose_next(objective, evidence, eligible_moves,
remaining_budget) -> execute | diagnose | report_now | request_feedback | stop
-> act -> verify -> write_back. Context gate: ticket + program + latest 80
progress lines; target 300, hard 400. Use goal-drift-reviewer after the first
end-to-end run and before completion. Record any result that cannot be
receipt-backed as PLANNED or BLOCKED.

Approval: approved-by-operator-2026-08-21.
```
