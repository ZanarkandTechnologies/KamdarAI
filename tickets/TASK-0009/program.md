---
kind: goal-program
mode: skill_improvement
trigger: native_goal
status: active
approval: owner-approved-2026-08-26
compiled_from_ticket_updated_at: 2026-08-26
generated_prompt: tickets/TASK-0009/artifacts/native-goal-prompt.md
---

# Self-improve: Daily evidence pipelines to tier A

```yaml
files:
  - tickets/TASK-0009/ticket.md
  - tickets/TASK-0009/program.md
  - tickets/TASK-0009/hypothesis-tree.json
  - tickets/TASK-0009/progress.md
  - evals/filesystem/scripts/run-task0007-skill-evals.mjs
  - skills/daily-project-memory/SKILL.md
  - skills/daily-project-memory/evals/evals.json
  - skills/daily-documentation-quality/SKILL.md
  - skills/daily-documentation-quality/evals/evals.json
  - skills/daily-project-control/SKILL.md
  - skills/daily-project-control/evals/evals.json
  - skills/daily-knowledge-capture/SKILL.md
  - skills/daily-knowledge-capture/evals/evals.json

metric:
  provider: real Hermes candidate/baseline/judge calibration plus independent evidence review
  command: node evals/filesystem/scripts/run-task0007-skill-evals.mjs --calibrate-pipelines --output <new-private-empty-directory>
  performance: every selected Daily normal case returns tier A and pass
  length: target SKILL.md nonblank line count after behavior passes
  guards:
    - all 21 canonical normal/hard/boundary contracts remain structurally valid
    - source IDs and numeric claims remain grounded
    - no provider tools, writes, or employee messages
    - assertions are never weakened to match a candidate
  suite: freeze only after stale fixture/assertion/golden bindings are repaired and independently reviewed

selection:
  owner: active-goal
  hypothesis_tree: tickets/TASK-0009/hypothesis-tree.json
  source_stage:
    inputs: failed 2026-08-26 calibration artifacts and current owner-local skill packages
    extracts: fixture drift, omitted fields, evidence-binding failures, output-shape ambiguity
  rule: execute mechanical prerequisite repairs directly; diagnose ambiguous misses; compare execute | diagnose | report_now | request_feedback | stop

loop:
  round: one bounded owner-local edit followed by the complete frozen real-model calibration
  harden:
    max_rounds: operator-terminal-condition-until-A
    patience: block only after the same evidence-backed external blocker repeats for three consecutive Goal turns
    accept: tier profile improves, all guards pass, and independent review accepts the evidence
    exit: all selected Daily cases A -> Weekly model proof; repeated external blocker -> blocked
  refine:
    max_rounds: 0
    patience: 0
    reason: operator requested tier A behavior, not instruction-length optimization

after_each_turn:
  - inspect this program, eligible tree leaves, latest 80 progress lines, current complete-suite evidence, and remaining Goal authority
  - choose one bounded execute | diagnose | report_now | request_feedback | stop action
  - update hypothesis-tree.json before appending progress.md
  - retain only changes supported by the complete frozen suite and guards

drift:
  - any fixture, assertion, evaluator, model, or target-skill change after freeze requires a fresh baseline

stop:
  blocked: same external blocker repeats for three consecutive Goal turns
  complete: Daily tier-A suite plus real-model Weekly SOP/Issue promotion case pass independent review
```

## Execution path and completion closure

```text
P0 repair invalid eval bindings -> P1 freeze/rebaseline -> P2 harden genuine misses
  -> P3 all Daily A -> P4 add/run Weekly model promotion proof -> independent review
```

| Done assertion | Owner | Evidence | State |
| --- | --- | --- | --- |
| Valid, source-consistent frozen suite | P0/P1 | eval packages + baseline summary | pending |
| Four Daily normal cases reach A | P2/P3 | real Hermes calibration bundle | pending |
| Hard/boundary guards remain valid | P2/P3 | structural inspection + tests | pending |
| Weekly creates grounded SOP/Issue output | P4 | real-model Weekly artifact + judge | pending |
| Tester cannot self-approve | Review | independent evidence-review receipt | pending |

stop_complete is withheld until every row is supported.
