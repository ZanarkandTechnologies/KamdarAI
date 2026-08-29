---
ticket_id: TASK-0019
artifact: progress
updated_at: 2026-08-29T00:00:00+08:00
state: implementation_in_progress
---

# TASK-0019 progress

## 2026-08-29 — Interactive report-template synchronization

- Added `npm run report:sync`: it scans every report template, compares the
  Markdown SHA-256 with its generated module, interprets only changed files,
  displays the structured contract delta, and writes `schemas/reports/*.zod.mjs`.
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
- Kept the implementation in Node/Zod. Python already owns setup orchestration,
  but that code is standard-library based and Pydantic is not installed. The
  report compiler, generated schemas, and filesystem eval harness are already
  JavaScript/Zod, so adding Pydantic would create a second schema runtime.
- Independent review found and the implementation now rejects incomplete or
  malformed AI interpretations, duplicate table keys, unsafe template IDs,
  output-path escapes, unresolved placeholders, and malformed table cells. A
  requested preview is rendered and validated before either the schema or
  preview is committed, so a rejected preview cannot leave a false synchronized
  hash behind.

### Proof

```text
node --test evals/filesystem/tests/report-template-sync.test.mjs \
  evals/filesystem/tests/markdown-report-contract.test.mjs
# 11 tests, 11 pass, 0 fail

npm run report:sync -- --check
# All report templates are synchronized; no model call or write

node --test evals/filesystem/tests/*.test.mjs
# 109 tests, 107 pass, 0 fail, 2 skip

python3 scripts/validate_company_context.py --context workspace.hermes.md
# context_valid=true
```

The full Python suite currently has seven pre-existing `test_setup_launch`
failures caused by local-variable shadowing of `profile_home` in
`scripts/setup_cli/flows/lifecycle.py`. TASK-0019 does not touch that owner.

## 2026-08-29 — Markdown-to-Zod synchronization prototype

### Prototype Note

- **Hypothesis:** a maintainer can keep plain Markdown as the report tuning
  surface while an AI interpretation copies section instructions nearly
  verbatim and proposes headings, tables, bullets, examples, cardinality,
  optionality, and nested row structure for deterministic compilation to Zod.
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
- **Evidence observed:** `scripts/markdown_report_contract.mjs` treats the AI
  response as untrusted input, validates it against Markdown observations,
  builds a strict runtime Zod schema and JSON Schema, validates a structured
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
  quantitative facts, or if generated Zod becomes less inspectable than the
  current authored schema.
- **Next scale step:** bind the compiled exemplar to the Stage 1/Stage 2 seam
  only after the week-first private-report writer stabilizes; do not replace
  `WeeklyReviewResultSchema` from this prototype.

### Proof

```text
node --test evals/filesystem/tests/markdown-report-contract.test.mjs
# 4 tests, 4 pass, 0 fail

node scripts/markdown_report_contract.mjs \
  templates/weekly-report.md \
  tickets/TASK-0019/artifacts/template-drift-cases/weekly-report.interpretation.json \
  tickets/TASK-0019/artifacts/template-drift-cases/weekly-report.extraction.json
# compatible: true; extraction_valid: true

node --test evals/filesystem/tests/*.test.mjs
# 102 tests, 100 pass, 0 fail, 2 skip
```

### Prototype-only boundaries

- The interpretation fixtures are reviewed AI-output stand-ins, not a new
  end-user editing surface or production schema source.
- Sentence counting and protected-token detection are representative safety
  checks, not a complete natural-language verifier.
- The compiler is pure and read-only. It returns a diff or compiled in-memory
  contract and never rewrites templates or production Zod files.
