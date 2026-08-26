---
ticket_id: TASK-0011
title: Ship a customer-presentable Company OS eval run
status: done
claimed_by: codex-task0011-presentation
created_at: 2026-08-26T04:46:00Z
updated_at: 2026-08-26T07:58:00Z
depends_on: [TASK-0010]
ui_scope: true
---

# TASK-0011: Ship a customer-presentable Company OS eval run

## Summary

Produce one immutable, source-complete Daily and Weekly evaluation deployment
that passes the current assertions, independent feature judges, per-output
artifact review, mocked integrations, and idempotency checks. Present that
paired deployment through a customer mode that shows the generated business
content and its evaluation while omitting evaluator plumbing.

## Scope

- In:
  - Repair the frozen Daily and Weekly evidence chain so every material output
    fact is available in the permitted immutable input.
  - Regenerate the golden Daily and Weekly candidate outputs against current
    Project, report, Issue, Decision, and SOP templates.
  - Prove an unchanged second Daily run produces no new effect.
  - Produce seven current feature judges with the five A-D rubric fields, two
    independent evidence reviews, and two hash-bound artifact-quality reviews.
  - Join per-output artifact-quality findings into scenario status and render
    every result type as readable business content.
  - Add a fail-closed presentation mode that consumes one hash-bound paired-run
    eligibility manifest and removes internal proof surfaces from public output.
- Out:
  - Weakening assertions to match a candidate, fabricating grades, or hiding a
    failed run.
  - Live Notion, Telegram, email, WhatsApp, Drive, deployment, or Hermes writes.
  - Replacing the existing internal diagnostic dashboard.
- Constraints:
  - Weekly runtime input remains Project Draft reports only; raw Work and
    Meeting records may not be added to Weekly context.
  - Feature-judge rubric grades and artifact-quality checks remain independent
    proof lanes.
  - Existing user changes in the dirty worktree must be preserved.

## Delta

> **Before:** The latest paired run contains 3 passing and 8 failing scenarios.
> Both artifact-quality reviews are D/invalid; Daily lacks second-run proof;
> saved judges predate the required five-grade rubric. The dashboard does not
> load artifact-quality review, selects Daily and Weekly independently, and
> exposes technical proof in the same generated customer artifact.
>
> **After:** One immutable deployment contains a source-complete Daily context,
> Draft-backed Weekly context, current-template outputs, current judges and
> reviews, passing integrations, and honest scenario-level quality status. A
> public build uses only that paired passing deployment and shows answer
> completion, five quality grades, generated content, and row-level review.
>
> **Example:** Selecting “Updates Project context” shows the exact current
> Project text, the agent guard, the proposed replacement, authored completion
> checks, five judge grades, and the file reviewer’s findings. It does not show
> judge paths, JSON pointers, gates, raw JSON, or “tier A” mechanics.

## Contract Diagram

```text
[S1] source-complete Daily context + current Project sections
  -> [S2] corrected Daily result + receipt + unchanged rerun
  -> [P1] Daily deterministic/integration checks
  -> [S3] complete Project Draft reports (no raw Work/Meetings)
  -> [S4] corrected Weekly result + receipt/read-back
  -> [P2] Weekly deterministic/integration checks
  -> [J1] 7 feature judges + 2 evidence reviews + 2 artifact reviews
       | fail/unsupported/stale
       +-------------------------------> [F1] repair owning input/output/template and rerun
  -> [S5] one reconciled paired deployment
  -> [P3] hashed presentation-eligibility manifest
       | no eligible paired deployment
       +-------------------------------> [F2] refuse public build
  -> [S6] customer inspector: completion + grades + output + file review
  -> [P4] operated desktop/mobile QA + independent review + demo
```

## Change Plan

### Change 1: Make the frozen evidence source-complete

```yaml
diagram_nodes: [S1, S3, F1]
files: {read: [evals/seed/kamdar-company-os.seed.json, automations/templates/daily-context-diff.json], edit: [automations/schemas/daily-context-diff.zod.mjs, automations/schemas/weekly-context.zod.mjs, automations/examples/golden/daily-context-diff-2026-08-25.json, automations/examples/golden/weekly-context-2026-W34.json, evals/filesystem/scripts/prepare-fresh-company-operating-eval-run.mjs, evals/filesystem/scripts/unified-daily-review-eval.mjs, evals/filesystem/scripts/unified-weekly-review-eval.mjs]}
operation: Define strict context schemas, including exact current Project sections. Replace the ID-only Daily context synthesizer with a checked-in source-complete fixture. Carry Daily evidence into complete immutable Project Draft report content for Weekly without loading raw Work or Meetings. Validate cited evidence closure, not only ID presence.
signature_delta: permissive context/ID membership -> typed context with cited facts resolvable from permitted immutable input
assertions:
  - Every Daily output citation resolves to a populated frozen record.
  - Every Weekly material fact resolves through an immutable Project Draft.
  - Weekly rejects raw Work or Meeting fields exactly as before.
proof: focused Daily/Weekly runner tests plus artifact reviewer citations
failure: Stop when a desired claim has no source; remove or qualify the claim instead of adding invented context.
```

### Change 2: Correct Daily and Weekly candidate artifacts

```yaml
diagram_nodes: [S2, S4, F1]
files: {edit: [automations/examples/golden/daily-review-result-2026-08-25.json, automations/examples/golden/weekly-review-result-2026-W34.json, automations/examples/golden/weekly-integration-receipt-2026-W34.json, automations/examples/golden/weekly-integration-read-back-2026-W34.json, automations/examples/golden/weekly-run-manifest-2026-W34.json, evals/daily-review-evals.json, evals/weekly-review-evals.json, tickets/TASK-0011/artifacts/review/assertion-change-review.md]}
operation: Copy the exact current Project sections into all Daily guards; remove the unrelated TASK-201 documentation comment; replace the unsupported 27-August chase wording and campaign-selection decision. Render all seven Weekly reports with current front matter, receipt fields, complete tables, workflow/baseline detail, Decision 0.6, and a complete guarded Project checklist. Before any assertion edit, record its old/new text, feature and scenario, exact evidence that the old assertion is unsupported or obsolete, and an independent reviewer verdict; no approved row means no assertion change.
signature_delta: source-tagged prose -> source-supported, current-template candidate artifacts
assertions:
  - FEAT-0001 guards equal the frozen Project sections byte-for-byte.
  - FEAT-0002 evaluates only the intended completed Work rows.
  - FEAT-0003 and FEAT-0004 make no claim beyond frozen evidence.
  - All reports and promoted artifacts match current destination templates.
  - Receipt hashes and read-back payloads bind to the regenerated bytes.
  - Every assertion diff has an approved assertion-change review row, or the review records that no assertions changed.
proof: Zod, deterministic runners, exact-hash receipt/read-back tests, unchanged authored-behavior review
failure: Do not edit an assertion merely because a valid source-supported candidate failed it. Missing or non-approved assertion-change evidence blocks regeneration.
```

### Change 3: Add real Daily second-run proof

```yaml
diagram_nodes: [S2, P1]
files: {edit: [automations/schemas/daily-idempotency-rerun-receipt.zod.mjs, automations/examples/golden/daily-idempotency-rerun-receipt-2026-08-25.json, evals/daily-review-evals.json, evals/filesystem/scripts/write-fresh-eval-integration-evidence.mjs, evals/filesystem/scripts/unified-daily-review-eval.mjs, evals/filesystem/tests/daily-integration-receipt.test.mjs, evals/filesystem/tests/unified-daily-review-eval.test.mjs]}
operation: Add a separate immutable unchanged-rerun receipt bound to the original receipt, context, and exact result hash. Its audit effects must resolve originally applied/delivered effects as duplicates, preserve no-findings, and preserve originally blocked/failed effects as the same non-mutating outcome; prove zero new provider mutations, preserve processing state, and include matching duplicate lookup/read-back evidence. Audit rows are evidence, not new effects.
signature_delta: first-run receipt only -> first-run receipt plus immutable unchanged-rerun audit
assertions:
  - Missing, stale, newly applied/delivered, or otherwise mutating rerun evidence fails idempotency.
  - Rerun evidence cannot be inferred from the first-run receipt.
proof: positive, missing, stale-hash, new-applied-effect, and changed-processing mutation tests
failure: Keep the suite red if a real second-run receipt cannot be produced.
```

### Change 4: Reconcile one current immutable deployment

```yaml
diagram_nodes: [P1, P2, J1, S5, F1]
files: {edit: [evals/filesystem/scripts/prepare-fresh-company-operating-eval-run.mjs, evals/filesystem/scripts/finalize-fresh-company-operating-eval-run.mjs, automations/evaluate-daily-review.md, automations/evaluate-weekly-review.md]}
operation: Materialize one new deployment. Put the exact frozen-context slice—not richer seed-only facts—into each feature packet, bind the packet to context/result hashes, and require the verdict to echo the packet hash. Run seven isolated feature testers, two independent evidence reviews, and two per-output artifact reviewers; validate all schemas and paths, derive integration summaries, then reconcile both suite results. Seed remains identity/control evidence only.
signature_delta: candidate plus richer seed evidence -> candidate plus exact frozen runtime evidence and packet hash
assertions:
  - All seven judges include the five A-D grades from their actual candidate.
  - Feature judges and artifact reviewers evaluate the same frozen factual boundary.
  - A verdict with a missing or stale packet hash is rejected.
  - Artifact reviews cover every output pointer exactly once.
  - Both suite result files report pass and reconcile from their underlying artifacts.
proof: base and --judged runner commands plus finalizer result
failure: A non-A judge or artifact review remains visible and returns to its owning change; it is never relabelled.
```

### Change 5: Render honest customer evidence

```yaml
diagram_nodes: [S5, S6, F2]
files: {edit: [evals/filesystem/scripts/eval-dashboard-model.mjs, evals/filesystem/scripts/eval-dashboard-components.mjs, evals/filesystem/scripts/eval-dashboard-entity-components.mjs, evals/filesystem/scripts/eval-dashboard-theme.mjs, evals/filesystem/scripts/build-vercel-showcase.mjs, evals/filesystem/scripts/serve-eval-dashboard.mjs, automations/schemas/presentation-eligibility.zod.mjs, evals/filesystem/tests/eval-dashboard.test.mjs, evals/filesystem/tests/template-first-kamdar.test.mjs]}
operation: Validate and join artifact-quality rows by exact observed pointer. Make failed row reviews affect only their owning scenarios. Add readable renderers for Project updates, comments, chases, knowledge candidates, reports, promotion dispositions, and next-week replacements. Label feature-judge grades as Answer quality and row checks as File review. Have the finalizer write presentation-eligibility.json with deployment ID, generated time, Daily/Weekly roots, result hashes/pass states, judge hashes, and artifact-review hashes. Presentation build must consume and validate this manifest, emit a stripped public model plus a build receipt containing eligibility and public-model hashes, and never discover “latest.”
signature_delta: independently discovered latest runs + diagnostic HTML -> hash-bound paired eligibility manifest + explicit internal/presentation render modes
assertions:
  - A stale or missing quality review fails closed.
  - Five grades come only from a validated feature judge rubric.
  - Every scenario exposes its generated business content.
  - Presentation HTML contains no paths, gates, JSON pointers, raw JSON, judge vocabulary, or full diagnostic dashboard.json.
  - The public build receipt proves the exact eligibility manifest and stripped model bytes used.
  - Internal mode retains the existing diagnostic evidence.
proof: pointer-isolation mutations, presentation-selector tests, public-content leak assertions, keyboard and responsive tests
failure: When no paired eligible deployment exists, refuse the presentation build with the failed gate; never fall back to a red or legacy run.
```

### Change 6: Verify, document, and demonstrate the customer path

```yaml
diagram_nodes: [P3, P4]
files: {edit: [evals/README.md, evals/filesystem/README.md, tickets/TASK-0011/progress.md, tickets/TASK-0011/artifacts/qa/, tickets/TASK-0011/artifacts/demo/]}
operation: Document the internal-versus-presentation commands and proof boundary. Run the full repository verification, operate the exact presentation build at desktop and mobile, obtain independent evidence-quality and implementation review, and record a narrated demo.
signature_delta: implicit latest-run demo -> reproducible paired-run customer walkthrough
assertions:
  - Documentation names the exact validated deployment and refuses unsupported claims.
  - Captures show the same run totals and content as the immutable artifacts.
  - Independent review confirms no hidden red gate or technical-data leak.
proof: full command log, paired captures, visual-QA report, reviewer receipt, demo MP4
failure: Any mismatch between UI and artifacts withholds customer-ready status.
```

## Lean receipt

```yaml
target: customer-presentable Company OS evaluation
current_need: produce one honest green paired run and prevent a public build from selecting red, stale, or technical-only evidence
rung: reuse_local
evidence:
  - Existing Daily/Weekly validators already own schemas, hashes, feature judges, receipts, and reconciliation.
  - Existing observed-slice items already preserve exact JSON pointers for artifact-quality joins.
  - Existing builder already accepts explicit run roots and has internal dashboard primitives.
smallest_next_action: repair the golden evidence chain, reuse current validators, add one quality join and one fail-closed paired presentation selector; add no dependency or second dashboard
proof_preserved: unchanged assertions, independent judges, hash-bound reviews, integrations, internal diagnostics, and visual QA remain required
review_route: review:implementation-plan+architecture+evidence-quality
```

## Done

- [x] One new paired deployment passes Daily and Weekly reconciliation from immutable artifacts.
- [x] All 11 scenarios pass without weakening a source-supported behavioral assertion.
- [x] Seven feature judges contain real groundedness, completeness, usefulness, repeatability, and length-balance grades.
- [x] Both artifact reviews are A/pass and every joined output row passes all applicable checks.
- [x] Daily second-run proof shows zero new provider mutations, safe repeat outcomes for every original effect, and unchanged processing/read-back.
- [x] Every scenario renders its actual business output; presentation mode contains no evaluator plumbing or raw diagnostic model.
- [x] A presentation build refuses any red, stale, unscored, incomplete, or cross-deployment input.
- [x] Any assertion edit has an independently approved assertion-change review row.
- [x] Full tests, explicit-root eval lint, desktop/mobile visual QA, independent review, and narrated demo pass with durable evidence.

## QA Strategy

```yaml
proof_weight: hybrid
checks:
  - node --test evals/filesystem/tests/company-operating-eval-contract.test.mjs evals/filesystem/tests/unified-daily-review-eval.test.mjs evals/filesystem/tests/weekly-review-evals.test.mjs evals/filesystem/tests/quality-review-contracts.test.mjs evals/filesystem/tests/eval-dashboard.test.mjs
  - node evals/filesystem/scripts/unified-daily-review-eval.mjs <new-run>/daily-eval --judged
  - node evals/filesystem/scripts/unified-weekly-review-eval.mjs <new-run>/weekly-eval --judged
  - node evals/filesystem/scripts/finalize-fresh-company-operating-eval-run.mjs <new-run>
  - node --test evals/filesystem/tests/*.test.mjs
  - python3 -m unittest discover -s tests -p 'test_*.py' -v
  - python3 -m unittest discover -s skills/setup-kamdar-workspace/tests -v
  - python3 -m unittest discover -s skills/notion-webhook-onboarding/tests -v
  - farplane lint evals --root /Users/kenjipcx/Zanarkand Technologies/projects/KamdarAI
delegated_lanes: [feature-testers, evidence-reviewer, artifact-quality-reviewer, qa-tester, visual-qa, reviewer, demo]
evidence_paths: [evals/filesystem/runs/deployments/<new-run>/, tickets/TASK-0011/artifacts/qa/, tickets/TASK-0011/artifacts/review/, tickets/TASK-0011/artifacts/demo/]
final_checkpoint: reviewer
residual_risk: A green frozen run proves the bounded synthetic scenario, not live provider reliability or general customer accuracy.
```

## Docs Strategy

- Update the eval READMEs to distinguish internal diagnostics from the stripped
  presentation build and name the paired-deployment eligibility gate.
- Do not update live Hermes workspace documentation or claim deployment.

## Links

- UI baseline: `tickets/TASK-0011/design.md`
- Prior inspector design: `tickets/TASK-0010/design.md`
- Current failure evidence: `tickets/TASK-0010/progress.md`
- Artifact-quality rubric: `evals/rubrics/end-user-artifact-quality.md`
- Revoked calibration deployment: `evals/filesystem/runs/deployments/task0011-presentation-2026-08-26-05/`
- Presentation eligibility: blocked until a hash-bound real-agent candidate exists
- Customer build: `evals/filesystem/.vercel-static/index.html`
- Public model: `evals/filesystem/.vercel-static/public-model.json`
- Build receipt: `evals/filesystem/.vercel-static/build-receipt.json`
- QA report: `tickets/TASK-0011/artifacts/qa/2026-08-26-presentation/report.md`
- QA receipt: `tickets/TASK-0011/artifacts/qa/2026-08-26-presentation/result.json`
- Best visual evidence: `tickets/TASK-0011/artifacts/qa/2026-08-26-presentation/screens/desktop-top.png`
- Visual QA: `tickets/TASK-0011/artifacts/qa/2026-08-26-presentation/visual-qa.md`
- Completion review: `tickets/TASK-0011/artifacts/review/2026-08-26-completion-receipt.json`
- Demo MP4: `tickets/TASK-0011/artifacts/demo/2026-08-26_135525-presentation-recap/final.mp4`
- Demo result: `tickets/TASK-0011/artifacts/demo/2026-08-26_135525-presentation-recap/result.json`

## State

- Current: Correction active. The inspector now derives completeness from assertion coverage and rejects reference-fixture candidates.
- Next: Run Daily and Weekly through the real Kamdar agent, then judge those exact outputs.
- Blocker: No hash-bound real-agent candidate exists; the prior all-pass run used authored goldens.
