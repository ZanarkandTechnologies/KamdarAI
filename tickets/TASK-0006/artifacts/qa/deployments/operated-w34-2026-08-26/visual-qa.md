---
artifact: visual-qa
scope: operated-w34-receipt-bound-dossier
date: 2026-08-26
verdict: pass
---

# Operated W34 dossier visual QA

Expected baseline: `tickets/TASK-0006/design.md` — `OPERATED-W34-DOSSIER`

Best image: in-app Browser capture, desktop 1280×720; the capture was inspected
in this task and is not stored as a source file.

Verdict: pass

## Screen: `OPERATED-W34-DESKTOP`

### Expected UI Spec

Dark, square-edged dossier: header, isolated-root/Goal/Track/Progress block,
receipt links, then four evidence sections in a two-column causal grid. No
evaluator score or inspector is present.

### Observed Snapshot Report

At 1280×720 the header occupied x=22..1247 and y=18..66. The dossier occupied
x=22..1247 and y=76..811. Four sections rendered in two 612px columns:
Project memory/Chasing people above Document quality/SOP, Decision, and Problem
accumulation. The public receipt links, Gmail caveat, and all evidence links
were visible in the DOM. Page width was 1269px against a 1280px viewport, so
there was no horizontal overflow.

### Diff Report + Verdict

`OPERATED-W34-DESKTOP -> in-app Browser desktop capture -> PASS`.

The final screen matches the intended hierarchy and contains no legacy
evaluator list, score, `PASSED` claim, local path, or old `3c7...` Notion root.

### Fix Plan

No current fix. Preserve the receipt-only class so a dossier without an
evaluator does not reserve an empty evaluator row below the story.

## Screen: `OPERATED-W34-MOBILE`

### Expected UI Spec

At 375px the evidence sections stack in source-to-outcome order; links wrap,
the page scrolls normally, and there is no horizontal overflow.

### Observed Snapshot Report

At 375×812 the dossier was x=10..354 (344px wide). The four sections were
344px-wide, stacked at y=573, 824, 1090, and 1421. The page had a 2040px
scroll height and a 364px scroll width, so no horizontal overflow. A live
scroll reached y=720 for the chase/document-quality middle frame and y=1228
for the report/Decision/Issue bottom frame.

### Diff Report + Verdict

`OPERATED-W34-MOBILE -> in-app Browser 375px captures -> PASS`.

The Gmail access notes stayed beside their links, the Project/Department/Company
report links wrapped, and the caveat remained visible at the bottom.

### Fix Plan

No current fix. Keep `body.has-operated-story.receipt-only` on normal document
scrolling; an internal body scroll container prevented browser scrolling before
this correction.

## Screen: public receipt document

### Expected UI Spec

A receipt link opens a sanitized, readable static document with a return link
to the dossier and no private runtime material.

### Observed Snapshot Report

`evidence/daily-receipt.html` rendered the Daily title, Notion read-backs,
provider-thread summary, redaction statement, and `← Kamdar Company OS — W34`
return link at 375px.

### Diff Report + Verdict

`public receipt -> in-app Browser mobile capture -> PASS`.

### Fix Plan

No current fix.
