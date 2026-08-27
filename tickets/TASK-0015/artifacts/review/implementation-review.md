---
ticket_id: TASK-0015
reviewed_at: 2026-08-27T09:40:00Z
review_route: inline-review-protocol
status: pass
rubrics: [code-quality, integration-readiness, skill-contract, documentation-quality, evidence-quality]
---

# Implementation review

## Verdict

- Overall: TAS-A / pass.
- Required families: TAS-A.
- Independent subagent review: unavailable under the active execution policy;
  the same rubric protocol was applied inline against the diff and fresh proof.

## Adversarial rejection attempts

1. **False scheduler readiness:** operated proof showed `hermes gateway status`
   exits zero even when stopped. Repaired by parsing the native running-state
   marker; rerun now returns `partial` and `scheduler_ready=false`.
2. **Paused schedules:** initial reconciliation ignored `enabled=false`.
   Repaired by updating and resuming paused canonical jobs through Hermes CLI.
3. **Wrong source/runtime boundary:** verified distribution mode requires
   installer-written `source` and `installed_at`; developer mode still requires
   a separate target profile.
4. **Payload bloat:** native install copied 356 KB and excluded tickets, tests,
   seed, docs, full evals, media, history, and the rejected facade skill.
5. **Misleading docs:** README commands were compared with the native install,
   preview, apply, update, cwd read-back, cron state, and Notion skill boundary.

## Rubric results

| Family | TAS | Evidence |
| --- | --- | --- |
| Code quality | TAS-A | Standard-library helper, explicit failures, unit coverage for create/update/resume/duplicates/readiness. |
| Integration readiness | TAS-A | Native local and public-GitHub install, update, apply, idempotent rerun, cwd read-back, and two stored jobs. |
| Skill contract | TAS-A | Five bounded nodes, explicit source modes, schedule edge, proof, and separate Notion owner. |
| Documentation quality | TAS-A | Public README leads with exact client commands and security gates. |
| Evidence quality | TAS-A | Commands are replayable; full tests and operated receipts match the claims. |

## Lean receipt

```yaml
target: client profile setup
current_need: bridge native distribution files into hard-excluded workspace state and client-local cron paths
rung: minimum_new_code
evidence:
  - native Hermes distribution already owns profile creation and updates
  - existing setup_workspace.py is reused for file ownership and copy safety
  - stdlib and native Hermes CLI cover config and cron; no dependency was added
smallest_next_action: retain one setup_profile.py orchestrator under the existing setup skill
proof_preserved: preview, apply, idempotence, drift, duplicate, paused-job, and stopped-gateway checks
review_route: review:code-quality
```

## Remaining risk

- A real client still must complete `hermes setup`, start its gateway, supply
  credentials outside chat, approve Notion scope, and prove one webhook reply.
