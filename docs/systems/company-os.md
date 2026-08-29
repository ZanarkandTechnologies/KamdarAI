---
title: Company OS
status: designed
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-29
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

The Company OS turns one bounded Daily source scan into private,
week-scoped Project reports and outbound requests. Daily first validates one
platform-neutral structured result, then deterministically maps its fields into
those workspace artifacts. Weekly finalizes the Project reports, rolls them into
Department and Company reports, and prepares reviewed knowledge promotion,
next-week planning, and executive delivery without re-extracting Daily evidence.

```text
company_os(source_window, templates, destination_bindings)
  -> weeks/<week>/reports[] + weeks/<week>/outbound[] + source_gaps[]
```

## At a glance

- System ID: `SYS-0001`
- Primary feature: `FEAT-0001`
- Source scan: once per Daily automation run; Weekly reads the accumulated
  Project reports and routing snapshot rather than rescanning raw sources
- Private operating state: week-scoped Project reports accumulated in the
  Hermes workspace; intermediary management state is not published to Notion
- Durable summaries: private Project reports → Department rollups → Company
  rollup
- Promotion authority: Weekly only, after type-specific gates
- External writes: Stage 2 mappings to explicitly configured destination URLs;
  destination platforms own access control
- Operator-visible artifact classes: `reports` and `outbound` only; delivery
  dedupe and provider status remain hidden run metadata

## Private workspace contract

```text
weeks/
`-- YYYY-Www/
    |-- reports/
    |   |-- project--<stable-project-id>.md
    |   |-- department--<stable-department-id>.md
    |   `-- company.md
    `-- outbound/
        |-- employee--<stable-action-key>.md
        |-- documentation--<stable-action-key>.md
        `-- executive-report.md
```

Week-first storage matches the dominant access pattern: Daily updates the
current reporting window, Weekly enumerates every Project report in that window,
and retention can archive a complete week. Reports carry their own
`accumulating` or `final` state; there is no separate drafts directory. Outbound
artifacts carry material intended to leave the private workspace; there is no
publish queue or separate follow-up directory.

## System flow

```text
 CONFIGURED COMPANY SOURCES
 Notion Projects + Tasks + Meetings + Directory + Drive
                                  │
                                  ▼
 ┌──────────────────────────── DAILY · ONE BOUNDED SCAN ──────────────────────┐
 │ Stage 1                         → one validated Zod result                  │
 │ FEAT-0001 Project memory        → private Project report fields            │
 │ FEAT-0002 Documentation quality → report evidence + outbound request       │
 │ FEAT-0003 Project control       → PM/risk/cost fields + outbound chase      │
 │ FEAT-0004 Knowledge capture     → Decision/SOP report fields                │
 └─────────────────────────────────────┬───────────────────────────────────────┘
                                       │ Stage 2 deterministic field mapping
                                       ▼
 ┌────────────────────── PRIVATE WEEKLY WORKSPACE ─────────────────────────────┐
 │ weeks/YYYY-Www/reports/  → accumulating Project reports                    │
 │ weeks/YYYY-Www/outbound/ → employee and documentation requests             │
 └─────────────────────────────────────┬───────────────────────────────────────┘
                                       │
                                       ▼
 ┌──────────────────────────── WEEKLY · ONE REVIEW PASS ──────────────────────┐
 │ Project weekly reports, read only → source-keyed accumulated review         │
 │ FEAT-0005 Operating reports    → Project → Department → Company            │
 │ FEAT-0006 Knowledge promotion  → Work Items / Decisions / SOPs             │
 │ FEAT-0007 Next-week planning   → Project context + carried commitments     │
 └───────────────┬──────────────────┬──────────────────┬───────────────────────┘
                 │                  │                  │
                 ▼                  ▼                  ▼
       NOTION / WIKI           GOOGLE DRIVE          EMAIL / TELEGRAM
       configured URLs        configured URLs       approved routes
       records/reports        documents/reports     outbound delivery
```

Stage 1 never decides provider placement. Stage 2 owns an explicit map from Zod
fields to report frontmatter, report sections, outbound content, or provider
properties. `workspace.hermes.md` binds each optional provider effect to an
authorized destination URL or route. Notion and Drive own visibility and
permissions at those destinations; Hermes does not reproduce their access
control model.

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
accumulate in the private Project weekly report, linked to their Work or Meeting
source and review condition. Weekly may apply only a Problem, Decision, or SOP
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
