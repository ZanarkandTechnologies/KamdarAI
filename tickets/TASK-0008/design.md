---
ticket_id: TASK-0008
title: Generated eval list and inspector
status: approved-for-implementation
updated_at: 2026-08-25
---

# Generated eval list and inspector

## Data flow

```text
suite cases + feature docs + seed entities + judged run artifacts
                              │
                              ▼
                    generated dashboard model
                       │                 │
                       ▼                 ▼
              feature-grouped list   selected-case inspector
```

## Desktop state

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ company os evals                 ■ <pass total>  ■ <features>  ■ <checks>  <date>                           │
├─────────────────────────────────────────────────────────────┬──────────────────────────────────────────────┤
│ test cases · grouped by feature                             │ <selected feature>                           │
├─────────────────────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ ▼ ■ <feature title from doc>                  (<status sum>)│ ■ <case title>  [status] [category] [tier]    │
│ ▌ ■ <case title from suite id>          [status pill]      │ <case prompt from suite>                    │
│   ■ <next case title>                   [status pill]      │                                              │
├─────────────────────────────────────────────────────────────┤ STARTING DATA                                │
│ ▼ <next feature title from doc>                <status sum> │ <seed entities selected by case.entity_ids>  │
│   <shared case title>               <status>  <result sum> │                                              │
│                                                             ├──────────────────────────────────────────────┤
│                                                             │ EXPECTED RESULT                              │
│                                                             │ <feature claim + authored assertions>        │
│                                                             ├──────────────────────────────────────────────┤
│                                                             │ ACTUAL RESULT                                │
│                                                             │ <feature result slice from run JSON>         │
│                                                             ├──────────────────────────────────────────────┤
│                                                             │ CHECKS                                       │
│                                                             │ <judge assertion + evidence reference>       │
│                                                             ├──────────────────────────────────────────────┤
│                                                             │ [technical evidence]                         │
└─────────────────────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

## Interaction

- First generated row is selected on load.
- Feature headers collapse only their owned/shared row instances.
- Selecting a row swaps the inspector without reflowing the list.
- On narrow screens, selection opens a full-screen inspector drawer; close
  returns to the same scroll position.
- Technical evidence is collapsed by default.

## Visual contract

- Canvas `#060606`; panels `#0d0d0d`; alternating rows `#111111` and `#0b0b0b`.
- Surfaces stay neutral. Five small accents carry orientation and state: peach
  `#f2ceb0`, lavender `#cec7ed`, mint `#b9ddcb`, pink `#e8b7c5`, and yellow
  `#ead99d`.
- Pastel is limited to 8–14px square markers and compact metadata/status pills;
  it never tints a panel or creates a large colored card.
- Panels retain square one-pixel borders. Only metadata pills may be rounded;
  status labels remain compact, nearly-square tags. No shadow, gradient, glow,
  hero, or decorative card stack.
- Monospace 12–13px type with dense 62–70px case rows.
- Desktop composition is 62% list and 38% inspector; both scroll independently.
- Status uses pastel tags: mint `PASSED`, pink `FAILED`, yellow `BLOCKED`, and
  lavender `NOT RUN`.

## UI ownership

```text
Dashboard document
├── theme tokens + responsive layout
├── top bar
│   └── generated metric pills
├── feature list
│   └── feature group → case row → pastel marker + status pill
└── inspector
    └── header + metadata pills + entity disclosures + check rows + evidence
```

- `eval-dashboard-html.mjs` only composes the document from the normalized model.
- `eval-dashboard-components.mjs` owns reusable generated UI components.
- `eval-dashboard-theme.mjs` owns palette, layout, and responsive presentation.
- `eval-dashboard-client.mjs` owns selection, collapse, close, and keyboard behavior.

## Result rule

```text
suite result passes + feature judge A + every judge assertion met -> PASSED
required artifact/judge absent or explicitly blocked                   -> BLOCKED
completed evidence contradicts an assertion                            -> FAILED
no completed run                                                       -> NOT RUN
```

## Source ownership

| Visible value | Source |
| --- | --- |
| Feature title and purpose | feature document front matter and sections |
| Case name, prompt, entities, expected checks | typed suite JSON |
| Starting data | seed entity selected by suite entity IDs |
| Actual result | declared review-result artifact and feature result path |
| Status and checks | suite result plus feature judge JSON |
| Record links and technical proof | declared receipt/read-back artifacts |
| Counts and summaries | derived from the normalized model |

The renderer may hardcode interface labels such as `STARTING DATA`; it may not
hardcode any domain value shown beside those labels.
