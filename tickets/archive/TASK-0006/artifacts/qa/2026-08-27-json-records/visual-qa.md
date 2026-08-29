# Visual QA — compact JSON source records

- **Expected baseline:** `tickets/TASK-0006/design.md`, section `OPERATED-EVAL-DOSSIER`.
- **Best proof:** `screens/desktop-links-inside-cards.png`.
- **Verdict:** Pass.

## Expected UI spec

- Each source record is a compact one-line summary with type, name, status, and
  its matching platform link inside the card.
- Expanding a record reveals its complete, human-labelled JSON.
- One shared interaction is used for Project, Work, Meeting, Report, and Person records.
- A safe source URL, when present, is visible without expanding the card.
- No separate source-link grid duplicates the records.
- Desktop and mobile layouts must not overflow horizontally.

## Observed snapshot report

- Desktop collapsed view shows five compact records; all four operated Work
  inputs expose `OPEN ↗` inside their matching cards.
- Desktop expanded view reveals the Project JSON within the same record.
- Mobile expanded view preserves the JSON and a 44px close target.
- Corrected desktop DOM probe: 5 records, 4 visible in-card source links, 0
  separate source-link grids, and 0px horizontal overflow.
- Assertion Review probe: one computed 494px grid column, two vertically
  ordered panels (`Actual agent output` then `Expected criteria`), and 0px
  horizontal overflow.
- Earlier expanded desktop/mobile probes still show 0 legacy semantic UI nodes
  and 0px horizontal overflow.

## Diff report and verdict

No material mismatch against the expected baseline. The JSON is intentionally scroll-bounded for long records; this keeps the case inspector usable while preserving the complete source payload. **Pass.**

## Fix plan

None required for this change. Revisit only if real records introduce JSON shapes that are unreadable at the current 10px monospace size.

## Coverage

- Desktop: `screens/desktop-links-inside-cards.png`,
  `screens/desktop-single-column-assertion-review.png`,
  `screens/desktop-expanded.png`
- Mobile: `screens/mobile-expanded.png`
