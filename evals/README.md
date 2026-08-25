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
- `evals.json` and `template-first-kamdar.mjs` retain the v4 buyer showcase.
- `filesystem/cases/` and `filesystem/scripts/mock-kamdar-automation.mjs`
  preserve the earlier reduced-fixture proof; they are not acceptance evidence.

```bash
cd evals/filesystem
npm test
HERMES_EVAL_PROFILE=vishan-kamdar-ai npm run ui
```

The active evals never write to live Notion, Gmail, Drive, messaging, or
schedules. Operated provider tests remain separately authorized proof edges.

The fixture's portfolio shape is bound to
`filesystem/fixtures/template-first-kamdar/seed-manifest.json`. Its private
source compiler lives at `../scripts/compile_private_kamdar_seed.mjs`; source
names, contacts, and the private compiled seed stay outside Git. A run may set
`KAMDAR_PRIVATE_SEED_PATH` to verify that seed's 0600 permissions, aggregate
counts, and capture hash without exposing any private record into the result.
