---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0013
title: Render feature eval evidence from canonical seed values
status: complete
claimed_by: codex-root
created_at: 2026-08-27T05:15:00Z
updated_at: 2026-08-27T05:15:00Z
depends_on: []
ui_scope: true
feature_refs: [FEAT-0001, FEAT-0002, FEAT-0003, FEAT-0004, FEAT-0005, FEAT-0006, FEAT-0007]
---

# TASK-0013: Render feature eval evidence from canonical seed values

## Summary

Build a minimal, source-backed eval dossier for the consolidated Daily and
Weekly suites. The dossier renders each feature's starting values directly
from `seed/*.json`, renders pass/fail only from the feature judge produced by
the automation eval, and links the real final Notion, Gmail, or Telegram
outputs supplied by an operated-evidence bundle.

Database seeding is test setup. It is neither an automation feature nor a
scored assertion.

## Scope

- In:
  - Load FEAT-0001–0007, their cases, entity IDs, claims, and assertions from
    `evals/daily/suite.json` and `evals/weekly/suite.json`.
  - Resolve source values through `seed/manifest.json` and render the complete
    matching seed records inline in the selected feature.
  - Read feature verdicts only from `eval/judges/FEAT-XXXX.json` beneath an
    explicitly selected Daily or Weekly run root.
  - Read human-facing output URLs only from an explicitly selected operated
    evidence bundle.
  - Produce a static, framework-free dossier and a local server command.
- Out:
  - Scoring whether the test database was seeded successfully.
  - Treating mutable seeded Notion pages as canonical source evidence.
  - Generating one HTML page per source record.
  - Running Daily, Weekly, Notion, Gmail, or Telegram from the viewer.
  - Restoring the removed legacy dashboard.

## Delta

> **Before:** The deleted legacy viewer bound source cards to mutable Notion
> source-page URLs, while the consolidated eval harness had no supported
> dossier.
>
> **After:** One small builder projects canonical seed values, current suite
> assertions, optional judged-run verdicts, and actual output links into a
> static feature dossier. Missing judge evidence stays `UNJUDGED`.
>
> **Example:** FEAT-0001 shows the exact seed JSON for CMT Pipeline and
> TASK-101/104/105/110, its automation assertions, and a link to the updated
> CMT Pipeline Notion output. It contains no assertion that setup seeded those
> records.

## Contract Diagram

```text
[S1] seed manifest + table JSON ───────> [M1] feature source values
[E1] Daily/Weekly suite JSON ──────────> [M2] feature/case/assertion contract
[J1] selected run / feature judges ────> [M3] PASS/FAIL/UNJUDGED
[O1] operated evidence output links ───> [M4] final human artifacts
                                                |
                                                v
                                      [V1] static feature dossier

Test-environment cloning and provider execution happen before J1/O1 and are
not scored by this viewer.
```

## Change Plan

### Change 1: Build one strict evidence model

```yaml
diagram_nodes: [S1, E1, J1, O1, M1, M2, M3, M4]
files:
  add: [evals/viewer/model.mjs]
operation: Resolve suite-owned feature sources from canonical seed tables, optional feature judges from selected run roots, and output artifacts from the operated-evidence bundle. Ignore legacy source_inputs URLs.
assertions:
  - Every declared feature entity ID resolves to one seed record.
  - Seed records affect source display but never feature score.
  - PASS requires an A-tier feature judge with every assertion met.
  - Missing judge evidence is UNJUDGED, never inferred PASS.
  - Output URLs come only from output_artifacts.
failure: Fail the build on duplicate/missing seed IDs, malformed judges, mismatched assertions, or malformed output URLs.
```

### Change 2: Render the minimal dossier

```yaml
diagram_nodes: [V1]
files:
  add: [evals/viewer/build.mjs, evals/viewer/serve.mjs]
  edit: [evals/filesystem/package.json, evals/README.md]
operation: Generate one static index with four metrics, a feature list, and one-column feature details containing seed source values, test cases, final output links, and assertion results.
proof: Generated HTML contains all seven features and output links but no source-page URL or seed-setup assertion.
failure: Preserve UNJUDGED/MISSING states rather than hiding unavailable proof.
```

### Change 3: Prove ownership and failure behavior

```yaml
diagram_nodes: [S1, E1, J1, O1, V1]
files:
  add: [evals/filesystem/tests/seed-evidence-viewer.test.mjs]
operation: Exercise source projection, legacy-source-link rejection, judge truth, output-link projection, and generated markup.
proof: Focused Node tests and the full filesystem suite pass.
failure: Any seed mutation that does not change displayed source values, source URL that leaks from legacy input evidence, or verdict inferred without a judge blocks completion.
```

## Lean receipt

```yaml
target: consolidated feature eval dossier
current_need: display stable source inputs, feature verdicts, and actual final outputs after the legacy viewer was removed
rung: standard_library
evidence:
  - Node 22 and browser primitives already cover JSON loading, static rendering, and local serving.
  - Daily and Weekly suites already own feature-to-seed entity bindings.
  - The operated evidence bundle already owns final output URLs.
smallest_next_action: add one model, one static renderer, one local server, and focused contract tests
proof_preserved: verdicts remain judge-owned and setup remains outside feature grading
review_route: review:implementation-plan+evidence-quality
```

## Done

- [x] All seven features and all suite cases are projected from the current
  Daily and Weekly suite files.
- [x] Every selected feature shows the complete relevant seed records inline;
  no mutable Notion source URL is presented as source truth.
- [x] Feature status and assertion results come only from selected judge files;
  absent evidence renders `UNJUDGED`.
- [x] Actual final output links render inside the matching feature detail.
- [x] Seed setup contributes zero feature assertions and zero score.
- [x] Four metrics report Features, Cases, Feature checks, and linked Outputs.
- [x] Focused tests, full filesystem tests, and a local browser read-back pass.

## QA Strategy

```yaml
proof_weight: hybrid
checks:
  - node --test evals/filesystem/tests/seed-evidence-viewer.test.mjs
  - node --test evals/filesystem/tests/*.test.mjs
  - npm run eval:view:build
  - HTTP read-back from the local static server
  - desktop and mobile browser inspection against tickets/TASK-0013/design.md
evidence_paths: [tickets/TASK-0013/artifacts/qa/, tickets/TASK-0013/artifacts/review/]
final_checkpoint: implementation review
residual_risk: Existing operated W34 output evidence has no matching current feature-judge directory, so its truthful initial status is UNJUDGED until that run is evaluated.
```

## State

- Current: Complete; implementation and evidence review passed.
- Next: Supply matching Daily and Weekly judged run roots when an operated run
  should display PASS/FAIL instead of truthful UNJUDGED states.
- Blockers: none.

## Links

- `design:` `tickets/TASK-0013/design.md`
- `progress:` `tickets/TASK-0013/progress.md`
- `related:` `tickets/TASK-0008/ticket.md` (superseded legacy dashboard)
