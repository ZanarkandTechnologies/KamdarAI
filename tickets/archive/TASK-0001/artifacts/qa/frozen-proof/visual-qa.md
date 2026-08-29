---
kind: visual-qa-report
ticket_id: TASK-0001
status: pass
created_at: 2026-08-21T13:55:00+08:00
runtime_target: http://127.0.0.1:4179
---

# Visual QA - frozen proof UI

Expected baseline: Agent Contract
Best image: tickets/TASK-0001/artifacts/qa/frozen-proof/screens/ui-home-playwright.png
Verdict: pass

## Screen: Proof Console

### Expected UI Spec

- Design language: quiet light proof console, dense enough to inspect the
  Company OS rather than a marketing page.
- Layout map: top identity/status bar, compact intro with run action, five-step
  proof navigation, then story and Company OS sections.
- Primary CTA: upper-right run card, visible in the first viewport.
- Visual hierarchy: proof title, run state, then database/routing content.
- Geometry: CTA x 75-98%, y 5-18%; main content x 8-92%; no horizontal overflow.

### Observed Snapshot Report

Evidence: `screens/ui-home-playwright.png`

The first viewport shows the compact proof console, frozen/no-write status,
run button, story, database purpose map, relationship map, template routing,
and real directory route.

### Diff Report + Verdict

PASS. The oversized hero from the prior capture was removed. The UI now starts
with a usable console and exposes the Company OS records/routing before the
long generated-file sections. No overlapping text or clipped controls are
visible at 1440x1100.

### Fix Plan

No visual blocker remains for this ticket. Future polish can add sticky
section navigation or explicit mobile screenshots, but those are not required
for the current proof claim.

## Screen: Generated Showcase

### Expected UI Spec

- Design language: shareable static proof, focused on verdict and assertion rows.
- Layout map: title, pass summary, report hierarchy, then assertion table.
- Visual hierarchy: 23/23 verdict first, assertion evidence second.
- Geometry: content x 15-85%; table rows readable without horizontal overflow.

### Observed Snapshot Report

Evidence: `screens/showcase-playwright.png`

The showcase displays `PASS - 23/23`, the Project -> Area -> Company hierarchy,
and visible PASS rows for the file and behavior assertions.

### Diff Report + Verdict

PASS. The shareable proof page renders the current run verdict and assertion
evidence clearly. The screenshot does not show the whole table because the
page is scrollable, but the API/result artifacts prove the complete 23-row
set.

### Fix Plan

No ticket-blocking visual fix.
