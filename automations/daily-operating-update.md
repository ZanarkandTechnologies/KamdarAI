---
automation_id: kamdar-daily-operating-update
automation_version: "2.0.0"
kind: company-os-automation
cadence: daily
company_timezone: Asia/Kuala_Lumpur
skill: skills/pm-daily/SKILL.md
---

# Daily operating update

## Purpose

Fetch one bounded Daily snapshot, run PM Daily against the current weekly
Project Memory, then apply only the resulting authorized provider effects.

## Authority

Read `workspace.hermes.md` completely. It owns exact sources, destinations,
message routes, and write authority. Never infer or substitute any of them.

## Todo List

- [ ] **1 — Fetch the Daily snapshot.**

  - Before the first Notion call, run `ntn --help`, `ntn datasources --help`,
    `ntn pages --help`, and `ntn api --help`; use only confirmed syntax.
  - Read active Projects and their complete pages.
  - Read linked Work that is in progress, blocked, overdue, changed during the
    last week, or completed and awaiting documentation review.
  - Include relevant embedded Meetings from those Work pages.
  - Keep exact Project, Work, Person, relation, status, date, URL, and source
    revision values.
  - Write `daily/context/daily-snapshot-YYYY-MM-DD.json`.

  Do not scan unrelated history. A missing relation or field is a named gap,
  not permission to infer a value or widen the query.

- [ ] **2 — Run PM Daily.**

  Read `skills/pm-daily/SKILL.md` completely and execute it with the Daily
  snapshot, each selected Project's current-week Project Memory file, and the
  memory and message templates named by the skill.

  The skill edits Project Memory and writes message drafts directly. Do not
  introduce an intermediary extraction object, generated template catalog, or
  Pydantic representation of the Markdown artifacts.

- [ ] **3 — Review local changes.**

  Reread every changed file. Require exact source citations, preserved existing
  memory, complete template headings, precise questions, and no changes outside
  the skill's declared output paths. Repair unclear prose with `unslop` without
  changing facts. Stop before provider calls when the artifact boundary fails.

- [ ] **4 — Apply authorized effects.**

  - Keep Project Memory local unless a complete artifact-sync row authorizes a
    one-way provider copy.
  - Post documentation questions or progress chases only to the exact linked
    Work record or explicitly configured employee route.
  - Use configured native skills or MCP tools directly. Do not add a local
    dispatcher, delivery plan, or provider executor.
  - Respect draft-versus-send behavior and exact destinations.
  - Read back every effect and record applied, duplicate, blocked, or failed.

  A missing integration or route blocks only that effect. Never choose a
  fallback channel, destination, record, or person.

## Output

- `daily/context/daily-snapshot-YYYY-MM-DD.json`
- Updated `weeks/<week>/project-memory/project--<project-id>.md`
- Drafts under `daily/messages/{documentation,progress}/`
- `daily/receipts/daily-YYYY-MM-DD.json`

The receipt is a compact factual log of attempted effects, exact targets,
provider confirmations, and blockers. It does not duplicate artifact bodies.
