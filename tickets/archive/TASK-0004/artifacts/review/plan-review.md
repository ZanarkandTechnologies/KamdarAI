---
ticket_id: TASK-0004
review_type: plan_rereview
reviewed_at: 2026-08-21T16:35:00+08:00
reviewer: Codex Reviewer
overall_tas: TAS-A
verdict: pass
rerun_required: false
---

# TASK-0004 Plan Review

## Review Summary

- `work_type:` implementation plan rereview for restoring the full Kamdar proof story, completing all feature pipelines, and adding one bounded operated showcase.
- `search_scope:` `tickets/TASK-0004/ticket.md` updated at `2026-08-21T16:35:00+08:00`; prior receipt; focused comparison to TASK-0001/TASK-0002 section contract and current runner/live seams inspected in the first pass.
- `rubrics_used:` implementation-plan, integration-readiness, evidence-quality. Caller/ticket declared these families. The repo-local rubric index is absent, so this uses the available review skill contract plus the declared families.
- `overall_tas:` TAS-A.
- `verdict:` pass; implementation packet may start.
- `rerun_required:` false for plan review. Implementation still requires the ticket’s own QA, operated evidence, browser capture, and independent implementation/visual/completion reviews.
- `hard_gate_failures:` none.

## Stage 1 — Ticket/spec compliance

Pass. The updated plan preserves the accepted section ownership:

- TASK-0001 remains the full buyer journey owner: story, Company OS/database walkthrough, Daily, Weekly, failure view, and decisions.
- TASK-0002 remains only the section-5 replacement for feature-grouped assertion drilldown.
- TASK-0004 explicitly keeps this boundary in `Scope`, `Design baseline`, `Change Plan`, and `Done / Proof`.

The requested “preserve sections 0-4/6-7 while replacing only section 5” is now clear enough for implementation and review.

## Prior Blocker Rereview

### Resolved — single scorer/live-edge seam

- `prior_issue:` The live edge could have stayed on the legacy `mock-kamdar-automation.mjs` scorer while the UI served `template-first-kamdar.mjs`.
- `repair_evidence:` TASK-0004 now requires `template-first-kamdar.mjs` to be the only scorer for both frozen and operated modes via `runTemplateFirstProof({mode, externalReceipts})`; external receipts must validate against feature/adapter/operation tuples and overlay `applied`, `sent`, or `blocked` onto the same planned-call rows. `serve.mjs` must only read the saved template-first result and never perform provider calls.
- `tas:` TAS-A for plan readiness.

### Resolved — v2 namespace/state freshness

- `prior_issue:` The live plan stated “do not reuse” but current code had a `[POC]` namespace and reusable `runtime-poc/.../state.json`.
- `repair_evidence:` TASK-0004 now requires a new immutable `[SHOWCASE] Kamdar Manager Eval 2026-08-21` namespace, a new `runtime-showcase/kamdar-manager-eval-2026-08-21-v2/state.json` checkpoint, startup rejection for namespace/version mismatch, trashed-root verification before reuse, and no reuse/delete of the TASK-0001 POC subtree.
- `tas:` TAS-A for plan readiness.

## Family TAS

- `implementation-plan:` TAS-A. Scope, order, non-goals, and proof gates are concrete and implementation-ready.
- `integration-readiness:` TAS-A. The plan now names the single scorer boundary, live edge migration, provider-write boundary, namespace guard, and UI read model.
- `evidence-quality:` TAS-A. Done/Proof and QA Strategy require deterministic rerun, all-nine-feature coverage, post-write provider reads, redacted receipts, browser capture, and independent reviews.

## Adversarial Rejection Attempts

- `split proof rejection:` failed; the revised plan explicitly forbids the split by making template-first the only scorer.
- `stale live state rejection:` failed; the revised plan gives an executable v2 namespace/checkpoint invariant.
- `section drift rejection:` failed; the plan repeatedly names TASK-0001 sections 0-4/6-7 as preserved and TASK-0002 as section 5 only.
- `unsafe provider write rejection:` failed at plan level; external effects are bounded to a namespaced showcase, prior recipients/routes, preflight, post-write reads, and redacted receipts.

## Finding Log

- No blocking findings.
- No revise findings.
- `note:` This is a plan pass, not an implementation pass. The implementation review must verify the actual code uses the new scorer entry point, removes legacy scorer dependence from the live edge, enforces v2 checkpoint refusal, and displays operated receipts without provider-success overclaim.

## Next Action

Start implementation under TASK-0004. First implementation checkpoint should prove the scorer/live-edge unification before investing in UI polish or browser demo work.
