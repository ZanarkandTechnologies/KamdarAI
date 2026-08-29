/goal Run the following files as one Goal Packet.

Files:
- tickets/TASK-0009/ticket.md
- tickets/TASK-0009/program.md
- tickets/TASK-0009/hypothesis-tree.json
- tickets/TASK-0009/progress.md
- evals/filesystem/scripts/run-task0007-skill-evals.mjs
- the four Daily pipeline SKILL.md and evals/evals.json files listed in program.md

Task: Repair invalid eval bindings, freeze a source-consistent suite, improve the
four real Hermes Daily normal outputs until every judge returns tier A, preserve
all hard/boundary and no-provider guards, then add and pass one real-model
Weekly SOP/Issue promotion proof.

Logging: Update hypothesis-tree.json first, then append observation, evidence,
learning, decision, remaining_budget, and next_action to progress.md.

Metric: Real Hermes candidate/baseline/judge artifacts; A is the only pass.
Independent evidence review is required. The tester lane cannot self-approve.

After each turn: choose_next(objective, evidence, eligible_moves,
remaining_budget) -> execute | diagnose | report_now | request_feedback | stop.
Make one bounded owner-local change, run the complete frozen evaluator, and
retain it only when performance improves and guards pass. Compare outside
options; execute mechanically implied repairs directly. No provider writes.

Context gate: ticket + program + hypothesis tree + latest 80 progress lines;
target 300 lines, hard stop at 400. Drift reviewer: independent evidence review
after suite repair, each retained A result, and final Weekly proof.

Approval: owner approved continuous execution on 2026-08-26 with “fix the
output until it’s A.” stop_complete remains withheld until every Completion
Closure row is supported.
