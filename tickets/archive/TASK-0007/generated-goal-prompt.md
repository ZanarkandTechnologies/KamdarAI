# Native Goal Launcher — TASK-0007

```text
/goal Run the following files as one approved Goal Packet.
Files:
- tickets/TASK-0007/ticket.md
- tickets/TASK-0007/program.md
- tickets/TASK-0007/progress.md

Load automation, seed, package, and proof files only through the named consumer
in `program.md`'s Reference Manifest.

Task: Complete only TASK-0007's source proof: isolated per-skill evals, one
fresh Notion-only seed root, bounded Daily/Weekly execution, receipt-backed
evidence, and independent review. Production, existing eval roots, provider
messaging, profile install, and HermesCorp are out of scope.

Logging: Read program.md first. Append a compact progress receipt before every
turn ends: observation, evidence, learning, decision, remaining_budget, and
next_action.

Metric: Use the program's hybrid provider—deterministic fixture evaluations,
isolated provider receipt, and independent reviewer. Never count self-review as
completion proof.

After each turn: observe -> choose_next(objective, evidence, eligible_moves,
remaining_budget) -> execute | diagnose | report_now | request_feedback | stop
-> act -> verify -> write_back.

Context gate: full ticket + program + latest 80 progress lines; target 300,
hard 400. Drift reviewer: goal-drift-reviewer after the eval batch and before
completion review. Approval: approved by the user's 2026-08-25 instruction.
Stop complete only when every program Completion Closure row is supported.
```
