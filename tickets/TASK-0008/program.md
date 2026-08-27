---
template_id: goal-loop-program
template_version: "0.2.0"
kind: goal-program
title: TASK-0008 Goal Program
status: superseded
owner: goal-advisor
ticket_ref: tickets/TASK-0008/ticket.md
progress_ref: tickets/TASK-0008/progress.md
---

# TASK-0008 Goal Program

## Goal Mode

```yaml
trigger: native_goal
files:
  - tickets/TASK-0008/ticket.md
  - tickets/TASK-0008/design.md
  - tickets/TASK-0008/program.md
  - tickets/TASK-0008/progress.md
compiled_from_ticket_updated_at: 2026-08-25
generated_prompt: tickets/TASK-0008/goal-prompt.md
budget: unbounded-by-user
approval: approved
```

## Execution Contract

- Objective: ship the accepted generated eval list and inspector.
- Mutable surface: the four Change Plan paths in `ticket.md` plus Goal evidence.
- Hard constraints: no UI-owned domain data; fail closed; preserve deployments.
- Evidence owner: focused tests and visual captures under TASK-0008 artifacts.
- Hypothesis tree: none.

## Compiled Execution Path

| Diagram nodes | Change unit | Exit assertions | Proof observation |
| --- | --- | --- | --- |
| A-C | loader inputs | authored sources resolve and validate | contract + missing-input tests |
| D-E | normalized model | 7 groups and 13 memberships; exact source trace | model + mutation tests |
| F | HTML renderer/build | accepted wide list/inspector with generated values | markup tests + screenshots |

## Reference Manifest

| Reference | Used by | Purpose |
| --- | --- | --- |
| `tickets/TASK-0008/design.md` | F | accepted interaction, geometry, and visual state |
| `evals/daily/suite.json` | A,D | Daily typed cases, features, paths, assertions |
| `evals/weekly/suite.json` | A,D | Weekly typed cases, features, paths, assertions |
| `docs/features/FEAT-*.md` | B,D | feature names, purpose, and examples |
| `evals/seed/kamdar-company-os.seed.json` | C,D | exact starting entities |
| completed run roots | C,D | actual result, judge, receipt, and status evidence |
| `../Farplane/bin/core/eval_contract.py` | D | closed typed-suite and lint precedent |

## Completion Closure

| Closure item | Source complaint | State/viewport | Proof method | Evidence owner/path | Status |
| --- | --- | --- | --- | --- | --- |
| Source-generated UI | no hardcoded datapoints | model + renderer | mutation/source-scan tests | TASK-0008 QA | supported |
| Reference-faithful layout | prior page unlike supplied dark wide reference | desktop 1440×900 | screenshot comparison | TASK-0008 QA | supported |
| Usable narrow state | inspector must remain readable | mobile 390×844 | operated screenshot | TASK-0008 QA | supported |

## Metric Provider

```yaml
provider: hybrid
primary: contract tests plus visual comparison
direction: pass
guards: [no-hardcoded-domain-data, fail-closed-evidence, preserve-deployments]
anti_metrics: [more showcase prose, duplicate compiled data, inferred pass]
minimum: all Done rows and all Completion Closure rows supported
```

## Decision Backbone

```text
observe -> choose smallest mechanically implied change -> execute -> verify -> write back
```

## Proof Policy

- Checks: focused Node tests, `farplane lint evals`, `git diff --check`, desktop/mobile visual QA.
- Evidence paths: `tickets/TASK-0008/artifacts/` and `progress.md`.
- Drift owner: inline against ticket scope and accepted design.
- Final checkpoint: visual QA plus completion review.

## After Each Turn

- Preserve the strongest passing source-driven state.
- Append one compact receipt to `progress.md`.
- Continue while a pending closure row has an executable proof step.

## Stop Conditions

- Complete only when every Done and Completion Closure row is supported.
- Block on missing required run evidence rather than inventing a fallback.
- Preserve the current deployment until a separately authorized deployment step.
