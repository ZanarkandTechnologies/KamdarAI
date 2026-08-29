---
ticket_id: TASK-0001
kind: native-goal-prompt
compiled_from_ticket_updated_at: 2026-08-21T13:24:48+08:00
approval: approved-by-operator-2026-08-21
---

# TASK-0001 native Goal launcher

```text
/goal Run the following files as one Goal Packet.
Files:
- tickets/TASK-0001/ticket.md
- tickets/TASK-0001/implementation-program.md
- tickets/TASK-0001/implementation-progress.md
- tickets/TASK-0001/ascii-prototype.md
- evals/evals.json
- templates/README.md
- workspace.hermes.md

Task: Complete only TASK-0001 Scope: In and Done conditions. Build and operate
the frozen, provider-free mock runner/UI; compare outputs to the ASCII and
repair concrete discrepancies. Scope: Out wins: no live schema, provider,
installer, or schedule mutation.

Logging: Read program.md first, then ticket.md, then only the latest 80 lines of
progress initially. After each material turn append observation, evidence,
learning, decision, remaining_budget, and next_action to implementation-progress.md.

Metric: Use the hybrid provider in implementation-program.md. Deterministic
assertions, ASCII comparison, and delegated QA/visual/agent/review judgment all
matter; a legacy POC score is not acceptance evidence.

After each turn: observe -> choose_next(objective, evidence, eligible_moves,
remaining_budget) -> execute | diagnose | report_now | request_feedback | stop
-> act -> verify -> write_back. Compare ticket/program after every material
turn. Use goal-drift-reviewer after the first end-to-end run and before
completion. Context gate: ticket + program + latest 80 progress lines; target
300, hard 400. At completion run QA evidence review, visual QA, agent QA,
narrated demo, completion review, and ticket/progress writeback. Include a
screenshot/image artifact in the final handoff.

Approval: approved-by-operator-2026-08-21.
```
