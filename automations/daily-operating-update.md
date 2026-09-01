---
automation_id: kamdar-daily-operating-update
automation_version: "2.2.0"
kind: company-os-automation
cadence: daily
company_timezone: Asia/Kuala_Lumpur
skill: skills/pm-daily/SKILL.md
---

# Daily operating update

```text
[Daily parent] --fetch once--> [bounded snapshot]
  --partition by exact Project relation--> [one Project packet each]
[Project packet] --isolated PM Daily subagent--> [Project Memory + action drafts]
[all results] --parent review and dedupe--> [authorized effects + receipt]
[unresolved relation] ---------------------> [named gap; no edit]
```

## Purpose

Fetch one bounded Daily snapshot, isolate PM Daily analysis by Project, then
apply only the resulting authorized provider effects.

## Deployment values — replace on the company computer

Replace every value below before enabling this automation. Use exact Notion
page or database URLs and do not search for substitutes.

```text
PROJECTS_URL=<REPLACE_WITH_NOTION_PROJECTS_URL>
TASKS_URL=<REPLACE_WITH_NOTION_TASKS_URL>
PEOPLE_URL=<REPLACE_WITH_NOTION_PEOPLE_URL>
```

If any value still contains `REPLACE_WITH`, stop and report
`deployment_values_incomplete`. Do not read another configuration file or scan
the connected Notion workspace.

## Authority

The Deployment values above own the exact input sources for this operated test.
Production writes remain proposal-only. Never infer another source, recipient,
or destination.

## Todo List

- [ ] **1 — Fetch the Daily snapshot.**

  - Use only the configured hosted Notion MCP. Do not call `ntn`, a local
    Notion CLI, the Notion REST API, or the webhook plugin for data fetching.
  - Fetch `projects` from `PROJECTS_URL` with `notion-fetch` and, when the URL
    resolves to a database or data source, its MCP query tools, using: "Read
    every active Project and
    its complete page. Preserve its provider page ID, business ID, status,
    Department relation, URL, and source revision."
  - Fetch `tasks` from `TASKS_URL` with `notion-fetch` and, when the URL resolves
    to a database or data source, its MCP query tools, using: "Read Work that is in progress,
    blocked, overdue, changed during the last week, or completed and awaiting
    documentation review. Preserve its provider page ID, business ID, exact
    Project and Person relations, dates, URL, source revision, and complete
    page content."
  - Fetch `people` from `PEOPLE_URL` with `notion-fetch` and, when the URL
    resolves to a database or data source, its MCP query tools, using: "Read only People referenced by the
    selected Work. Preserve their provider page ID, business ID, name, and
    email when present; do not scan unrelated People."
  - Include relevant embedded Meetings from those Work pages.
  - Keep exact Project, Work, Person, relation, status, date, URL, and source
    revision values.
  - Write `daily/context/daily-snapshot-YYYY-MM-DD.json`.

  Do not scan unrelated history. A missing relation or field is a named gap,
  not permission to infer a value or widen the query.

- [ ] **2 — Run PM Daily.**

  - Partition the snapshot by exact Project relation. Build one packet per
    selected Project containing that Project, its related Work, People and
    embedded Meetings, its current-week Project Memory, and the templates named
    by PM Daily. Never copy unrelated Project context into a packet.
  - Spawn one native subagent per Project packet and invoke PM Daily once in
    that isolated boundary. Each subagent owns only that Project's Memory file
    and drafts for Work in that Project; it returns changed paths and named gaps.
  - Run independent Project packets concurrently when safe. A failed or
    unresolved packet blocks only that Project until the parent review finds a
    cross-Project completeness or safety failure.

  Read `skills/pm-daily/SKILL.md` completely before dispatch and require every
  subagent to read it before editing. The skill edits Project Memory and writes
  message drafts directly. Do not
  introduce an intermediary extraction object, generated template catalog, or
  Pydantic representation of the Markdown artifacts.

- [ ] **3 — Review local changes.**

  Collect every subagent result, reject overlapping write paths, and deduplicate
  actions by exact Work item and question condition. Reread every changed file.
  Require exact source citations, preserved existing memory, complete template
  headings, precise questions, and no changes outside the owning Project packet.
  Repair unclear prose with `unslop` without changing facts. Stop before provider
  calls when the artifact boundary fails.

- [ ] **4 — Apply authorized effects.**

  Apply only the exact artifact types returned by PM Daily:

  - For `project_memory`, call no integration. Keep the returned file local.
  - For `documentation_request`, call the configured Notion MCP with: "Call
    `notion-get-comments` on the returned `source_url`. If the exact Markdown
    body after the routing frontmatter already exists, record `duplicate` and
    stop. Otherwise call `notion-create-comment` on that same page with the
    exact body, then call `notion-get-comments` again and require exact
    read-back. Do not search for or substitute another Work record."
  - For `progress_followup`, call the configured Notion MCP with: "Call
    `notion-get-comments` on the returned `source_url`. If the exact Markdown
    body after the routing frontmatter already exists, record `duplicate` and
    stop. Otherwise call `notion-create-comment` on that same page with the
    exact body, then call `notion-get-comments` again and require exact
    read-back. Do not search for or substitute another Work record."

  Use configured native skills or MCP tools directly. Do not add a dispatcher,
  delivery plan, or provider executor. Read back every attempted effect and
  record `applied`, `duplicate`, `blocked`, or `failed` in the receipt.

  A missing integration or route blocks only that effect. Never choose a
  fallback channel, destination, record, or person.

## Integration outputs

- `daily/context/daily-snapshot-YYYY-MM-DD.json`
- `daily/receipts/daily-YYYY-MM-DD.json`

PM Daily owns and returns every Project Memory and message-draft path. The
automation receipt is a compact factual log of attempted effects, exact targets,
provider confirmations, and blockers; it does not duplicate artifact bodies.
