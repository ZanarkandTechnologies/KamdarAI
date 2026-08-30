---
automation_id: kamdar-evaluate-weekly-review
automation_version: "1.0.0"
kind: company-os-eval-automation
cadence: on-demand
feature_refs: [FEAT-0005, FEAT-0006, FEAT-0007]
---

# Evaluate Weekly Review

## Context

Evaluate one completed Weekly operating review without changing its inputs or
contacting a provider. The Weekly run is immutable: deterministic checks prove
its files, JSON shapes, provenance, receipts, read-back, and inventory before
native read-only subagents judge feature quality. The tester lane cannot
self-approve proof; spawn a separate native read-only evidence reviewer after
the tester files exist.

Load `evals/weekly/suite.json`,
`seed/manifest.json`,
`schemas/automations/weekly_review_result.py`,
`automations/weekly-operating-review.md`, and the report and destination
templates named by the suite.

Use these exact paths under `<run_root>`:

- `weekly/run-manifest-2026-W34.json`
- `weekly/context/weekly-context-2026-W34.json`
- `weekly/review/weekly-review-result-2026-W34.json`
- `weekly/receipts/weekly-integration-receipt-2026-W34.json`
- `weekly/read-back/weekly-integration-read-back-2026-W34.json`
- `eval/deterministic.json`
- `eval/judges/FEAT-0005.json` through `eval/judges/FEAT-0007.json`
- `eval/evidence-review.json`
- `eval/artifact-quality-review.json`
- `eval/integrations.json`
- `eval/result.json`

The parent automation writes eval artifacts. Subagents remain read-only and
return machine-readable JSON for the parent to validate and save. All
integration behavior is mocked; never call live Notion, messaging, email, or
other providers.

## Todo List

- [ ] **1 — Freeze and validate the one Weekly run.**

  Treat the Weekly context, result, integration receipt, and provider read-back
  as immutable inputs. Verify their SHA-256 values against the run manifest
  before judging them. Parse every JSON file, validate the result against
  the `WeeklyReviewResult` Pydantic model, enforce the integration contracts, prove every
  result source ID exists in the immutable
  Weekly context, then prove every context ID exists in the seed. The seed is
  grading evidence, not a runtime source; never fill a missing Project Notes candidate
  by reading seed-only Work facts.

  Inventory `<run_root>/weekly` and `<run_root>/eval`. Reject undeclared files,
  missing required paths, repeated outputs, or a manifest path with the wrong
  artifact kind. Confirm that the result contains `report_results`,
  `promotion_dispositions`, `employee_memory_updates`, `sop_updates`, `carry_forward_updates`, and
  `configuration_gaps`. Write every check and failure to
  `<run_root>/eval/deterministic.json`. Stop before subagents if an immutable
  input is missing, malformed, or changed.

  Run the executable deterministic gate before dispatching testers:

  ```bash
  python3 scripts/validate_eval_run.py weekly <run_root>
  ```

  The immutable W34 expected files under `evals/weekly/expected/` are the
  source-safe reference bundle for local tests; do not mutate them during a run.

- [ ] **2 — Run one feature-scoped tester subagent per Weekly feature.**

  Spawn three native read-only tester subagents. Give each only its feature row
  and case from the suite, the named seed entities and pipeline case, its result
  slice, and the relevant templates:

  | Tester | Result slice | Relevant templates | Judge for |
  | --- | --- | --- | --- |
  | FEAT-0005 | `report_results[]` and `configuration_gaps[]` | Project, Area, and Company report templates | Versioned Project finalization, source-linked report hierarchy, shared sections, immutable prior Final, and truthful Company finalization gate |
  | FEAT-0006 | `promotion_dispositions[]` | Issue, Decision, and employee SOP templates | Complete disposition matrix, correct existing database, preserved workflow/problem baseline, authority, dedupe, provenance, and blocked weak evidence |
  | FEAT-0007 | `carry_forward_updates[]` | Project Notes template | Complete unresolved Work and documentation questions used to initialize next week's Project Notes without changing source Work |

  Each tester follows the suite tier rubric and returns machine-readable tester
  evidence with `lane`, `target`, `claim_under_test`, `tier`, `test_cases[]`,
  `rubric`, `assertions[]`, `evidence[]`, `failures[]`, `artifacts[]`,
  `blockers[]`, and `verdict_path`. `rubric` grades `groundedness`,
  `completeness`, `usefulness`, `repeatability`, and `length_balance` from `A`
  through `D`. Every assertion needs a resolvable JSON pointer or seed/template
  reference. Only tier `A` passes; missing evidence is `D`. `verdict_path` must
  be an absolute path exactly equal to the resolved manifest artifact
  `<run_root>/eval/judges/<feature_id>.json`. A missing, relative, or different
  path is invalid. A tester cannot inspect or judge another feature or write any
  file.

- [ ] **3 — Review the tester evidence independently.**

  After all three tester results exist, spawn one separate native read-only
  evidence reviewer that produced none of them. Give it
  `eval/deterministic.json`, all tester results, their cited immutable evidence
  fragments, and the suite claims, falsifiers, and tier rubric.

  The reviewer checks unsupported claims, scope mismatch, hidden failures,
  unresolved citations, stale evidence, and whether each tester proved the
  entire feature rather than a convenient subset. It may confirm or downgrade a
  tier, never upgrade one without a new tester run. Return machine-readable
  evidence review containing `lane`, `verdict`, `claim_under_test`,
  `reviewed_tiers`, `unsupported_claims`, `scope_mismatch`, `missing_evidence`,
  `weak_artifacts`, `rerun_instructions`, and `fix_candidates`. The parent
  validates and writes it to `<run_root>/eval/evidence-review.json`.

- [ ] **4 — Review the generated artifacts as an end user.**

  Spawn a separate read-only artifact reviewer. Give it the exact Weekly result
  bytes, frozen context, destination templates, and
  `evals/rubrics/end-user-artifact-quality.md`. It must inspect every report,
  promotion disposition, Project replacement, and configuration gap for
  referential clarity, end-user value, readability, template fidelity, and
  groundedness. The parent validates the response with
  `schemas/automations/artifact_quality_review.py` and writes
  `<run_root>/eval/artifact-quality-review.json`. Only tier A proceeds. Route
  B/C prose findings through `unslop` and regeneration; the reviewer remains
  read-only.

- [ ] **5 — Verify mocked integrations and reconcile the verdict.**

  Route each Weekly result section through its local mocked integration adapter.
  Match every intended effect to its immutable receipt and read-back by feature
  ID, operation, target ID, action key, payload hash, outcome, and provider ID or
  URL. For applied effects, compare the complete intended value and hash with
  provider read-back; a receipt link alone is not proof.

  Verify that duplicate, blocked, monitor, dismissed, project-only, conflicted,
  and failed outcomes create no destination row; the already-Final W33 report
  remains unchanged; a missing expected Area prevents a Final Company status;
  source Work remains unchanged; the Project checklist is replaced only when
  expected-current text matches; and an unchanged rerun produces zero duplicate
  effects. Write the integration checks to
  `<run_root>/eval/integrations.json`.

  Reconcile deterministic checks, independently reviewed tester tiers, tier-A
  artifact quality, and integration checks into `<run_root>/eval/result.json`.
  Overall `pass` requires
  every deterministic and integration gate plus independently confirmed tier
  `A` for FEAT-0005, FEAT-0006, and FEAT-0007. Otherwise return `fail` or
  `blocked` with exact evidence paths and the smallest rerun boundary.

  After all declared eval files exist, run the same gate in judged mode; it
  rejects any saved verdict that does not reconcile with the immutable inputs:

  ```bash
  python3 scripts/validate_eval_run.py weekly <run_root> --judged
  ```

## Output

- `<run_root>/eval/deterministic.json`
- `<run_root>/eval/judges/FEAT-0005.json` through `FEAT-0007.json`
- `<run_root>/eval/evidence-review.json`
- `<run_root>/eval/artifact-quality-review.json`
- `<run_root>/eval/integrations.json`
- `<run_root>/eval/result.json`
