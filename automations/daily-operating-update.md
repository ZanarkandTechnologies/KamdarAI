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
  - Load each exact current-week private Project report from
    `weeks/<week>/reports/`. If this is the first Daily run of the week, initialize
    it through the private report writer from the bounded live Work context;
    never copy the prior finalized report wholesale.
  - Write `daily/context/daily-context-diff-YYYY-MM-DD.json`.

  Never infer an `ntn` resource or argument shape.

  Keep stable owner Person IDs in the context. Do not fetch contact details yet.
  A missing relation, full page, or processing field is a `configuration_gap`,
  not permission to scan every historical Work item.

- [ ] **2 — Extract one Zod-shaped Daily Review.**

  - Read `schemas/automations/daily-review-result.zod.mjs` completely.
  - Give `DailyReviewResultSchema`, its `.describe()` instructions, golden
    examples, and the context JSON to one structured extraction call.
  - Treat the call as schema-driven form completion. Do not add fields or
    requirements outside the schema.
  - Validate the returned object against `DailyReviewResultSchema`.
  - Write the exact validated bytes to
    `daily/review/daily-review-result-YYYY-MM-DD.json`.
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
  `schemas/automations/artifact-quality-review.zod.mjs` and write
  `daily/review/daily-artifact-quality-review-YYYY-MM-DD.json`. Require exact
  coverage of every output row. Only tier A may proceed to integration calls.
  Route B/C readability findings through `unslop`, regenerate the result, and
  rerun the review against the new hash; the reviewer never edits the result.

- [ ] **4 — Apply each JSON section and verify its effects.**

  Resolve the exact tables, URLs, write authority, and message routes from
  `workspace.hermes.md`. Then apply each result through its integration:

  - `project_updates[].section_replacements[]`: use the `notion` skill via
    configured provider on `projects`. Replace the named section only when
    `expected_current_text` still matches.
  - `documentation_reviews[]` with `verdict = needs_information`: use the
    configured provider on `tasks`. Add the rendered
    comment to the exact Work item using `question_key` for deduplication.
  - `knowledge_updates[].draft_entries[]` and `weekly_progress_chases[]`: map
    them through the private report writer into the exact current-week Project
    report. Build the complete replacement report using the procedure below.
  - `weekly_progress_chases[]`: load the exact Person, resolve its
    `Contact endpoint` through the active environment binding, and send through
    that approved route only.

  Never infer a table, report path, person, route alias, or fallback channel.
  The current private report path must resolve under `weeks/<week>/reports/`.
  If a required provider integration or approved route is unavailable, keep the
  private report update, report the external effect as `blocked`, and retain the
  JSON result.

  For the current Weekly Draft:

  1. Load or initialize the exact current-week private Project report.
  2. Reconcile its open-work view against canonical Work by stable Work ID:
     update still-open rows, add newly created Meeting-commitment Work, and
     omit completed or cancelled rows only after their disposition is
     evidenced in the current week's outcomes. Never delete the source Work.
  3. Preserve unresolved documentation requests, blockers, unaccepted expected
     artifacts, and other content that is still current.
  4. Render the structured workflow and problem payloads without dropping any
     baseline fields.
  5. Apply the findings to the required sections.
  6. Increment `draft_version` by one.
  7. Set `last_updated` to the run timestamp.
  8. Write one complete replacement Draft.

  **Message delivery**

  - Use only the route authorized by the active environment binding.
  - Before the first Gmail send, run
    `gws gmail users getProfile --params '{"userId":"me"}'` and
    `gws schema gmail.users.messages.send`.
  - Before the first Telegram send, run `kamdar send --help`.
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
  `schemas/automations/daily-integration-receipt.zod.mjs`, recording Notion
  effects, processing outcomes, and each blocked or provider-confirmed message
  route
