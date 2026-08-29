---
kind: qa-evidence
ticket_id: TASK-0007
environment: task0007-isolated-notion-seed
status: partial-projection-with-project-memory-edge
date: 2026-08-25
---

# TASK-0007 isolated Daily + Weekly operating proof

## Decision

The source-safe Project-memory edge worked in one marked, synthetic Notion
root. The remaining Daily and Weekly behavior was prepared or rendered through
a deterministic projection, not applied to the current Weekly draft. The
artifact-flow audit found two competing Decision/SOP draft writers and a
missing Project-Control-to-Draft route, so this is not end-to-end Weekly proof.
It is not production: no live Hermes installation, schedule activation, staff
message, Drive operation, or production record access occurred.

## Operated flow

```text
one bounded Daily context
          |
          +-- Project memory -> 4 guarded section patches -> isolated Notion receipt
          +-- Documentation quality -> grouped request plan -> dispatch prepared
          +-- Project control -> stale/cost finding plan -> dispatch prepared
          `-- Decision/SOP contribution -> Weekly-draft contribution prepared

retained Daily artifacts -> Weekly evidence -> five-anchor diff
                           -> 12 Project + 7 Department + 1 Company report
                           -> reviewed promotion/delivery plans
```

The collector produced one context artifact; the four pipelines consume that
same artifact and do not re-fetch a provider. In the proof root, Project memory
was the sole applied Daily edge; the other effects remained prepared by design.

## What the isolated seed proves

| Surface | Observed result |
| --- | --- |
| Boundary | One marked root, seven child databases, read-only identity/schema preflight, and zero external messages. |
| Seed state | 41 Projects, 8 People, 30 Work items, 3 Decisions, 3 SOPs, 24 Reports, and 10 automation artifacts. |
| Daily Project memory | Four source-bound patches applied to two exact synthetic Project targets; one explicitly replaced the weekly checklist under the approved W35 reset marker. |
| Weekly reports | A template-first projection rendered 12 Project, 7 Department, and 1 Company report; it did not prove the corrected Weekly Draft → finalization path. |
| Receipts/idempotency | 159 durable Notion receipt entries across the bounded proof passes; the final identical run made 0 writes and skipped 139 current actions. |

## Provisional feature behavior

| Feature | Evidence-backed outcome |
| --- | --- |
| FEAT-0001 | Minimal Project knowledge/attention diffs are source-linked and applied only through the isolated guarded edge. |
| FEAT-0002 | Missing documentation becomes a grouped, proposal-only employee request plan. |
| FEAT-0003 | Stale/blocked work retains duration and cost evidence without a send claim. |
| FEAT-0004 | Decision and SOP candidates stage into the Weekly evidence path. |
| FEAT-0005 | Weekly finalization renders the Project → Department → Company hierarchy. |
| FEAT-0006 | Eligible promotion artifacts are rendered for review, not silently promoted in production. |
| FEAT-0007 | Carry-forward remains an in-place Project planning update. |
| FEAT-0008 | Executive delivery stays prepared; no provider delivery occurred. |
| FEAT-0009 | Notion effects are receipt-backed and a rerun is idempotent. |

## Evaluation and verification

- Current static suite: **9 skill packages × normal/hard/boundary = 27/27
  contracts pass**. Every package owns a local template, golden, blocked or
  boundary fixture, and rerun rule.
- Across the initial and minimal repaired safe-mode runs, all four Daily
  pipeline candidates earned **A** against their baselines. The Project-memory
  repair made the W35 reset explicit; the Project-control preserved judge output
  was re-parsed after the evaluator was fixed to accept a valid final JSON
  object after harmless prose.
- Source checks passed: **22 Python** tests, **35 Node** filesystem tests,
  workspace-context validation, setup preview, and `git diff --check`.

## Scope qualification

The Notion run is a deterministic fixture projection plus one bounded isolated
Project-memory provider edge. It proves Project data shape, application guards,
and Project receipt/idempotency behavior; it does not prove direct Daily Draft
updates or Weekly Draft finalization. See the corrective
`artifacts/audit/daily-weekly-artifact-flow-audit.md` for the generated-file
graph and required proof. The five integration/Weekly packages have current
normal/hard/boundary contract coverage, but no live messaging, Drive, or
production adapter was enabled. The setup preview was intentionally left
`changes_pending`; no source was installed into the Hermes profile.
