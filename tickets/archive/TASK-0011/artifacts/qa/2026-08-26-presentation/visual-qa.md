---
ticket_id: TASK-0011
kind: visual-qa
status: pass
captured_at: 2026-08-26T07:20:00Z
---

# Presentation inspector visual QA

Expected baseline: `tickets/TASK-0011/design.md`
Best image: `screens/desktop-top.png`
Verdict: pass

No project `docs/TASTE.md` exists; the accepted design language is the
ticket's neutral pastel-on-black, dense two-pane inspector.

## S1 — validated run overview

### Expected UI Spec

One compact header above the scenario list and inspector. Outcome, scenario
count, and validation date appear before the two Daily/Weekly groups. Status is
text plus color; selecting a row is the primary action.

### Observed Snapshot Report

`screens/desktop-top.png` shows `Kamdar Company OS evaluation`, `11/11 passed`,
`11 scenarios`, and `Validated 26 Aug 2026` above both workflow groups. At
1440×1100, the list occupies x=1.6–61.1% and the inspector x=61.8–98.5%.
There is no viewport-level horizontal overflow and browser warnings/errors are
empty. `screens/mobile-list.png` proves the grouped list at exactly 375×812.

### Diff Report + Verdict

PASS. Hierarchy, density, status text, and paired-run summary match S1. The
final copy is customer-facing and the presentation has no technical tags.

### Fix Plan

No change required.

## S2 — Project answer and file inspection

### Expected UI Spec

Result, five Answer quality grades, Completion checks, then the readable
Project comparison: Current Project, Agent read, safe-match state, and Proposed
update. Section tabs must work by keyboard.

### Observed Snapshot Report

`screens/desktop-middle.png` and `screens/desktop-bottom.png` cover the middle
and bottom of the independently scrolling inspector. All five A grades wrap in
one desktop row. The three Project tabs use `tablist`/`tab`/`tabpanel`; pressing
ArrowRight moved selection and focus from Overview to Project knowledge and
hid the previous panel. The inspector reached its exact bottom
(`scrollTop=745`, `scrollHeight=1749`, `clientHeight=1004`).

At 375×812, `screens/mobile-inspector-top.png` shows two-column grade cards,
readable entity rows, no horizontal overflow, and a 44×44 close target.
`screens/mobile-inspector-bottom.png` proves the output bottom after a real
scroll (`1476 + 812 = 2288`). Close returns to the list.

### Diff Report + Verdict

PASS. S2 copy, evidence order, geometry, responsive wrapping, focus behavior,
and long-form coverage match the design. Status never relies on color alone.

### Fix Plan

No change required.

## S3 — non-Project output

### Expected UI Spec

Reports and promoted records appear as readable business documents rather than
raw JSON or an evaluator summary. Markdown headings, tables, lists, status, and
version remain legible; internal front matter does not lead the customer view.

### Observed Snapshot Report

`screens/desktop-report-output.png` shows the Deepavali Weekly report rendered
with headings, paragraphs, tables, and lists. Three document bodies and six
tables are present in the selected report scenario; `template_id` front matter
is absent from visible content. Tables scroll inside their own boundary and do
not create viewport overflow.

### Diff Report + Verdict

PASS. S3 exposes the actual business artifact with readable structure and no
raw-JSON fallback.

### Fix Plan

No change required.

## S4 — internal diagnostic mode

### Expected UI Spec

Engineering mode retains Technical proof, paths, gates, receipts, raw evidence,
and `dashboard.json`; none is emitted by the presentation build.

### Observed Snapshot Report

`screens/internal-technical-proof.png` shows the separately built internal
mode with Technical proof expanded. It contains feature IDs, result paths,
judge/review/receipt paths, and the diagnostic model. The presentation leak
scan and tests reject those same fields from customer output.

### Diff Report + Verdict

PASS. S4 remains available without contaminating the presentation artifact.

### Fix Plan

No change required.

## Design coverage

| State | Desktop | Mobile | Operated evidence | Verdict |
| --- | --- | --- | --- | --- |
| S1 overview | `desktop-top.png` | `mobile-list.png` | both workflow groups visible | PASS |
| S2 Project inspector | `desktop-middle.png`, `desktop-bottom.png` | `mobile-inspector-top.png`, `mobile-inspector-bottom.png` | keyboard tabs, close, scroll-to-bottom | PASS |
| S3 non-Project output | `desktop-report-output.png` | responsive renderer covered by 375px overflow probe | formatted report, 6 tables | PASS |
| S4 internal diagnostics | `internal-technical-proof.png` | not applicable to customer drawer | Technical proof expanded | PASS |

Best evidence item: `screens/desktop-top.png`.
