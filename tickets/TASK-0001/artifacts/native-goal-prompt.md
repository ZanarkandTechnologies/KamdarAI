---
kind: native-goal-prompt
ticket_id: TASK-0001
compiled_from_ticket_updated_at: 2026-08-21T10:59:23+08:00
approval: approved
---

/goal Run the following files as one Goal Packet.

Files:
- tickets/TASK-0001/ticket.md
- tickets/TASK-0001/program.md
- tickets/TASK-0001/progress.md
- workspace.hermes.md
- automations/daily-operating-update.md
- automations/daily-notion-documentation-check.md
- automations/weekly-operating-review.md

Read `program.md`, then `ticket.md`, then only the latest 80 progress lines.
Target 300 loaded lines; hard-block above 400. Complete only TASK-0001 Scope: In
and Done / Proof.

Task: preserve one frozen deterministic evaluator and operate one bounded live
Kamdar POC. Use only namespaced POC Notion/Drive writes, the two email addresses
supplied at runtime, and the configured Telegram home chat. Never expose or
track a credential, live contact, raw company record, or live ID. Never delete,
share, invite, schedule, start a gateway, or overwrite non-POC state.

Logging: append observation, evidence, learning, decision, remaining budget,
and next action after each material phase. Metric and side-effect policy come
from `program.md`; ticket QA wins on conflict. Self-certification is not final
proof.

After each phase:
`observe -> choose_next(objective, evidence, eligible_moves, remaining_budget) -> execute | diagnose | report_now | request_feedback | stop -> act -> verify -> write_back`.
Run a goal-drift reviewer after the first complete run and before completion. Final
proof requires provider postchecks, ordered tests, QA, visual evidence,
adversarial eval review, demo, completion review, and ticket writeback. Do not
claim an unrun end-to-end path. Regenerate this packet after material changes.

Approval: explicit operator authority dated 2026-08-21 for the bounded live POC
described in ticket Safety / Authority.
