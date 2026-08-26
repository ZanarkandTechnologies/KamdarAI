# TASK-0011 Native Goal Prompt

/goal Run the listed files as one Goal Packet.

Files:
- tickets/TASK-0011/ticket.md
- tickets/TASK-0011/program.md
- tickets/TASK-0011/progress.md
- tickets/TASK-0011/design.md

Task: Complete only TASK-0011 Scope: In and Done. Read `program.md` first; it owns execution order, metric, drift, and stops. The ticket owns scope and proof. The design owns customer-visible copy and behavior.

Logging: Read only the latest 80 lines of `progress.md` initially. Before ending each turn append observation, evidence, learning, decision, remaining_budget, and next_action.

Metric: Evaluate with the hybrid provider before writeback: unchanged deterministic assertions, packet/hash-bound judges and artifact reviews, integration/idempotency proof, full tests, operated UI evidence, visual QA, demo, and independent completion review. Ticket QA wins on conflict.

After each turn: `choose_next(objective, evidence, eligible_moves, remaining_budget) -> execute | diagnose | report_now | request_feedback | stop`, then act, verify, and write back. Use `goal-drift-reviewer` after Change 4 and before completion review. Execute implied repairs directly; do not weaken an assertion, invent a grade, combine deployments, or hide a failure.

Context gate: ticket + program + latest 80 progress lines; target 300, hard 400. Load design and older evidence only for a named node or gap.

Completion: ordered sanity checks -> complete judged run -> full tests -> QA evidence review -> narrated lead-engineer demo MP4 -> ticket-scoped response draft -> completion review with approved response -> ticket writeback -> `farplane ticket finalize TASK-0011` -> stop_complete. `stop_complete` remains withheld until every Completion Closure row is supported.

Approval: approved by the operator on 2026-08-26 after the TASK-0011 TAS-A implementation-plan review.
