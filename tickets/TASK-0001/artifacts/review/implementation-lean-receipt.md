---
ticket_id: TASK-0001
kind: lean-receipt
status: pass
created_at: 2026-08-21T13:24:48+08:00
---

# Lean receipt — template-first frozen proof

```yaml
target: frozen Kamdar runner and local proof UI that execute evals/evals.json
current_need: The retained runner is hard-coded to the superseded 37-check, area-first fixture and cannot truthfully render the approved 10-file/13-behavior contract.
rung: minimum_new_code
evidence:
  - evals/filesystem/scripts/mock-kamdar-automation.mjs requires its old case schema and fixture paths.
  - evals/filesystem/scripts/serve.mjs and the static UI are dependency-free reusable transport/display seams.
  - evals/evals.json requires different paths, templates, Daily-before-Weekly lifecycle, and expanded template assertions.
smallest_next_action: Add one dependency-free template-first frozen runner and fixture; adapt the existing HTTP server and static UI to its result shape; keep the legacy runner as explicitly superseded comparison material.
proof_preserved: Root assertions, ASCII comparison, ignored run roots, no network/provider calls, and independent UI/QA proof remain mandatory.
review_route: review:implementation-plan
```

## Lean check QA

```yaml
lean_receipt_qa:
  need: pass
  first_sufficient_rung: pass
  evidence: pass
  proof_preserved: pass
  integration: pass
  highest_risk: accidental reuse of the old area-first assertion model
  exact_fix_or_deferral: new runner consumes only root evals/evals.json; legacy files remain marked superseded
```
