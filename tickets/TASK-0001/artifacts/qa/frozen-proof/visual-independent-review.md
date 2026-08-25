---
kind: visual-qa-independent-review
ticket_id: TASK-0001
status: pass
created_at: 2026-08-21T14:03:00+08:00
reviewer: visual-proof-review
baseline: Agent Contract + ascii-prototype sections 0-5
---

# Visual Independent Review - Frozen Proof UI

Expected baseline: Agent Contract
Best image: tickets/TASK-0001/artifacts/qa/frozen-proof/screens/ui-home-playwright.png
Verdict: pass

## Screen: Proof Console

### Expected UI Spec

Design language: quiet, dense, light proof console for inspecting the Company
OS, not a marketing surface. Layout should expose the frozen/no-write status,
run action, section navigation, story, Company OS, Daily, Weekly, and expected
assertion surfaces described in the ASCII prototype. Primary CTA should be in
the first viewport. Typography should stay compact, aligned, and readable.

Geometry assertions:

```json
[
  {
    "element": "statusBadge",
    "expected_bbox_pct": { "x": [82, 99], "y": [1, 6], "w": [10, 18], "h": [2, 5] },
    "observed": "top-right, within expected bounds",
    "verdict": "PASS"
  },
  {
    "element": "runCta",
    "expected_bbox_pct": { "x": [68, 99], "y": [6, 16], "w": [18, 28], "h": [6, 10] },
    "observed": "upper-right run card, visible above fold",
    "verdict": "PASS"
  },
  {
    "element": "sectionNav",
    "expected_bbox_pct": { "x": [8, 92], "y": [15, 24], "w": [80, 88], "h": [3, 7] },
    "observed": "five equal tabs below intro",
    "verdict": "PASS"
  },
  {
    "element": "mainContent",
    "expected_bbox_pct": { "x": [8, 92], "y": [24, 100], "w": [80, 88], "h": [60, 76] },
    "observed": "story and Company OS sections aligned on the same grid",
    "verdict": "PASS"
  }
]
```

### Observed Snapshot Report

Evidence: `screens/ui-home-playwright.png` at 1440x1100.

The clean Playwright capture shows the product identity, frozen/mock/no-write
badge, visible `Run Daily -> Weekly proof` action, five-section proof
navigation, story summary, Company OS database map, relationship map, template
routing, and real directory route. The page uses restrained green accents,
thin borders, compact headings, and readable table/callout spacing.

### Diff Report + Verdict

PASS. The screenshot matches the ASCII intent for sections 0-2 and makes the
remaining Daily/Weekly/Expectations states discoverable through the section
navigation. No overlapping text, clipped controls, broken font loading, or
unexplained empty space is visible in the clean desktop capture.

### Fix Plan

No ticket-blocking visual fix. Do not use the OS-window screenshots as primary
evidence because Safari chrome, notifications, dock, and sidebars obscure the
UI. If compact/mobile evidence is later required, regenerate it from the app
route; the current `ui-home-compact.png` is unrelated scenic imagery and must
not be cited as proof.

## Screen: Showcase Result

### Expected UI Spec

Design language: shareable proof receipt. Layout should lead with the frozen
mock/no-provider context, the template-first proof title, a pass summary, the
Project -> Area -> Company hierarchy, and a readable assertion table. The
primary attention target is the 23/23 verdict; the second is the assertion
evidence list.

Geometry assertions:

```json
[
  {
    "element": "contentColumn",
    "expected_bbox_pct": { "x": [12, 24], "y": [3, 8], "w": [60, 76], "h": [85, 97] },
    "observed": "centered readable column",
    "verdict": "PASS"
  },
  {
    "element": "verdictPanel",
    "expected_bbox_pct": { "x": [14, 86], "y": [14, 26], "w": [65, 75], "h": [8, 14] },
    "observed": "PASS - 23/23 panel appears before assertions",
    "verdict": "PASS"
  },
  {
    "element": "assertionTable",
    "expected_bbox_pct": { "x": [14, 86], "y": [28, 100], "w": [65, 75], "h": [55, 72] },
    "observed": "three-column assertion table with readable rows",
    "verdict": "PASS"
  }
]
```

### Observed Snapshot Report

Evidence: `screens/showcase-playwright.png` at 1440x1100.

The showcase shows `Frozen mock - no provider writes`, `Kamdar template-first
proof`, `PASS - 23/23`, the report hierarchy sentence, and assertion rows with
green PASS states and evidence paths. The table is scrollable; the complete
row set is supported by `generated/result.json`.

### Diff Report + Verdict

PASS. The result screen is plain but appropriate for a proof artifact: the
verdict and assertion evidence are immediately visible, aligned, and readable.
No row overlap or horizontal clipping is visible in the desktop capture.

### Fix Plan

No ticket-blocking visual fix. For a friend-facing link later, consider adding
anchor links or a compact summary table above the full assertion list, but that
is polish outside this ticket's visual acceptance gate.

## Evidence Notes

- Trusted evidence: `ui-home-playwright.png`, `showcase-playwright.png`.
- Supporting but noisy evidence: `ui-home.png`, `showcase.png`.
- Not accepted as visual proof: `ui-home-compact.png` and
  `showcase-compact.png`; at least `ui-home-compact.png` displays unrelated
  scenic imagery.
