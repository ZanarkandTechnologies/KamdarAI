---
ticket_id: TASK-0006
title: ASCII prototype — buyer-led proof grouped by feature
status: proposed
owner: Codex
created_at: 2026-08-21
updated_at: 2026-08-21
source_refs:
  - tickets/TASK-0006/ticket.md
  - tickets/TASK-0006/seed-contract.md
  - tickets/TASK-0006/data-model-gap-report.md
  - evals/evals.json
  - evals/filesystem/runs/kamdar-template-first-latest/result.json
---

# ASCII prototype — buyer-led proof grouped by feature

## The correction

The previous draft repeated the same evidence twice:

```text
Section 4: one expanded feature
Section 5: the same feature's file → integration → receipt path
```

The buyer should not have to join those views. Each feature will own its whole
story in one place:

```text
feature(signal)
  -> manager action
  -> record changes and/or deliberate files
  -> content checks
  -> Notion / Drive / Email / Telegram result
  -> business outcome
```

There is no separate integration section in the showcase. Provider setup,
route schemas, cleanup instructions, and raw traces stay in the implementation
ticket or the final audit drawer. The buyer sees the result beside the file
that produced it.

## Page order

```text
1. What problem does this solve?
2. What data is real, derived, or synthetic in this demo?
3. What happened in this test week?
4. How Daily work becomes a Weekly result
5. Daily features — record/file changes and applications grouped by feature
6. Weekly features — record/file changes and applications grouped by feature
7. Safety and receipts — the checks shared by every feature
8. System reference — databases, templates, raw assertions, and traces
```

The default page tells the story. Technical detail is available, but it does
not interrupt the story.

## Proposed showcase

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ KAMDAR AI · OPERATED DEMO                                  [Open workspace ↗]│
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Know what is late, why it matters, and who needs to act                      │
│                                                                              │
│ Kamdar AI checks the work already stored in Notion and Drive. It updates      │
│ project memory, follows up missing owners, prepares the weekly review, and    │
│ sends leadership one final report.                                           │
│                                                                              │
│ NEXT TEST MUST PROVE                                                         │
│ [Notion @mentions] [2 emails sent] [7 department reports] [Telegram sent]   │
│                                                                              │
│ Private Project capture + labelled synthetic Work · isolated v4 only         │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ THE SEEDED WORKSPACE                                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ FROM THE SUPPLIED CAPTURE                                                     │
│ 49 captured rows                                                             │
│ ├─ 39 named Projects across 6 departments                                    │
│ ├─ 10 incomplete rows kept as source gaps                                    │
│ └─ 7 observed department labels, including Content with no named Project     │
│                                                                              │
│ DECLARED TEST OVERLAY — the capture did not contain these records             │
│ 8 People · 21 Work Items · 3 embedded Meetings                               │
│ ├─ 4 stale or blocked · 4 incomplete · 6 healthy                             │
│ ├─ 4 active with time/cost variance · 3 Meeting pages                        │
│ └─ 2 routed test employees + 1 Demo Owner with private operator contacts     │
│                                                                              │
│ REPORTING TARGET                                                             │
│ 12 active Project reports → 7 department reports → 1 Company report          │
│ Content receives an honest source-gap report; no Project is invented.         │
│                                                                              │
│ DELIVERY TARGET                                                              │
│ 2 grouped employee emails · detailed Notion comments with verified mentions │
│ 1 owner Telegram message with a section and report link for every department│
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ THIS TEST WEEK                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Across Marketing, Merchandising, CMT, Ecommerce, Property Management, DTC,   │
│ and Content, the manager must separate delayed work, incomplete records,      │
│ healthy work, Meeting commitments, and missing source structure.              │
│                                                                              │
│ WHAT THE MANAGER SHOULD DO                                                    │
│ ┌──────────────────────────────┬───────────────────────────────────────────┐ │
│ │ Daily                        │ Weekly                                    │ │
│ ├──────────────────────────────┼───────────────────────────────────────────┤ │
│ │ Update current project facts │ Compare plan with actual                  │ │
│ │ Ask for missing evidence     │ Publish Project, Area, Company reports    │ │
│ │ Chase the delayed owner once │ Promote useful knowledge                  │ │
│ │ Save review candidates       │ Plan next week and notify the owner       │ │
│ └──────────────────────────────┴───────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ FROM TODAY'S WORK TO THE OWNER'S REPORT                                      │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ changed Work + embedded Meetings                                             │
│              │                                                               │
│              ▼                                                               │
│ Daily: memory · quality · follow-up · knowledge candidates                    │
│              │                                                               │
│              ▼                                                               │
│ Weekly: reports · promotion · next-week plan                                  │
│              │                                                               │
│              ▼                                                               │
│ 12 Project reports → 7 department reports → Company report                   │
│              │                                                               │
│              ▼                                                               │
│ one owner Telegram message with all seven department sections                │
│                                                                              │
│ [Follow each feature and its files ↓]                                        │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│ WHAT ONE PROJECT ENTRY LOOKS LIKE                                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ Project: {captured Project title}                                             │
│ Department · Owner · Status · Health · Progress · Last meaningful update     │
│ Objective · Current context · Main blocker · Next action                      │
│                                                                              │
│ LINKED WORK                         LINKED DECISIONS                           │
│ filtered where Work.Project = this  filtered where Decisions.Projects = this │
│                                                                              │
│ LINKED RESOURCES                    LINKED REPORTS                             │
│ filtered where Resources.Projects  filtered where Reports.Project = this     │
│                                                                              │
│ Daily updates these fields in place. It does not create a second memory file.│
└──────────────────────────────────────────────────────────────────────────────┘
```

## Daily features

Every card answers five questions without opening the audit view:

```text
Why did this run? · What did the manager do? · Which records or files changed?
What was applied? · What changed for the business?
```

### Daily 1 — Keep project memory current

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ DAILY 1 OF 4                                TARGET · 12 PROJECTS APPLIED    │
│ Keep project pages current                                                   │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ The signal                                                                   │
│ Twenty-one Work pages changed across the active Projects, including three    │
│ embedded Meetings.                                                           │
│                                                                              │
│ What Kamdar AI did                                                           │
│ Read each page in full, calculated sourced time/cost variance, kept suspected│
│ causes unconfirmed, extracted Meeting commitments, and refreshed 12 Projects.│
│                                                                              │
│ PROJECT RECORD CHANGES                                                       │
│                                                                              │
│ UPDATED  12 canonical Project entries                                        │
│          Status · health · progress · current context · blockers             │
│          next action · last meaningful update                                │
│          [Inspect before/after fields] [Open 12 Projects ↗]                  │
│                                                                              │
│ CREATED  0 Daily Project-memory files                                        │
│ CREATED  0 Daily-memory child pages                                          │
│                                                                              │
│ ALSO APPLIED  Meeting commitments became linked Task proposals                │
│                                                                              │
│ Result                                                                       │
│ Every active Project says what changed, what is uncertain, and what happens  │
│ next. Meeting commitments are no longer trapped in page content.             │
│                                                                              │
│ ▸ Inspect record-diff and behavior checks · FEAT-0001 · internal IDs         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Daily 2 — Ask for the missing information

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ DAILY 2 OF 4                              TARGET · 4 TAGGED COMMENTS        │
│ Ask for the exact missing evidence                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ The signal                                                                   │
│ Four active Work Items are missing different fields required by their mapped │
│ Task templates.                                                               │
│                                                                              │
│ What Kamdar AI did                                                           │
│ Compared each Work page with its Task template and wrote one precise comment │
│ for each missing field. Every comment names and tags the person in charge.   │
│                                                                              │
│ FILE CHANGES                                                                 │
│                                                                              │
│ CREATED  4 documentation-request files                                       │
│          Missing fields · source links · requested answers · responsible owner│
│          Template: Documentation request                                     │
│          [Browse 4 files] [Open 4 tagged Notion comments ↗]                  │
│                                                                              │
│ COMMENT DETAIL                                                               │
│ @Responsible person · current status · days stale · plan versus actual       │
│ blocker · missing evidence · revised commitment request · source Work link    │
│                                                                              │
│ Result                                                                       │
│ Each responsible person sees an answerable question on the right Work page. │
│                                                                              │
│ ▸ Inspect file-content and precision checks · FEAT-0002 · internal ID        │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Daily 3 — Follow up delayed work

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ DAILY 3 OF 4                                TARGET · 2 EMAILS SENT          │
│ Ask the delayed owner once                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ The signal                                                                   │
│ Four Work Items are stale or blocked. Two allowlisted test employees own     │
│ those items; healthy Work belongs to other employees and must stay untouched.│
│                                                                              │
│ What Kamdar AI did                                                           │
│ Added detailed progress questions to the source Work pages, tagged the person│
│ in charge, resolved two employee routes through People, and grouped each     │
│ employee's open Work into one email. Healthy Work was left alone.            │
│                                                                              │
│ FILE CHANGES                                                                 │
│                                                                              │
│ CREATED  test-employee-a-followup-2026-08-21.md                              │
│ CREATED  test-employee-b-followup-2026-08-21.md                              │
│          One file per employee · all owned Work · exact questions · links     │
│          Template: Employee follow-up                                        │
│          [Render both complete emails]                                        │
│                                                                              │
│ DOWNSTREAM                                                                   │
│ TARGET   4 Notion comments with verified user mentions        [Open ↗]       │
│ TARGET   2 Gmail messages with matching payload receipts      [View receipts]│
│ NOT USED Telegram is reserved for the owner's final weekly report            │
│                                                                              │
│ Result                                                                       │
│ Two employees receive one useful email each, after the source Work pages are │
│ updated. No healthy employee receives a message.                             │
│                                                                              │
│ ▸ Inspect ordering, routing, payload, privacy, and rerun checks · FEAT-0003  │
└──────────────────────────────────────────────────────────────────────────────┘
```

The four affected Work Items receive one comment each. A stale and incomplete
item does not receive separate comments from Daily 2 and Daily 3:

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ @Responsible person — action needed on {specific Work item}                  │
├──────────────────────────────────────────────────────────────────────────────┤
│ What the record says now                                                     │
│ Status: Blocked · Due: 18 Aug · Last meaningful update: 14 Aug               │
│ Plan: 12h / MYR 1,440 · Actual: 18h / MYR 2,160                              │
│ Blocker: supplier-feed mismatch · Cause confidence: unconfirmed              │
│ Missing: manual-count evidence                                               │
│                                                                              │
│ Please reply with                                                            │
│ 1. Work completed since 14 Aug                                               │
│ 2. Current blocker and who owns it                                           │
│ 3. Evidence confirming or rejecting the suspected cause                      │
│ 4. Revised hours/cost if the plan changed                                    │
│ 5. Revised completion date and next action                                   │
│                                                                              │
│ Update: Status · Evidence · Effort/cost · Next action                         │
│ Source: [Open Work item ↗] · Receipt: daily-comment:{date}:{work-id}          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Daily 4 — Save knowledge worth reviewing

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ DAILY 4 OF 4                          TARGET · 12 CANDIDATES STAGED         │
│ Keep useful knowledge without publishing guesses                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ The signal                                                                   │
│ Three embedded Meetings contain problems, decisions, resources, commitments, │
│ and SOP signals.                                                             │
│                                                                              │
│ What Kamdar AI did                                                           │
│ Extracted source-linked candidates from all three Meetings and held them for │
│ Weekly review.                                                               │
│ Nothing became company knowledge during the Daily run.                       │
│                                                                              │
│ FILE CHANGES                                                                 │
│                                                                              │
│ CREATED  candidates-2026-08-21.md                                            │
│          3 Problems · 3 Decisions · 3 Resources · 3 SOPs · evidence · state  │
│          Template: Knowledge candidates                                      │
│          [Render file]                                                       │
│                                                                              │
│ Result                                                                       │
│ The weekly reviewer has twelve concrete candidates instead of rereading the │
│ Meeting from scratch. None is treated as approved yet.                       │
│                                                                              │
│ ▸ Inspect extraction and promotion-gate checks · FEAT-0004                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Weekly features

### Weekly 1 — Show plan versus actual

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ WEEKLY 1 OF 4                            TARGET · 20 REPORTS + DRIVE        │
│ Show where the week moved and slipped                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ What Kamdar AI did                                                           │
│ Built 12 active Project reports, rolled them into seven department reports, │
│ then built one Company report. Every summary links to its source report.     │
│                                                                              │
│ FILE CHANGES                                                                 │
│                                                                              │
│ MODIFIED 3 existing Project report drafts                                   │
│ CREATED  9 new Project reports                                               │
│          Plan/actual · time/cost · cause confidence · blockers · next action │
│          [Browse 12 Project files] [Open Notion reports ↗]                   │
│                                                                              │
│ CREATED  7 department reports                                                │
│          Marketing · Merchandising · CMT · Ecommerce · Property · DTC        │
│          Content: explicit source gap; no Project fabricated                  │
│          [Browse 7 department files] [Open Notion reports ↗]                 │
│                                                                              │
│ CREATED  company/weekly-rollup-2026-W34.md                                   │
│          Department outcomes · risks · owner attention · next-week priorities│
│          [Render Company report] [Open Notion report ↗]                      │
│                                                                              │
│ DOWNSTREAM                                                                   │
│ TARGET   20 Notion Report records                                            │
│ TARGET   Company report published to Drive                  [Open file ↗]    │
│                                                                              │
│ Result                                                                       │
│ Leadership can move from Company to department to Project evidence and can   │
│ see where the source itself is incomplete.                                   │
│                                                                              │
│ ▸ Inspect hierarchy, template, lifecycle, and variance checks · FEAT-0005   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Weekly 2 — Turn reviewed findings into company knowledge

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ WEEKLY 2 OF 4                        TARGET · 12 PROMOTIONS + DRIVE         │
│ Keep the decisions and methods the company should reuse                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ What Kamdar AI did                                                           │
│ Reviewed the Daily candidates and routed each approved item to its           │
│ canonical home.                                                              │
│                                                                              │
│ FILE CHANGES                                                                 │
│                                                                              │
│ CREATED  3 Issue files        → Notion Work                   [Open ↗]       │
│ CREATED  3 Decision files     → Notion Decisions              [Open ↗]       │
│ CREATED  3 Resource files     → Notion Resources              [Open ↗]       │
│ CREATED  3 SOP/Skill files    → Notion Skills                 [Open ↗]       │
│          [Browse all 12 promotion files]                                     │
│                                                                              │
│ DOWNSTREAM                                                                   │
│ TARGET   Reviewed Issue, Decision, Resource, and Skill records                │
│ TARGET   Approved Resources published to Drive             [Open files ↗]   │
│                                                                              │
│ Result                                                                       │
│ A Meeting produced durable, reviewable knowledge without bypassing approval. │
│                                                                              │
│ ▸ Inspect source, authority, duplicate, and routing checks · FEAT-0006       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Weekly 3 — Carry the right work into next week

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ WEEKLY 3 OF 4                               TARGET · NEXT-WEEK APPLIED      │
│ Keep open commitments without creating duplicate tasks                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ What Kamdar AI did                                                           │
│ Carried the unresolved replenishment work forward and linked one approved    │
│ Meeting commitment to the existing Task identity.                            │
│                                                                              │
│ RECORD CHANGES                                                               │
│                                                                              │
│ UPDATED  Project entries with carry-forward context, owner attention, and    │
│          revised commitments                                                  │
│          [Inspect Project diffs] [Open Projects ↗]                           │
│                                                                              │
│ CREATED  linked Work entries for approved Meeting commitments                │
│          Definition of done · owner · due date · source Meeting              │
│          [Inspect new records] [Open linked Work ↗]                          │
│                                                                              │
│ CREATED  0 Project-plan Markdown files                                       │
│                                                                              │
│ Result                                                                       │
│ Next week starts with named commitments and the same canonical Work IDs.      │
│                                                                              │
│ ▸ Inspect carry-forward, ordering, source-link, and dedupe checks · FEAT-0007│
└──────────────────────────────────────────────────────────────────────────────┘
```

### Weekly 4 — Send the owner one final report

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ WEEKLY 4 OF 4                             TARGET · TELEGRAM SENT           │
│ Put the final Company report in the owner's hands                             │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ What Kamdar AI did                                                           │
│ Condensed the finalized Company report into one section per department, then │
│ added cross-company risks, owner attention, and next-week priorities.        │
│                                                                              │
│ FILE CHANGES                                                                 │
│                                                                              │
│ CREATED  telegram-summary-2026-W34.md                                        │
│          7 department sections · report links · risks · owners · next actions│
│          Template: Telegram executive summary                                │
│          [Render complete message]                                            │
│                                                                              │
│ DOWNSTREAM                                                                   │
│ TARGET   Telegram delivery to private Demo Owner             [View receipt] │
│                                                                              │
│ Result                                                                       │
│ The owner receives one message showing what happened in every department and │
│ can open each department report. The feature passes only with a matching      │
│ Telegram message receipt.                                                     │
│                                                                              │
│ ▸ Inspect finalization, ordering, route, payload, and rerun checks · FEAT-0008│
└──────────────────────────────────────────────────────────────────────────────┘
```

## Safety shared by every feature

Safety is not presented as a ninth product outcome. It explains why the eight
outcomes can be trusted.

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ WHY THIS PROOF IS TRUSTWORTHY                                  FEAT-0009     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ FILE CHANGES                                                                 │
│ CREATED  daily/receipt-2026-08-21.md                                         │
│ CREATED  weekly/receipt-2026-W34.md                                          │
│          source window · template versions · actions · gaps · rerun identity │
│          [Render receipts]                                                   │
│                                                                              │
│ ✓ Only the isolated v4 environment can be changed                            │
│ ✓ Unknown causes remain unconfirmed                                          │
│ ✓ Unknown recipients are blocked                                             │
│ ✓ A local artifact is not proof of provider delivery                         │
│ ✓ A matching second run creates no duplicate file, record, or message        │
│                                                                              │
│ ▸ Inspect source bounds, receipt schema, payload hashes, and raw trace        │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Record and file drill-downs

Project memory and next-week planning use record changes, not fake files:

```text
▼ Project: {captured Project title}                              UPDATED · PASS
  Target     Projects / {private Project ID}

  Before                         After
  Status: In progress            Status: At risk
  Health: —                      Health: Needs owner attention
  Current context: stale         Current context: 4 specific sourced changes
  Main blocker: —                Main blocker: supplier-feed mismatch
  Next action: —                 Next action: link count evidence by 22 Aug
  Last update: 14 Aug            Last update: 21 Aug

  Relations
  ✓ Work, Decisions, Resources, and Reports point to this Project page ID

  Application
  ✓ notion.update_project_memory
  ✓ One matching mutation receipt
  [Open Project ↗] [View receipt]
```

Deliberate artifacts such as reports and messages keep a file drill-down. It
keeps file existence, file content, and downstream application together:

```text
▼ weekly-report-2026-W34.md                                      MODIFIED · PASS
  Path       weekly/reports/projects/replenishment-accuracy/...
  Template   Weekly report @ current version

  Content
  ✓ Executive summary names the material change
  ✓ Plan versus actual contains linked Work
  ✓ 12h planned → 18h actual
  ✓ MYR 1,440 estimated → MYR 2,160 actual
  ✓ Suspected cause remains unconfirmed
  ✓ Next action and owner are present

  Application
  ✓ notion.upsert_project_report
  ✓ Receipt matches this file's SHA-256
  [Render Markdown] [Open Notion result ↗] [View receipt]
```

There is no separate page-wide “files created” section. A buyer looking at
reporting sees report files; a buyer looking at chasing sees the email file.

## How feature docs and eval rows connect

The feature document is rendered above its proof. `evals.json` does not carry a
second copy of the feature explanation:

```text
docs/features/FEAT-0003-daily-progress-chasing.md
┌────────────────────────────────────────────────────────────────────────────┐
│ Why it exists                                                              │
│ Trigger and inputs                                                         │
│ Flow                                                                       │
│   stale Work → detailed tagged comment → People route → grouped email      │
│ State changes and artifacts                                                │
│ Downstream application                                                     │
│ Failure modes                                                              │
│ Proof contract                                                             │
│ Example                                                                    │
└─────────────────────────────────┬──────────────────────────────────────────┘
                                  │ feature_id = FEAT-0003
                                  ▼
eval assertions                   UI proof below the rendered feature doc
├─ record changes                 ├─ Project / Work diffs
├─ files                          ├─ email files and content checks
├─ behavior                       ├─ ordering and healthy suppression
└─ application receipts           └─ Notion comments and Gmail receipts
```

The same mapping applies to every feature. No extra flow ID is introduced.

## System reference

The material below remains available, but collapsed by default:

```text
▸ Browse the fictional workspace
  Projects · Work · People · Decisions · Resources · Reports · Skills · Templates

▸ Render all record templates
  Project · Task · Decision · Resource · Weekly report · Area rollup · Company...

▸ Inspect the complete test suite
  grouped by feature → record / file / behavior / application checks

▸ Developer evidence
  internal IDs · action keys · provider receipts · tool trace · idempotency
```

Notion cleanup candidates, route installation, provider commands, and the ASCII
comparison do not belong in the buyer narrative. They remain in TASK-0006 and
its audit artifacts.

## Acceptance test for the proposed UI

```text
Without opening a technical drawer, a buyer should be able to answer:

1. What operating problem does Kamdar AI solve?
2. Which records came from the supplied capture, and which are test overlay?
3. What happened across all seven observed departments?
4. What does Daily do that Weekly does not?
5. Which records or deliberate files did each feature change?
6. Where was each change applied?
7. Which comments tagged the responsible person with useful detail?
8. Which employee emails were actually sent?
9. Did the owner receive a department-by-department Telegram report?

After opening one record or file row, the buyer should also be able to answer:

10. What record contract or template governed the change?
11. What content was checked?
12. Does the provider receipt match that exact file?
```

The UI is not ready to implement until this page order and per-feature evidence
shape are accepted.
