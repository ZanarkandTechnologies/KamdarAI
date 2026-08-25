---
name: daily-project-memory
description: "Maintain source-linked Daily Project memory by deriving a minimal patch and owning its guarded application handoff."
tier: 3
group: operations
source: local
capability:
  kind: pipeline
  consumes: [kamdar-daily-context-diff]
  produces: [kamdar-project-diff-plan, kamdar-project-diff-application-receipt]
template_uses:
  skill-template: "0.6.1"
allowed-tools: Read, Write, Grep, Glob
---

# Daily Project Memory

## Context

Run after the collector writes a context diff with Project snapshots and changed
Work/Meeting evidence. This pipeline proposes the smallest useful changes to
`Project knowledge` and `This week's attention`, then owns the only possible
handoff to `apply-project-diffs`. Keep proprietary Project facts on the Project
page; do not turn them into a separate wiki or research record.

Use only the context diff, this package's JSON contract/goldens, and the
canonical [Project template](../../templates/project.md) for the content
judgment. `application_mode: prepare` writes only the diff plan. In explicit
`apply` mode, the nested integration still requires exact target preflight,
authority, idempotency, and an observed receipt.

## Skill Signature

```text
run_daily_project_memory(context_diff_path, application_mode = prepare, output_path)
  -> project-diff-plan.json + application receipt | no_finding | configuration_gap
reads: one Daily context diff, Project snapshots, the Project template, local output/goldens,
       and exact preflight only when applying
does: separates durable knowledge from operational attention, proposes patches, and owns the guarded apply handoff
writes: output_path and, only through the nested integration in apply mode, one named Project section
returns: proposed | applied | duplicate | conflict | blocked | no_finding | configuration_gap
```

<!-- BEGIN FARPLANE_IMPORTANT_CHECKLIST -->
## Todo List

- [ ] **N1 — Bind complete embedded Project evidence.**
  `context_diff + Project/Work/Meeting snapshots -> addressed Project source set | configuration_gap`

  Rule: Require a context ID, evidence window, Project ID and current body
  snapshot, changed evidence, and stable source IDs for every proposed patch.
  A missing Project relation, unread source, or unsupported block is a named
  gap. Artifact skills do not perform a compensating provider read.

  Assert:
  - Every patch points to one known Project ID and one or more input source IDs.
  - No provider handle or inferred Project identity enters the output.

- [ ] **N2 — Classify memory versus weekly operational attention.**
  `source-backed fact + current Project sections -> Project knowledge | weekly attention | no_finding`

  Rule: Put a durable, decision-changing proprietary fact, constraint, finding,
  or review condition in `project_knowledge`. Put a concrete current-week
  action, accountable owner, due state, blocker/status, and evidence in
  `this_weeks_attention`. Keep raw transcripts, generic research, and full
  Work lists in their source records.

  Assert:
  - Every attention item is a bounded action, not a copied status history.
  - Every knowledge item states impact, evidence, and a review condition or gap.
  - If an action or review condition has no supplied date, its Project/source ID
    and the missing date appear explicitly in `gaps`; never infer one.

- [ ] **N3 — Propose the smallest valid section patch.**
  `classified evidence + before snapshot -> append | replace section patch + explicit gaps`

  Rule: Append a new non-duplicative knowledge/attention item during the active
  week. Replace only the named item or the whole attention checklist when new
  evidence supersedes it or that Project's embedded
  `weekly_attention_reset.requested` is true. A whole-checklist replacement
  carries the exact reset week, reason, and source in `attention_reset`; a
  false or absent marker never authorizes a reset. Never overwrite an unrelated
  Project section; preserve uncertainty in `gaps` rather than filling it with
  a confident sentence.

  Assert:
  - Each patch declares `target_section`, `operation`, `before_excerpt`, and proposed Markdown.
  - Duplicate source IDs or a material contradiction produce one named gap, not competing patches.
  - A whole-checklist `replace` has `attention_reset.requested: true` and the
    exact embedded reset week, reason, and source; otherwise use append or a
    named-row replacement.
  - An absent commitment, normalisation, or review date is a named gap on the
    patch that depends on it, even when a related task has another due date.


- [ ] **N4 — Apply only through the guarded child integration.**
  `reviewed plan + application mode -> receipt | prepared | conflict | blocked`

  Rule: First render the local JSON contract with source IDs, replace/append
  intent, no-change Projects, source gaps, and a deterministic idempotency key.
  In `prepare`, return that plan with no integration call. In `apply`, call only
  [`apply-project-diffs`](../apply-project-diffs/SKILL.md) with unchanged patch
  text and its exact preflight/adapter inputs.

  Assert:
  - All referenced source IDs exist in the input and all JSON is valid.
  - An applied result requires the child integration's observed receipt; a
    missing adapter, mismatch, or failed guard never changes the patch.
<!-- END FARPLANE_IMPORTANT_CHECKLIST -->

## Templates

- Output contract: [project-diff-plan.json](templates/project-diff-plan.json).
- Collector input: [Daily context template](../../automations/templates/daily-context-diff.json)
  and [sanitized golden](../../automations/examples/golden/daily-context-diff-2026-08-24.json).
- Calibration output: [golden project diff plan](examples/golden/project-diff-plan.json).
- Destination structure: [canonical Project template](../../templates/project.md).
- Nested integration: [`apply-project-diffs`](../apply-project-diffs/SKILL.md).

## Gotchas

- Do not copy Tasks or raw Meeting notes into either Project section. Link the
  source and retain only the insight or the bounded attention action.
- Do not convert an unconfirmed cause into Project knowledge. Cite it as a gap
  and name the evidence that would resolve it.
- Do not replace a weekly checklist mid-week merely because one row changed;
  append or replace the named row unless the context explicitly starts a reset.
- Do not perform a provider read, resolve a live relation, or call an adapter
  outside `apply-project-diffs`. A receipt belongs exclusively to that child.

## Output

One valid `kamdar-project-diff-plan` JSON file at `output_path` containing
minimal Project knowledge and/or weekly-attention proposals, evidence source
IDs, explicit gaps, and append/replace intent; plus the nested application
receipt only in `apply` mode. Return `configuration_gap` without an artifact
when safe embedded Project evidence is absent.
