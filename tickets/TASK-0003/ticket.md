---
ticket_id: TASK-0003
title: Implement the feature-first Kamdar proof UI
status: complete
created_at: 2026-08-21T15:05:00+08:00
updated_at: 2026-08-21T16:12:00+08:00
owner: Codex
source_ticket: TASK-0002
approval: operator-approved-2026-08-21
---

# TASK-0003: Implement the feature-first Kamdar proof UI

## Summary

Replace the current global assertion-wall proof surface with the accepted
feature-first UI from `TASK-0002`. One frozen Daily-to-Weekly pass remains the
only execution; the interface groups its assertions, generated files, planned
integration calls, and honest gaps by the feature they prove. The shareable
showcase must tell the same story.

> **Before:** the proof leads with a flat list of assertions and a buyer-facing
> ASCII-comparison panel, making a 23/23 score look more complete than it is.
>
> **After:** a reader begins with feature coverage, opens a feature to inspect
> its sources, file/template/content assertions, behaviour checks, integration
> state, and gaps, and can open the real Kamdar source locations where available.
>
> **Example:** FEAT-0001 shows its two Daily evidence files and their template
> sections; FEAT-0006 remains visibly `Designed · not yet proved` rather than
> inheriting the 23/23 pass result.

## Scope

- `In:` implement the approved [ASCII prototype](../TASK-0002/ascii-prototype.md)
  in the local proof UI and generated showcase; enrich the eval contract and
  frozen trace only with metadata required to connect feature assertions to
  sources and planned calls; update the current ASCII comparison and regression
  tests; capture browser-visible proof.
- `Out:` adding assertions or output artifacts for unproved FEAT-0006/0007/0008;
  changing the Daily/Weekly business logic; live Notion, Drive, email, or
  Telegram operations; provider result links without a provider receipt;
  redesigning the Kamdar template or database model.

## Design baseline

- `accepted design:` `tickets/TASK-0002/ascii-prototype.md` sections 1–8.
- `core action:` inspect whether a named automation feature is actually proved
  and, when it is, inspect its generated artifacts.
- `subtraction:` no global buyer-facing assertion wall and no primary
  ASCII-comparison section. Both remain collapsed developer evidence.
- `deliberate no:` no fake provider-success or individual Notion-record URLs
  in frozen mode. Only supplied real source-location links are clickable.
- `implementation shape:` extend the existing dependency-free JSON contract,
  runner, static HTML, and local server; add no framework or browser dependency.

## Lean receipt

```yaml
target: feature-first frozen proof UI and showcase
current_need: A reader cannot tell which business process a passing assertion proves, nor inspect a file's content checks within that process.
rung: reuse_local
evidence:
  - evals/evals.json already gives each of the 23 assertions one feature_id
  - template-first-kamdar.mjs already exposes scored assertions, output files, and a mock trace
  - ui/index.html and serve.mjs are dependency-free local presentation seams; no package manifest or framework is present
smallest_next_action: extend the current JSON contract, runner, static UI, showcase, and focused tests in place
proof_preserved: 23 deterministic assertions, no-write safety, idempotency, API/browser operation, and visible screenshot evidence remain required
review_route: review:implementation-plan + evidence-quality
```

## Change Plan

1. **Feature presentation contract — `evals/evals.json`, runner loader**
   - Add the real, high-level Kamdar source routes and the minimal per-feature
     source/integration metadata needed by the presentation. Preserve every
     assertion's single `feature_id` owner and derive coverage from current
     rows, so zero-row features remain honest gaps.
   - Local proof: contract loader rejects missing feature/source metadata and
     every scored assertion/call resolves to one feature.
   - Rollback boundary: no runtime configuration or provider state changes.

2. **Feature-aware frozen evidence — `template-first-kamdar.mjs`**
   - Carry `feature_id` through connector-shaped planned calls. Replace the
     stale TASK-0001 ASCII anchors with the accepted TASK-0002 anchors.
   - Render feature-grouped Markdown/HTML showcase content with status,
     source links, artifact summaries, assertions, and an explicit mock/no-write
     state. Keep raw comparisons and trace as developer evidence.
   - Local proof: a frozen run stays 23/23, 0 processor network calls, 0
     external writes, and 8/8 current-ASCII comparison checks.
   - Rollback boundary: a failed renderer leaves only the owned local run root.

3. **Feature-first interactive UI — `evals/filesystem/ui/index.html`**
   - Replace the current global expectations panel with Daily, Weekly, and
     Shared feature cards. A feature expansion shows real source links,
     artifacts with expandable template/content checks, behavior verdicts,
     planned integration calls, and no invented operated-result link.
   - Keep the existing file inspector and frozen-run action. Make developer
     evidence a collapsed details section.
   - Local proof: all nine features render; FEAT-0006/0007/0008 show zero
     assertions as `Designed · not yet proved`; a generated file opens its
     content checks and then its output inspector.
   - Rollback boundary: a static UI failure does not alter eval outputs or
     contract scoring.

4. **Regression and visible proof — tests, generated run, ticket artifacts**
   - Extend contract/runner/UI tests for feature ownership, current ASCII
     comparison, showcase states, and no fake success links. Run the local
     server, operate the frozen proof through the browser, and capture the
     updated UI and showcase.
   - Local proof: narrow Node suite, full repository checks relevant to touched
     files, API result, and rendered browser screenshots agree.

## Done / Proof

- [x] The UI and showcase are organised by all nine canonical feature pages,
      not by a global assertion list.
- [x] Every displayed assertion, file event, and planned connector-shaped call
      has a feature owner; zero-assertion Weekly features stay visible and
      explicitly unproved.
- [x] Each proved file can expand to show its governing template/version and
      the current content assertions; its generated output remains inspectable.
- [x] Real Kamdar root/Projects/Tasks/Drive links render only from configured
      source metadata; frozen mode contains no fake result links or success
      language.
- [x] The frozen Daily→Weekly runner remains deterministic, 23/23 passes,
      idempotent, provider-free, and compares against the accepted ASCII.
- [x] Node tests, browser/API sanity, independent QA/visual review, a concise
      user-visible demo capture, and completion review are recorded before
      completion. No external provider is called.

## QA Strategy

1. Run the focused Node runner/UI tests, then all filesystem tests; validate
   `evals/evals.json` through the existing loader.
2. Run the frozen processor into an owned temporary root; assert 23/23, no
   provider writes, feature-owned trace, showcase content, and current ASCII
   comparison.
3. Start the local server; use the browser to run the proof, expand a Daily
   feature and a generated file, verify source links/feature states, and open
   `/showcase`. Capture the best screenshot(s).
4. Ask the existing independent review lanes to inspect implementation/evidence
   against this ticket and the ASCII without accepting self-certification.
5. Record the strongest evidence and reviewed handoff in this ticket/program/
   progress before stopping. The residual risk is intentionally limited to
   unproved promotion, planning, and provider-delivery features.

## Docs Strategy

The existing feature registry and Company OS map are canonical. Update their
links only if the new UI reveals a factual mismatch; do not create duplicate
feature documentation.

## State

- `approval:` operator-approved for local frozen implementation only.
- `current:` implemented and verified locally. The server is running at
  `http://127.0.0.1:4179/` for review.
- `blockers:` none. Real provider writes remain prohibited by scope.

## Links

- `accepted_ascii:` `tickets/TASK-0002/ascii-prototype.md`
- `feature_registry:` `docs/features/README.md`
- `company_os:` `docs/systems/kamdar-company-os.md`
- `assertion_contract:` `evals/evals.json`
- `runner:` `evals/filesystem/scripts/template-first-kamdar.mjs`
- `ui:` `evals/filesystem/ui/index.html`
- `local_ui:` `http://127.0.0.1:4179/`
- `showcase:` `http://127.0.0.1:4179/showcase`
- `qa_report:` `tickets/TASK-0003/artifacts/qa/frozen-feature-ui/report.md`
- `qa_receipt:` `tickets/TASK-0003/artifacts/qa/frozen-feature-ui/result.json`
- `visual_qa:` `tickets/TASK-0003/artifacts/qa/frozen-feature-ui/visual-qa.md`
- `visual_review:` `tickets/TASK-0003/artifacts/review/visual-review.md`
- `completion_review:` `tickets/TASK-0003/artifacts/review/completion-review.md`
- `best_evidence:` `tickets/TASK-0003/artifacts/qa/screens/feature-file-drilldown.png`
- `showcase_evidence:` `tickets/TASK-0003/artifacts/qa/screens/showcase-feature-summary.png`
