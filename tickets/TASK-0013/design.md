# TASK-0013 Design Baseline

## Visual inheritance

TASK-0013 changes evidence ownership only. It inherits the accepted dossier
visual system from `tickets/TASK-0006/design.md` and the approved desktop
captures under `tickets/TASK-0006/artifacts/qa/2026-08-27-json-records/`.

The migration must not introduce a new dashboard style, typography scale,
layout ratio, card language, navigation model, or responsive behavior.

## `FEATURE-DOSSIER` — restored desktop state

Reader question: Did this feature work, what fixed seed values did it receive,
and where is the human-facing result?

```text
┌─────────────────────────────────────────────────────────────────────┐
│ kamdar company os — w34        ● 0/7  ● 11/11  ● 0/35  ● 15/15  │
├───────────────────────────┬─────────────────────────────────────────┤
│ feature checks     result │ Unified Daily Review                    │
│ ▼ Unified Daily Review    │ ■ Update the CMT Pipeline Project       │
│ ▌ Project update UNJUDGED │ [UNJUDGED] missing current judge       │
│   Documentation  UNJUDGED ├─────────────────────────────────────────┤
│   Progress chase UNJUDGED │ TASK                                    │
│   Knowledge      UNJUDGED │ <feature claim>                         │
│ ▼ Weekly Review            ├─────────────────────────────────────────┤
│   Reports        UNJUDGED │ SOURCE INPUT · SEED JSON                │
│   Promotion      UNJUDGED │ ■ PROJECT  CMT Pipeline       AT RISK   │
│   Next week      UNJUDGED │ ■ WORK     TASK-101          BLOCKED   │
│                            │ ■ WORK     TASK-104       IN PROGRESS   │
│                            ├─────────────────────────────────────────┤
│                            │ ASSERTION REVIEW                        │
│                            │ Actual agent output                     │
│                            │ [Updated CMT Pipeline Project ↗]        │
│                            │ Expected criteria                       │
│                            │ ■ assertion                       PENDING│
└───────────────────────────┴─────────────────────────────────────────┘
```

Visible copy:

- Header: `kamdar company os — w34`
- List heading: `feature checks · grouped by workflow`
- Groups: `Unified Daily Review`, `Weekly Operating Review`
- Inspector sections: `Task`, `Source input · seed JSON`, `Test cases`,
  `Assertion review`
- Assertion panels: `Actual agent output`, `Expected criteria`

Proof shown: complete seed records expand inside compact entity rows; real
Notion/Gmail output links appear only inside Actual agent output; current judge
state controls PASS/FAIL/UNJUDGED.

Action: Select a feature, expand a seed record when needed, then inspect its
output and expected criteria in one vertical reading flow.

Assertion: The screen retains the accepted W34 topbar, pill metrics, 40/60
workspace, grouped rows, pastel squares, dense mono typography, square edges,
one-column assertion review, and independent panel scrolling.

## `FEATURE-DOSSIER-MOBILE`

At 900px and below the feature list remains the default screen. Selecting a
feature opens the inspector as a full-screen drawer; Close returns to the list.
There is no horizontal overflow.

## Visual system

- Register: restrained operational dossier.
- Scene: a manager reviewing dense evaluation evidence on a dark workstation.
- Taste dials: density 8, variance 2, motion 1, color commitment 3,
  materiality 2.
- Typography: 12px system monospace; 8–10px evidence labels.
- Color: `#060606` canvas, `#0d0d0d` panels, `#272727` borders, muted grey
  copy, and the established peach/lavender/mint/pink/yellow status accents.
- Shape: square panels and entity cards; radius is reserved for metric/group
  pills only; no shadows, gradients, glow, or large marketing typography.

## Focus and simplicity pass

- Benefit: the evaluator can compare source, output, and criteria without
  relearning the interface.
- Focal action: select a grouped feature row and inspect its right panel.
- Remove/defer: bespoke source-page links, receipt-first UI, decorative metric
  tiles, and a second navigation model.
- Deliberate no: no visual redesign as part of evidence-source migration.
