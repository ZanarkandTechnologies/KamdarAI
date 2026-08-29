---
ticket_id: TASK-0010
title: Canonical Farplane Company OS eval scenarios
status: approved-for-implementation
updated_at: 2026-08-26
---

# TASK-0010 Design Baseline

## S1 — scenario list

Reader question: What business behavior was tested, and did it pass?

```text
+---------------------------------------------------------------------+
| DAILY REVIEW EVALUATION                     current run status       |
|                                                                     |
| FEATURE EVALS                                                       |
| Updates Project context from operating progress              PASS   |
| Checks completed work for missing documentation              PASS   |
| Chases the right owner when progress is stalled              PASS   |
| Updates the Weekly Draft with problems, decisions, and SOPs NOT RUN |
|                                                                     |
| WORKFLOW SAFEGUARDS                                                 |
| Applies prepared changes and verifies them                   PASS   |
| Keeps work open when a required change fails                 PASS   |
| Treats nothing needed as successfully reviewed               PASS   |
| Creates nothing twice when the review is rerun               PASS   |
+---------------------------------------------------------------------+
```

Visible copy: `DAILY REVIEW EVALUATION`, scenario titles, concise observed
summaries, and `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN`.

Proof shown: scenario-specific result backed by feature assertions and/or
integration gates.

Intended takeaway: the reader understands the tested behavior without opening
technical evidence.

Action: select a scenario.

Assertion: no row title contains internal-only vocabulary such as canary,
processing transition, or after-effects.

Assertion: the seven Company OS features each have one first-class scenario;
cross-feature integration and safety scenarios are additional rows, never
replacements for feature coverage.

## S2 — selected safe-failure scenario

Reader question: Why did a blocked provider action produce a passing eval?

```text
+---------------------------------------------------------------------+
| PASS · KEEPS WORK OPEN WHEN A REQUIRED CHANGE FAILS                 |
|                                                                     |
| GIVEN                                                               |
| TASK-203 requires a Draft update; provider confirmation is absent.  |
|                                                                     |
| WHEN                                                                |
| Daily Review attempts to apply the prepared update.                 |
|                                                                     |
| EXPECTED                         OBSERVED                            |
| Work remains unprocessed        UNPROCESSED                         |
| Status remains unchanged        NOT CHANGED                         |
| Blocked reason is recorded      RECORDED                            |
|                                                                     |
| RESULT                                                              |
| PASS — the failed action was handled safely.                        |
|                                                                     |
| [Technical proof]                                                   |
+---------------------------------------------------------------------+
```

Visible copy: `GIVEN`, `WHEN`, `EXPECTED`, `OBSERVED`, `RESULT`, and
`Technical proof`.

Proof shown: bound processing-safety gate, receipt effect, and Work processing
decision.

Intended takeaway: operational failure and eval failure are different states.

Action: optionally expand Technical proof.

Assertion: technical evidence is collapsed by default and the visible result
states why the scenario passed.

## S3 — stale feature proof

Reader question: Did the saved run actually judge the current assertions?

```text
+---------------------------------------------------------------------+
| NOT RUN · UPDATES THE WEEKLY DRAFT WITH PROBLEMS, DECISIONS, SOPS  |
|                                                                     |
| OBSERVED                                                            |
| Output file checked: daily-review-result.json                       |
| Content asserted at: knowledge_updates                              |
|                                                                     |
| RESULT                                                              |
| NOT RUN — saved judge does not cover the current authored checks.  |
| Rerun this feature eval.                                            |
+---------------------------------------------------------------------+
```

Assertion: a stale judge can never inherit PASS from a prior assertion set.

## S4 — output-first failed Project update

Reader question: What failed, how much passed, and what text caused the conflict?

```text
+---------------------------------------------------------------------+
| FAILED · UPDATES PROJECT CONTEXT FROM OPERATING PROGRESS            |
| 3 of 4 required checks passed                                      |
| Expected-current text is stale, so the replacement is unsafe.      |
|                                                                     |
| ARTIFACT QUALITY                                                   |
| Groundedness  —  Completeness  —  Usefulness  —                    |
| Repeatability  —  Length balance  —        (Not evaluated)         |
|                                                                     |
| REQUIRED CHECKS                                                    |
| ✕ Complete sections use the current Project text                   |
| ✓ One update targets CMT Pipeline                                  |
| ✓ Progress and blockers are preserved                              |
| ✓ Construction and production facts are source-linked              |
|                                                                     |
| OBSERVED OUTPUT · CMT Pipeline · applied · read-back matched        |
| [Overview !] [Project knowledge !] [This week's attention !]       |
| +--------------------------+  +----------------------------------+  |
| | ACTUAL CURRENT           |  | AGENT EXPECTED CURRENT           |  |
| | exact frozen section     |  | stale guard text                 |  |
| +--------------------------+  +----------------------------------+  |
| MISMATCH — replacement is unsafe                                  |
| +----------------------------------------------------------------+ |
| | PROPOSED REPLACEMENT                                           | |
| +----------------------------------------------------------------+ |
|                                                                     |
| [Technical proof]                                                   |
+---------------------------------------------------------------------+
```

Assertions:

- Result and required-check completion appear before setup context.
- The five artifact metrics render only from a complete A–D judge rubric;
  legacy runs say `Not evaluated` instead of inventing grades.
- Failed required checks appear before passing checks. File paths, judge tier,
  judge freshness, JSON pointers, receipts, and raw slices stay inside closed
  Technical proof.
- `project_updates` renders the exact frozen section, the agent's expected
  section, and proposed replacement in keyboard-operable section tabs.
- A mismatch states that the guarded replacement is unsafe.

## Preserved interaction and visual system

Reuse TASK-0008's neutral pastel-on-black list/inspector, selection, collapse,
keyboard, and narrow-screen drawer behavior. Add no new dependency, chart,
animation, or decorative surface.
