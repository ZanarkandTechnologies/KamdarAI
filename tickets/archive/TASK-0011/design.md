---
ticket_id: TASK-0011
title: Customer-presentable eval inspector design baseline
status: awaiting_review
updated_at: 2026-08-26T04:50:11Z
---

# TASK-0011 Design Baseline

## Focus and simplicity

Core action: choose one business scenario and understand what the system
produced, whether it met the expected behavior, and why the evidence is trusted.

Subtract from presentation mode: raw entity JSON, Technical proof, judge and
receipt paths, JSON pointers, gate names, schema vocabulary, and the full
diagnostic `dashboard.json`.

Deliberate no: no second dashboard, composite score, invented grade,
celebratory animation, chart library, or “latest run” fallback. Presentation
mode consumes one hash-bound paired-run eligibility manifest.

## S1 — validated run overview

Reader question: Is this one complete, independently validated run?

```text
+---------------------------------------------------------------------+
| Kamdar Company OS evaluation                                        |
| 11/11 scenarios passed · 7 features · Validated 26 Aug 2026         |
|                                                                     |
| DAILY REVIEW                                                        |
| Updates Project context from operating progress              PASS   |
| Checks completed work for missing documentation              PASS   |
| Chases the right owner when progress is stalled              PASS   |
| Updates the Weekly Draft with useful operating knowledge      PASS   |
|                                                                     |
| WEEKLY REVIEW                                                       |
| Finalizes source-linked operating reports                    PASS   |
| Promotes qualified knowledge                                PASS   |
| Carries unresolved work into next week                       PASS   |
+---------------------------------------------------------------------+
```

Visible copy:

- Heading: `Kamdar Company OS evaluation`
- Summary: `11/11 scenarios passed · 7 features · Validated 26 Aug 2026`
- Status labels: `Pass`, `Failed`, `Blocked`, or `Not evaluated`

Proof shown: one paired eligible deployment whose Daily and Weekly result files
pass and whose current judges and artifact reviews validate. The public build
receipt binds the eligibility manifest and stripped presentation model bytes.

Intended takeaway: this is one complete run, not a collage of unrelated green
results.

Action: select a scenario.

Assertion: presentation mode cannot render when the paired eligibility gate
fails.

## S2 — scenario answer and file inspection

Reader question: What did the system produce, and did it satisfy the expected
answer?

```text
+---------------------------------------------------------------------+
| PASS · Updates Project context from operating progress              |
|                                                                     |
| RESULT                                                              |
| 4 of 4 completion checks passed                                     |
| The Project update is current, source-backed, and safe to apply.    |
|                                                                     |
| ANSWER QUALITY                                                      |
| Groundedness A  Completeness A  Usefulness A                        |
| Repeatability A  Length balance A                                  |
|                                                                     |
| COMPLETION CHECKS                                                   |
| ✓ One update targets CMT Pipeline                                  |
| ✓ All three guards match the current Project                       |
| ✓ Progress and blockers are preserved                              |
| ✓ Construction and production facts are source-linked              |
|                                                                     |
| REVIEWED OUTPUT · CMT Pipeline                                      |
| [Overview] [Project knowledge] [This week's attention]              |
| +--------------------------+  +----------------------------------+  |
| | CURRENT PROJECT          |  | AGENT READ                       |  |
| | exact section text       |  | exact matching guard             |  |
| +--------------------------+  +----------------------------------+  |
| Exact match — safe to replace                                      |
| +-----------------------------------------------------------------+ |
| | PROPOSED UPDATE                                                 | |
| | readable replacement text                                      | |
| +-----------------------------------------------------------------+ |
|                                                                     |
| FILE REVIEW                                                        |
| ✓ Clear references  ✓ Useful  ✓ Readable  ✓ Current template      |
| ✓ Grounded  ✓ Reconstructable  ✓ Baseline intact                  |
+---------------------------------------------------------------------+
```

Visible copy:

- `Result`, `Answer quality`, `Completion checks`, `Reviewed output`, and
  `File review`
- `Current Project`, `Agent read`, `Proposed update`
- `Exact match — safe to replace` or the source-backed failure sentence

Proof shown: authored assertions, five validated feature-judge grades, exact
candidate content, and the exact pointer-bound artifact review.

Intended takeaway: the customer can inspect the work itself without reading
the evaluation harness.

Action: change output section tabs; return to the scenario list.

Assertion: every visible grade and check has a current proof source, while no
internal path, pointer, gate, or judge vocabulary appears.

## S3 — non-Project output

Reader question: Can I inspect the actual report, comment, chase, decision, or
SOP rather than a JSON summary?

```text
+---------------------------------------------------------------------+
| REVIEWED OUTPUT · Weekly CMT report                                 |
| Final · version 4                                                   |
|                                                                     |
| CMT Pipeline — Week of 17 Aug 2026                                  |
| Summary                                                             |
| The first sample checks are complete ...                            |
|                                                                     |
| Outcomes and open attention                                         |
| [rendered report table and sections]                                |
|                                                                     |
| FILE REVIEW                                                         |
| ✓ Current template · ✓ Grounded · ✓ Baseline intact                |
+---------------------------------------------------------------------+
```

Visible copy varies by output type:

- comment: target Work title and complete comment text;
- chase: owner, Work title, complete message, and delivery state;
- knowledge candidate: kind, destination section, human prose, workflow or
  baseline detail, and missing information;
- report: title, status/version, and rendered Markdown sections;
- promotion: disposition, reason, rendered Issue/Decision/SOP, or stated gap;
- next-week replacement: current checklist, agent guard, and proposed checklist.

Proof shown: the candidate row and its exact artifact-quality review.

Intended takeaway: every scenario evaluates a visible business artifact.

Action: read the output; return to the list.

Assertion: presentation mode never falls back to raw JSON when a typed output
renderer is missing; the build fails until that output type is handled.

## S4 — internal diagnostic mode

Reader question: Where can an engineer inspect paths, receipts, gates, and raw
evidence when debugging?

Internal mode preserves the existing closed `Technical proof`, raw entity data,
and diagnostic `dashboard.json`. It is not emitted by the presentation build.

Assertion: stripping customer output does not delete or weaken internal proof.

## Responsive and accessible behavior

- Reuse TASK-0010’s list/inspector layout, neutral pastel-on-black tokens,
  keyboard-operable tabs, Escape close behavior, and mobile drawer.
- At 375 px, quality cards wrap without horizontal scrolling and report text
  remains readable.
- Status is always text, never color alone.
- Section tabs retain `tablist`, arrow, Home, End, and focus behavior.
