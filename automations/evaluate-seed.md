---
automation_id: evaluate-kamdar-seed
status: active
---

# Evaluate the Kamdar seed

Review the exact source-controlled seed before any evaluation workspace is provisioned or reseeded. This automation is read-only.

## Todo list

1. Load `evals/seed/kamdar-company-os.seed.json`, its JSON Schema, `evals/rubrics/seed-realism.md`, and every referenced template. Record the seed SHA-256 before review.
2. Run deterministic schema, relationship, template, duplicate-ID, and private-data checks.
3. Spawn one independent read-only reviewer. Review every entity and every `pipeline_cases[]` row for company fit, relationship coherence, lifecycle consistency, operational plausibility, and surrounding context. Label each row `captured`, `publicly_grounded`, or `synthetic_scenario`; cite the exact capture, public source, or seed path.
4. Write `evals/seed/kamdar-company-os.seed-review.json` using `automations/schemas/seed-realism-review.zod.mjs`. The review must bind the exact seed ID and SHA-256. Do not edit the seed while reviewing it.
5. Only tier A with complete coverage may unlock Notion provisioning or reseeding. Route B/C findings back to the seed author, then rerun the review against the new hash.

## Output

`evals/seed/kamdar-company-os.seed-review.json` is the sole semantic approval artifact. The Notion seed operator rejects missing, stale, partial, or non-A reviews before its first provider write.
