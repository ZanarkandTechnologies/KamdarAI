---
ticket_id: TASK-0008
surface: selected-case inspector
state: prompt spacing
verdict: pass
date: 2026-08-25
---

# Visual QA — inspector prompt spacing

Expected baseline: `tickets/TASK-0008/design.md`
Best image: `desktop-after.png`
Verdict: pass

## Expected UI Spec

The selected-case prompt sits inside the inspector content gutter, aligned with
the metadata strip and section copy rather than touching the panel border.

## Observed Snapshot Report

`desktop-after.png` shows the Processing After Effects Canary prompt with a
computed `9px 12px 12px` margin. Its content begins 13px from the inspector's
outer edge, including the one-pixel panel border. Inspector scroll position is
zero after selection and the page has no horizontal overflow.

## Diff Report + Verdict

- Screen: desktop selected-case inspector.
- Cause: `.inspector p` had higher specificity than `.prompt`, replacing the
  intended horizontal margin with `7px 0`.
- Correction: `.inspector > .prompt` now owns the prompt margin, while
  `.inspector .kicker` protects the header spacing from the same generic rule.
- Verdict: PASS.

## Fix Plan

Completed in `eval-dashboard-theme.mjs`; regression assertions live in
`eval-dashboard.test.mjs`. No remaining spacing change is required.

## Design coverage

| State | Evidence | Result |
| --- | --- | --- |
| Desktop selected prompt | `desktop-after.png` | PASS |
