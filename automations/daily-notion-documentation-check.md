---
automation_id: kamdar-daily-notion-documentation-check
automation_version: "0.1.0"
kind: company-os-automation
cadence: daily
company_timezone: Asia/Kuala_Lumpur
status: proposal-only
owner: Kamdar AI
source: Notion Tasks data source
comment_policy: proposal-only
---

# Daily Notion documentation check

> **Outcome**
>
> Produce a deduplicated, source-specific proposal for incomplete Notion work records edited in the current Kamdar local day.

> **Why**
>
> Improve operational documentation without silently editing records or posting comments.

## Route

- **Source:** [Notion Tasks](https://app.notion.com/p/638d85a858b04d038d8b97be1a879a1f)
- **Data source ID:** `43a439fd-74c5-4b43-9afb-950f047e5d4f`
- **Interaction:** `ntn` through the profile-scoped Notion integration.
- **Local day:** `Asia/Kuala_Lumpur`.

## Current mapping state

The current Tasks database exposes `Name`, `Project`, `Status`, `Description`, dates, and People relations. It does **not** expose a `Type` property or a mapped Kamdar Notion template for Task, Issue, or Meeting records.

Therefore every live run must return:

```text
configuration_gap: unmapped_template
```

It must not infer a template rubric or post a comment.

## Procedure

1. Calculate the current `Asia/Kuala_Lumpur` local-day UTC window.
2. Fetch at most 25 Tasks edited in that window.
3. Read only the configured template mapping and each returned task needed to evaluate it.
4. If a record type lacks a mapping, record `unmapped_template`; do not invent requirements.
5. If a mapping exists later, identify only missing, actionable items and build one comment proposal per record.
6. Deduplicate proposals by page ID, template reference, and normalized missing items.
7. Store the proposal and receipt in ignored local paths. Do not call the Notion comment-create endpoint.

## Write boundary

- Allowed now: bounded reads and local proposal generation.
- Not allowed now: comment posting, record editing, task creation, template creation, scheduling, or sending chases.
- To enable comments later, the owner must approve both a template mapping and `comment_policy: approved` in the workspace context, then approve the individual live run.

## Receipt fields

- local date and UTC window
- records checked and partial-query flag
- mapped templates and unmapped record types
- complete/incomplete/proposed/duplicate counts
- source and configuration gaps
- `write: false`
