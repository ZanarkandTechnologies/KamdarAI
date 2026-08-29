# TASK-0010 visual QA

Expected baseline: `tickets/TASK-0010/design.md`
Best image: `output-inspector/screens/desktop-result.png`
Verdict: revise — S4 passes; the current run's S2 safe-failure scenario still does not have a passing feature verdict

## S1 — scenario list

### Expected UI Spec

- Design language: retain TASK-0008's dense pastel-on-black list/inspector.
- Layout: workflow-grouped scenario list on desktop and a full-width list on mobile.
- Hierarchy: run result, workflow, plain scenario title, concise result.
- Interaction: selecting a scenario opens its evidence; workflow groups remain collapsible.

### Observed Snapshot Report

- Desktop shows two workflow groups and eleven independently named scenarios: seven feature evals plus four Daily integration/safety safeguards.
- The fresh saved evidence reports three PASS and eight FAIL across eleven scenarios.
- Mobile preserves all rows at 375 px; labels truncate without horizontal overflow.
- No title contains `canary`, `after-effects`, or a processing-transition identifier.

### Diff Report + Verdict

- Screen: S1 scenario list
- Design intent: a manager can identify the tested business behavior before opening proof.
- Evidence: `output-inspector/screens/desktop-result.png`, `output-inspector/screens/mobile-list.png`
- Verdict: PASS
- Top 3 visual diffs: none material; compact mobile truncation is intentional and leaves the result visible.
- Top 3 behavior diffs: none; two groups and eleven rows are selectable, and the mobile detail closes back to the list.
- Severity: none
- Fix directives: none
- Artifacts: the two screenshots above; static model reports 2 groups and 11 rows.
- Best evidence item: `output-inspector/screens/desktop-result.png`
- Geometry: desktop list occupies the left ~62% and inspector the right ~38%; mobile list uses 364/375 px with no horizontal overflow.

## S2 — selected safe-failure scenario

### Expected UI Spec

- Layout: Given, When, Expected, Observed, Result, then collapsed Technical proof.
- Hierarchy: the PASS reason must be visible without reading raw JSON.
- Responsiveness: the inspector becomes a 375 px full-screen mobile drawer with an accessible close control.

### Observed Snapshot Report

- The fresh FEAT-0004 verdict fails its content assertions, so the current safe-failure scenario is FAILED even though its processing-safety gate passes.
- The earlier PASS capture is superseded by the fresh run.
- Technical proof remains collapsed and the list/drawer interaction has no browser warnings or errors.

### Diff Report + Verdict

- Screen: S2 selected safe-failure scenario
- Design intent: distinguish an expected operational failure from an eval failure.
- Evidence: `screens/feature-evals-restored-desktop.png`
- Verdict: not_provable as the intended PASS state from the current candidate
- Top 3 visual diffs: none material.
- Top 3 behavior diffs: the scenario cannot demonstrate the intended PASS while its bound FEAT-0004 content verdict fails; selection and collapsed proof still behave as declared.
- Severity: major proof gap, not a rendering defect
- Fix directives: repair the FEAT-0004 candidate and rerun it; do not change the UI status manually.
- Artifacts: `screens/feature-evals-restored-desktop.png`
- Best evidence item: `screens/feature-evals-restored-desktop.png`
- Geometry: desktop scroll width equals 1440 px; mobile list width is 364/375 px without horizontal overflow.

## S4 — output-first failed Project update

### Expected UI Spec

- Design language: dense pastel-on-black evidence inspector with raw mechanics behind progressive disclosure.
- Layout: result and five grades first; authored setup next; required checks before a rendered output comparison; Technical proof last and closed.
- Primary interaction: three keyboard-operable section tabs switch one Actual / Expected / Replacement comparison.
- Hierarchy: failure cause, 3/4 completion, metric state, failed requirement, then file content.
- Responsiveness: desktop retains the 62/38 list/inspector split; mobile uses a full-screen 375 px drawer and one-column comparisons.

### Observed Snapshot Report

- Desktop shows `3 of 4 required checks passed` and the source-derived cause before Given/When/Expected.
- All five requested metrics are visible. The legacy judge has no rubric, so each honestly says `Not evaluated`.
- The failed check is first. The Observed output names CMT Pipeline, applied delivery, matched read-back, and three mismatched tabs.
- Actual current, Agent expected current, and Proposed replacement render as escaped text. Technical proof stays closed.
- On mobile, the comparison collapses to one column with no horizontal overflow. Click and ArrowRight tab navigation both changed the selected panel. Browser logs contained no warnings or errors.

### Diff Report + Verdict

- Screen: S4 output-first failed Project update
- Design intent: let a manager understand the failed artifact by reading the actual file content, without receipt or judge internals.
- Evidence: `output-inspector/screens/desktop-result.png`, `output-inspector/screens/desktop-output.png`, `output-inspector/screens/mobile-result.png`, `output-inspector/screens/mobile-output.png`
- Verdict: PASS
- Top 3 visual diffs: none material; the mobile two-column comparison correctly becomes one column.
- Top 3 behavior diffs: none; click and keyboard tab changes work, Technical proof is closed, and unsafe markup is escaped.
- Severity: none
- Fix directives: none for S4.
- Artifacts: four screenshots above; 55/55 focused contract, evaluator, and dashboard tests pass.
- Best evidence item: `output-inspector/screens/desktop-result.png`
- Geometry: desktop list x=1.5–61.2% and inspector x=61.9–98.5%; mobile inspector width is 375/375 px; body scroll width equals viewport width; comparison is two columns on desktop and one on mobile.

## Design coverage

| State | Desktop | Mobile | Verdict |
| --- | --- | --- | --- |
| S1 scenario list | `output-inspector/screens/desktop-result.png` | `output-inspector/screens/mobile-list.png` | PASS |
| S2 safe-failure detail | current fresh run | missing passing current candidate | not_provable |
| S3 stale feature proof | `screens/feature-evals-restored-desktop.png` | `screens/feature-evals-restored-mobile.png` | PASS |
| S4 output-first Project failure | `output-inspector/screens/desktop-result.png`, `desktop-output.png` | `mobile-result.png`, `mobile-output.png` | PASS |

No long-form page, animation, theme switch, or fixed footer is in scope. The detail panel was scrolled through during mobile inspection; its scrollbar remains contained inside the drawer.
