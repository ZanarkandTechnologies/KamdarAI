---
automation_id: kamdar-weekly-operating-review
automation_version: "2.0.0"
kind: company-os-automation
cadence: weekly
company_timezone: Asia/Kuala_Lumpur
skill: skills/pm-weekly/SKILL.md
---

# Weekly operating review

## Purpose

Freeze the complete week of Project Memory, run PM Weekly to produce final
local artifacts, then sync only explicitly authorized outputs.

## Authority

Read `workspace.hermes.md` completely. It owns exact sources, destinations,
message routes, and write authority. Never infer or substitute any of them.

## Todo List

- [ ] **1 — Freeze the weekly input.**

  - Before the first Notion call, run `ntn --help`, `ntn datasources --help`,
    `ntn pages --help`, and `ntn api --help`; use only confirmed syntax.
  - Fetch the complete active-Project inventory and exact Department relation.
  - Enumerate one current-week Project Memory file for every expected Project.
  - Reject mixed weeks, duplicate Projects, unreadable files, or an incomplete
    Project set.
  - Write `weekly/context/weekly-snapshot-YYYY-Www.json` containing the frozen
    inventory and file hashes.

- [ ] **2 — Run PM Weekly.**

  Read `skills/pm-weekly/SKILL.md` completely and execute it with every frozen
  Project Memory file, prior reports and long-term memory needed for comparison,
  and the report, record, and message templates named by the skill.

  The skill writes reports, memory updates, next-week Project Memory, and the
  executive message draft directly. Do not introduce an intermediary extraction
  object, generated template catalog, or Pydantic representation of Markdown.

- [ ] **3 — Review local artifacts.**

  Reread every changed file. Require complete Project coverage, matching
  templates, immediate-source links, conservative promotion, preserved prior
  memory, and no changes outside the skill's declared paths. A blocked Project
  blocks its dependent Department and Company finalization. Stop before every
  provider call when any artifact fails this review.

- [ ] **4 — Sync authorized artifacts.**

  - Local files are canonical.
  - Create one-way provider copies only for complete artifact-sync bindings.
  - Send or retain the executive draft according to its configured behavior.
  - Use configured native skills or MCP tools directly. Do not add a local
    dispatcher, delivery plan, or provider executor.
  - Read back provider effects and record returned URLs or message IDs only
    when the provider supplies them.

  Missing destinations remain local-only. Incomplete or unauthorized bindings
  block the affected external effect and never authorize a fallback.

## Output

- `weekly/context/weekly-snapshot-YYYY-Www.json`
- `weeks/<week>/reports/{projects,departments,company}/`
- `memory/{employees,sops,issues,decisions}/`
- `weeks/<next-week>/project-memory/`
- `weeks/<week>/outbound/company-report.md`
- `weekly/receipts/weekly-YYYY-Www.json`

The receipt records frozen input hashes, final local paths, provider outcomes,
returned provider identifiers, and blockers without duplicating artifact bodies.
