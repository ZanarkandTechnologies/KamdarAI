---
title: Kamdar Company OS
status: designed
owner: KamdarAI
created_at: 2026-08-21
updated_at: 2026-08-25
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
  - ../../evals/evals.json
---

# Kamdar Company OS

The Kamdar Company OS turns one bounded Daily source scan into canonical Project
patches, precise owner requests, and direct source-keyed updates to one current
Weekly Draft. Weekly reads that Draft, writes the reporting hierarchy, and
prepares reviewed knowledge promotion, next-week planning, and executive
delivery without re-extracting Daily evidence.

```text
kamdar_company_os(source_window, templates, write_policy)
  -> feature_artifacts[] + integration_plans[] + receipts[] + source_gaps[]
```

## At a glance

- System ID: `SYS-0001`
- Primary feature: `FEAT-0001`
- Source scan: once per Daily automation run; Weekly reads the accumulated Draft
  and routing snapshot rather than rescanning raw sources
- Canonical detail: Notion Projects, Work, Decisions, Reports, and relevant
  Skills connected through Project relations; proprietary Project knowledge
  remains in the corresponding Project page
- Durable summaries: Project reports → Area rollups → Company rollup
- Promotion authority: Weekly only, after type-specific gates
- External writes: separately approved and receipt-bearing

## System flow

```text
 REAL KAMDAR SOURCES
 Notion Projects + Tasks + Meetings + Directory + Drive + prior reports
                                  │
                                  ▼
 ┌──────────────────────────── DAILY · ONE BOUNDED SCAN ──────────────────────┐
 │ FEAT-0001 Project memory       → canonical Project patch + Task proposals │
 │ FEAT-0002 Documentation quality→ detailed Work comment contribution       │
 │ FEAT-0003 Project control      → PM/risk/cost Draft entries + outreach     │
 │ FEAT-0004 Knowledge capture    → Decision/SOP Draft entries                 │
 └─────────────────────────────────────┬───────────────────────────────────────┘
                                       │ retained Daily artifacts + receipts
                                       ▼
 ┌──────────────────────────── WEEKLY · ONE REVIEW PASS ──────────────────────┐
 │ Current Weekly Draft, read only → source-keyed accumulated review           │
 │ FEAT-0005 Operating reports    → Project → Department → Company            │
 │ FEAT-0006 Knowledge promotion  → Work Items / Decisions / SOPs             │
 │ FEAT-0007 Next-week planning   → Project context + carried commitments     │
 └───────────────┬──────────────────┬──────────────────┬───────────────────────┘
                 │                  │                  │
                 ▼                  ▼                  ▼
          NOTION / WIKI          GOOGLE DRIVE      EMAIL / TELEGRAM
       Projects, Work,        reports,             grouped chases,
       Decisions, Reports,    source documents     executive summary
       Skills / SOP records
```

## Promotion map

| Candidate found during Daily | Weekly disposition | Intended destination |
| --- | --- | --- |
| Repeated or material problem | Promote / Duplicate / Monitor / Dismiss | Work Item / issue record |
| Decision with future precedent | Promote / Duplicate / Monitor / Dismiss | Decisions database |
| Repeated workflow or SOP | Promote / Duplicate / Monitor / Dismiss | Skills/wiki record; owning skill only after review |

Daily never promotes canonical knowledge. Proprietary Project-specific facts
stay in the Project knowledge body, linked to their Work or Meeting source and
review condition. Weekly may apply only a Problem, Decision, or SOP candidate
whose source quality, destination mapping, dedupe result, authority, privacy,
and write policy all pass. Otherwise it remains in the report with a named gap.

## Proof model

Every assertion in `evals/evals.json` belongs to one feature. The future proof
UI groups rows by feature while the runner still executes one scenario:

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
