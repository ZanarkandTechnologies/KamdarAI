---
ticket_id: TASK-0019
artifact: progress
updated_at: 2026-08-31T00:00:00+08:00
state: offline_complete
---

# TASK-0019 progress

## 2026-08-31 — Minimal private setup verified

- Wired the operated Weekly Doctor path to freeze exactly the active Projects'
  current-week Project Notes before loading Weekly context. Missing Project
  coverage leaves the freeze absent and becomes a visible configuration gap;
  Daily-only Doctor runs do not freeze the week. Weekly reruns also compare the
  current active Project set with the immutable manifest, so an added or removed
  Project blocks stale consolidation.
- Made the distributed fresh-install template—not only the Kamdar development
  context—default to empty artifact-sync and communications tables.
- Removed Reports, Decisions, and SOPs from the fresh-install source table;
  Project Notes, reports, and Employee/SOP/Decision/Issue Memory are canonical
  private files. Older workspaces receive the explicit empty sync block without
  losing owner content.
- Routed both documentation questions and stale-work chases to exact linked Work
  comments by default. Multi-ticket chases fan out to every resolved Work URL;
  unresolved URLs block without database fallback. An explicitly configured
  employee-follow-up route overrides only the progress comments.
- Updated setup guidance, PRD, operator/customer docs, automation/feature
  contracts, and the Markdown-synchronized Pydantic message description.
- Proof: 263 Python tests passed with 2 explicitly gated live tests skipped;
  template sync, context validation, installed offline evals, and diff checks
  passed. Independent re-review found no remaining critical/high issue.
- QA receipt: `artifacts/qa/20260831-minimal-private-setup/result.json`.

## 2026-08-31 — Local-first memory and optional provider sync

- Added a Pydantic `artifact-sync` contract with three artifact roles:
  `short-term memory`, `long-term memory`, and `reports`. Missing rows are
  local-only; partial rows, duplicate roles, and non-HTTPS destinations fail
  validation. There is no enabled/default field.
- Made Stage 2 write Project Notes, Employee/SOP/Decision/Issue Memory, and
  immutable report versions into the private Hermes workspace before any
  optional provider copy. Each provider action depends on the successful local
  action; failed local version/hash guards prevent the copy.
- Split public Person directory records from private Employee Memory. Weekly
  can initialize and update `memory/employees/<person-id>.md` without writing
  private evidence to the configured People database.
- Updated the PRD, Company OS map, operator manual, Daily/Weekly contracts,
  feature docs, workspace configuration, setup review screen, templates, and
  synthetic seeds to use the same short-term/long-term vocabulary.
- Wired Stage 2 to the existing Project Notes lifecycle instead of a generic
  Markdown appender: Daily initialization/append honors locks and frozen weeks;
  Weekly consolidation and deterministic carry-forward run only after all
  required local projections and configured copies succeed.
- Weekly state loading now accepts only a hash-verified freeze, reads nested
  report versions, and loads full Employee/SOP Memory only for referenced IDs.
  Final report versions are immutable; local action receipts persist file hashes
  and revalidate them before a provider retry.
- Provider copies now use the verified complete local Markdown, not an
  extraction delta. Long-term sync cannot target the configured public People
  source, and every employee ID plus resolved memory path is traversal-safe.
- Proof at this checkpoint: all 253 Python tests passed (2 explicitly gated provider tests
  skipped). Template drift, company-context validation, installed offline
  evals, and `git diff --check` passed.
- Independent hostile re-review passed with no remaining critical/high finding.

## 2026-08-31 — Full template-to-Pydantic synchronization

- Extended template sync from the three report templates to all 19 Markdown
  templates. One generated catalog retains each stable ID, version, source
  hash, and exact body; `--check` detects drift without a model call or write.
- Moved documentation-request and employee-follow-up wording and golden
  examples out of hard-coded Daily constants and into their Markdown templates.
  The Daily Pydantic JSON Schema now resolves both descriptions from the
  generated catalog.
- Kept model interpretation limited to the three templates that define report
  shapes. Their generated contract diff is displayed before replacement;
  synthetic report preview remains an explicit prompt or `--preview` action.
- Added the generated catalog to the client distribution and tests proving
  complete inventory coverage, exact body synchronization, Pydantic binding,
  and model-free drift detection for non-report templates.
- Proof: all 225 Python tests passed (2 provider-backed tests skipped), template
  sync reported no drift, and the distribution payload remained below its size
  limit.

## 2026-08-31 — Python/Pydantic consolidation complete

- Removed the JavaScript schemas, evaluators, test harness, package manifests,
  and dependency directories. No JavaScript source or package metadata remains.
- Ported Project Notes, cross-Project reducers, template sync, report models,
  seed validation/private compilers, feature-outcome evaluation, run validation,
  and the evidence viewer to Python.
- Added Pydantic contracts for automation results, report extraction, seed and
  realism review, feature judges, evidence review, and integration gates.
- Added a repository guard that fails if the retired toolchain or a
  non-importable generated report contract returns.

## 2026-08-31 — Complete offline QA passed

- Full Python boundary: 219 tests passed, 2 provider-backed tests skipped, 0 failed.
- Report-template sync, company-context validation, packaged installed evals,
  and whitespace/error checks passed.
- QA receipt: `artifacts/qa/20260831-project-notes-projection/result.json`.
- Residual deployment gate: authenticated Notion, Drive, and messaging writes
  still require configured private destinations and explicit authority.

## 2026-08-31 — Test ownership consolidated

- Merged the automation-contract and feature-outcome checks into their existing
  owner suites, reducing the test layout from 33 modules to 31.
- Removed redundant source-layout and archived-prototype assertions.
- Removed the unreferenced Daily documentation runner, its runner-only tests,
  and its obsolete hard-coded Notion data-source ID.
- Preserved the automation, Pydantic validation, setup-boundary, and reference
  feature-outcome behavior checks in the consolidated suites.

## 2026-08-31 — Project Notes and Weekly projections implemented locally

- Replaced the shared mutable Draft with one guided Project Notes template and
  standard-library writer. Daily appends per Project; exact reruns preserve
  bytes; key conflicts do not write; a frozen week rejects new notes.
- Added all-Project coverage validation, exclusive week locking, immutable
  freeze manifests, consolidation receipts, and unresolved carry-forward.
- Added an all-or-nothing legacy converter. It preserves source-key identity,
  publishes every Project directory in one rename, and records a repair receipt
  instead of exposing a partial migration.
- Migrated Daily and Weekly Pydantic contracts, fixtures, receipts,
  automation prompts, reference automation, and eval packets to Project Notes.
  Weekly raw Work/Meeting input remains forbidden.
- Added cross-Project Employee Memory and workflow/SOP reducers. Employee
  observations merge by Person + Work; SOP samples merge by workflow key.
  Baseline proposals require three comparable samples across two Projects and
  remain owner-approval gated.
- Added guarded Person and SOP Markdown application. Person persistent memory
  and latest-week evidence update with version/hash checks; SOP weekly samples
  update without changing the approved baseline version.
- Removed the old Draft template, writer, and test. Runtime distribution now
  includes the dependency-free Project Notes writer.

### Focused proof

```text
python3 -m unittest tests.unit.scripts.test_project_week_notes -v
# 4 pass

python3 -m unittest tests.unit.scripts.test_project_note_reducers -v
# 4 pass

python3 -m unittest tests.unit.schemas.test_weekly_and_meeting_contracts tests.harness.evals.test_validate_eval_run -v
# 23 pass

python3 -m unittest tests.unit.schemas.test_automation_contract_validation -v
# 5 pass

python3 -m unittest tests.unit.schemas.test_weekly_and_meeting_contracts -v
# 14 pass
```

External Notion/Drive/message writes remain separately gated by client
destination bindings, authentication, permissions, and explicit authority.

## 2026-08-29 — Hermes profile invocation and reproducible generated contracts

- Removed the undocumented `kamdar` executable dependency from report sync.
  That executable was only a Hermes profile alias; the sync command now invokes
  `hermes -p vishan-kamdar-ai` directly and supports
  `KAMDAR_HERMES_PROFILE` when the maintained source profile has a different
  ID. Customer setup still runs Hermes inside Docker and installs no host CLI.
- Narrowed the root report-output ignore rule so `schemas/reports/*.py`
  are committed derived contracts. A clean clone can therefore run the
  model-free `python3 scripts/sync_report_templates.py --check` without first reconstructing
  missing generated state.
- Added a unit assertion that the interpreter uses the raw Hermes profile
  command and never depends on a `kamdar` alias.

## 2026-08-29 — Interactive report-template synchronization

- Added `python3 scripts/sync_report_templates.py`: it scans every report template, compares the
  Markdown SHA-256 with its generated module, interprets only changed files,
  displays the structured contract delta, and writes `schemas/reports/*.py`.
- Preview generation is not implicit. An interactive run asks
  `Generate synthetic test report preview? [y/N]`; non-interactive runs default
  to no, while `--preview` is the explicit override.
- `--check` is a model-free, non-writing content-hash check suitable for local
  preflight and CI.
- Project, Area, and Company templates now carry evidence-bound employee-action
  tables. Project reports retain material actions and commitments; Area and
  Company reports roll up only items that need that management level's
  visibility. The instruction explicitly prohibits inferred personality,
  intent, or performance ratings.
- Consolidated the implementation on Python/Pydantic, matching setup orchestration,
  automation contracts, generated report contracts, and the eval harness. Hermes
  supplies Pydantic, so the repository no longer carries a second schema runtime.
- Independent review found and the implementation now rejects incomplete or
  malformed AI interpretations, duplicate table keys, unsafe template IDs,
  output-path escapes, unresolved placeholders, and malformed table cells. A
  requested preview is rendered and validated before either the schema or
  preview is committed, so a rejected preview cannot leave a false synchronized
  hash behind.

### Proof

```text
python3 -m unittest tests.integration.test_report_template_sync -v
# 4 tests, 4 pass, 0 fail

python3 scripts/sync_report_templates.py --check
# All report templates are synchronized; no model call or write

python3 -m unittest discover -s tests -p 'test_*.py' -v
# 109 tests, 107 pass, 0 fail, 2 skip

python3 scripts/validate_company_context.py --context workspace.hermes.md
# context_valid=true
```

At the 2026-08-29 checkpoint, seven `test_setup_launch` failures exposed local-
variable shadowing of `profile_home` in `scripts/setup_cli/flows/lifecycle.py`.
That separate defect was resolved before the 2026-08-31 consolidation; the
current full-suite result is recorded above.

## 2026-08-29 — Markdown-to-Pydantic synchronization prototype

### Prototype Note

- **Hypothesis:** a maintainer can keep plain Markdown as the report tuning
  surface while an AI interpretation copies section instructions nearly
  verbatim and proposes headings, tables, bullets, examples, cardinality,
  optionality, and nested row structure for deterministic compilation to Pydantic.
- **Scale risk:** automatically interpreting every template would create a
  lossy second contract and could silently drift production schemas, prompts,
  examples, and renderers.
- **Representative slice:** the Project `templates/weekly-report.md` true path
  plus the Company `templates/company-operating-rollup.md` hierarchy edge. The
  Project case runs the complete extraction, cleanup, and render round trip;
  both templates compile against their real headings, tables, instructions,
  placeholders, frontmatter ID/version, and golden examples.
- **Manual / non-scalable move:** reviewed JSON fixtures stand in for the AI
  response. The prototype deliberately has no model call, auto-apply path, YAML
  schema contract, schema editor, database, publish queue, or provider write.
- **Evidence observed:** `scripts/markdown_report_contract.py` treats the AI
  response as untrusted input, validates it against Markdown observations,
  builds a strict runtime Pydantic schema and JSON Schema, validates a structured
  Project extraction, rejects fact-changing prose cleanup, and renders the
  same frontmatter/heading/table shape. Focused tests cover compatible compile,
  exact instruction descriptions, golden-example observation, nested table
  rows, cardinality and optionality ambiguity, description drift, structural
  drift, cleanup invariants, and round-trip rendering.
- **Promote criteria:** run the same reviewed interpretation boundary against
  the Area template and at least 10 realistic extraction variations; require
  zero silent shape changes, actionable errors for every incompatible edit,
  and a reviewed decision on where internal interpretation snapshots live.
- **Revise / stop criteria:** stop automatic compilation if real templates need
  hidden semantics that cannot be stated in Markdown instructions or a minimal
  reviewed annotation, if cleanup invariants cannot preserve citations and
  quantitative facts, or if generated Pydantic becomes less inspectable than the
  current authored schema.
- **Next scale step:** bind the compiled exemplar to the Stage 1/Stage 2 seam
  only after the week-first private-report writer stabilizes; do not replace
  `WeeklyReviewResultSchema` from this prototype.

### Proof

```text
python3 -m unittest tests.integration.test_report_template_sync -v
# 4 tests, 4 pass, 0 fail

python3 scripts/markdown_report_contract.py \
  templates/weekly-report.md \
  tickets/TASK-0019/artifacts/template-drift-cases/weekly-report.interpretation.json \
  tickets/TASK-0019/artifacts/template-drift-cases/weekly-report.extraction.json
# compatible: true; extraction_valid: true

python3 -m unittest discover -s tests -p 'test_*.py' -v
# 102 tests, 100 pass, 0 fail, 2 skip
```

### Prototype-only boundaries

- The interpretation fixtures are reviewed AI-output stand-ins, not a new
  end-user editing surface or production schema source.
- Sentence counting and protected-token detection are representative safety
  checks, not a complete natural-language verifier.
- The compiler is pure and read-only. It returns a diff or compiled in-memory
  contract and never rewrites templates or production Pydantic files.
