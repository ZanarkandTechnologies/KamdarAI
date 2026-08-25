---
kind: visual-qa-evidence
ticket_id: TASK-0005
status: pass
captured_at: 2026-08-21T19:30:00+08:00
surface: http://127.0.0.1:4179/showcase
---

# Operated showcase visual proof

## Observed layout

The fresh local page reports `OPERATED SHOWCASE · RECEIPT-BACKED`, `9/9
features covered`, and `44/44 assertions pass`. At a 1280 × 720 browser
viewport, its only page-level content column is 768px wide at x=248.5. Core
body type resolves to 13px.

| Capture | What it proves |
| --- | --- |
| [Hero](operated-showcase-v4-hero.png) | Dark, square, Farplane-style shell; centered one-column layout; 44/44 receipt-backed headline; provider blockers stay visible. |
| [Expanded Daily artifact](operated-showcase-v4-daily-artifact.png) | A generated Markdown file expands in place, names its template, shows economic/cause content, and exposes exact applied Notion links. |

## Behavior audit

- `GET /api/result/latest` returned `operated-showcase`, 44/44, 18 applied
  Notion receipts, 5 blocked provider actions, and idempotency pass.
- `GET /showcase` returned `OPERATED SHOWCASE` after a separate frozen rerun.
- The page exposes 19 artifact previews, 14 template cards, and database/result
  links inside the isolated v4 Notion environment.
- Frozen UI runs use a separate root and cannot replace this operated proof.

## Independent verdict

The independent visual lane returned **TAS-A / pass** after inspecting the
recaptured top viewport and expanded Daily artifact. No visual blocker remains.
