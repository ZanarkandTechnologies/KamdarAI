---
kind: ascii-prototype
ticket_id: TASK-0002
status: review
version: "0.1.0"
created_at: 2026-08-21T14:30:00+08:00
frozen_week: 2026-W34
company_timezone: Asia/Kuala_Lumpur
source_contract: tickets/TASK-0001/ascii-prototype.md
feature_registry: docs/features/README.md
---

# Kamdar feature-first proof UI

This prototype replaces only Section 5 of
`tickets/TASK-0001/ascii-prototype.md`. Sections 0–4 and 6–7 remain the buyer
story around it. Daily still performs one bounded source scan, Weekly still
performs one review pass, and `evals/evals.json` remains the assertion source.
No live provider write is authorized by this design document.

## 1. Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ KAMDAR MANAGER                                           PROVED · 2026-W34   │
│ What the manager did, what it produced, and where each result should go      │
├──────────────────────────────────────────────────────────────────────────────┤
│ OVERVIEW │ DAILY FEATURES │ WEEKLY FEATURES │ SOURCES │ DEVELOPER EVIDENCE   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ THIS RUN                                                                     │
│ 9 / 9 features have eval coverage · 39 / 39 declared assertions pass         │
│ 4 Work Items read · 2 Projects summarized · 1 source gap preserved          │
│                                                                              │
│ DAILY                                                                        │
│ ✓ Project memory       ✓ Documentation quality                              │
│ ✓ Progress chasing     ✓ Knowledge candidate capture                        │
│                                                                              │
│ WEEKLY                                                                       │
│ ✓ Operating reports    ✓ Knowledge promotion                                │
│ ✓ Next-week planning   ✓ Executive distribution                             │
│                                                                              │
│ SHARED                                                                       │
│ ✓ Safety and receipts                                                       │
│                                                                              │
│ [Inspect Daily] [Inspect Weekly] [Open Kamdar Notion ↗] [Open Drive ↗]       │
└──────────────────────────────────────────────────────────────────────────────┘
```

The headline separates assertion health from feature coverage. A perfect score
across existing rows cannot imply that an untested feature works.

## 2. Daily features

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ DAILY FEATURES                                             11 / 11 PASS      │
│ One source scan · four separately inspectable outcomes                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ✓ FEAT-0001  PROJECT MEMORY                    6 assertions  [Inspect →]     │
│   2 Project evidence files · 2 Task proposals · 1 hidden Meeting             │
│                                                                              │
│ ✓ FEAT-0002  DOCUMENTATION QUALITY             1 assertion   [Inspect →]     │
│   TASK-102 needs Evidence · standalone comment artifact still missing        │
│                                                                              │
│ ✓ FEAT-0003  PROGRESS CHASING                  3 assertions  [Inspect →]     │
│   1 grouped follow-up artifact · email/Telegram routes mocked                │
│                                                                              │
│ ✓ FEAT-0004  KNOWLEDGE CANDIDATE CAPTURE       1 assertion   [Inspect →]     │
│   DEC-001 + RES-001 retained · Problem/SOP artifact proof incomplete         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 3. Expanded feature and file-content drilldown

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← DAILY FEATURES                                                             │
│ FEAT-0001 · DAILY PROJECT MEMORY             LOCAL PASS · 6 / 6 · APPLY GAP │
│ Changed Tasks and hidden Meetings become concise Project memory              │
├──────────────────────────────────────────────────────────────────────────────┤
│ SOURCES                                                                      │
│ [Open Notion Projects ↗] [Open Notion Tasks ↗] [Open Kamdar Drive ↗]        │
│ Read: TASK-101, TASK-102, TASK-103, TASK-201                                 │
│ Gap: TASK-102 expected Drive QA evidence is missing                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ OUTCOME                                                                      │
│ Replenishment remains At risk. Festive remains Active.                       │
│ TASK-201 produced Task proposals TASK-104 and TASK-105.                      │
│ Raw Meeting notes were not copied into Project context.                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ ARTIFACTS AND FILE ASSERTIONS                                                │
│                                                                              │
│ ▼ ✓ CREATED  daily/projects/replenishment-accuracy-2026-08-21.md             │
│     follows kamdar-daily-operating-evidence@0.2.0                            │
│     [Open generated file] [Open template]                                    │
│                                                                              │
│     CURRENT TEMPLATE CONTENT ASSERTIONS                                      │
│     ├─ ✓ contains section "Material change"                                 │
│     ├─ ✓ contains section "Work Items"                                      │
│     ├─ ✓ contains section "Meeting extraction"                              │
│     ├─ ✓ contains section "Follow-up proposals"                             │
│     └─ ✓ contains section "Source gaps"                                     │
│                                                                              │
│     PROPOSED FEATURE CONTENT ASSERTIONS                                      │
│     ├─ ○ contains TASK-101 and TASK-201 source links                         │
│     ├─ ○ contains Task proposals TASK-104 and TASK-105                       │
│     └─ ○ contains no unresolved template placeholder                         │
│                                                                              │
│ ▶ ✓ CREATED  daily/projects/festive-ecommerce-2026-08-21.md                  │
│     follows kamdar-daily-operating-evidence@0.2.0                            │
│     Expand to inspect file-content assertions                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ BEHAVIOR ASSERTIONS                                                          │
│ ✓ fetched each changed Work Item page in full                               │
│ ✓ extracted hidden Meeting blocks or returned a parse gap                   │
│ ✓ converted explicit commitments into linked Task proposals                 │
│ ✓ kept Project memory concise instead of copying a task list                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ DOWNSTREAM APPLICATION                                                       │
│ DESIGNED · notion.update_project(project-update.md, project_url)             │
│ DESIGNED · notion.create_task(task-proposal-TASK-104.md, project_url)        │
│ Current trace: no apply call captured                                        │
│ Target/result links: unavailable until an approved operated run              │
└──────────────────────────────────────────────────────────────────────────────┘
```

The primary file assertion remains:

```text
expect(file).to_follow(template_id@version, feature_id)
```

Expanding the file reveals template-derived structure and feature-specific
content checks. Source, behavior, integration, and result evidence stays within
the same feature page.

## 4. Weekly features

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ WEEKLY FEATURES                                            7 / 7 COVERED PASS│
│ One review pass · four business outcomes                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ✓ FEAT-0005  OPERATING REPORTS                 7 assertions  [Inspect →]     │
│   2 Project reports → 2 Area rollups → 1 Company rollup                     │
│                                                                              │
│ ✓ FEAT-0006  KNOWLEDGE PROMOTION                7 assertions  [Inspect →]     │
│   Work Items / Decisions / Resources / SOP + Skills/wiki                     │
│                                                                              │
│ ✓ FEAT-0007  NEXT-WEEK PLANNING                 3 assertions  [Inspect →]     │
│   Unresolved work → Project plan proposal + linked Task                       │
│                                                                              │
│ ✓ FEAT-0008  EXECUTIVE DISTRIBUTION             3 assertions  [Inspect →]     │
│   Company rollup → Telegram artifact → receipt-aware downstream state         │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 5. Proved feature with downstream state

```text
┌─ FEAT-0006 · WEEKLY KNOWLEDGE PROMOTION ─────────────────────────────────────┐
│ STATUS  PROVED · 7 / 7 ASSERTIONS PASS                                      │
│                                                                              │
│ PIPELINES                                                                    │
│ ○ Problem  → Work Item / Issue                                               │
│ ○ Decision → Decisions database using decision.md                            │
│ ○ Resource → Resources database + linked Drive source                        │
│ ○ SOP      → Skills/wiki record → owning skill only after review             │
│                                                                              │
│ REQUIRED ARTIFACT FLOW                                                       │
│ candidate → reviewed Markdown record → integration call → provider receipt  │
│           → downstream Notion/Drive/wiki link                                │
│                                                                              │
│ PROOF                                                                        │
│ ✓ four promotion artifacts follow pinned templates                           │
│ ✓ candidate authority and destination routing are scored                     │
│ ✓ each downstream call shows PLANNED, APPLIED, SENT, or BLOCKED              │
│ ! no integration call assertions                                              │
│ ! no downstream record URLs or observed receipts                             │
│                                                                              │
│ [Open feature contract] [Open Company OS flow]                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 6. Feature-specific source and integration links

```text
┌─ FEAT-0003 · DAILY PROGRESS CHASING ─────────────────────────────────────────┐
│ SOURCES                                                                      │
│ [Open TASK-101 ↗] → [Open Project ↗] → [Open Directory record ↗]            │
│                                                                              │
│ ARTIFACT                                                                     │
│ employee-followups-2026-08-21.md                         [Open file]          │
│                                                                              │
│ APPLICATION                                                                  │
│ email.send(employee-followups-2026-08-21.md, approved_route)                 │
│ Status: MOCKED · no provider call                                            │
│ Result link: unavailable                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

Mock mode shows the real or frozen target link and clearly labels the call as
planned. Operated mode replaces that state with an observed provider receipt
and clickable result URL. The UI never invents a result link.

Current real source routes available to the UI:

- [Kamdar AI root](https://app.notion.com/p/Kamdar-AI-3b7d43a2394280e6ae73fcadf3c5c748)
- [Notion Projects](https://app.notion.com/p/b2e2f5f3d6b14d01961a2bef0696d744)
- [Notion Tasks](https://app.notion.com/p/638d85a858b04d038d8b97be1a879a1f)
- [Kamdar Google Drive](https://drive.google.com/drive/folders/1QQ-bEjBeMwhB9AHEEJtiOOTYZPceJxBV)

Individual source-record and result links appear only when the fixture or an
operated integration receipt supplies them.

## 7. Developer evidence

```text
▶ DEVELOPER EVIDENCE
  Assertion source: evals/evals.json
  Fixture: frozen sanitized snapshot
  Runner safety: 0 processor network calls · 0 external writes
  Idempotency: second unchanged run produced 0 file events
  ASCII comparison: available here, not in the buyer summary
  Raw tool trace: available here
```

The buyer view leads with feature outcomes, source links, artifacts, and
downstream state. Harness mechanics remain inspectable but collapsed.

## 8. Promotion criteria for UI implementation

- Every feature card resolves its title and contract from `feature_id`.
- Every accepted feature has at least one executable assertion; a regression
  to zero remains visible as `Coverage gap`.
- File rows expand into template-derived and feature-specific content checks.
- Mocked integration calls cannot display provider-success language.
- Operated receipts may show a result URL only when the provider returned it.
- Daily and Weekly continue to execute one source pass each.
