---
ticket_id: TASK-0008
surface: inspector structured evidence
state: JSON code blocks
verdict: pass
date: 2026-08-25
---

# Visual QA — JSON evidence blocks

Expected baseline: `tickets/TASK-0008/design.md`
Best image: `actual-json-after.png`
Verdict: pass

## Expected UI Spec

Structured evidence must preserve the exact JSON hierarchy while remaining
scannable inside the 38% inspector. Entity, result, and receipt payloads use one
consistent code-block component with restrained pastel syntax color.

## Observed Snapshot Report

| State | Evidence | Geometry | Result |
| --- | --- | --- | --- |
| Expanded starting entity | `entity-json-after.png` | block remains inside inspector; internal vertical scroll; no page overflow | PASS |
| Actual result | `actual-json-after.png` | full inspector width minus 12px section gutters; no horizontal page overflow | PASS |

The selected case renders seven JSON blocks. Keys, strings, numbers, booleans,
and null values have distinct semantic tokens. Browser console errors: zero.

## Diff Report + Verdict

- Screen: selected-case inspector.
- Before: undifferentiated escaped text inside generic `<pre>` elements.
- After: reusable `JSON / structured data` code blocks with syntax highlighting,
  bounded internal scrolling, and preserved indentation.
- Behavior: entity disclosure still controls only its owned payload; selecting a
  new case still resets the inspector to the top.
- Verdict: PASS.

## Fix Plan

Completed in `eval-dashboard-components.mjs` and
`eval-dashboard-theme.mjs`. `renderJsonBlock` owns every structured payload;
the focused test verifies syntax classes and HTML escaping.

## Design coverage

| Declared state | Evidence | Result |
| --- | --- | --- |
| Starting entity detail | `entity-json-after.png` | PASS |
| Actual result detail | `actual-json-after.png` | PASS |
