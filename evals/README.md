# Kamdar evaluation contracts

This directory owns evaluation definitions and proof tooling. Seed data lives
at the repository root under `seed/`; product templates live under `templates/`.

## Active contracts

- `daily/`: FEAT-0001–0004 suite and expected artifacts.
- `weekly/`: FEAT-0005–0007 suite and expected artifacts.
- `automations/`: evaluator procedures for the seed, Daily, and Weekly runs.
- `rubrics/`: independent review criteria.
- `schemas/`: evaluation-only structured review contracts.
- `filesystem/`: executable evaluators and their deterministic tests.
- `viewer/`: a minimal static feature dossier. It renders source values from
  the canonical seed, verdicts from selected feature judges, and final links
  from operated evidence. Database seeding is setup and is never scored as an
  automation feature.

The `expected/` directories are deterministic test inputs and outputs, not
runtime state. Generated `filesystem/runs/` and `filesystem/node_modules/` are
ignored local state.

```bash
node --test evals/filesystem/tests/*.test.mjs
node evals/viewer/build.mjs --out evals/viewer/dist \
  --evidence tickets/archive/TASK-0006/artifacts/qa/deployments/operated-w34-2026-08-26/operated-evidence.json
node evals/viewer/serve.mjs
```

The active evals never authorize live Notion, Gmail, Drive, messaging, or
schedule changes. Operated provider proof requires its own explicit authority.
