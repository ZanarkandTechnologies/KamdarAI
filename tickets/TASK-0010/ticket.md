---
id: TASK-0010
title: Align Company OS eval scenarios with Farplane Eval OS
status: active
approval: owner-directed-implementation
created: 2026-08-26
updated: 2026-08-26
owner: vishan-kamdar
feature_refs: [FEAT-0001, FEAT-0002, FEAT-0003, FEAT-0004, FEAT-0005, FEAT-0006, FEAT-0007]
ui_scope: true
---

# Align Company OS eval scenarios with Farplane Eval OS

## Decision

Use Farplane's canonical case fields as the base contract for Daily and Weekly
workflow scenarios: `id`, `prompt`, `expected_output`, `files`, `assertions`,
and flat `metadata`. Keep readable `title`, `context`, `tags`, and `notes`
directly under `metadata`; keep only Kamdar-specific proof bindings under
`metadata.extensions.kamdar`. Do not add a second authored Given/When/Then
model.

The dashboard projects those typed fields into Given, When, Expected, Observed,
Result, and collapsed Technical proof. Every scenario computes status from its
own declared proof bindings; a feature verdict is never copied indiscriminately
to every related scenario.

## Contract diagram

```text
[A] Canonical Farplane case + metadata.extensions.kamdar
            |
            v
[B] strict shared suite contract ----invalid----> fail closed
            |
            v
[C] feature judges + integration gates + receipts
            |
            v
[D] scenario-specific checks/status
            |
            v
[E] Given | When | Expected | Observed | Result | Technical
```

## Scope

- Replace the Daily and Weekly case shape with canonical Farplane case fields
  and one typed `metadata.extensions.kamdar` proof-binding extension.
- Split implementation-language cases into plain user-outcome scenarios.
- Share one strict suite contract across Daily, Weekly, and dashboard loaders.
- Bind every scenario to exact feature assertions and/or integration gates.
- Render the accepted TASK-0008 dashboard with the clearer scenario fields.
- Repair Kamdar skill-local eval manifests so the canonical Farplane validator
  can validate this repository when invoked with its explicit root.
- Rerun focused and full repository eval/test surfaces without live provider
  writes, deployment, or Hermes runtime installation.

## Change plan

| Unit | Owner surface | Change | Proof |
| --- | --- | --- | --- |
| A-B | `evals/filesystem/scripts/company-operating-eval-contract.mjs`, Daily/Weekly suite JSON | Define and migrate the shared Farplane-based scenario contract plus bindings. | Both suites parse; malformed or incomplete scenarios fail. |
| C-D | unified Daily/Weekly evaluators and dashboard model | Resolve scenario-specific feature assertions, integration gates, receipts, observed slices, and status. | Mutating one bound proof changes only its owning scenarios. |
| E | dashboard components/theme/client | Render literal Given, When, Expected, Observed, Result, and collapsed Technical sections using existing interaction and visual primitives. | Desktop/mobile markup and operated captures match `design.md`. |
| F | `skills/*/evals/evals.json` | Remove noncanonical fields, keep portable files/metadata, and preserve material case meaning. | Farplane validator passes against the Kamdar root. |
| G | tests, README, eval automation docs | Update contracts, fixtures, and commands; rerun the complete local suite. | Narrow tests, full tests, explicit-root eval lint, and static build pass. |

## Lean receipt

```yaml
rung: reuse_local
evidence:
  - Farplane Eval OS already owns expected, agent answer, assertion evidence, traces, and artifacts.
  - TASK-0008 already owns the list/inspector UI and responsive behavior.
smallest_next_action: add one shared adapter/contract and scenario proof binding; reuse existing render primitives
proof_preserved: schema, feature judges, integration receipts, read-back, processing safety, and idempotency remain visible
```

## Done

- Daily and Weekly scenarios use canonical Farplane case fields with no
  implementation-jargon titles such as `processing-after-effects-canary`.
- Each scenario has independent proof bindings, checks, and status.
- The inspector makes expected failure handling understandable without exposing
  technical terminology by default.
- Canonical skill eval manifests pass the Farplane contract against KamdarAI.
- Full local verification passes and no live provider or deployment side effect occurs.

## QA Strategy

1. Contract tests reject missing task fields, unknown feature/entity references,
   unknown proof gates, and duplicate scenario IDs.
2. Mutation tests prove a failed integration gate affects only bound scenarios.
3. Receipt tests prove blocked work can yield a passing safety scenario while
   remaining operationally unprocessed.
4. Dashboard tests assert literal labels, evidence mapping, responsive behavior,
   and no domain literals in renderer source.
5. Run the filesystem, Python, setup, webhook, and explicit-root Farplane eval
   contract checks listed by the repository.
6. Capture desktop/mobile UI evidence and obtain independent implementation and
   evidence-quality review before completion.

## Safety

This ticket is source-only. It does not authorize live Notion, Telegram, email,
WhatsApp, Drive, scheduling, deployment, or Hermes runtime writes.

## Links

- Design: `tickets/TASK-0010/design.md`
- Progress: `tickets/TASK-0010/progress.md`
- Prior UI baseline: `tickets/TASK-0008/design.md`
- Farplane ownership: `../Farplane/skills/eval/references/eval-surface-ownership.md`
