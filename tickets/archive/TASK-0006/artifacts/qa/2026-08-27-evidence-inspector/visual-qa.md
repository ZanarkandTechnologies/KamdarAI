---
ticket_id: TASK-0006
state_id: OPERATED-EVAL-DOSSIER
date: 2026-08-27
---

# Operated evidence inspector visual QA

Expected baseline: `tickets/TASK-0006/design.md` — `OPERATED-EVAL-DOSSIER`
Best image: `screens/desktop.png`
Verdict: pass

## Expected UI Spec

- Dark, dense two-panel evaluator with four run metrics, grouped feature cases
  on the left, and one scrollable case inspector on the right.
- The selected case shows linked source inputs before source cards, linked
  human-facing outputs before rendered output content, then expected checks.
- Receipts and implementation evidence remain collapsed technical material.
- At 375px, the case list fills the viewport and the selected inspector becomes
  a dismissible full-screen panel with one-column artifact links.

## Observed Snapshot Report

- Desktop at 1440×1000 shows 7/7 features, 11/11 cases, 82/82 checks,
  15/15 outputs, two workflow groups, four source links, and the selected
  Project output link in the inspector.
- Mobile at 375×812 opens the inspector, renders the output link above the
  generated content, exposes a 44px close target, and has zero horizontal
  overflow.
- `Technical proof` is closed by default. The removed story grid and Run Proof
  strip do not render in the operated evaluator.

## Diff Report + Verdict

- Screen: `OPERATED-EVAL-DOSSIER`
- Design intent: inspect a feature case from source records through actual
  human outputs and pass/fail expectations without replacing outputs with receipts.
- Evidence: `screens/desktop.png`, `screens/mobile-list.png`,
  `screens/mobile-inspector.png`
- Verdict: PASS
- Visual diffs: none material; artifact links use the accepted lavender proof
  treatment, align to the two-column inspector, and collapse to one column.
- Behavior diffs: none material; case selection, mobile inspector opening,
  Escape/close behavior, external links, and collapsed technical evidence are preserved.
- Geometry: desktop has 40/60 list-inspector columns and zero page overflow;
  mobile has zero horizontal overflow, a full-screen inspector, and 44px close control.
- Severity: none
- Fix directives: none
- Best evidence item: `screens/desktop.png`

## Design coverage

| State | Evidence | Desktop | Mobile | Verdict |
| --- | --- | --- | --- | --- |
| Metrics and grouped cases | `screens/desktop.png`, `screens/mobile-list.png` | visible | visible | PASS |
| Source links in inspector | `screens/desktop.png` | four links visible | verified in operated DOM | PASS |
| Human output links | `screens/desktop.png`, `screens/mobile-inspector.png` | above output body | above output body | PASS |
| Expected checks | `screens/desktop.png` | beside output | available below output | PASS |
| Technical proof collapsed | captured DOM state | closed | closed | PASS |
