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

Run one bounded Daily Review for active Projects. Collect the relevant company
context once, extract one validated JSON result, then give each result array
unchanged to its integration owner.

The default is `prepare`: do not mutate Notion, mark Work
processed, or contact anyone. An operator may explicitly select
`isolated-eval` for the dated evaluation workspace. That mode may apply the
prepared Notion effects and relay proposed employee chases to the configured
Telegram eval sink. An eval relay proves message rendering and provider
delivery only; it is never recorded as delivery to the employee.

Write boundary: only the declared local output artifacts are allowed in `prepare`.
`isolated-eval` is bounded to the Notion root and eval sink aliases declared in
`workspace.hermes.md`.

## Todo List

- [ ] **1 — Load the active-Project context.**

  Read `workspace.hermes.md` and `skills/kamdar-company-os/SKILL.md` completely,
  including its Notion CLI contract. Before the first provider call, run
  `ntn --help`, `ntn datasources --help`, `ntn pages --help`, and
  `ntn api --help`; use only syntax confirmed there or in the skill contract.
  Never infer an `ntn` resource or argument shape. Then call
  `kamdar-company-os` for its bounded Daily collection step only. Query
  `notion.projects` for active Projects and
  read their complete pages. From `notion.work_items_this_week`, read the
  complete linked Work that is open, changed today, or Done with a different
  `Daily review version`; include embedded Meetings from those Work pages.
  Load the exact current-week Notion Report Draft and its full page content.
  Write `daily/context/daily-context-diff-YYYY-MM-DD.json`.

  Keep stable owner Person IDs in the context. Do not fetch contact details yet.
  A missing relation, full page, or processing field is a `configuration_gap`,
  not permission to scan every historical Work item.

- [ ] **2 — Extract one Zod-shaped Daily Review.**

  Read `automations/schemas/daily-review-result.zod.mjs` completely. Give its
  `DailyReviewResultSchema`, `.describe()` instructions and golden examples,
  plus the context JSON, to one structured extraction call. Extract:

  | Result array | Feature | Required result |
  | --- | --- | --- |
  | `project_updates[].section_replacements[]` | FEAT-0001 | Complete replacements for Project `Overview`, `Project knowledge`, and `This week's attention` |
  | `completed_ticket_comments[]` | FEAT-0002 | Complete clarification comments for Done Work whose important rationale or evidence is missing |
  | `weekly_progress_chases[]` | FEAT-0003 | Complete accountable-owner messages when weekly targets are stale, blocked, or unlikely to finish |
  | `knowledge_updates[].draft_entries[]` | FEAT-0004 | Complete source-linked Weekly Draft entries carrying structured current-workflow observations, measurable problem baselines or explicit measurement gaps, decisions, and SOP promotion candidates |

  Validate the result against `DailyReviewResultSchema` and write it unchanged
  to `daily/review/daily-review-result-YYYY-MM-DD.json`. On validation failure,
  stop before integrations.

  Daily observation does not require an already-approved SOP. Capture the
  current employee method first, including inefficient or informal steps. A
  missing duration, volume, wage basis, or financial value stays as a named
  measurement gap with an owner and a precise source-record question; never
  substitute an estimate.

- [ ] **3 — Pass the end-user artifact quality gate.**

  Give the exact result bytes, frozen context, destination templates, and
  `evals/rubrics/end-user-artifact-quality.md` to an independent read-only
  reviewer. Validate its response with
  `automations/schemas/artifact-quality-review.zod.mjs` and write
  `daily/review/daily-artifact-quality-review-YYYY-MM-DD.json`. Require exact
  coverage of every output row. Only tier A may proceed to integration calls.
  Route B/C readability findings through `unslop`, regenerate the result, and
  rerun the review against the new hash; the reviewer never edits the result.

- [ ] **4 — Use each JSON section with its integration.**

  Resolve the exact tables, URLs, and channel aliases from
  `workspace.hermes.md`, then apply this mapping:

  | Use this JSON section | To do this | With this integration |
  | --- | --- | --- |
  | `project_updates[].section_replacements[]` | Replace the named section on the exact Project only when `expected_current_text` still matches | `notion` skill via `ntn` on `notion.projects` |
  | `completed_ticket_comments[]` and `knowledge_updates[].missing_information_comment` | Add the rendered clarification comment to the exact Work item | `notion` skill via `ntn` on `notion.work_items_this_week` |
  | Current Weekly Draft Report + `knowledge_updates[].draft_entries[]` + `weekly_progress_chases[]` | Return one complete replacement Draft: preserve still-current content, render the structured workflow/problem payloads without losing baseline fields, apply the findings to the four sections, increment `draft_version` by one, and set `last_updated` to the run timestamp | `notion` skill via `ntn` on the exact current-week Report Draft |
  | `weekly_progress_chases[]` | Load the exact Person, resolve their approved preferred channel and safe route alias, then either prepare the chase or dispatch it under the mode rules below | `notion` skill via `ntn`, then `$telegram-message`, `email-message`, or `whatsapp-message` |

  Never infer a table, Report, person, route alias, or fallback channel. The current Report
  Draft ID/URL must be present in the collected context. If the Reports source,
  required integration, or approved route is unavailable, report `blocked` and
  keep the JSON result.

  **Contact routing by execution mode**

  - In `prepare`, record the intended Person, preferred channel, approved route
    alias, and rendered message. Make no provider call.
  - In `isolated-eval`, never send to a seeded employee address or account.
    Wrap each unchanged `message_text` in an eval envelope naming the intended
    Person, requested channel, and route alias, then send it only to the
    explicitly configured Telegram eval sink. Record the result as
    `delivered_to_eval_sink`, not `delivered_to_employee`.
  - A missing email or WhatsApp provider is `channel_unavailable`. It must not
    silently fall back to Telegram. The separately authorized Telegram eval
    relay may still run, but its receipt must preserve the unavailable intended
    channel and identify Telegram as the proof sink.
  - Every provider attempt needs a receipt with the action key, intended Person,
    intended channel, approved route alias, actual sink alias, provider state,
    provider message ID when returned, and timestamp. Never invent success or a
    provider message ID.

  Only after every required effect for a Done Work item is `applied`,
  `duplicate`, or truthfully `no_finding` may the `notion` skill set that Work
  item's `Status` to `Processed` and `Daily review version` to
  `daily-review-v1`. The receipt must read both values back. Prepared, blocked,
  conflicted, or failed effects leave `Status` as `Done` and the review version
  empty so the item remains eligible for retry.

## Output

- `daily/context/daily-context-diff-YYYY-MM-DD.json`
- `daily/review/daily-review-result-YYYY-MM-DD.json`
- `daily/review/daily-artifact-quality-review-YYYY-MM-DD.json`
- One receipt recording Notion effects, processing outcomes, and each prepared,
  blocked, or provider-confirmed message route
