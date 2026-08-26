# Kamdar evaluation surfaces

The active acceptance surface uses one immutable run per automation:

- `daily-review-evals.json` binds FEAT-0001–0004 to the four arrays in one
  schema-valid `DailyReviewResult`;
- `weekly-review-evals.json` binds FEAT-0005–0007 to one Weekly result;
- `seed/kamdar-company-os.seed.json` supplies the evidence and controls;
- `seed/kamdar-company-os.seed-review.json` binds a tier-A realism review to
  the exact seed hash and covers every entity and feature case;
- each eval automation runs deterministic gates, one read-only tester subagent
  per feature, a separate evidence-review subagent, and one end-user artifact
  quality review covering every generated result row.

Both active suites author each scenario with the canonical Farplane case
fields: `id`, `prompt`, `expected_output`, `files`, `assertions`, and flat
`metadata`. Human labels live at `metadata.title`; Kamdar-only feature, entity,
result-path, and integration-gate joins live at
`metadata.extensions.kamdar`. The dashboard derives Given/When/Expected from
that case and joins Observed/Result to the immutable run artifacts. Output-file
existence and content checks remain suite evidence; `files` is reserved for
case input fixtures.

Daily deterministic validation is owned by
`filesystem/scripts/unified-daily-review-eval.mjs`. It rejects undeclared
intermediate files, validates the result and receipt with Zod, verifies exact
result hashes and seed/context IDs, and enforces processing safety. Provider
effects are accepted only through mocked receipts with matching read-back.

Run the Daily and Weekly evaluator contracts through
`automations/evaluate-daily-review.md` and
`automations/evaluate-weekly-review.md`. Tester lanes cannot self-approve;
only tier A plus independent evidence review and tier-A artifact quality passes.
The shared rubrics live in `rubrics/seed-realism.md` and
`rubrics/end-user-artifact-quality.md`.

Retained comparison material:

- `kamdar-company-os.json` contains superseded connector-routing and safety
  sanity cases.
- `evals.json` and `template-first-kamdar.mjs` retain the v4 buyer showcase;
  that legacy DSL is not an input to the active Daily/Weekly dashboard.
- `filesystem/cases/` and `filesystem/scripts/mock-kamdar-automation.mjs`
  preserve the earlier reduced-fixture proof; they are not acceptance evidence.

The customer presentation is fail-closed: it accepts one explicit, hash-bound
Daily/Weekly eligibility manifest from a real agent execution and never
discovers a latest run. Reference fixtures may calibrate the evaluator but are
not presentation eligible. There is currently no customer-valid deployment.

```bash
# Internal diagnostics: may discover the latest completed runs and expose proof plumbing.
npm run evals:ui

# Complete filesystem regression suite.
node --test evals/filesystem/tests/*.test.mjs
```

A valid presentation shows assertion-derived completeness, independently
judged qualitative metrics, readable generated business content, and row-level
file review. It omits local paths, JSON pointers, judge packets, gates, and raw
diagnostic JSON. The internal view retains those details for debugging.

The active evals never write to live Notion, Gmail, Drive, messaging, or
schedules. Operated provider tests remain separately authorized proof edges.

The fixture's portfolio shape is bound to
`filesystem/fixtures/template-first-kamdar/seed-manifest.json`. Its private
source compiler lives at `../scripts/compile_private_kamdar_seed.mjs`; source
names, contacts, and the private compiled seed stay outside Git. A run may set
`KAMDAR_PRIVATE_SEED_PATH` to verify that seed's 0600 permissions, aggregate
counts, and capture hash without exposing any private record into the result.
