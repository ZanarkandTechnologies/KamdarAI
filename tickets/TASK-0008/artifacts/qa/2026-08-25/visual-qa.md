---
ticket_id: TASK-0008
kind: visual-qa
status: pass
captured_at: 2026-08-25
---

# Visual QA

Expected baseline: `tickets/TASK-0008/design.md`

Best image: `screens/desktop-neutral-theme.png`

Verdict: pass

## COLOR-THEME-CORRECTION

### Expected UI Spec

- Design language: match the supplied reference's neutral near-black canvas,
  charcoal surfaces, gray borders, and warm off-white copy without a green cast.
- Semantic exception: only failed and blocked states may retain muted red or
  amber; passing and selected states remain neutral.

### Observed Snapshot Report

- Evidence: `screens/desktop-neutral-theme.png` at 1440×900 and
  `screens/mobile-neutral-theme.png` at 390×844.
- Browser-computed canvas is `rgb(6, 6, 6)`, panel is `rgb(13, 13, 13)`, border
  is `rgb(39, 39, 39)`, and passing text is `rgb(210, 210, 204)`.
- Every default surface uses equal red, green, and blue channels; text uses only
  a small warm off-white blue reduction rather than a green bias.
- Desktop remains 1440×900 without body overflow; mobile client and scroll
  widths both remain 390px.

### Diff Report + Verdict

- Verdict: PASS.
- Visual diffs: the prior green-biased canvas, panels, rows, borders, links,
  selection, and pass tokens are replaced by neutral charcoal/off-white values.
- Behavior diffs: none; selection, collapse, inspector, and mobile drawer states
  are unchanged.
- Severity: correction closed.

### Fix Plan

- Closed: removed `#050605`, `#0d0f0d`, `#101210`, `#0c0e0c`, `#bccbb7`,
  `#141714`, and `#0b0d0b` from the renderer.
- Guard: the renderer test now requires the neutral token set and rejects those
  green-biased values.

## DESKTOP-EVAL-LIST

### Expected UI Spec

- Design language: dense black console, square borders, small monospace type,
  and no card lift, hero, gradients, or explanatory system chrome.
- Layout: one header above a 62% grouped eval list and 38% selected-case
  inspector; both body panels scroll independently.
- Hierarchy: selected row, inspector verdict and prompt, then evidence sections.
- Responsiveness: desktop remains viewport-bound without body overflow.

### Observed Snapshot Report

- Evidence: `screens/desktop-eval-list.png` at 1440×900.
- Header: x 22, y 18, w 1396, h 48.
- List: x 22, y 76, w 859.31, h 806 (59.7% viewport width).
- Inspector: x 891.31, y 76, w 526.69, h 806 (36.6%).
- Body scroll size equals 1440×900; there is no body overflow.
- Seven generated feature groups and thirteen generated case rows are present.

### Diff Report + Verdict

- Verdict: PASS.
- Visual diffs: none material. The observed 60/37 content split is within the
  declared 62/38 composition after the 10px gap and outer margins.
- Behavior diffs: one initial row-selection defect was found and repaired;
  selecting the Weekly report case now changes both selected row ID and
  inspector title. Feature collapse changes `aria-expanded` and hides its rows.
- Severity: none after repair.
- Fix directives: none.

### Fix Plan

- Closed: use the raw row ID with `getElementById`; CSS escaping belongs only
  in selectors and prevented template lookup.
- Preserve the current border, density, independent scrolling, and progressive
  disclosure while adding future source data.

## INSPECTOR-MOBILE

### Expected UI Spec

- Layout: the list is the default surface; selecting a case opens a full-screen
  inspector drawer with a visible close control.
- Geometry: 390×844 viewport, no horizontal overflow or covered content.

### Observed Snapshot Report

- Evidence: `screens/mobile-eval-list.png` and
  `screens/mobile-eval-inspector.png` at 390×844.
- List body client and scroll widths both equal 390px.
- Inspector opens at x 0, y 0, w 390, h 844 and closes back to the list while
  preserving the selected row.
- Long evidence remains vertically scrollable; entity JSON is collapsed.

### Diff Report + Verdict

- Verdict: PASS.
- Visual diffs: none material; the header wraps to two dense lines as intended.
- Behavior diffs: none after the row-selection repair.
- Severity: none.
- Fix directives: none.

### Fix Plan

- No change required. Preserve the full-screen drawer boundary and avoid adding
  fixed bottom controls that would cover evidence.

## Design coverage

| State | Evidence | Verdict |
| --- | --- | --- |
| `LIST-DEFAULT` | `screens/desktop-neutral-theme.png` | PASS |
| `FEATURE-TOGGLE` | operated `aria-expanded=false` and `case-rows hidden` | PASS |
| `LIST-SELECTED` | operated Weekly row ID and matching inspector title | PASS |
| `INSPECTOR-CLOSE` | operated desktop/mobile close state | PASS |
| `INSPECTOR-MOBILE` | `screens/mobile-neutral-theme.png` | PASS |

## Before / After

- Before: `tickets/TASK-0006/artifacts/qa/deployments/seed-v2-2026-08-25-02/dossier-first-viewport.jpg`
  is a narrow stacked narrative with a hero, environment cards, and no case
  selection surface.
- After: `screens/desktop-eval-list.png` is the reference-aligned wide grouped
  list and selected-case inspector, with technical evidence secondary.
