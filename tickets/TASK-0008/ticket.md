---
id: TASK-0008
title: Render the Company OS eval dossier from typed evidence
status: active
approval: owner-directed-implementation
created: 2026-08-25
updated: 2026-08-25
owner: vishan-kamdar
feature_refs: [FEAT-0001, FEAT-0002, FEAT-0003, FEAT-0004, FEAT-0005, FEAT-0006, FEAT-0007]
---

# Render the Company OS eval dossier from typed evidence

## Decision

Replace the hand-authored showcase with one generated dashboard. The loader
reads the Daily and Weekly typed eval suites, their feature documents, the
canonical seed, and completed run artifacts. It emits a normalized view model;
the renderer owns only interface chrome, layout, and interaction.

## Contract diagram

```text
[A] typed suite JSON ─┐
[B] feature docs ─────┼─> [D] strict loader ─> [E] dashboard model ─> [F] HTML
[C] seed + run JSON ──┘          │
                                 └─> reject missing or inconsistent evidence
```

## Scope: In

- Load all case, feature, entity, claim, assertion, status, result, count, and
  evidence values from authored JSON, feature Markdown, or run JSON.
- Expand shared cases into feature-scoped rows without duplicating source data.
- Render the accepted wide dark list-and-inspector design.
- Show starting entities, expected behavior, actual result slices, checks, and
  technical evidence for the selected row.
- Fail the build when a feature document, declared run artifact, or judge result
  is missing or malformed.
- Prove source ownership with mutation tests.

## Scope: Out

- Changing automation behavior, seed content, or eval verdicts.
- Calling Notion or another provider from the static page.
- Treating fixture URLs as production proof.
- Deploying over the current evidence site without a separately operated build.

## Change plan

| Unit | Owner surface | Change | Observable proof |
| --- | --- | --- | --- |
| A-D | `evals/filesystem/scripts/eval-dashboard-model.mjs` | Strictly load and normalize suites, docs, seed entities, review results, judges, and receipts. | Missing and malformed inputs fail; source mutations change the model. |
| E-F | `evals/filesystem/scripts/eval-dashboard-html.mjs` | Render the two-panel UI from the normalized model only. | Seven feature groups and thirteen feature-case rows render from current inputs. |
| F | `evals/filesystem/scripts/build-vercel-showcase.mjs` | Build from explicit Daily and Weekly run roots. | Static index contains the selected run evidence and no old showcase story. |
| proof | `evals/filesystem/tests/eval-dashboard.test.mjs` | Add contract, mutation, status, and markup tests. | Focused tests and `farplane lint evals` pass. |

## Invariants

- Renderer source contains no feature names, case names, entity IDs, business
  counts, claims, expected outcomes, actual outcomes, or verdicts.
- One suite case remains one authored JSON object even when several features
  reference it.
- `PASSED` requires a passing suite result and an A-tier feature judge with no
  failed assertions; absent evidence is never inferred as pass.
- The inspector preserves complete JSON values; summaries may be derived but
  may not replace source evidence.
- Technical evidence is secondary and never changes the user-facing verdict.

## Done

- [x] The generated model contains every Daily and Weekly feature and all
  feature-case memberships from the current suites.
- [x] The desktop page matches the accepted 62/38 list-and-inspector design and
  the mobile inspector becomes a drawer.
- [x] Every visible business datum can be traced to a source path in the model.
- [x] Mutating a case prompt, feature title, judge result, or result slice changes
  the rendered page without editing renderer code.
- [x] Missing required evidence fails closed.
- [x] Focused tests, eval lint, diff check, and paired desktop/mobile screenshots
  pass.

## QA Strategy

1. Parse both suites through the closed Zod contract.
2. Assert seven feature groups and thirteen feature-scoped case rows.
3. Mutate source fixtures and prove the model and HTML follow the source.
4. Downgrade one judge and prove the row becomes `FAILED`.
5. Remove one required artifact and prove the build fails.
6. Capture desktop and mobile screenshots of the generated static page.

## Agent Contract

- Read: suites, feature docs, seed, completed Daily/Weekly run roots, accepted design.
- Write: the four Change Plan owner surfaces and this Goal packet only.
- Verify: narrow Node tests, `farplane lint evals`, source scan, visual comparison.
- Preserve: existing deployment folders and current production deployment.

## Links

- Design: `tickets/TASK-0008/design.md`
- Program: `tickets/TASK-0008/program.md`
- Progress: `tickets/TASK-0008/progress.md`
- Accepted predecessor design: `tickets/TASK-0006/design.md`
- Visual QA: `tickets/TASK-0008/artifacts/qa/2026-08-25/visual-qa.md`
- Generated model: `evals/filesystem/.vercel-static/dashboard.json` (ignored build artifact)
- Demo preproduction: `tickets/TASK-0008/artifacts/demo/2026-08-25-eval-dashboard/result.json`
