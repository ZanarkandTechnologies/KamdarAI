---
automation_id: kamdar-daily-operating-update
automation_version: "1.0.0"
kind: company-os-automation
cadence: daily
company_timezone: Asia/Kuala_Lumpur
feature_refs: [FEAT-0001, FEAT-0002, FEAT-0003, FEAT-0004]
---

# Daily operating update

## Context

Run one bounded Daily Review for active Projects. Collect the company context
once, produce and validate one JSON result, then pass each result array
unchanged to the integration named in step 4.

## Authority

`workspace.hermes.md` is the active environment binding. It supplies the exact
Notion sources, write authority, and message routes for this run. Use only those
resources and stop when a required action is not authorized. Never infer a
destination or substitute another route.

## Todo List

- [ ] **1 — Load the active-Project context.**

  - Read `workspace.hermes.md` completely for source routing and authority.
  - Before the first provider call, run `ntn --help`,
    `ntn datasources --help`, `ntn pages --help`, and `ntn api --help`. Use only
    syntax confirmed by the installed CLI.
  - Query the `projects` source for active Projects and read their complete pages.
  - From the `tasks` source, read complete linked open or
    changed-today Work for Project progress. For documentation review and
    processing, read complete Work only when `Status = Done` and
    `AI review != Processed`. Do not reload unchanged Done Work whose
    `AI review = Processed`.
  - Include embedded Meetings from the selected Work pages.
  - Load or initialize one Project Notes file for every selected Project at
    `weeks/<week>/project-notes/project--<project-id>.md`. Do not load prior
    Daily source records, Employee Memory, SOP records, or final reports.
  - Write `daily/context/daily-context-diff-YYYY-MM-DD.json`.

  Never infer an `ntn` resource or argument shape.

  Keep stable owner Person IDs in the context. Do not fetch contact details yet.
  A missing relation, full page, or processing field is a `configuration_gap`,
  not permission to scan every historical Work item.

- [ ] **2 — Extract one Pydantic-shaped Daily Review.**

  - Read `schemas/automations/daily_review_result.py` completely and run
    `python -m schemas.automations.validate schema daily-review`.
  - Give the emitted JSON Schema, its field descriptions, golden
    examples, and the context JSON to one structured extraction call.
  - Treat the call as schema-driven form completion. Do not add fields or
    requirements outside the schema.
  - Write the exact validated bytes to
    `daily/review/daily-review-result-YYYY-MM-DD.json`.
  - Validate that file with `python -m schemas.automations.validate
    validate daily-review <result-path>`.
  - Stop before integrations if validation fails.

  Daily observation does not require an already-approved SOP. Capture the
  current employee method first, including inefficient or informal steps. A
  missing duration, volume, wage basis, or financial value stays as a named
  measurement gap with an owner and a precise source-record question; never
  substitute an estimate.

- [ ] **3 — Pass the end-user artifact quality gate.**

  Give the exact result bytes, frozen context, destination templates, and
  `evals/rubrics/end-user-artifact-quality.md` to an independent read-only
  reviewer. Validate its response with
  `schemas/automations/artifact_quality_review.py`, validate it with `python -m
  schemas.automations.validate validate artifact-quality-review
  <review-path>`, and write
  `daily/review/daily-artifact-quality-review-YYYY-MM-DD.json`. Require exact
  coverage of every output row. Only tier A may proceed to integration calls.
  Route B/C readability findings through `unslop`, regenerate the result, and
  rerun the review against the new hash; the reviewer never edits the result.
  Keep opaque UUIDs and hashes in structured evidence fields only. Comments,
  messages, reasoning, and rendered Markdown use readable entity names or
  natural descriptions; human references such as `TASK-101` may remain.

- [ ] **4 — Apply each JSON section and verify its effects.**

  Resolve the exact tables, URLs, write authority, and message routes from
  `workspace.hermes.md`. Then apply each result through its integration:

  - `project_note_updates[]`: pass `progress_notes[]` and `knowledge_notes[]`
    unchanged to `scripts/project_week_notes.py`. The applier derives stable
    note keys and appends each Project batch to that Project's current-week
    file under the week lock.
  - `documentation_reviews[]` with `verdict = needs_information`: use the
    configured provider on `tasks`. Add the rendered
    comment to the exact Work item using `question_key` for deduplication.
  - `documentation_reviews[]` with an open question must also have a matching
    `documentation_question` note in the owning Project batch. The provider
    comment and private note are separate effects with the same Work ID.
  - `weekly_progress_chases[]`: load the exact Person, resolve its
    `Contact endpoint` through the active environment binding, and send through
    that approved route only.

  Never infer a table, report path, person, route alias, or fallback channel.
  The Project Notes path must resolve under `weeks/<week>/project-notes/`.
  If a required provider integration or approved route is unavailable, keep the
  private report update, report the external effect as `blocked`, and retain the
  JSON result.

  For each Project Notes batch:

  1. Validate every note's Project, section, source revision, timestamps, Work
     and Person IDs, workflow key, payload, and Markdown.
  2. Acquire the week lock, reject a frozen week, and preflight every note key.
  3. Append new notes by section. Exact duplicates make no write; a conflicting
     key leaves that Project file unchanged.
  4. Record the per-Project append outcome. Other Project batches may settle
     independently, but Work processing advances only when its owning Project
     append and all other required effects settle safely.

  **Message delivery**

  - Use only the route authorized by the active environment binding.
  - Before the first Gmail send, run
    `gws gmail users getProfile --params '{"userId":"me"}'` and
    `gws schema gmail.users.messages.send`.
  - Before any configured owner message, pipe the message body from the runtime
    workspace into `python ../scripts/authorized_message.py --workspace
    .hermes.md --profile-home .. --message "owner alert" --action-key
    <stable-action-key>`. Never call `hermes send` directly from a normal
    automation.
  - If the intended route is missing or unauthorized, record
    `channel_unavailable`. Do not select another channel, recipient, or fallback.
  - For every provider attempt, record the action key, intended Person, intended
    channel, approved route alias, actual destination, provider state, provider
    message ID when returned, and timestamp. Never invent success or a provider
    message ID.

  Posting a documentation question does not complete documentation review. A
  `needs_information` verdict must keep `Status = Done`, set
  `AI review = Needs information`, and leave `Daily review version` empty.

  Only after a Done Work item has `documentation verdict = sufficient` and
  every required effect is `applied`, `duplicate`, or truthfully `no_finding`
  may the `notion` skill set `AI review = Processed` and
  `Daily review version = daily-review-v2`. Keep `Status = Done`. The receipt
  must read all three properties back. A blocked, conflicted, or failed effect
  sets `AI review = Blocked` and leaves the review version empty.

## Output

- `daily/context/daily-context-diff-YYYY-MM-DD.json`
- `daily/review/daily-review-result-YYYY-MM-DD.json`
- `daily/review/daily-artifact-quality-review-YYYY-MM-DD.json`
- `daily/receipts/daily-integration-receipt-YYYY-MM-DD.json`, validated against
  `schemas/automations/daily_integration_receipt.py` with `python -m
  schemas.automations.validate validate daily-integration-receipt
  <receipt-path> --processing-safety`, recording Notion
  Project Notes append effects, processing outcomes, and each blocked or provider-confirmed message
  route
