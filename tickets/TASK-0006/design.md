---
ticket_id: TASK-0006
title: Buyer proof — operated before/after feature dossier
status: approved-for-implementation
updated_at: 2026-08-25
---

# Buyer proof design baseline

## Core decision

One wide, dark, square-edged screen answers a simple question: **did each
feature work on the test cases we gave it?** Features group the cases in the
left list. Selecting a case opens its starting data, expected result, actual
result, and checks in the right panel.

```text
feature + test_case + result
  -> grouped_case_row + case_details

case_details =
  why this case exists
  -> starting data
  -> expected result
  -> actual result
  -> checks
```

The static Vercel page renders the latest generated evidence bundle. It never
pretends it can operate the private Hermes profile itself.

## Screen `DESKTOP-EVAL-LIST` — grouped cases with details

The left panel groups cases by feature. The right panel shows the selected
case. Provider IDs, receipts, schemas, hashes, and environment details appear
only under `Technical evidence`.

```text
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ company os evals                                                                                                    13/13 cases passed │
│ last run · 25 Aug 2026, 6:05 pm                                                                                7 features · 49 checks │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────┐  ┌──────────────────────────────────────────────────┐
│ test cases · grouped by feature                                                      │  │ Project memory · Daily review              [×] │
├───────────────────────────────────────────────────────────────┬────────┬─────────────┤  ├──────────────────────────────────────────────────┤
│ feature / case                                                │ result │ summary     │  │ PASSED                                           │
├───────────────────────────────────────────────────────────────┼────────┼─────────────┤  │ The Project should reflect completed work,       │
│ ▼ Keep Project pages current                         2 passed │        │             │  │ unresolved work, and the next owner action.      │
│ ▌  Daily review · completed and blocked work                 │ passed │ 3 changes   │  ├──────────────────────────────────────────────────┤
│    Safe rerun · do not repeat completed changes              │ passed │ no repeats  │  │ WHY WE TEST THIS                                 │
├───────────────────────────────────────────────────────────────┼────────┼─────────────┤  │ A completed target should be checked off. A      │
│ ▼ Ask for missing information                       3 passed │        │             │  │ blocked target should remain visible with its    │
│    Completed ticket · reason missing                         │ passed │ 1 question  │  │ owner and next step.                             │
│    Complete ticket · nothing missing                         │ passed │ no comment  │  ├──────────────────────────────────────────────────┤
│    Failed update · leave ticket ready to retry               │ passed │ retry kept  │  │ STARTING DATA                                    │
├───────────────────────────────────────────────────────────────┼────────┼─────────────┤  │ Penang replenishment accuracy                    │
│ ▼ Chase slow weekly targets                         2 passed │        │             │  │ [ ] Validate the signed baseline                 │
│    Stale blocked target · ask owner for recovery             │ passed │ 1 message   │  │ [ ] Confirm the supplier rule                    │
│    Healthy target · do not chase                              │ passed │ no message  │  │ Blocker: none                                    │
├───────────────────────────────────────────────────────────────┼────────┼─────────────┤  ├──────────────────────────────────────────────────┤
│ ▼ Add useful knowledge to the weekly draft          3 passed │        │             │  │ EXPECTED RESULT                                  │
│    Complete evidence · capture problem, decision, SOP        │ passed │ 3 entries   │  │ [x] Validate the signed baseline                 │
│    Weak evidence · ask instead of inventing                  │ passed │ 1 question  │  │ [ ] Jun confirms the rule by 27 Aug             │
│    Failed update · keep source unprocessed                   │ passed │ retry kept  │  │ [ ] Record the rollout decision                  │
├───────────────────────────────────────────────────────────────┼────────┼─────────────┤  │ Blocker: supplier-rule owner is unclear         │
│ ▶ Build weekly reports                              1 passed │ passed │ 7 reports   │  ├──────────────────────────────────────────────────┤
│ ▶ Promote reusable knowledge                        1 passed │ passed │ 3 promoted  │  │ WHAT HAPPENED                                    │
│ ▶ Carry work into next week                         1 passed │ passed │ 1 checklist │  │ The Project matched the expected result.         │
└───────────────────────────────────────────────────────────────┴────────┴─────────────┘  │ No unrelated Project fields changed.            │
                                                                                        ├──────────────────────────────────────────────────┤
                                                                                        │ CHECKS                                           │
                                                                                        │ ✓ Completed target checked off                  │
                                                                                        │ ✓ New action and blocker added                  │
                                                                                        │ ✓ Existing unrelated content preserved         │
                                                                                        ├──────────────────────────────────────────────────┤
                                                                                        │ [starting record] [updated record]               │
                                                                                        │ [technical evidence]                             │
                                                                                        └──────────────────────────────────────────────────┘
```

### Interaction states

- `LIST-DEFAULT`: row 01 is selected on first load; the inspector is populated.
- `FEATURE-TOGGLE`: feature headers expand or collapse their owned/shared cases.
- `LIST-HOVER`: the row border and left selection rail brighten; no lift/shadow.
- `LIST-SELECTED`: selection rail stays filled and the inspector content swaps.
- `INSPECTOR-CLOSE`: desktop leaves a compact “select an eval” panel; the list
  never stretches or reflows.
- `INSPECTOR-MOBILE`: below 900px the inspector becomes a full-screen drawer
  with a sticky close button; Back returns to the same list scroll position.

### Starting-data entity cards

Starting records render as typed operational cards, not open JSON blocks.

| Entity | Primary card content |
| --- | --- |
| Project | status, owner, objective, progress, blocker, weekly checklist, knowledge |
| Work Item | status, priority, due date, owner, Project, progress, blocker, next action, missing information |
| Person | role, department, active Projects and Work present in the case |
| Meeting | date, facilitator, attendees, purpose, problem, decision, commitments, follow-up |
| Report | week, status, version, PM attention, section counts and expandable report sections |

Every value comes from the generated entity payload or its seed-backed ID label
map. Empty sections disappear. `Technical source data` remains closed at the bottom of
each card. The same card becomes full-width inside the mobile inspector.

### Reference-faithful visual rules

- Canvas `#050605`; panels `#0d0f0d`; alternating rows `#101210`/`#0c0e0c`.
- Square 1px borders `#242824`; zero radius, shadow, gradient, glow, or hero.
- 12–13px monospace; lowercase panel titles; muted secondary row text.
- Rows are 62–70px high with a strong first line and one evidence line.
- Status uses plain text. Tiny squares may support the label but never replace it.
- The list and inspector scroll independently. Inspector headings remain sticky.

### Status labels

| Label | Meaning |
| --- | --- |
| `PASSED` | The actual result matched the expected result and every required check passed. |
| `FAILED` | The result or a required check did not match. |
| `BLOCKED` | The case could not finish; the details panel explains why. |
| `NOT RUN` | No result exists for this case yet. |

The default view never displays provider IDs, receipt types, schemas, hashes,
environment names, or processing terminology. Those belong under
`Technical evidence`. A case cannot show `PASSED` without its required stored
evidence, but users do not need to understand that storage contract.

### Geometry assertions

| Region | Desktop viewport bounds |
| --- | --- |
| Header | x 3–97%, y 4–11%, width 94% |
| Eval list | x 3–64%, y 13–96%, width 61% |
| Inspector | x 66–97%, y 13–96%, width 31% |

## Result rule

```text
expected result == actual result && required checks pass -> PASSED
case cannot finish                                  -> BLOCKED
result or required check differs                    -> FAILED
case has no completed run                           -> NOT RUN
```

## Simplicity pass

- Core action: select one eval row and inspect its complete before/after change
  without leaving or reflowing the list.
- Subtract: raw assertion tables, standalone integration diagrams, duplicate
  section-4/section-5 file inventories, and hard-coded buyer copy.
- Deliberate no: no Vercel-side provider action button and no unlabelled
  aggregate claim. The local operated runner remains the only side-effect edge.

## Acceptance checks

1. The initial screen is legible without knowing internal IDs, schemas,
   providers, receipts, or eval terminology.
2. Each case shows why it exists, its starting data, expected result, actual
   result, checks, and direct record links when available.
3. Desktop uses the declared 62/38 list-and-inspector composition; narrow
   screens use a full-screen inspector drawer.
4. Feature copy is read from its feature document without exposing that
   document or its internal identifiers in the default view.
5. Provider and receipt evidence stays under `Technical evidence`; a case
   cannot display `PASSED` unless its required stored evidence exists.
