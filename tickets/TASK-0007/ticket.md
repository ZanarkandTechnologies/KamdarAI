---
id: TASK-0007
title: Recompose Kamdar Daily review as one structured extraction and guarded application
status: active
approval: owner-directed-source-build
created: 2026-08-22
updated: 2026-08-25
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
four application-shaped arrays: Project section replacements, completed-ticket
comments, weekly-progress chases, and Weekly Draft knowledge entries.

The prior four independently invoked Daily skill pipelines are superseded as the
runtime design. Their source packages remain frozen reference/eval material until
the combined automation proves equivalent or better behavior. Templates remain
the Notion rendering contracts; the Zod schema is the AI output contract.

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
             +-- linked Done Work not processed by current review version
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
     sections   comments    dispatcher  entries
        \          |          |          /
         +---------+----------+---------+
                           |
                           v
                  receipts + per-Work processing mark
```

## In scope

- Resolve the four Daily source keys declared by `workspace.hermes.md`.
- Collect active Projects and bounded relevant linked Work in one source phase.
- Validate the model result with the reviewed Zod contract.
- Write the context and result as JSON artifacts.
- Route each result array unchanged to its guarded integration boundary.
- Resolve employee contact only inside the dispatcher from verified People and
  channel-alias facts; no model-selected fallback.
- Mark completed Work with the current processing version only after all
  required effects for that Work succeed.
- Keep `prepare` as the default with zero provider effects.

## Out of scope

- Production schedule activation or production Notion/message writes.
- Model-selected provider routes, endpoints, action keys, hashes, or receipts.
- Loading every Project or historical Work item on every run.
- Deleting the previous Daily skills before combined proof passes.
- Weekly report finalization, promotion, and executive distribution changes.

## Change plan

| Unit | Owner surface | Change | Observable proof |
| --- | --- | --- | --- |
| A | `automations/schemas/daily-review-result.zod.mjs` | Keep one text-first schema per FEAT and one aggregate result. | Golden-shaped output parses; extra or malformed fields fail. |
| B | `automations/daily-operating-update.md` | Define the Codex automation that collects active-Project context, performs one structured extraction, writes JSON, and calls integration skills. | Contract test proves one collector, one result, and direct result-array routing. |
| C | Project/Draft/message/comment integrations | Accept directly routable section, comment, message, and anchor rows. | Each integration sees only its owned rows; prepare makes no provider call. |
| D | processing state | Derive eligible Done Work from context and mark only after successful required effects. | Partial failure leaves the Work unprocessed; rerun is safe. |
| E | automation docs/evals | Replace four-call runtime claims with the combined flow and boundary cases. | Focused Node/Python tests pass. |

## Invariants

- The collector is the only Daily provider-read phase.
- Active Projects are the root scope; relevant linked Work is bounded from them.
- Complete source pages enter the model context; pipelines never compensate with
  another provider scan.
- Rendered model text passes unchanged through integrations after identity,
  expected-current-value, source, route, and idempotency guards.
- `prepare` never mutates Notion, sends a message, or marks Work processed.
- Missing route/handler/adapter is blocked, never permission to choose a fallback.
- A processing mark is an observed application fact, not model output.

## Done

- One source-owned Codex automation Markdown contract implements the flow.
- The active-Project collector, Zod validation, application routing, receipts,
  and processing-version gate have deterministic tests.
- The Daily automation documentation and source catalog describe the same flow.
- No live provider write or schedule is claimed by local proof.

## QA strategy

1. Parse a golden one-call result through Zod.
2. Prove inactive Projects and unrelated Work do not enter context.
3. Prove linked open, changed-today, and Done-unprocessed Work do enter context.
4. Prove each result array routes to only its owning integration.
5. Prove prepare produces zero effects and zero processing marks.
6. Prove apply marks a Done Work item only after every required owned effect
   succeeds; one failed effect preserves it for retry.
7. Rerun the existing current-Weekly-Draft and workspace validation tests.

## Residual gates

Live Hermes model invocation, production Notion application, employee delivery,
and schedule activation require private profile installation and separately
authorized operated proof. Local source/eval success grants none of that authority.
