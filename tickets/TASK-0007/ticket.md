---
id: TASK-0007
title: Recompose Kamdar Daily review as one structured extraction and guarded application
status: active
approval: owner-directed-source-build
created: 2026-08-22
updated: 2026-08-27
owner: vishan-kamdar
feature_refs:
  - FEAT-0001
  - FEAT-0002
  - FEAT-0003
  - FEAT-0004
  - FEAT-0005
  - FEAT-0006
  - FEAT-0007
  - FEAT-0008
  - FEAT-0009
---

# Recompose Kamdar Daily review as one structured extraction and guarded application

## Decision

Kamdar uses active Projects as the Daily scope root. One collector reads their
current editable sections, relevant linked Work, embedded Meetings, and
referenced People. One model call returns a Zod-validated JSON result containing
four application-shaped arrays: Project section replacements, documentation
reviews, weekly-progress chases, and Weekly Draft knowledge entries. Business
`Status` remains `Done`; the separate `AI review` property records whether
Daily review is pending, waiting for information, processed, or blocked.

The prior independently invoked Daily and Weekly skill pipelines are
superseded and removed. The Daily and Weekly automation contracts now own the
runtime behavior directly. Templates remain the Notion rendering contracts;
the Zod schemas are the structured extraction contracts.

### Runtime authority update — 2026-08-27

TASK-0007 originally proved the flow through `prepare` and `isolated-eval`
execution. Those modes are no longer part of the automation contract. The
automation is environment-neutral; `workspace.hermes.md` owns the environment,
provider routes, and write authority. The current workspace binding remains
proposal/evaluation-only, so this update does not activate production writes or
a production schedule. Production requires a separately reviewed binding and
schedule.

## Contract diagram

```text
workspace.hermes.md source keys
             |
             v
      active Projects
             |
             +-- full Project sections
             +-- linked open Work
             +-- linked Work changed today
             +-- linked Done Work where AI review is not Processed
             +-- embedded Meetings + referenced People
             |
             v
      one bounded Daily context JSON
             |
             v
      one structured extraction call
             |
             v
      Zod DailyReviewResult JSON
        |          |          |          |
        v          v          v          v
     Project     Work       employee    Weekly Draft
     sections   reviews     dispatcher  entries
        \          |          |          /
         +---------+----------+---------+
                           |
                           v
                  receipts + per-Work AI review state
```

## In scope

- Resolve the four Daily source keys declared by `workspace.hermes.md`.
- Collect active Projects and bounded relevant linked Work in one source phase.
- Validate the model result with the reviewed Zod contract.
- Write the context and result as JSON artifacts.
- Route each result array unchanged to its guarded integration boundary.
- Resolve employee contact only inside the dispatcher from verified People and
  channel-alias facts; no model-selected fallback.
- Mark completed Work `AI review = Processed` only when its documentation
  verdict is sufficient and every required effect succeeds.
- Keep business `Status = Done`; a posted documentation question leaves
  `AI review = Needs information` and does not set the review version.
- Keep execution authority outside the automation and in the reviewed workspace
  binding.
- Remove superseded workflow skills, fixtures, runners, and proof UI after the
  canonical Daily/Weekly validators preserve their behavior.

## Out of scope

- Changing the current proposal/evaluation-only workspace binding or activating
  a production schedule.
- Model-selected provider routes, endpoints, action keys, hashes, or receipts.
- Loading every Project or historical Work item on every run.
- Weekly report finalization, promotion, and executive distribution changes.

## Change plan

| Unit | Owner surface | Change | Observable proof |
| --- | --- | --- | --- |
| A | `schemas/automations/daily-review-result.zod.mjs` | Keep one text-first schema per FEAT and one aggregate result. | Golden-shaped output parses; extra or malformed fields fail. |
| B | `automations/daily-operating-update.md` | Define the Codex automation that collects active-Project context, performs one structured extraction, writes JSON, and calls integration skills. | Contract test proves one collector, one result, and direct result-array routing. |
| C | Project/Draft/message/comment integrations | Accept directly routable section, comment, message, and anchor rows. | Each integration sees only its owned rows; the current workspace binding makes no production provider call. |
| D | processing state | Fetch Done Work whose `AI review` is not `Processed`; mark it processed only after a sufficient documentation verdict and successful required effects. | A posted question leaves `Status = Done`, `AI review = Needs information`, and the review version empty. |
| E | automation docs/evals | Replace four-call runtime claims with the combined flow and boundary cases. | Focused Node/Python tests pass. |

## Invariants

- The collector is the only Daily provider-read phase.
- Active Projects are the root scope; relevant linked Work is bounded from them.
- Complete source pages enter the model context; pipelines never compensate with
  another provider scan.
- Rendered model text passes unchanged through integrations after identity,
  expected-current-value, source, route, and idempotency guards.
- Provider effects require explicit authority from the reviewed workspace
  binding; the current binding grants no production authority.
- Missing route/handler/adapter is blocked, never permission to choose a fallback.
- A documentation verdict is model output; a processing mark is an observed
  application fact derived from that verdict plus integration read-back.

## Done

- One source-owned Codex automation Markdown contract implements the flow.
- The active-Project collector, Zod validation, application routing, receipts,
  and processing-version gate have deterministic tests.
- The Daily automation documentation and source catalog describe the same flow.
- No live provider write or schedule is claimed by local proof.

## QA strategy

1. Parse a golden one-call result through Zod.
2. Prove inactive Projects and unrelated Work do not enter context.
3. Prove linked open or changed Work enters Project-control context and Done
   Work enters documentation review only when `AI review != Processed`.
4. Prove each result array routes to only its owning integration.
5. Prove the proposal/evaluation binding produces no production effects or
   processing marks.
6. Prove apply marks a Done Work item only after documentation is sufficient and
   every required owned effect succeeds; a posted question or failed effect
   preserves it for retry.
7. Rerun the existing current-Weekly-Draft and workspace validation tests.

## Residual gates

Live Hermes model invocation, production Notion application, employee delivery,
and schedule activation require private profile installation and separately
authorized operated proof. Local source/eval success grants none of that authority.
