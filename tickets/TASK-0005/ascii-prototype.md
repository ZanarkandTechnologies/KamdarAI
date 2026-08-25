---
ticket_id: TASK-0005
title: ASCII prototype — intelligent operating proof
status: proposed
owner: Codex
created_at: 2026-08-21
updated_at: 2026-08-21
source_refs:
  - tickets/TASK-0005/ticket.md
  - docs/features/FEAT-0001-daily-project-memory.md
  - docs/features/FEAT-0003-daily-progress-chasing.md
  - docs/features/FEAT-0005-weekly-operating-reports.md
  - evals/evals.json
---

# ASCII prototype — intelligent operating proof

## Decision

These are **extensions to existing features**, not new feature IDs.

```text
+--------------------------------------+------------------------------+-------------------------+
| Proposed change                      | Durable owner                | Classification          |
+--------------------------------------+------------------------------+-------------------------+
| Planned/actual time and MYR cost     | FEAT-0001 Daily memory       | Existing feature grows  |
| Evidence-backed problem explanation  | FEAT-0001 Daily memory       | Existing feature grows  |
| Comment on stale source before chase | FEAT-0003 Progress chasing   | Existing feature grows  |
| Weekly time/cost/cause rollup         | FEAT-0005 Operating reports  | Existing feature grows  |
| Larger type + artifact previews      | Showcase UI                  | Proof UX, not a feature |
| One fixture + clean v4 Notion demo   | Eval/live proof harness      | Proof infrastructure    |
| Screenshot when no stronger evidence | QA evidence lane             | Proof fallback          |
+--------------------------------------+------------------------------+-------------------------+
```

Why: the behavior still runs inside the existing Daily and Weekly scans and
produces the outputs those features already own. Create a new `FEAT-*` only if
the capability later has an independent trigger, input contract, output,
operator, or proof lifecycle—for example, a separately scheduled cost-analysis
workflow used outside Daily project memory.

## How the features now fit together

```text
 FROZEN SCENARIO — one identity system, one source of truth
 ┌──────────┬────────────┬────────┬───────────┬──────────────┬───────────┐
 │ Projects │ Work Items │ People │ Resources │ Prior reports│ Templates │
 └────┬─────┴──────┬─────┴───┬────┴─────┬─────┴──────┬───────┴─────┬─────┘
      └────────────┴──────────┴──────────┴────────────┴─────────────┘
                                    │
                                    ▼
                         DAILY — ONE SOURCE SCAN
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ FEAT-0001 Project memory                                                  │
 │ changed work + meetings → status + hours + cost + cause + proposals       │
 ├───────────────────────────────────────────────────────────────────────────┤
 │ FEAT-0002 Documentation quality                                           │
 │ mapped template gaps → precise source-record comment                      │
 ├───────────────────────────────────────────────────────────────────────────┤
 │ FEAT-0003 Progress chasing                                                │
 │ stale work → source comment → owner route → grouped follow-up             │
 ├───────────────────────────────────────────────────────────────────────────┤
 │ FEAT-0004 Knowledge capture                                               │
 │ problems + decisions + resources + SOP/skill signals → candidates         │
 └───────────────┬───────────────────────────────────┬───────────────────────┘
                 │                                   │
                 ▼                                   ▼
       generated Daily Markdown             planned/applied actions
                 └──────────────────┬────────────────┘
                                    ▼
                         WEEKLY — ONE REVIEW PASS
 ┌───────────────────────────────────────────────────────────────────────────┐
 │ FEAT-0005 Reports       Project → Area → Company; plan vs actual          │
 │ FEAT-0006 Promotion     approved candidates → Task/Decision/Resource/Skill│
 │ FEAT-0007 Planning      unresolved work → next-week Project/Task proposals│
 │ FEAT-0008 Distribution  Company report → executive delivery              │
 │ FEAT-0009 Safety        gates + immutability + receipts + idempotency      │
 └───────────────┬───────────────────────────────────┬───────────────────────┘
                 │                                   │
                 ▼                                   ▼
       generated Weekly Markdown            planned/applied actions
                 └──────────────────┬────────────────┘
                                    ▼
                         FROZEN ASSERTION SCORER
                   ┌────────────────┴─────────────────┐
                   ▼                                  ▼
          no provider receipt                  v4 provider receipt
          PLANNED / BLOCKED                    APPLIED + exact URL
                   └────────────────┬─────────────────┘
                                    ▼
                              SHOWCASE UI
       story → source environment → Daily → Weekly → feature evals → gaps
```

## Representative scenario

The example values below are declared in the fixture. The automation may
calculate from them, but it may not invent them.

```text
 INPUT — TASK-101 / Reconcile supplier feed
 ┌──────────────────────┬───────────────────────────────────────────────────┐
 │ Project              │ Replenishment Accuracy                           │
 │ Owner                │ PERSON-001                                       │
 │ Due / run date       │ 2026-08-20 / 2026-08-21                          │
 │ Planned / actual     │ 12h / 18h                                        │
 │ Hourly basis         │ MYR 120, explicitly supplied                     │
 │ Observed fact        │ Feed totals differ from the approved stock count │
 │ Likely cause         │ Supplier-feed mapping mismatch                   │
 │ Confidence           │ Low — unconfirmed                                │
 │ Confirmation needed  │ Owner compares source columns with approved map  │
 └──────────────────────┴───────────────────────────────────────────────────┘

                  calculation only from declared inputs
                                  │
                                  ▼
 DAILY RESULT
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ 12h planned → 18h actual | +6h | MYR 1,440 → MYR 2,160 | +MYR 720      │
 │ Schedule: +1 day overdue                                                 │
 │ Cause: supplier-feed mapping mismatch [LOW / UNCONFIRMED]                │
 │ Next evidence: compare source columns with the approved mapping          │
 └─────────────────────┬────────────────────────────────────────────────────┘
                       │
                       ├─ 1. Add one idempotent comment to TASK-101
                       │     "Please confirm the mapping mismatch and revised ETA."
                       └─ 2. Then prepare the grouped owner follow-up

 WEEKLY RESULT
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Project report: +6h / +MYR 720 / +1 day; cause remains unconfirmed      │
 │ Area rollup: consumes Project reports, not raw Work Items                 │
 │ Company rollup: consumes Area reports, not raw Work Items                 │
 └──────────────────────────────────────────────────────────────────────────┘

 NOTION APPLICATION
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ Existing TASK-101 receives the comment; no duplicate "Update Task" row  │
 │ Existing Project receives linked evidence; no duplicate Project row      │
 │ Applied receipt records the exact result URL                             │
 └──────────────────────────────────────────────────────────────────────────┘
```

## Proposed showcase

One centered page-level column. Panels may use internal columns only when they
remain readable. Suggested scale: 13px body, 11–12px artifact content, 10–11px
metadata.

```text
                             max-width: 768px
        ┌──────────────────────────────────────────────────────────┐
        │ KAMDAR AI · OPERATING MANAGER PROOF                     │
        │ 9/9 features  ·  44/44 assertions  ·  V4 NOTION DEMO    │
        │ [Open demo workspace ↗]              [Run receipt ↗]    │
        └──────────────────────────────────────────────────────────┘
        ┌──────────────────────────────────────────────────────────┐
        │ 01 · THE PROBLEM                                        │
        │ Work is scattered across Projects, Work Items, meetings │
        │ and docs. Managers cannot see variance or why work slips.│
        └──────────────────────────────────────────────────────────┘
        ┌──────────────────────────────────────────────────────────┐
        │ 02 · MOCK COMPANY OS                                    │
        │ Projects  Work  People  Decisions  Resources  Reports   │
        │ Skills    Templates                                     │
        │ [open each clean Notion database ↗]                     │
        └──────────────────────────────────────────────────────────┘
        ┌──────────────────────────────────────────────────────────┐
        │ 03 · DAILY AUTOMATION                                   │
        │ scan once → memory · quality · chasing · candidates     │
        │                                                          │
        │ ▼ PASS · replenishment-accuracy-2026-08-21.md           │
        │   template: daily-operating-evidence@0.4.0              │
        │   assertions: file created · follows template ·         │
        │               economics exact · cause stays unconfirmed │
        │   ┌────────────────────────────────────────────────────┐ │
        │   │ # Daily operating evidence                        │ │
        │   │ ## Material change                                │ │
        │   │ ...complete generated Markdown...                 │ │
        │   └────────────────────────────────────────────────────┘ │
        │   [open local artifact] [open exact Notion result ↗]    │
        │                                                          │
        │ ▸ PASS · employee-followups-2026-08-21.md               │
        └──────────────────────────────────────────────────────────┘
        ┌──────────────────────────────────────────────────────────┐
        │ 04 · WEEKLY AUTOMATION                                  │
        │ Daily evidence → Project → Area → Company → promotions  │
        │                                                          │
        │ ▼ PASS · weekly-report-2026-W34.md                      │
        │   template + full Markdown + exact applied result        │
        └──────────────────────────────────────────────────────────┘
        ┌──────────────────────────────────────────────────────────┐
        │ 05 · EVAL RESULTS — GROUPED BY FEATURE                  │
        │                                                          │
        │ FEAT-0001 · DAILY PROJECT MEMORY              8/8 PASS  │
        │  ▸ Artifact: daily/projects/...md              5 checks │
        │    ✓ file created                                       │
        │    ✓ follows daily-operating-evidence@0.4.0             │
        │    ✓ exact time/cost arithmetic                         │
        │    ✓ hypothesis remains unconfirmed                     │
        │  ✓ meeting commitment becomes a linked Task proposal    │
        │                                                          │
        │ FEAT-0003 · DAILY PROGRESS CHASING            7/7 PASS  │
        │  ▸ Artifact: daily/outreach/...md              3 checks │
        │  ✓ source comment occurs before owner chase              │
        │  ✓ healthy Work produces neither comment nor chase       │
        │                                                          │
        │ FEAT-0005 · WEEKLY OPERATING REPORTS         10/10 PASS │
        │  ▸ Project report                              4 checks │
        │  ▸ Area reports                                3 checks │
        │  ▸ Company report                              3 checks │
        └──────────────────────────────────────────────────────────┘
        ┌──────────────────────────────────────────────────────────┐
        │ 06 · PROVIDER EVIDENCE                                  │
        │ APPLIED · Notion comment          [open exact comment ↗] │
        │ APPLIED · Report record           [open exact page ↗]    │
        │ BLOCKED · Gmail                    missing valid receipt  │
        │ PLANNED · Telegram                 no delivery receipt    │
        │ Screenshot appears only when no URL or local artifact    │
        │ can show the external state.                             │
        └──────────────────────────────────────────────────────────┘
```

The assertion total above is illustrative until the executable rows are
reconciled. The UI must derive it from `evals/evals.json`; it must never hardcode
a buyer-friendly count.

## How we test it

```text
 L0 CONTRACT         L1 DETERMINISM       L2 BEHAVIOR
 ┌───────────────┐   ┌────────────────┐   ┌──────────────────────────┐
 │ JSON valid    │──▶│ Exact arithmetic│──▶│ Comment precedes chase   │
 │ templates pin │   │ Same fixture    │   │ Healthy work suppressed │
 │ no placeholders│  │ Same artifacts  │   │ Cause remains honest     │
 └───────────────┘   └────────────────┘   └────────────┬─────────────┘
                                                      │
 L6 REVIEW           L5 BROWSER           L4 OPERATED  │   L3 IDEMPOTENCY
 ┌───────────────┐   ┌────────────────┐   ┌────────────▼──┐ ┌──────────────┐
 │ Independent   │◀──│ Width + fonts  │◀──│ V4 Notion only│◀│ Run it twice │
 │ claim review  │   │ previews+links │   │ read receipts │ │ zero dupes   │
 └───────────────┘   └────────────────┘   └───────────────┘ └──────────────┘
```

### L0 — Contract checks

- Every generated record pins a registered template and version.
- Fixture, template registry, feature registry, and `evals/evals.json` parse.
- No generated artifact contains unresolved placeholders.
- New assertions are tagged to `FEAT-0001`, `FEAT-0003`, or `FEAT-0005`.

### L1 — Deterministic calculations

- `12h × MYR 120 = MYR 1,440`; `18h × MYR 120 = MYR 2,160`.
- Variance is `+6h`, `+MYR 720`, and `+1 day` for the declared scenario.
- Missing inputs produce `source_gap`; they never produce an inferred number.

### L2 — Behavior checks

- A low-confidence cause renders as `unconfirmed` with confirmation needed.
- The stale source-record comment occurs before owner routing and chase.
- Healthy Work gets neither a comment nor a chase.
- Weekly reports consume the previous reporting grain, preserving the hierarchy.

### L3 — Idempotency

- Run the exact frozen scenario twice.
- Second run creates zero duplicate files, rows, comments, or delivery actions.
- The same idempotency key produces an explicit skip receipt.

### L4 — Operated Notion proof

- Create/read only the isolated v4 root and its eight clean databases.
- Seed the exact fixture IDs; never mix `KMD-*` and synthetic `PROJ-*` IDs.
- Read back database membership, titles, comments, relationships, and URLs.
- No connector-shaped duplicate Project or Work rows exist.

### L5 — Browser proof

- Computed main width is at most 768px and there is one page-level column.
- Font sizes meet the declared readable minimum.
- Every Daily and Weekly Markdown file is expandable in full.
- Applied actions expose exact provider URLs; local outputs expose file links.
- Old workspace and Drive URLs appear zero times.

### L6 — Independent review

- A reviewer compares every buyer claim with its artifact, receipt, or capture.
- `APPLIED` requires a provider receipt. A local pass proves only local behavior.
- Any unresolved provider remains `PLANNED` or `BLOCKED` in the showcase.

## Required positive and negative cases

```text
+--------------------------------------+-------------------------------------------+
| Case                                 | Expected result                           |
+--------------------------------------+-------------------------------------------+
| Planned + actual hours + rate exist  | Exact hours and MYR variance              |
| Planned hours missing                | source_gap; no invented time variance     |
| Hourly rate missing                  | source_gap; no MYR estimate               |
| Cause has weak evidence              | LOW / UNCONFIRMED + confirmation request  |
| Work is stale                        | One source comment, then routed chase     |
| Work is healthy                      | No comment and no chase                   |
| Same stale case runs twice           | Second comment/chase is skipped           |
| Provider receipt exists              | APPLIED + exact provider URL              |
| Provider receipt is missing          | PLANNED/BLOCKED; never claimed delivered  |
| Local Markdown exists                | Render it and link it; no screenshot need |
| External state has no URL/artifact   | Attach a screenshot as fallback evidence |
+--------------------------------------+-------------------------------------------+
```

## Approval boundary

Approve this prototype means:

1. extend `FEAT-0001`, `FEAT-0003`, and `FEAT-0005` rather than minting new
   feature IDs;
2. make the seven-level test ladder the proof contract; and
3. keep showcase UX and coherent v4 fixture work classified as proof surfaces,
   not buyer-facing automation capabilities.
