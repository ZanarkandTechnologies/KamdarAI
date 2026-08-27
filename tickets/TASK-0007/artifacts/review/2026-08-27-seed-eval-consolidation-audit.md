---
task: TASK-0007
date: 2026-08-27
status: accepted
scope: seed-and-eval-consolidation
---

# Seed and eval consolidation audit

## Before

- One 930-line seed JSON mixed metadata with every entity table and scenario.
- `evals/filesystem/fixtures/` duplicated data already represented by current
  golden artifacts and the canonical seed.
- The filesystem harness also carried legacy runners and an eval dashboard
  whose tests depended on ignored generated run directories.
- The current Weekly Draft template lived under a legacy eval fixture path.

## After

- `seed/manifest.json` owns metadata and routes to six table files under
  `seed/`: 7 projects, 6 people, 10 tasks, 3 meetings, 4 reports, and 7
  scenarios.
- `evals/daily/expected/` and `evals/weekly/expected/` contain the known-good
  artifacts owned by their respective suites.
- `evals/filesystem/` contains only executable validators, provider-edge test
  tooling, tests, and ignored generated runs.
- `templates/current-weekly-draft.md` owns the active Weekly Draft template.
- Legacy mock, template-first, v4, live-POC, dashboard/showcase, duplicated
  fixture, presentation-only schema, and generated-viewer surfaces were
  removed.

## Preservation and loss check

- The assembled modular seed is byte-for-value equivalent to the prior seed
  content after normalization.
- The deterministic bundle digest is
  `7a08f91109caa5f8f82d6a1cd1a59b767923219633ddedb3d8bcb1d87eab22f9`.
- Daily/Weekly schemas, canonical eval suites, golden artifacts, operated
  provider boundaries, and private-seed compilation remain.
- Deleted tracked source is recoverable from Git. Deleted `runs/` and
  `.vercel-static/` content was ignored generated output and can be regenerated.
- No live Hermes workspace or profile file was changed or deleted.

## Verification

- `python3 -m unittest discover -s tests -p 'test_*.py' -q`
- `python3 -m unittest discover -s skills/setup-kamdar-workspace/tests -q`
- `python3 -m unittest discover -s skills/notion-webhook-onboarding/tests -q`
- `node --test evals/filesystem/tests/*.test.mjs` — 75 tests, 72 passed, 3
  skipped, 0 failed.
- `python3 scripts/validate_company_context.py --context workspace.hermes.md`
- `git diff --check`

## Independent review focus

Confirm that no active Daily/Weekly consumer references a removed legacy path,
the seed loader prevents table-path escape and preserves relations, and no
required acceptance or production configuration was deleted with the optional
dashboard layer.

## Independent review result

- Verdict: `TAS-A`, pass, no blocking findings.
- The modular seed matches the deleted monolith byte-for-value after assembly.
- Active TASK-0007 contracts point to the modular seed and current unified
  validators; dashboard- and workflow-skill-owned goal packets are superseded.
- LSP diagnostics were unavailable; Node syntax checks and Python compilation
  were used as the available substitutes.

## Daily and Weekly package follow-up

The generic `evals/fixtures/golden/` bucket was removed after review:

- `evals/daily/suite.json` now owns the Daily suite, with deterministic inputs
  and outputs under `evals/daily/expected/`.
- `evals/weekly/suite.json` now owns the Weekly suite, with deterministic inputs
  and outputs under `evals/weekly/expected/`.
- The unreferenced W34 Weekly Draft copy was deleted.
- The 24-August Daily context remains as `daily/expected/reference-context.json`
  because the isolated Notion operator actively consumes it; its runner was
  renamed from fixture to reference terminology.
- Active source and documentation contain no reference to
  `evals/fixtures/golden/` or the former top-level suite filenames.

Independent review exposed that the renamed reference runner's skipped test hid
a stale idempotency assertion. The reference context has no qualifying
knowledge entries, so both passes correctly return `no_finding`; the runner had
incorrectly required the second pass to return `duplicate`. The assertion now
derives the valid repeat state from the first pass, rejects conflict or
configuration-gap states, and still requires an unchanged Draft hash. The test
is enabled and its stale two-Project/MEETING-042 assumptions now follow the
current five-Project reference input.

Final behavior proof: 75 Node tests, 73 passed, 2 intentionally skipped, and 0
failed; the reference runner also completes directly with an unchanged Draft
hash. All Python suites, context validation, JSON parsing, Node syntax checks,
the fresh-run materializer, and the diff check passed.

Independent follow-up review verdict: `TAS-A`, pass, no blocking findings.
