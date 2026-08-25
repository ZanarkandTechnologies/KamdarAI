---
ticket_id: TASK-0008
surface: generated eval dashboard
state: pastel component correction
verdict: pass
date: 2026-08-25
---

# Visual QA — pastel component correction

## Expected UI spec

- Neutral black canvas and panels; no green surface tint.
- Small peach, lavender, mint, pink, and yellow square markers provide visual
  grouping without turning the interface into colored cards.
- Compact pills carry generated run metrics and case metadata; compact tags
  carry status.
- Desktop keeps a 62/38 independently scrolling list and inspector.
- Mobile keeps every row inside the viewport and opens the selected case as a
  full-screen inspector.
- Feature and case content remains generated from the normalized eval model.

## Observed snapshot report

| State | Evidence | Result |
| --- | --- | --- |
| Desktop list + inspector | `desktop-after.png` | PASS — neutral panels, pastel markers, compact generated metrics/status, readable 62/38 split |
| Mobile feature list | `mobile-list-after.png` | PASS — 390px viewport has no horizontal overflow; status tags remain visible |
| Mobile inspector | `mobile-inspector-after.png` | PASS — selection opens the full-screen drawer; close control is visible |

## Behavior checks

- Feature collapse updates `aria-expanded` and hides only its owned case rows.
- Mobile selection opens the inspector and close returns to the list.
- Browser console reported no errors.
- DOM source contains 7 generated feature groups, 13 generated case rows, and
  56 generated checks.

## Diff report

- Replaced the monochrome-only navigation with restrained pastel orientation
  markers and semantic status tags.
- Replaced the plain run-summary sentence with generated compact metric pills.
- Consolidated inspector status, category, and tier into one metadata strip.
- Fixed the mobile intrinsic-width overflow that pushed row status off-screen.
- Split the monolithic document renderer into components, theme, client
  interactions, and document composition.

## Residual risk

- The static dashboard is verified against the current typed 7-feature,
  13-case model. New exceptionally long unbroken source values should continue
  to be covered by the renderer's overflow tests.
