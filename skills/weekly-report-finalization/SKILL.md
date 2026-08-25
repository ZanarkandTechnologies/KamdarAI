---
name: weekly-report-finalization
description: "Turn the completed current Weekly Draft into Project, Department, and Company reports plus review-gated promotion plans."
tier: 3
group: operations
source: local
capability:
  kind: pipeline
  consumes: [kamdar-current-weekly-draft, kamdar-project-snapshot]
  produces: [kamdar-weekly-finalization-plan, kamdar-weekly-report-hierarchy]
template_uses:
  skill-template: "0.6.1"
allowed-tools: Read, Write, Grep, Glob
---

# Weekly Report Finalization

## Context

Run once per week after Daily pipelines have directly accumulated their owned
entries in the current Markdown Weekly Draft. It finalizes that existing Draft
into Project, Department, and Company reports and prepares promotion review.
It never writes another Draft anchor or re-extracts Decisions/SOPs from raw
Work or Meeting evidence.

Use the completed Draft, a supplied canonical local Project snapshot only for
report routing, the report templates, and this package's golden. Provider
publishing and message delivery remain separate future edges.

## Skill Signature

```text
finalize_weekly_report(current_weekly_draft_path, project_snapshot_path, output_root)
  -> weekly-finalization-plan.md + Project/Department/Company Markdown reports |
     no_finding | configuration_gap
reads: one current Draft, local Project routing snapshot, report templates, golden
does: validates Draft anchors, routes report content, retains promotion gaps, renders hierarchy
writes: caller-owned output_root only; never the input Draft or a provider
returns: finalization plan, report paths, promotion-review state, and source gaps
```

<!-- BEGIN FARPLANE_IMPORTANT_CHECKLIST -->
## Todo List

- [ ] **N1 — Bind one completed local Draft.**
  `current Draft + week -> five anchored source-keyed sections | configuration_gap`

  Rule: Require one non-final Draft with all five anchor markers, stable source
  keys, and a week. A missing, malformed, or final Draft is a named gap; do
  not search another file or re-mine Daily evidence.

  Assert:
  - Every final report item traces to a Draft source key.
  - The input Draft is read-only during finalization.

- [ ] **N2 — Route reports without re-synthesis.**
  `Draft entries + local Project snapshot -> Project/Department/Company destinations`

  Rule: Use the supplied Project snapshot only to route known Project and
  Department relations. Do not reinterpret raw Work/Meeting facts or invent a
  new Draft entry. Missing routing is an explicit report gap.

  Assert:
  - Each Project report links its Draft source keys.
  - Department and Company reports aggregate report references, not copied transcripts.

- [ ] **N3 — Keep promotion review-gated.**
  `Proposed Decisions/SOPs + authority/recurrence/proof -> promote | retain`

  Rule: Promote only content whose Draft entry carries the required reviewed
  authority, recurrence, owner, and proof. Otherwise retain it in report
  history as Proposed with the exact gap.

  Assert:
  - A candidate never becomes canonical merely because it appears in the Draft.
  - Promotion plans name a destination, source key, and review condition.

- [ ] **N4 — Render the hierarchy and finalization plan.**
  `routed reports + promotion state -> plan + stable output paths`

  Rule: Render the local finalization plan followed by Project → Department →
  Company reports using the canonical templates. Keep outcomes, problems worth
  solving, and next-week handoff concise and Draft-linked.

  Assert:
  - Outputs have one week, source references, and no unresolved placeholders.
  - Finalization claims no provider publication or executive delivery.

- [ ] **N5 — Return a truthful local completion state.**
  `outputs + gaps -> finalization result`

  Rule: Return report paths, retained/promotion-ready keys, source gaps, and
  the unmodified input Draft path. `no_finding` creates no hierarchy.

  Assert:
  - No second Weekly diff, Draft mutation, or provider receipt is created.
<!-- END FARPLANE_IMPORTANT_CHECKLIST -->

## Templates

- Current Draft: [current-weekly-draft.md](../../automations/templates/current-weekly-draft.md).
- Finalization plan: [weekly-finalization-plan.md](templates/weekly-finalization-plan.md).
- Report templates: [Project weekly report](../../templates/weekly-report.md),
  [Department rollup](../../templates/area-operating-rollup.md), and
  [Company rollup](../../templates/company-operating-rollup.md).
- Golden: [W34 finalization](examples/golden/weekly-finalization-plan-2026-08-24.md).

## Gotchas

- Do not create `weekly-report-diff.md`, re-write a Draft anchor, or duplicate Daily extraction.
- Do not turn a Proposed Decision/SOP into canonical knowledge without its review evidence.
- Do not publish to Notion, Drive, or an executive channel from this local finalization skill.

## Output

One `kamdar-weekly-finalization-plan` Markdown file plus local report hierarchy
under `output_root`. The current Weekly Draft remains the single source of
weekly accumulation.
