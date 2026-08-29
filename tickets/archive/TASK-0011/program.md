---
template_id: goal-loop-program
template_version: "0.2.0"
kind: goal-program
title: TASK-0011 Goal Program
status: complete
owner: goal-advisor
ticket_ref: tickets/TASK-0011/ticket.md
progress_ref: tickets/TASK-0011/progress.md
---

# TASK-0011 Goal Program

## Goal Mode

```yaml
trigger: native_goal
files:
  - tickets/TASK-0011/ticket.md
  - tickets/TASK-0011/program.md
  - tickets/TASK-0011/progress.md
  - tickets/TASK-0011/design.md
compiled_from_ticket_updated_at: 2026-08-26T05:18:40Z
generated_prompt: tickets/TASK-0011/generated-goal-prompt.md
budget: no numeric time or token budget supplied; continue only while a verified in-scope move beats report_now or stop
approval: approved
```

## Execution Contract

- Objective: satisfy TASK-0011 Done without weakening evidence or hiding failures.
- Mutable surface: only files admitted by TASK-0011 Change Plan and ticket-local proof artifacts.
- Hard constraints: no live providers, deployment, Hermes install, fabricated grade, red-run fallback, or unreviewed assertion edit.
- Evidence owner: immutable run artifacts plus delegated QA/review.
- Hypothesis tree: none.

## Compiled Execution Path

| Nodes | Change | Exit assertion | Proof |
| --- | --- | --- | --- |
| S1,S3,F1 | 1 evidence boundary | cited facts resolve from permitted typed context | runner/context mutation tests |
| S2,S4,F1 | 2 candidates | source-supported current-template artifacts; assertion diffs independently approved | schemas, hashes, assertion review |
| S2,P1 | 3 rerun | zero new provider mutations with outcome-preserving audit | rerun mutation tests |
| P1,P2,J1,S5 | 4 judged deployment | current packet-bound judges/reviews reconcile | both `--judged` validators |
| S5,S6,F2 | 5 presentation inspector | paired manifest, exact quality joins, readable outputs, no leaks | model/build/UI tests |
| P3,P4 | 6 finish proof | full checks, visual QA, review, demo | ticket artifacts |

## Completion Closure

- Reopened: `task0011-presentation-2026-08-26-05` is a reference calibration,
  not agent-behavior proof. Completion requires real-agent provenance, semantic
  assertion judging, and a newly operated presentation capture.

## Metric Provider

Hybrid pass metric: unchanged deterministic assertions, hash-bound independent
judges/reviews, and operated UI proof. Guards prohibit weakened supported
assertions, invented grades, cross-run pairing, technical leaks, live side
effects, fixture inflation, hidden failure, copied verdicts, or self-approval.

## Proof And Drift Policy

- Ordered proof: focused sanity checks -> complete judged run -> full tests -> QA evidence review -> narrated demo -> response draft -> completion review -> ticket finalization.
- Drift owner: `goal-drift-reviewer` after Change 4 and before completion review; stop/revise on scope, evaluator, suite, or proof-policy drift.
- Context gate: initially read full ticket + full program + latest 80 progress lines; target 300 lines, hard 400. Load design or older evidence only for a named node/gap.
- Final checkpoint: reviewer; self-certification is insufficient.

## Stop Conditions

- Complete only when closure and ticket finalization succeed. Diagnose and
  repair an attributable owner, never the answer key. Request feedback only
  for new material scope; block on missing authority/proof, live side effects,
  or context above the hard gate. Otherwise report only when stop beats the
  next useful move; withhold `stop_complete` until closure.
