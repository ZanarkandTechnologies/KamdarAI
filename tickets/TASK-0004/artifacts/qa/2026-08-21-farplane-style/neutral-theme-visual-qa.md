---
kind: visual-qa
ticket_id: TASK-0004
status: pass
created_at: 2026-08-21T16:30:00+08:00
baseline: user-supplied Farplane market-model console reference
best_image: screens/farplane-neutral-final.jpg
supersedes: visual-qa.md
---

# Neutral Farplane console correction

Expected baseline: user-supplied Farplane market-model console reference

Best image: `screens/farplane-neutral-final.jpg`

Verdict: **pass**

## Screen 1 — Operated overview

### Expected UI Spec

- **Design language:** nearly black canvas, neutral charcoal panels, faint square borders, tiny mono copy, and pastel colors restricted to small signal markers.
- **Layout:** edge-to-edge console with a compact status bar, shallow proof header, and two dense operating panels.
- **Hierarchy:** rows and current state first; decoration and marketing copy remain secondary.
- **Geometry:** content width `94–99%`; header height below `16%` of a 720–950px desktop viewport; no horizontal overflow.
- **Color:** no green surface tint, gradient, mint panel, or large colored rail.

### Observed Snapshot Report

Evidence: `screens/farplane-neutral-final.jpg`

- Computed body background is `rgb(2, 3, 2)` and the primary panel is `rgb(9, 10, 9)`.
- Main console occupies `97%` of viewport width.
- Proof header is `128px` high with an `18px` mono title.
- The left operating panel contains eight compact scenario rows with white signal chips; the right panel shows seven Company OS records with five-pixel pastel markers.
- No horizontal overflow is present.

### Diff Report + Verdict

- `User reference neutral-black canvas -> screens/farplane-neutral-final.jpg -> PASS`
- `User reference dense row model -> eight-row scenario table -> PASS`
- `User reference restrained pastel accents -> five-pixel markers and signal chips -> PASS`
- Verdict: **PASS**.

### Fix Plan

No blocking visual correction remains. Preserve the neutral palette and prohibit green-tinted panel tokens from becoming the final cascade again.

## Screen 2 — Feature evidence drilldown

### Expected UI Spec

- Feature rows stay flat and dense.
- One expanded process exposes artifact, behavior, and downstream evidence as aligned console columns.
- Applied and blocked states remain readable without large color fills.

### Observed Snapshot Report

Evidence: `screens/farplane-neutral-feature.jpg`

- Weekly features render as full-width compact rows.
- The expanded knowledge-promotion evidence uses three square-bordered columns across approximately `97%` of the viewport.
- Four artifacts, two behavior checks, four applied Notion calls, and one blocked Drive call remain visible together.
- Status color is limited to text and tiny section markers.

### Diff Report + Verdict

- `TASK-0004 evidence contract -> screens/farplane-neutral-feature.jpg -> PASS`
- `User reference compact console rows -> screens/farplane-neutral-feature.jpg -> PASS`
- Verdict: **PASS**.

### Fix Plan

None. Keep the existing responsive single-column collapse below `820px`.

## Artifacts

- `screens/farplane-neutral-final.jpg` — best overview.
- `screens/farplane-neutral-feature.jpg` — feature drilldown.
- `screens/neutral-console.jpg` — rejected intermediate with a narrower canvas.
- `screens/after-viewport.jpg` — superseded green-tinted version.
