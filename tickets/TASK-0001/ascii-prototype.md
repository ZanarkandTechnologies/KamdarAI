---
kind: ascii-prototype
ticket_id: TASK-0001
status: configuration-foundation-approved
version: "0.1.0"
created_at: 2026-08-21T12:10:00+08:00
frozen_week: 2026-W34
company_timezone: Asia/Kuala_Lumpur
---

# Kamdar Company OS proof — ASCII prototype

This is the approved product and eval contract. The source configuration now
exists in KamdarAI; the frozen runner/UI is implemented under the TASK-0001
implementation Goal. No live database provisioning, provider call,
installation, or scheduling is authorized by this document.

## 0. Whole experience at a glance

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ KAMDAR MANAGER PROOF                                      MOCK · 2026-W34   │
│ See the company memory, the manager's instructions, and every expected result│
├──────────────────────────────────────────────────────────────────────────────┤
│  1 STORY  │  2 COMPANY OS  │  3 DAILY  │  4 WEEKLY  │  5 EXPECTATIONS       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Problem                                                                     │
│  Project truth is scattered across project pages, tasks, meetings, Drive,   │
│  decisions, and messages. A manager cannot see what changed, what is stale,  │
│  what needs better documentation, or what should become durable knowledge.  │
│                                                                              │
│                         daily_update(today)                                  │
│  Company OS ───────────────────────────────► reviewed daily evidence          │
│      │                                                 │                     │
│      │                                                 ▼                     │
│      └─────────────────────────────────────► weekly_review(week)              │
│                                                        │                     │
│                                                        ▼                     │
│                           Project reports → Area rollups → Company rollup     │
│                                                                              │
│  What this proof answers                                                     │
│  ✓ Did the agent read the right records?                                     │
│  ✓ Did it preserve Projects as project memory and Tasks as work items?       │
│  ✓ Did Meetings become follow-ups and promotion candidates?                  │
│  ✓ Did every durable output follow an approved template?                     │
│  ✓ Did it chase only the right people, through approved routes?              │
│  ✓ Can we inspect the exact files, contents, and edge-case verdicts?          │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 1. Story and mock environment

```text
THE COMPANY
Kamdar has two representative operating areas in this mock:

  Retail Operations                       Digital Commerce
  └─ Project: Replenishment Accuracy      └─ Project: Festive E-commerce Launch

THE WEEK
Monday 17 Aug 2026 ───────────────────────────────────── Sunday 23 Aug 2026
Today: Friday 21 Aug 2026, Asia/Kuala_Lumpur

THE SIGNALS

  TASK-101  stale + blocked       Needs a precise progress request
  TASK-102  active but incomplete Needs a focused documentation request
  TASK-103  healthy               Must not be chased
  TASK-201  meeting completed     Task page with a hidden Meeting block:
                                 2 commitments, 1 decision candidate, and 1 resource candidate
  TASK-099  old/no recent change  Must be excluded from the Daily window

  Replenishment Accuracy has a finalized prior report (2026-W33) and a current
  2026-W34 draft that must be MODIFIED. Festive E-commerce has no 2026-W34
  draft, so its report must be CREATED.
  One Drive source expected by TASK-102 is missing.
  One directory owner has an approved email route; another has Telegram only.

THE FEATURES UNDER TEST

  Daily
  ├─ select current projects and recently changed Work Items
  ├─ interpret Task / Issue / Meeting differently
  ├─ update project current context from evidence, without replacing the Project
  ├─ turn meeting commitments into linked Task proposals
  ├─ propose Decision / Resource promotion only when gates are met
  ├─ check documentation against the mapped record template
  ├─ draft one grouped progress/documentation chase per person
  ├─ record missing sources instead of inventing them
  └─ write an inspectable receipt for Weekly

  Weekly
  ├─ compare plan versus actual per Project
  ├─ create/update the current project report draft using weekly-report.md
  ├─ finalize the prior/current report only at the lifecycle gate
  ├─ roll project reports into Area summaries
  ├─ roll Area summaries into one Company summary
  ├─ promote approved Decisions / Resources / SOP candidates
  ├─ carry unresolved work forward without clearing Tasks
  └─ produce owner attention + next-week commitments
```

## 2. Company OS: databases, relations, templates, and samples

### 2.1 Relationship map

```text
                                   ┌─────────────────────┐
                                   │       PEOPLE        │
                                   │ owners + routes     │
                                   └───┬──────┬──────┬───┘
                                       │      │      │
                         owner ┌───────┘      │      └────────┐ owner
                               ▼              ▼               ▼
┌─────────────┐  1       *  ┌─────────────┐  *       *  ┌─────────────┐
│  PROJECTS   ├────────────►│ WORK ITEMS  ├────────────►│  DECISIONS  │
│ project mem │              │Task/Issue/  │             │ precedents  │
└──┬────┬─────┘              │Meeting      │             └─────────────┘
   │    │                    └──────┬──────┘
   │    │                           │ evidence / provenance
   │    │                           ▼
   │    │                    ┌─────────────┐       ┌─────────────┐
   │    └───────────────────►│  RESOURCES  │──────►│ GOOGLE DRIVE│
   │                         │ reusable    │ source│ canonical   │
   │                         └─────────────┘       └─────────────┘
   │
   │ 1       *
   ▼
┌─────────────┐            ┌─────────────┐
│   REPORTS   │            │   SKILLS    │
│project/area/│            │ existing SOP│
│company      │            │ capability  │
└─────────────┘            └─────────────┘

Area is initially a controlled property on Projects and People, not a DB.
```

### 2.2 Template routing

```text
┌─────────────────┬──────────────────────────────┬─────────────────────────────┐
│ DATABASE        │ RECORD TYPE                  │ ENFORCED TEMPLATE           │
├─────────────────┼──────────────────────────────┼─────────────────────────────┤
│ Projects        │ Project                      │ company-os-project@0.2.0    │
│ Work Items      │ Task / Issue / Meeting       │ company-os-task@0.2.0       │
│ Decisions       │ Decision                     │ company-os-decision@0.2.0   │
│ Resources       │ Resource                     │ company-os-resource@0.2.0   │
│ Reports         │ Project Weekly Report        │ company-os-weekly-report    │
│                 │                              │ @0.3.0                      │
│ Reports         │ Area Operating Rollup        │ kamdar-area-operating-      │
│                 │                              │ rollup@0.1.0                │
│ Reports         │ Company Operating Rollup     │ kamdar-company-operating-   │
│                 │                              │ rollup@0.1.0                │
│ Automation      │ Daily evidence               │ kamdar-daily-operating-     │
│ outputs         │                              │ evidence@0.1.0              │
│ Automation      │ Follow-up / receipt          │ kamdar-employee-followups   │
│ outputs         │                              │ and kamdar-automation-receipt│
│ People          │ Directory Entry              │ schema only in first slice  │
│ Skills          │ Existing capability record   │ already provided            │
└─────────────────┴──────────────────────────────┴─────────────────────────────┘
```

Runtime route:

```text
.hermes.md Work row
  source: real Kamdar AI directory → Notion Projects / Tasks
  record types: Project + Work Item
  template files: workspace/templates/project.md + task.md
  full changed Task page: required before meeting extraction
  assertions: evals/evals.json
  comment policy: proposal-only | approved
```

### 2.3 Projects — sample

```text
┌─ PROJECTS / PROJ-REPLENISH ──────────────────────────────────────────────────┐
│ Name          Replenishment Accuracy                                        │
│ Area          Retail Operations                                             │
│ Owner         PERSON-AISHA                                                  │
│ Objective     Reduce store stock variance below 2%                          │
│ Status        At risk                                                       │
│ Current week  2026-W34                                                      │
│ Template      company-os-project@0.2.0                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│ # Replenishment Accuracy                                                    │
│                                                                              │
│ > Outcome                                                                    │
│ > Store stock variance is below 2% with evidence from the Penang pilot.     │
│                                                                              │
│ > Why                                                                        │
│ > Incorrect replenishment causes lost sales and excess transfers.           │
│                                                                              │
│ ## Current context                                                           │
│ - Pilot is in Penang stores                                                  │
│ - ERP extract is current through 20 Aug                                      │
│ - Variance review is blocked on owner response                               │
│                                                                              │
│ ## This week             [linked Work Items filtered to PROJ-REPLENISH]      │
│ ## Decisions and precedents [linked Decisions]                               │
│ ## Reusable knowledge      [linked Resources + Skills]                       │
│ ## Reports                 [current draft + finalized reports]               │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 Work Items — samples

```text
┌─ WORK ITEMS / TASK-101 ───────────────────────────────────────────────────────┐
│ Project       PROJ-REPLENISH       Type       Issue                          │
│ Owner         PERSON-AISHA         Status     Blocked                        │
│ Priority      High                 Last update 2026-08-18 09:00 +08          │
│ Template      company-os-task@0.2.0                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ Outcome: Penang variance root cause is verified and resolution dated.        │
│ Why: the pilot cannot scale while stock variance is unexplained.             │
│ Current status: variance is 4.8%; supplier feed mismatch suspected.          │
│ Meeting notes and updates: no update since Tuesday.                          │
│ Commitments: Aisha to confirm root cause; due 20 Aug.                         │
│ Evidence: ERP extract + store count sheet.                                   │
│ Resolution: empty.                                                           │
└──────────────────────────────────────────────────────────────────────────────┘

┌─ WORK ITEMS / TASK-201 ───────────────────────────────────────────────────────┐
│ Project       PROJ-REPLENISH       Type       not exposed by current DB       │
│ Owner         PERSON-AISHA         Status     Active                          │
│ Priority      Medium               Last update 2026-08-21 10:30 +08          │
│ Template      company-os-task@0.2.0 · embedded Meeting block detected        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Outcome: decide how pilot variance will be verified before expansion.        │
│ Why: rollout decision is due next week.                                      │
│ Meeting notes and updates:                                                   │
│ - Compare ERP extract against manual count in 3 stores.                      │
│ - Use a 2% variance threshold for the pilot acceptance gate.                 │
│ Commitments and follow-ups:                                                  │
│ - Darren: upload manual count evidence by 22 Aug.                            │
│ - Aisha: publish variance comparison by 23 Aug.                              │
│ Evidence: meeting recording and shared count sheet.                          │
└──────────────────────────────────────────────────────────────────────────────┘
```

Daily interpretation of the embedded Meeting block in `TASK-201`:

```text
2 commitments -> propose TASK-104 + TASK-105 linked to PROJ-REPLENISH
2% threshold  -> propose DEC-001 because it gates rollout and sets precedent
count method  -> propose RES-001 because it will be reused in other stores
the ticket and Meeting block remain the source; neither is overwritten or copied as a report
```

### 2.5 People / Company Directory — sample

```text
┌─ PEOPLE / PERSON-AISHA ───────────────────────────────────────────────────────┐
│ Name              Aisha Rahman (fictional)                                  │
│ Role              Retail Operations Lead                                    │
│ Area              Retail Operations                                         │
│ Active            Yes                                                       │
│ Projects          PROJ-REPLENISH                                             │
│ Approved routes   Email: yes  | Telegram: no                                 │
│ Contact locator   runtime-only; never stored in eval fixtures or reports     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.6 Decisions — proposed then promoted

```text
┌─ DECISION CANDIDATE / DEC-001 ────────────────────────────────────────────────┐
│ Decision    Accept pilots only when verified stock variance is ≤ 2%          │
│ Projects    PROJ-REPLENISH                                                   │
│ Proposer    PERSON-AISHA        Approver     UNRESOLVED                       │
│ Status      Proposed            Decided at   —                                │
│ Template    company-os-decision@0.2.0                                        │
│ Gate        PASS on precedent value; BLOCKED on approval authority           │
└──────────────────────────────────────────────────────────────────────────────┘

Daily output: candidate only.
Weekly output: still candidate until approver and decided_at are present.
```

### 2.7 Resources — proposed then promoted

```text
┌─ RESOURCE CANDIDATE / RES-001 ────────────────────────────────────────────────┐
│ Name           Three-store variance verification method                     │
│ Project        PROJ-REPLENISH                                                │
│ Owner          PERSON-DARREN                                                 │
│ Type           SOP draft                                                     │
│ Source         TASK-201 Meeting block + Drive count sheet                    │
│ Quality        Needs verification                                            │
│ Template       company-os-resource@0.2.0                                     │
│ Gate           PASS future reuse; BLOCKED until evidence source is complete  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.8 Reports — lifecycle and grain

```text
Reports DB
├─ RPT-PROJ-REPLENISH-W33   Project Weekly · Final · immutable
├─ RPT-PROJ-REPLENISH-W34   Project Weekly · Draft · updated during week
├─ RPT-PROJ-FESTIVE-W34     Project Weekly · Draft · created this week
├─ RPT-AREA-RETAIL-W34      Area Rollup · Draft · derived from project reports
├─ RPT-AREA-DIGITAL-W34     Area Rollup · Draft · derived from project reports
└─ RPT-COMPANY-W34          Company Rollup · Draft · derived from area reports

Rule: Reports summarize and link to Projects / Work Items. They never become
the canonical home of task status, meeting notes, decisions, or resources.
```

## 3. Daily automation: prompt first, then observed result

### 3.1 Prompt shown in the proof

```text
┌─ DAILY MANAGER INSTRUCTION ───────────────────────────────────────────────────┐
│ Run Kamdar's Daily Operating Update for 21 Aug 2026 in Asia/Kuala_Lumpur.    │
│                                                                              │
│ 1. Fetch active Projects and Work Items meaningfully changed in today's      │
│    window, plus unresolved stale commitments needed for today's review.      │
│ 2. Preserve Projects as durable project memory. Treat Task, Issue, and       │
│    Meeting records according to company-os-task@0.2.0.                       │
│ 3. Fetch every changed Task page in full. From embedded Meeting blocks and   │
│    meeting notes, extract commitments into linked Task proposals. Propose    │
│    Decisions and Resources only when their promotion gates are met.          │
│ 4. Review changed records against their mapped templates. Ask for the        │
│    smallest missing information; do not ask healthy complete records for     │
│    generic "more detail."                                                   │
│ 5. For stale or blocked work, resolve Project owner → Company Directory →    │
│    approved route. Group all work items into one proposed message/person.    │
│ 6. Record missing or stale sources explicitly. Never infer missing evidence. │
│ 7. Produce Daily evidence grouped by Area and Project, action proposals,     │
│    project-memory update proposals, and a machine-readable receipt.          │
│                                                                              │
│ WRITE POLICY: MOCK. Record intended mutations and deliveries; call nothing.  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Source-selection result

```text
Daily window: 2026-08-21 00:00..23:59 +08
Stale commitment lookback: unresolved and due on/before 2026-08-21

SELECTED
  Projects     PROJ-REPLENISH, PROJ-FESTIVE
  Work Items   TASK-101 (stale), TASK-102 (changed), TASK-103 (changed),
               TASK-201 (changed; embedded Meeting block)
  People       PERSON-AISHA, PERSON-DARREN
  Reports      RPT-PROJ-REPLENISH-W33
  Resources    ERP extract, count sheet, festive QA brief

EXCLUDED
  TASK-099     last changed 2026-08-10; no unresolved due commitment

SOURCE GAP
  TASK-102     expected Drive QA evidence is missing
```

### 3.3 Daily output tree

```text
mock-run/2026-08-21/daily/
├── projects/
│   ├── replenishment-accuracy-2026-08-21.md  CREATED · kamdar-daily-operating-evidence@0.1.0
│   └── festive-ecommerce-2026-08-21.md       CREATED · kamdar-daily-operating-evidence@0.1.0
├── outreach/employee-followups-2026-08-21.md CREATED · kamdar-employee-followups@0.1.0
└── receipt-2026-08-21.md                    CREATED · kamdar-automation-receipt@0.1.0

No weekly report is finalized by Daily.
No external message, comment, or provider write occurs in mock mode.
```

### 3.4 Daily evidence file — expanded example

```text
▼ projects/replenishment-accuracy-2026-08-21.md          CREATED  ✓
  Follows: kamdar-daily-operating-evidence@0.1.0

  # Retail Operations — Daily evidence — 2026-08-21

  ## Replenishment Accuracy                              [PROJ-REPLENISH]
  Project state: At risk
  Material change: meeting set a 2% verification threshold; blocked issue
  remains overdue.

  ### TASK-101 — Resolve Penang replenishment variance
  Type / status: Issue / Blocked
  Owner: PERSON-AISHA
  Progress: supplier feed mismatch suspected; no confirmation since 18 Aug.
  Blocker: root cause and resolution date missing.
  Documentation: Current Status exists; Resolution is empty and expected while
  unresolved. Missing: next action and revised commitment date.
  Action: focused progress request proposed.
  Evidence: notion://TASK-101, drive://erp-extract

  ### TASK-201 — Pilot variance review
  Type / status: Work Item / Active; embedded Meeting block
  Commitments extracted:
  - PERSON-DARREN uploads manual count evidence by 22 Aug.
  - PERSON-AISHA publishes the comparison by 23 Aug.
  Promotion candidates:
  - DEC-001: 2% pilot threshold; approver unresolved.
  - RES-001: three-store verification method; source incomplete.
  Evidence: notion://TASK-201#meeting-block, drive://count-sheet

  ## Source gaps
  None for this area.
```

### 3.5 Project-memory update — rendered inside Daily evidence

```text
▼ project-memory update                                  PROPOSED  ✓
  Maps to: company-os-project@0.2.0

  PROJ-REPLENISH
  ├─ Current context
  │  ├─ ADD: 2% verification threshold proposed in TASK-201 Meeting block
  │  └─ UPDATE: pilot blocked pending owner response and manual count evidence
  ├─ This week
  │  ├─ LINK existing TASK-101
  │  ├─ PROPOSE TASK-104 for PERSON-DARREN
  │  └─ PROPOSE TASK-105 for PERSON-AISHA
  ├─ Decisions and precedents
  │  └─ PROPOSE LINK DEC-001; do not promote without approver
  └─ Reusable knowledge
     └─ PROPOSE LINK RES-001; do not promote without verified source

  Forbidden:
  - replacing Outcome or Why with generated text
  - copying full meeting notes into Project Current context
  - marking Decision/Resource as approved
```

### 3.6 Daily action result

```text
┌──────────────────────────────┬───────────────────────────────────┬───────────┐
│ RECORD / PERSON              │ RESULT                            │ WHY       │
├──────────────────────────────┼───────────────────────────────────┼───────────┤
│ TASK-101 / PERSON-AISHA      │ progress request proposed         │ stale +   │
│                              │                                   │ blocked   │
│ TASK-102 / PERSON-DARREN     │ documentation request proposed    │ missing   │
│                              │                                   │ evidence  │
│ TASK-103                     │ no chase                           │ healthy   │
│ TASK-201 embedded meeting     │ 2 Task proposals                   │ explicit  │
│                              │ 1 Decision candidate               │ meeting   │
│                              │ 1 Resource candidate               │ content   │
└──────────────────────────────┴───────────────────────────────────┴───────────┘

PERSON-AISHA message contains TASK-101 only.
PERSON-DARREN message groups TASK-102 and TASK-201 follow-up.
Directory lookup precedes route selection. Missing route => blocked proposal.
```

## 4. Weekly automation: builds on Daily

### 4.1 Prompt shown in the proof

```text
┌─ WEEKLY MANAGER INSTRUCTION ──────────────────────────────────────────────────┐
│ Run Kamdar's Weekly Operating Review for 2026-W34.                           │
│                                                                              │
│ 1. Load the week's successful Daily receipts, current Projects/Work Items,   │
│    and each Project's previous finalized weekly report.                      │
│ 2. For every active Project, create or update one current-week draft using   │
│    company-os-weekly-report@0.3.0. Preserve plan versus actual and evidence.  │
│ 3. Derive one Area rollup from its Project reports, then one Company rollup   │
│    from the Area rollups. Do not make rollups a second task store.            │
│ 4. Review problems, Decisions, Resources, and SOP candidates. Promote only   │
│    when their template gate, authority, and evidence are complete.            │
│ 5. Carry unresolved Work Items forward; never clear or delete Tasks.          │
│ 6. Record follow-up outcomes, unresolved source gaps, owner attention, and    │
│    owner-approved next-week commitments.                                      │
│ 7. Keep finalized reports immutable and link each report to its predecessor.  │
│                                                                              │
│ WRITE POLICY: MOCK. Materialize expected files only inside the isolated run.  │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Weekly output tree

```text
mock-run/2026-W34/weekly/
├── reports/
│   ├── projects/
│   │   ├── replenishment-accuracy/weekly-report-2026-W34.md  MODIFIED
│   │   └── festive-ecommerce/weekly-report-2026-W34.md       CREATED
│   ├── areas/
│   │   ├── retail-operations/weekly-rollup-2026-W34.md       CREATED · kamdar-area-operating-rollup@0.1.0
│   │   └── digital-commerce/weekly-rollup-2026-W34.md        CREATED · kamdar-area-operating-rollup@0.1.0
│   └── company/weekly-rollup-2026-W34.md                     CREATED · kamdar-company-operating-rollup@0.1.0
└── receipt-2026-W34.md                                      CREATED · kamdar-automation-receipt@0.1.0

Canonical source records remain in Notion. These files are the isolated eval
projection of the records the automation would create or update.
```

### 4.3 Project weekly report — canonical template expansion

```text
▼ reports/projects/replenishment-accuracy/weekly-report-2026-W34.md  MODIFIED ✓
  Follows: company-os-weekly-report@0.3.0

  # Replenishment Accuracy — Week of 2026-08-17

  ## Executive summary
  Penang variance analysis identified a likely supplier-feed mismatch and set
  a 2% verification threshold. The main risk is that the root cause and manual
  count evidence remain incomplete. Next priority is to publish the verified
  comparison before deciding whether the pilot can expand.

  ## Plan versus actual
  | Planned result | Actual result | Evidence | Variance and implication |
  | --- | --- | --- | --- |
  | Verify variance root cause | Likely mismatch; not verified | TASK-101; TASK-201 Meeting block | Late evidence blocks rollout decision |

  ## What went well
  - TASK-201's Meeting block produced explicit owners, dates, and an acceptance threshold.

  ## Problems observed
  | Problem | Evidence and recurrence | Impact | Disposition |
  | --- | --- | --- | --- |
  | Supplier-feed mismatch unverified | TASK-101; first observed this week | Pilot cannot expand | Monitor as existing Issue |

  ## Promotion candidates
  ### Decisions with future precedent
  - DEC-001; authority missing; retain as candidate.
  ### Resources with future reuse
  - RES-001; source incomplete; retain as candidate.
  ### SOPs with repeatability evidence
  - Three-store verification method; only one use; do not promote yet.

  ## Follow-ups
  - PERSON-AISHA: progress requested for TASK-101; response pending.

  ## Next week
  - Verify count evidence and decide pilot expansion; owner approval pending.

  ## Automation receipt
  - evidence_window: 2026-08-17T00:00:00+08:00..2026-08-24T00:00:00+08:00
  - sources_checked: Projects, Work Items, Daily receipts, Drive
  - source_gaps: manual count evidence for RES-001
  - last_successful_daily_receipt: daily/2026-08-21/receipt.json
```

### 4.4 Area rollup — derived from Project reports

```text
▼ reports/areas/retail-operations/weekly-rollup-2026-W34.md   CREATED ✓
  Follows: kamdar-area-operating-rollup@0.1.0

  # Retail Operations — 2026-W34
  ## Area summary
  1 active project · 1 project at risk · 2 unresolved follow-ups.

  ## Project results
  | Project | Weekly report | Result | Risk | Next commitment |
  | --- | --- | --- | --- | --- |
  | Replenishment Accuracy | RPT-PROJ-REPLENISH-W34 | Threshold set; root cause unverified | Rollout blocked | Publish comparison |

  ## Owner attention
  - Approver required for DEC-001.
  - Manual count source missing for RES-001.

  Forbidden: full copied task bodies, meeting transcripts, contact locators.

  Automation receipt: project report locators, source gaps, previous area report.
```

### 4.5 Company rollup — derived from Area reports

```text
▼ reports/company/weekly-rollup-2026-W34.md                   CREATED ✓
  Follows: kamdar-company-operating-rollup@0.1.0

  # Kamdar — Company operating review — 2026-W34
  ## Executive view
  Retail Operations is at risk; Digital Commerce is progressing with one
  evidence gap. Two owner follow-ups remain unresolved.

  ## Areas
  | Area | Active projects | Status | Main problem | Report |
  | --- | --- | --- | --- | --- |
  | Retail Operations | 1 | At risk | Pilot evidence incomplete | area://retail |
  | Digital Commerce | 1 | Watch | QA evidence missing | area://digital |

  ## Cross-company owner attention
  - Resolve Decision approver for the 2% pilot threshold.
  - Restore festive QA source or mark TASK-102 blocked.

  ## Next-week commitments
  - Only owner-approved commitments appear here.

  Automation receipt: area report locators, source gaps, previous company report.
```

## 5. Expected-files UI: template assertion first, edge assertions second

### 5.1 Results screen

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ EXPECTATIONS                                              23 / 23 PASS      │
│ Source: evals/evals.json · template-first assertion rows                   │
├──────────────────────────────────────────────────────────────────────────────┤
│ FILTER  [All] [Files] [Contents] [Sources] [Actions] [Safety]               │
├──────────────────────────────────────────────────────────────────────────────┤
│ EXPECTED FILES (10)                                                          │
│                                                                              │
│ ▶ ✓ CREATED  daily/projects/replenishment-accuracy-2026-08-21.md             │
│     follows <kamdar-daily-operating-evidence@0.1.0>                           │
│                                                                              │
│ ▶ ✓ CREATED  daily/projects/festive-ecommerce-2026-08-21.md                  │
│     follows <kamdar-daily-operating-evidence@0.1.0>                           │
│                                                                              │
│ ▶ ✓ CREATED  daily/outreach/employee-followups-2026-08-21.md                 │
│     follows <kamdar-employee-followups@0.1.0>                                │
│                                                                              │
│ ▶ ✓ CREATED  daily/receipt-2026-08-21.md                                    │
│     follows <kamdar-automation-receipt@0.1.0>                                │
│                                                                              │
│ ▼ ✓ MODIFIED weekly/reports/projects/replenishment-accuracy/                 │
│              weekly-report-2026-W34.md                                       │
│     follows <company-os-weekly-report@0.3.0>                                 │
│     ├─ ✓ Executive summary is exactly 3 sentences                            │
│     ├─ ✓ Plan versus actual has evidence and implication                     │
│     ├─ ✓ Problems have disposition                                           │
│     ├─ ✓ Promotion candidates keep unresolved authority/source gaps          │
│     ├─ ✓ Follow-ups name owner, status, and dependency                       │
│     ├─ ✓ Next week contains only approved commitments                        │
│     └─ ✓ Receipt names window, sources, gaps, and last Daily receipt          │
│                                                                              │
│ ▶ ✓ CREATED  weekly/reports/projects/festive-ecommerce/                     │
│              weekly-report-2026-W34.md                                       │
│     follows <company-os-weekly-report@0.3.0>                                 │
│                                                                              │
│ ▶ ✓ CREATED  weekly/reports/areas/retail-operations/                         │
│              weekly-rollup-2026-W34.md                                       │
│     follows <kamdar-area-operating-rollup@0.1.0>                             │
│                                                                              │
│ ▶ ✓ CREATED  weekly/reports/areas/digital-commerce/                          │
│              weekly-rollup-2026-W34.md                                       │
│     follows <kamdar-area-operating-rollup@0.1.0>                             │
│                                                                              │
│ ▶ ✓ CREATED  weekly/reports/company/weekly-rollup-2026-W34.md                │
│     follows <kamdar-company-operating-rollup@0.1.0>                          │
│                                                                              │
│ ▶ ✓ CREATED  weekly/receipt-2026-W34.md                                      │
│     follows <kamdar-automation-receipt@0.1.0>                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

The key simplification is one primary assertion per durable file:

```text
expect(file).to_follow(template_id@version)
```

Expanding it reveals the template-derived checks. Additional rows exist only
for behavior that the template alone cannot prove.

### 5.2 Additional behavior assertions

```text
SOURCE SELECTION
✓ includes records changed inside the local Daily window
✓ includes unresolved commitments due before today
✓ excludes TASK-099 because it is old and has no due unresolved commitment
✓ selects previous finalized report for each Project, not an Area report
✓ records missing Drive evidence as source_gap

PROJECT / TASK SEMANTICS
✓ Projects retain Outcome, Why, and durable Current context
✓ Work Items remain issue-tracker-level records linked to Projects
✓ Meeting notes create commitment proposals without overwriting the Meeting
✓ Meeting commitments become proposed linked Tasks, not Project checklist text

DOCUMENTATION QUALITY
✓ TASK-102 request names the exact missing Evidence item
✓ TASK-103 receives no generic quality request
✓ no rubric is invented when template routing is missing

PROMOTION GATES
✓ DEC-001 remains proposed because approver is unresolved
✓ RES-001 remains proposed because source quality is incomplete
✓ SOP remains proposed because only one use is observed

OUTREACH
✓ resolves Project owner before Company Directory route
✓ groups multiple work items into one message per person
✓ uses only an approved route
✓ no message is emitted in mock mode
✓ healthy work creates no chase

REPORT LIFECYCLE
✓ project weekly report follows canonical template
✓ current-week Draft may be updated idempotently
✓ Final report is immutable and links to previous report
✓ Area rollup reads Project reports, not raw Tasks
✓ Company rollup reads Area rollups, not raw Tasks
✓ unresolved Tasks remain open and linked after Weekly

SAFETY / REPEATABILITY
✓ second identical Daily run creates no duplicate Task/message proposal
✓ second identical Weekly run modifies only active Drafts
✓ no real contact locator, token, provider ID, or message target is in fixtures
✓ mock receipt labels every intended provider action as planned, not sent
```

## 6. Failure view: useful gaps should be visible, not papered over

```text
┌─ PROOF RESULT ────────────────────────────────────────────────────────────────┐
│ STATUS  PASS                                                                  │
│ 23 / 23 expectations pass · 1 observed known source gap                     │
├──────────────────────────────────────────────────────────────────────────────┤
│ OBSERVED, NOT PAPERED OVER                                                    │
│ TASK-102's Drive source is missing. The automation correctly reported the    │
│ source gap and did not invent evidence.                                      │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 7. Confirmed design decisions

```text
[DECISION A] Report hierarchy — accepted
Project weekly report → Area rollup → Company rollup.
The canonical Project report is the durable plan-versus-actual unit.

[DECISION B] Template runtime location — accepted
KamdarAI/templates → installed workspace/templates + .hermes.md routing.
`kamdar-company-os` is the installed procedure; it reads, rather than embeds,
the template configuration.

[DECISION C] Meeting follow-ups — updated for actual Notion behavior
Meetings can be hidden blocks inside Tasks. Fetch every changed Task page in
full, parse Meeting blocks plus Meeting notes, and report `meeting_block_parse_gap`
when the provider representation is ambiguous.

[DECISION D] Areas — accepted
Controlled Project/People property first; promote to a DB only for independent
area ownership or policy.

[DECISION E] Assertion source — accepted
`evals/evals.json` is the source of file, template, content, behavior, and
safety assertions. The proof UI renders its template-first rows and expansion.
```

These five decisions define the source configuration now installed in KamdarAI.
The next implementation slice is a frozen runner and proof UI that render
`evals/evals.json`; it must not create Notion databases, post comments, send
messages, schedule automations, or install into the live Hermes workspace
without its own approval gate. Corrections continue to start here first.
