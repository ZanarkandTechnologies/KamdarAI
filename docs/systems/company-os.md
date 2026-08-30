---
title: Company OS
status: designed
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-31
system_id: SYS-0001
primary_feature_ref: FEAT-0001
feature_refs:
  - FEAT-0001
  - FEAT-0002
  - FEAT-0003
  - FEAT-0004
  - FEAT-0005
  - FEAT-0006
  - FEAT-0007
refs:
  - ../features/README.md
  - ../../workspace.hermes.md
  - ../../automations/daily-operating-update.md
  - ../../automations/weekly-operating-review.md
  - ../../evals/daily/suite.json
  - ../../evals/weekly/suite.json
---

# Company OS

The Company OS turns one bounded Daily source scan into private Project Notes.
Weekly freezes every active Project's notes together, then produces official
reports and persistent entity updates without rescanning raw Work or Meetings.

```text
company_os(source_window, templates, destination_bindings)
  -> Project Notes -> reports + Employee Memory + SOP/Decision/Issue updates
```

## At a glance

- System ID: `SYS-0001`
- Primary feature: `FEAT-0001`
- Daily owner: append complete source-linked observations to one private file
  per Project/week.
- Weekly owner: freeze the all-Project set; project reports and persistent
  Person/SOP memory; carry unresolved items forward.
- Durable summaries: Project reports → Department reports → Company report.
- Promotion authority: Weekly only, after type-specific gates
- External writes: Stage 2 mappings to explicitly configured destination URLs;
  destination platforms own access control
- Public boundary: Project Notes and intermediate management state stay private.

## Private workspace contract

```text
weeks/
`-- YYYY-Www/
    |-- project-notes/
    |   `-- project--<stable-project-id>.md
    |-- reports/
    |   |-- projects/
    |   |-- departments/
    |   `-- company/
    |-- projections/
    |   |-- employee-memory-updates.json
    |   `-- sop-updates.json
    `-- outbound/
        `-- <approved message or publication>.md
```

Week-first storage matches the dominant access pattern. Project Notes are
append-only observation blocks; Weekly report files are projections, not the
Daily cache. There is no publish queue or separate Daily Person/SOP memory.

## System flow

```text
Projects + Work + Meetings + artifacts
                  |
       Daily Pydantic extraction
                  |
       project_note_updates[]
                  |
       Project-scoped append writer
                  v
       all Project Notes for week
                  |
         lock + coverage + freeze
                  |
       +----------+-----------+----------------+
       |          |           |                |
    Reports   Employee     SOP samples     Issue/Decision
       |       Memory      + baseline       promotion
       v                     proposal
Department -> Company -> approved outbound/publication
```

Daily selects latest Work state by source revision and time. Weekly selects the
greatest `source_updated_at` per Work and question type; materially divergent
ties block consolidation. Accepted completed outcomes update Employee Memory by
`person_id + work_id`. Comparable workflow samples group by explicit
`workflow_key`; three samples across two Projects may propose, but never apply,
a timing baseline without owner approval.

After every required projection validates and reads back, Weekly writes a
consolidation receipt. It then initializes next week's Project Notes with only
unresolved Work, open documentation questions, and unaccepted artifacts. Frozen
notes and Final reports remain immutable.

Stage 1 never decides provider placement. Stage 2 maps validated fields to
explicit workspace paths, destination URLs, or routes. `workspace.hermes.md`
holds those bindings; Notion and Drive own destination permissions.

```text
validated projection
  |-- NOTION / WIKI     approved records and reports at configured URLs
  |-- GOOGLE DRIVE      approved documents under the configured company root
  `-- EMAIL / TELEGRAM  approved outbound only, with delivery receipts
```

## Integration routing

This table is the selected provider contract, not evidence that a connection is
installed or healthy; operated receipts remain the proof of live access.

| Capability | Route | Decision basis |
| --- | --- | --- |
| Notion read/write | Official hosted Notion MCP connected directly by Hermes | Its hosted OAuth works with Hermes and supports agent-created and updated pages without another broker. |
| Notion comment events | Notion webhook into the Hermes gateway | MCP provides actions, not event ingress; the webhook starts the run and the MCP performs any resulting read/write. |
| Gmail, Drive, Docs, Sheets, and Calendar | One Composio-managed Google connection exposed to Hermes through a fixed tool allowlist | Google's hosted Workspace MCP is still Developer Preview, requires Workspace and Cloud/OAuth setup, and does not cover the current personal-Google deployment or all required Gmail actions. Composio supplies managed consent, token refresh, and the missing Google tools. |

Grounding: [Notion hosted MCP](https://developers.notion.com/guides/mcp/overview),
[Google Workspace MCP configuration](https://developers.google.com/workspace/guides/configure-mcp-servers),
[Google Developer Preview terms](https://developers.google.com/workspace/preview),
and [Composio managed authentication](https://docs.composio.dev/toolkits/managed-auth).

Hermes owns the connection identity, allowed tools, health, write authority,
and provider receipts. Composio owns the Google OAuth application and token
lifecycle; the Company OS source stores only the desired routing and no provider
tokens.
Connect only the explicitly authorized client Google account, bind Drive work
to the configured company root, and keep production email sends separately
authorized. Prefer a dedicated company Google identity when the client adopts
one.

This repository is the temporary proving ground for this route. Move the
generic provider policy to HermesCorp after operated proof without moving any
client account or routing details. Reconsider direct Google MCP after
general availability when it supports the required account type and Gmail
actions with a lower setup burden.

## Promotion map

| Candidate found during Daily | Weekly disposition | Intended destination |
| --- | --- | --- |
| Repeated or material problem | Promote / Duplicate / Monitor / Dismiss | Existing Work database / Issue record linked to the affected SOP step |
| Decision with future precedent | Promote / Duplicate / Monitor / Dismiss | Decisions database |
| Observed employee workflow | Observe daily; promote only after authority/reuse review | Existing SOPs database / `templates/sop.md`; `skill.md` remains software-only |

Daily never promotes canonical knowledge. Proprietary Project-specific facts
accumulate in private Project Notes and then immutable Project report history,
linked to their Work or Meeting source and review condition. Weekly may apply only a Problem, Decision, or SOP
candidate whose source quality, destination mapping, dedupe result, authority,
privacy, and write policy all pass. Otherwise it remains in the report with a
named gap.

## Proof model

Every assertion in the Daily and Weekly eval suites belongs to one feature. The
proof UI groups rows by feature while each runner validates one immutable run:

```text
feature
  → outcome
  → source links
  → record changes
      → before/after field assertions
  → deliberate files
      → template assertion + expandable content assertions
  → behavior and downstream application / observed receipt
```

Feature documents own the buyer explanation and ASCII Flow; `feature_id`
resolves each assertion to that document. The frozen proof remains network-free;
external delivery only becomes success through a redacted provider receipt.
