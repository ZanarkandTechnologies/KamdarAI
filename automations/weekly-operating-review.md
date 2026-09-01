---
automation_id: kamdar-weekly-operating-review
automation_version: "2.2.0"
kind: company-os-automation
cadence: weekly
company_timezone: Asia/Kuala_Lumpur
skill: skills/pm-weekly/SKILL.md
---

# Weekly operating review

```text
[Weekly parent] --freeze--> [every Project Memory]
[Project Memory] ----------> [finalized Project evidence summaries]
[Project summaries] --by Department--> [Department reports] --> [Company report]
[Project summaries] --by Person ID----> [Employee Memory]
[Project summaries] --by workflow_key-> [SOP samples + baseline proposal]
[Project summaries] --decisions/issues> [durable memory]
```

## Purpose

Freeze the complete week of Project Memory, run PM Weekly to produce final
local artifacts, then sync only explicitly authorized outputs.

## Deployment values — replace on the company computer

Replace every required value below before enabling this automation. Weekly
derives its local input from `weeks/<current-week>/project-memory/`; that path is
part of the filesystem contract and is not configurable.

```text
PROJECTS_URL=<REPLACE_WITH_NOTION_PROJECTS_URL>
OWNER_REPORT_GMAIL_RECIPIENTS=<REPLACE_WITH_COMMA_SEPARATED_EMAILS_OR_NONE>
REPORTS_SYNC_DESTINATION=<REPLACE_WITH_GOOGLE_DRIVE_FOLDER_URL_OR_NONE>
SOPS_SYNC_DESTINATION=<REPLACE_WITH_NOTION_DATABASE_OR_GOOGLE_DRIVE_FOLDER_URL_OR_NONE>
DECISIONS_SYNC_DESTINATION=<REPLACE_WITH_NOTION_DATABASE_OR_GOOGLE_DRIVE_FOLDER_URL_OR_NONE>
```

If `PROJECTS_URL` still contains `REPLACE_WITH`, stop and report
`deployment_values_incomplete`. Every value ending in `_OR_NONE` may be set to
`none`; never invent a recipient or destination.

## Authority

The Deployment values above own the exact inputs and optional destinations for
this operated test. Local files remain canonical. Never infer another source,
recipient, or destination.

## Todo List

- [ ] **1 — Freeze the weekly input.**

  - Use only the configured hosted Notion MCP. Do not call `ntn`, a local
    Notion CLI, the Notion REST API, or the webhook plugin for data fetching.
  - Fetch `projects` from `PROJECTS_URL` with `notion-fetch` and, when the URL
    resolves to a database or data source, its MCP query tools, using: "Read the complete active-Project
    inventory and preserve each provider page ID, business ID, exact Department
    relation, status, URL, and source revision. Do not include inactive Projects."
  - Enumerate one current-week Project Memory file for every expected Project
    inside `weeks/<current-week>/project-memory/`.
  - Reject mixed weeks, duplicate Projects, unreadable files, or an incomplete
    Project set.
  - Write `weekly/context/weekly-snapshot-YYYY-Www.json` containing the frozen
    inventory and file hashes.

- [ ] **2 — Run PM Weekly.**

  Read `skills/pm-weekly/SKILL.md` completely and execute it with every frozen
  Project Memory file, prior reports and long-term memory needed for comparison,
  and the report, record, and message templates named by the skill.

  The skill writes finalized Project evidence summaries, Department and Company
  reports, memory updates, next-week Project Memory, and the executive message
  draft directly. Project summaries are intermediate evidence; Department and
  Company files are the management reports. Do not introduce an intermediary
  extraction object, generated template catalog, or Pydantic representation of
  Markdown.

- [ ] **3 — Review local artifacts.**

  Reread every changed file. Require complete Project coverage, matching
  templates, immediate-source links, conservative promotion, preserved prior
  memory, and no changes outside the skill's declared paths. A blocked Project
  blocks its dependent Department and Company finalization. Stop before every
  provider call when any artifact fails this review.

- [ ] **4 — Sync authorized artifacts.**

  Apply only the exact artifact types and paths returned by PM Weekly:

  - For each `project_report`, `department_report`, or `company_report` returned
    at `weeks/<week>/reports/...`, call the configured Google Drive integration
    with: "When `REPORTS_SYNC_DESTINATION` is not `none`, upload the exact
    returned file to that folder without rewriting it. Read back the created
    Drive file and record its returned URL. Otherwise keep it local."
  - For each `sop_memory` returned under `memory/sops/`, call the integration
    selected by `SOPS_SYNC_DESTINATION` with: "Sync only an approved finalized
    SOP to this exact destination, then read back the created record or file.
    Keep proposals and unapproved baselines local."
  - For each `decision_memory` returned under `memory/decisions/`, call the
    integration selected by `DECISIONS_SYNC_DESTINATION` with: "Sync only a
    promoted final Decision to this exact destination, then read back the
    created record or file. Keep unapproved proposals local."
  - For `executive_distribution` returned under `weeks/<week>/outbound/`, call
    the configured Gmail integration with: "When
    `OWNER_REPORT_GMAIL_RECIPIENTS` is not `none`, send the exact returned draft
    to every listed address. Do not substitute a summary or infer recipients;
    record each returned message ID independently. Otherwise keep it local."
  - For `employee_memory`, `issue_memory`, and `next_week_project_memory`, call
    no integration. Keep the exact returned files local. In particular, never
    sync Employee Memory to the public People database.
  - Use configured native skills or MCP tools directly. Do not add a local
    dispatcher, delivery plan, or provider executor.
  - Read back provider effects and record returned URLs or message IDs only
    when the provider supplies them.

  Missing destinations remain local-only. Incomplete or unauthorized bindings
  block the affected external effect and never authorize a fallback.

## Integration outputs

- `weekly/context/weekly-snapshot-YYYY-Www.json`
- `weekly/receipts/weekly-YYYY-Www.json`

PM Weekly owns and returns every report, memory, next-week Project Memory, and
distribution-draft path. The automation receipt records frozen input hashes,
validated returned paths, provider outcomes, returned provider identifiers, and
blockers without duplicating artifact bodies.
