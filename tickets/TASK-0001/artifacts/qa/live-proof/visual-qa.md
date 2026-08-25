---
kind: visual-qa-report
ticket_id: TASK-0001
verdict: pass
generated_at: 2026-08-21T11:20:00+08:00
---

# Visual QA

Expected baseline: ticket state.
Best image: `tickets/TASK-0001/artifacts/qa/live-proof/desktop-results.png`
Verdict: pass.

## Expected UI Spec

The proof surface should read like the Howie Test / Run / Results system:
quiet, operational, light, dense, and inspection-first. The first screen must
make Live POC status obvious, the tab strip must expose Test, Run, and Results,
and the user must be able to inspect expected calls, files, tool trace, scored
assertions, and showcase output without seeing live recipients or secrets.

## Observed Snapshot Report

- `desktop-overview.png`: shows Kamdar Manager Proof, Live POC selected,
  provider readiness for Notion, Drive, Email, and Telegram, and the exact
  owner request.
- `desktop-run.png`: shows Run selected, 13 connector calls, and the safety
  notice that processor network calls are zero and live evidence is external
  receipt based.
- `desktop-results.png`: shows Results selected, Proof passed, 37 passed / 0
  failed, live-poc evidence, output files, and assertion verdicts.
- `desktop-showcase.png`: shows the generated standalone showcase with live POC
  connector proof and recorded tool activity.
- `narrow-results.png` and `narrow-results-pass.png`: show mobile-like stacking
  and pass verdict rows without text overlap or horizontal break.

## Diff Report + Verdict

- Header and mode control: PASS. The mode switch is at the expected top-right
  desktop region and remains reachable at narrow width.
- Main content bounds: PASS. Content is constrained to a single proof shell,
  with no clipped headings or broken grid at desktop or narrow widths.
- Run evidence: PASS. `desktop-run.png` exposes the trace and call count instead
  of hiding the live adapter receipts.
- Result evidence: PASS. `desktop-results.png` exposes the pass banner, score,
  output files, and assertion list.
- Privacy presentation: PASS. Screenshots show logical people/task IDs and
  redacted contact behavior; no runtime email address, chat ID, token, or live
  provider ID is visible.
- Geometry assertions: PASS. Desktop CTA/mode control appears in the upper
  75-95% x band and 8-18% y band of the shell; tabs span the shell width below
  the selected behavior section; narrow view stacks readiness cells in one
  column and keeps text within the viewport.

## Fix Plan

None required for this POC proof. Residual capture quality issue: visible macOS
browser chrome and Codex overlay are artifacts of available capture tooling,
not app layout defects.
