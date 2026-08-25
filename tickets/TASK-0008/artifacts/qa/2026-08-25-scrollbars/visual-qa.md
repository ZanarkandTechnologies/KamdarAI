---
ticket_id: TASK-0008
surface: generated eval dashboard
state: independent scrolling surfaces
verdict: pass
date: 2026-08-25
---

# Visual QA — scroll surface correction

Expected baseline: `tickets/TASK-0008/design.md`
Best image: `desktop-after.png`
Verdict: pass

## Expected UI Spec

- Desktop retains the declared 62/38 list and inspector with independent
  vertical scrolling.
- Scroll affordances use the neutral black/charcoal visual system rather than
  bright operating-system defaults.
- Below 900px, the inspector is the only active scroll surface while open.
- Neither state introduces horizontal overflow.

## Observed Snapshot Report

| State | Evidence | Geometry | Result |
| --- | --- | --- | --- |
| Desktop split | `desktop-after.png` | list 59.3%, gap 0.8%, inspector 37.1%; body overflow false | PASS |
| Mobile inspector | `mobile-after.png` | 390×844; inspector fills viewport; body and list overflow locked | PASS |

Computed scrollbar colors are charcoal `rgb(52, 52, 52)` on black
`rgb(9, 9, 9)` for both desktop panes. Browser console errors: zero.

## Diff Report + Verdict

- Screen: desktop list and selected-case inspector
- Design intent: two independently scrollable neutral panels without accidental
  bright rails.
- Top visual diff fixed: native white scrollbar tracks no longer frame the
  inspector on both sides.
- Top behavior diff fixed: the mobile inspector now disables background list
  scrolling until closed.
- Severity: minor visual defect with a mobile scroll-trap risk.
- Verdict: PASS.

## Fix Plan

Completed in the owning surfaces:

- `eval-dashboard-theme.mjs`: shared slim charcoal scrollbar skin and mobile
  background-scroll lock.
- `eval-dashboard-client.mjs`: toggles `inspector-open` with drawer lifecycle.
- `eval-dashboard.test.mjs`: locks both contracts against regression.

## Design coverage

| Declared state | Evidence | Result |
| --- | --- | --- |
| Desktop 62/38 independent panes | `desktop-after.png` | PASS |
| Narrow full-screen inspector | `mobile-after.png` | PASS |
