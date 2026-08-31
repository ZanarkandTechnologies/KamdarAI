---
name: pm-weekly
description: Turn one frozen week of Project Memory into final Project, Department, and Company reports plus grounded long-term memory updates.
---

# PM Weekly

## Use when

Run after the final Daily update for the week. This skill reads the complete
frozen Project set and edits local artifacts only. It does not fetch provider
data, send the executive report, or sync files.

## Inputs

- Every `weeks/<week>/project-memory/project--<project-id>.md`
- Existing Project, Department, and Company reports for comparison
- Existing `memory/{employees,sops,issues,decisions}/` entries
- `templates/{weekly-report,area-operating-rollup,company-operating-rollup}.md`
- `templates/executive-distribution.md`
- `../pm-daily/templates/project-memory.md` for next-week initialization
- Shared entity templates under the repository `templates/` directory

## Outputs

- `weeks/<week>/reports/projects/project--<id>.md`
- `weeks/<week>/reports/departments/department--<id>.md`
- `weeks/<week>/reports/company.md`
- Grounded updates under `memory/{employees,sops,issues,decisions}/`
- Next-week Project Memory files containing unresolved attention only
- One executive-distribution draft under `weeks/<week>/outbound/`
- No other files

## Workflow

- [ ] **1 — Freeze the complete weekly input.**
  Rule: enumerate every expected active Project before analysis. Do not proceed
  from a partial Project set or mix weeks.
  Assert: each selected Project has one readable current-week memory file; gaps
  are named and affected rollups remain blocked.

- [ ] **2 — Finalize Project reports.**
  Rule: use the weekly-report template and compare with the previous report.
  Separate observed results, open attention, problems, decisions, SOP signals,
  and next actions. Preserve measurement gaps instead of estimating value.
  Assert: every material claim cites Project Memory evidence and each Final
  report has the complete template structure.

- [ ] **3 — Roll reports upward.**
  Rule: Department reports read only Final Project reports; the Company report
  reads only Final Department reports. Use their matching templates.
  Assert: each rollup links all immediate source reports and never hides a
  blocked or missing child report.

- [ ] **4 — Consolidate long-term memory.**
  Rule: update Employee, SOP, Issue, and Decision entries only from repeated or
  explicitly approved evidence. Keep the current interval separate from the
  durable baseline. One observation may remain Project-only.
  Assert: updates preserve prior valid context, cite source reports, and label
  unmeasured Before/After values as gaps.

- [ ] **5 — Carry attention forward and draft distribution.**
  Rule: initialize next week from unresolved work only. Render the executive
  distribution template from the complete Final Company report.
  Assert: resolved items do not reappear; the draft contains no invented
  provider URL or delivery receipt.

- [ ] **6 — Verify the artifact boundary.**
  Rule: inspect the changed-file list and reread every changed artifact.
  Assert: only declared outputs changed, templates are complete, source links
  resolve to the frozen input, and no provider action was attempted.

## Golden behavior

A workflow observed once stays in Project reporting with its measurement gaps.
A repeated, receiver-accepted workflow may update the SOP's latest interval
evidence, but it does not replace an approved baseline without explicit proof.

## Proof

Cases and frozen inputs live in `evals.json` and `evals/`. Evals assert report
coverage, template headings, source links, conservative promotion, preserved
long-term memory, correct carry-forward, and no unauthorized effects. Review
every output for readable conclusions and next actions, complete template use,
explicit uncertainty, and source-grounded measurements. Workflow observations
must remain reconstructable. Do not expose unexplained opaque IDs or hashes in
reader prose. Financial claims must show their sourced formula; missing inputs
become an owned measurement gap. Estimated value must never appear verified,
and a failed quality review blocks provider application.
