# TASK-0013 Progress

## 2026-08-27 — Contract bound

- Source evidence owner: canonical `seed/*.json` values.
- Feature definition owner: consolidated Daily and Weekly suites.
- Verdict owner: selected run's feature judges only.
- Human output owner: operated-evidence `output_artifacts` only.
- Explicit exclusion: database seeding is setup and contributes no feature
  assertion or metric.

## 2026-08-27 — Implemented and focused proof passed

- Added the strict seed/suite/judge/output model and framework-free static
  renderer under `evals/viewer/`.
- Added root build/serve commands and eight focused contract tests.
- Focused result: 8 passed, 0 failed.
- Build result: 7 features, 11 unique cases, 35 current feature assertions,
  and 15 linked human outputs.
- Browser result: desktop 1280px and mobile 390px both had zero horizontal
  overflow; source cards had zero links and output links remained inside the
  selected feature.
- Current W34 status is truthfully `UNJUDGED`: the operated evidence bundle
  has output links but no matching current Daily/Weekly judge directories.
- Repository-wide result at this checkpoint: 73 passed, 10 failed, 2 skipped.
  All ten failures share the pre-existing Daily idempotency receipt hash drift;
  the viewer-focused suite remains green.

## 2026-08-27 — Visual regression corrected

- The first migration renderer incorrectly replaced the accepted dossier with
  a new large-type metric-card layout. That was a scope violation: the task
  changed evidence ownership, not visual design.
- Restored the accepted TASK-0006 visual system: compact W34 topbar, pill
  metrics, 40/60 grouped list and inspector, dense mono rows, pastel square
  coding, compact expandable entity records, single-column assertion review,
  and mobile inspector drawer.
- Preserved the TASK-0013 data contract: seed values remain source truth,
  mutable Notion source links remain absent, and operated output links remain
  inside Actual agent output.
