# Kamdar evaluation contracts

This directory owns evaluation definitions and proof tooling. Seed data lives
at the repository root under `seed/`; product templates live under `templates/`.

## Active contracts

- `daily/`: FEAT-0001–0004 suite and expected artifacts.
- `weekly/`: FEAT-0005–0007 suite and expected artifacts.
- `feature-outcomes/`: small generated-versus-expected cases for `produced`,
  `no_change_needed`, and `insufficient_information` extraction outcomes.
- `automations/`: evaluator procedures for the seed, Daily, and Weekly runs.
- `rubrics/`: independent review criteria.
- `schemas/`: evaluation-only structured review contracts.
- `scripts/` and `tests/` at the repository root: Python evaluators and their deterministic tests.
- `viewer/`: a minimal static feature dossier. It renders source values from
  the canonical seed, verdicts from selected feature judges, and final links
  from operated evidence. Database seeding is setup and is never scored as an
  automation feature.

The `expected/` directories are deterministic test inputs and outputs, not
runtime state. Generated evidence-viewer output is ignored local state.

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/evaluate_feature_outcomes.py
python3 -m evals.viewer.build --out evals/viewer/dist \
  --doctor-run /absolute/private/path/to/doctor-run
python3 -m evals.viewer.serve
```

The active evals never authorize live Notion, Gmail, Drive, messaging, or
schedule changes. Operated provider proof requires its own explicit authority.
