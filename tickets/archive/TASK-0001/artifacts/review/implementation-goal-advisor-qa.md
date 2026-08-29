---
ticket_id: TASK-0001
kind: goal-advisor-qa
status: pass
created_at: 2026-08-21T13:21:32+08:00
---

# Goal Packet QA — TASK-0001 implementation

```yaml
goal_advisor_qa:
  prompt_under_review: tickets/TASK-0001/artifacts/implementation-goal-prompt.md
  files_listed: [ticket.md, implementation-program.md, implementation-progress.md, ascii-prototype.md, evals/evals.json, templates/README.md, workspace.hermes.md]
  approval_state: approved-by-operator-2026-08-21
  delegated_lanes: [qa-tester, visual-qa, agent-qa-test, demo, goal-drift-reviewer, reviewer]
  grounding_evidence_rule: local-only source contract; no external dependency choice in scope
  final_evidence_rule: strongest UI screenshot plus ticket-scoped evidence and reviewed response
  critical_path_proof_rule: Daily -> Weekly -> root assertions -> UI -> ASCII comparison -> repair
  final_completion_checkpoint: QA, visual QA, agent QA, demo, drift, completion review, ticket/progress writeback
  experiment_backbone: not applicable
  first_load_context_budget: target 300 lines; hard block above 400; progress tail capped at 80
  decision_backbone: observe -> choose_next -> act -> verify -> write_back
  violations: []
  fixes_or_deferrals:
    - Independent packet review completed: TAS-A/pass.
```
