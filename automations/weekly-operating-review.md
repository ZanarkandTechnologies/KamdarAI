---
automation_id: kamdar-weekly-operating-review
automation_version: "1.0.0"
kind: company-os-automation
cadence: weekly
company_timezone: Asia/Kuala_Lumpur
feature_refs: [FEAT-0005, FEAT-0006, FEAT-0007]
---

# Weekly operating review

## At a glance

Run one bounded Weekly sequence from one frozen set of Project Notes:

```text
active Projects
      |
      v
freeze every Project Notes file ----coverage/hash failure----> stop
      |
      v
one validated Weekly result --------quality below Tier A------> revise + review
      |
      v
Project reports + targeted memory updates + next-week carry-forward
      |
      v
Department reports --> Company report --> optional provider copies --> owner
```

The frozen Project Notes are the only Weekly operational source. Read Projects
for relations and prior Final reports for continuity, but never rescan raw Work
or Meeting pages.

## Authority and report shape

`workspace.hermes.md` binds the exact sources, write authority, optional sync
destinations, and message routes. Never infer or substitute a route. Stop only
the unauthorized effect when the rest of the run remains valid.

All report levels use: `Summary`, `Outcomes and open attention`, `Problems and
inefficiencies`, `Decisions`, `SOPs`, and `Next-week priorities`. Higher levels
summarize and link lower reports; they do not copy source evidence verbatim.

`Area` means Department. Its `area` value must match a seeded Project
Department; do not invent another organizational layer.

## Execution gates

| Gate | Required proof | Failure |
| --- | --- | --- |
| A. Freeze context | Every active Project has one hashed note in `.project-notes-freeze.json` | Stop before extraction |
| B. Validate result | One schema-valid `weekly-review-result-YYYY-Www.json` | Stop before any mutation |
| C. Review quality | Independent review covers every artifact and returns Tier A | For B/C readability, run `unslop`, regenerate, and review the new hash |
| 1. Project | Every frozen note has a Final Project report and candidate dispositions | Record gaps; block only invalid promotions unless report finalization is invalid |
| 2. Department | Every expected active Project has a Final report | Block its Department and Company report |
| 3. Company | Every expected Department report is Final | Record the gap; do not finalize Company |
| 4. Deliver | Local Final files read back; each external target is authorized | Block only the failed or unauthorized external effect |

## Todo List

- [ ] **A — Freeze the complete Weekly context.**

  1. Read `workspace.hermes.md` completely.
  2. Before the first provider call, run `ntn --help`, `ntn datasources
     --help`, `ntn pages --help`, and `ntn api --help`. Use only confirmed CLI
     syntax; never infer an `ntn` resource or argument shape.
  3. Under `weeks/<week>/project-notes/`, enumerate exactly one Project Notes
     file for every expected active Project.
  4. Acquire the week lock, validate exact coverage, hash every file, and
     atomically create `.project-notes-freeze.json`.
  5. Load prior Final reports and lightweight local Employee/SOP Memory indexes.
     Load full memory files only for IDs or keys referenced by frozen notes.
     People remains a directory source.
  6. Materialize the immutable input as
     `weekly/context/weekly-context-YYYY-Www.json`.

- [ ] **B — Produce one validated Weekly result.**

  1. Read `schemas/automations/weekly_review_result.py` completely.
  2. Run `python -m schemas.automations.validate schema weekly-review`.
  3. Give the emitted JSON Schema, schema instructions, golden examples,
     frozen context, and every destination template to one structured
     extraction call.
  4. Validate the complete result before any workspace or provider mutation.
  5. Write its exact bytes to
     `weekly/review/weekly-review-result-YYYY-Www.json`, then run:

     ```bash
     python -m schemas.automations.validate validate weekly-review <result-path>
     ```

- [ ] **C — Pass the end-user artifact quality gate.**

  Give the exact result bytes, frozen context, destination templates, and
  `evals/rubrics/end-user-artifact-quality.md` to an independent read-only
  reviewer. Validate the response with
  `schemas/automations/artifact_quality_review.py`:

  ```bash
  python -m schemas.automations.validate validate artifact-quality-review <review-path>
  ```

  Write `weekly/review/weekly-artifact-quality-review-YYYY-Www.json`. Require
  exact coverage of every report, promotion disposition, Employee Memory
  update, SOP update, carry-forward update, and gap. Proceed only for Tier A.
  Keep opaque UUIDs and hashes in structured evidence; rendered reports use
  readable names or natural descriptions. Human references such as `TASK-101`
  may remain.

- [ ] **1 — Project frozen Project Notes and promote reviewed knowledge.**

  | Frozen section or evidence | Weekly action | Owned destination |
  | --- | --- | --- |
  | Complete Project Notes | Render one Final report; preserve source note keys | `weeks/<week>/reports/projects/project--<id>.md` |
  | Accepted completed outcomes | Group by Person ID across Projects | `memory/employees/<person-id>.md` |
  | Problems and inefficiencies | Promote qualifying problems or record disposition | `memory/issues/<issue-id>.md` |
  | Decisions | Promote qualifying reusable decisions or record disposition | `memory/decisions/<decision-id>.md` |
  | Approved employee workflows | Group by explicit `workflow_key` | `memory/sops/<workflow-key>.md` |
  | Unresolved Work and questions | Carry forward the newest source-linked snapshot | `weeks/<next-week>/project-notes/project--<id>.md` |

  Apply these rules:

  | Candidate | Promote only when | Update rule |
  | --- | --- | --- |
  | Project report | Its frozen note validates | Set `report_status = Final`; increment `report_version`; set `finalized_at` |
  | Issue | Recurring or materially costly, with workflow step, dated Before baseline, cost or measurement gap, confidence, owner, and next test | Otherwise keep it in report history with a disposition |
  | Decision | Reusable precedent, operating standard, monetary commitment, material risk/compliance choice, cross-team tradeoff, or costly-to-reverse choice | Compare 2–3 real options in the style of `advise`; preserve selection, rationale, authority, tradeoff, consequences, review trigger, Project relation, and provenance |
  | SOP | Approved employee workflow with trigger, actors, steps, systems, handoffs, baseline, exceptions, output, owner, reuse proof, Project relation, and provenance | Use `templates/sop.md`, never the Farplane `skill.md` registry card |
  | Employee Memory | Accepted completed outcomes grouped by Person ID across all Projects | Append deduplicated durable observations; replace only `Latest weekly evidence`; keep open/stale/question-pending Work weekly; never rate a person or infer effort, intent, or personality |
  | SOP baseline | Comparable samples share an explicit `workflow_key` | Replace only `Latest weekly samples`; preserve the approved baseline; three samples across two Projects may create an owner-approval candidate, never an automatic baseline change |
  | Next-week notes | Work or a documentation question remains unresolved | Carry only the newest snapshot; never carry accepted completed Work, rescan raw Work, or edit the frozen week |

  Record one disposition for every candidate: `promoted`, `duplicate`,
  `project_only`, `monitor`, `dismissed`, or `blocked`. Missing authority,
  relation, template, or dedupe evidence blocks that promotion, not an otherwise
  valid Project report.

  A report sentence is not automatically a Decision. Ask what a future manager,
  customer-service owner, or Project lead would reuse. If it only states what
  the team will do next, mark it `project_only`. Monetary materiality may be an
  amount, exposure, budget boundary, or an explicit measurement gap with an
  owner; never invent a value.

  Reports own weekly findings. Local Employee, SOP, Issue, and Decision Memory
  own durable knowledge. Public People pages never receive Employee Memory.
  Responses arriving after finalization update live Work or review state and
  enter next week's Project Notes; never reopen a Final report.

- [ ] **2 — Roll Final Project reports into Final Department reports.**

  For each Department, group only this week's Final Project reports by the
  Project's seeded Department. Read those reports and the previous Department
  report. Create or replace one private report from
  `templates/area-operating-rollup.md`, preserve the shared sections, summarize
  cross-Project patterns, link every source Project report, and record its
  private locator and version. Record missing relations as `configuration_gap`.

- [ ] **3 — Roll Final Department reports into the Company report.**

  Read every Final Department report and the previous Company report. Create or
  replace one private report from `templates/company-operating-rollup.md`.
  Include only company-material patterns, preserve the shared sections, and
  link every Department report. Set `report_status = Final`, increment
  `report_version`, set `finalized_at`, and write it under the exact private
  weekly report root.

- [ ] **4 — Sync to provider and deliver the Company report.**

  Begin only after every expected local Project, Department, and Company file
  reads back as Final.

  1. For each Final local artifact, create a one-way provider copy only when
     `workspace.hermes.md` has a complete matching `short-term memory`,
     `long-term memory`, or `reports` provider/destination row. Missing means
     local-only. Incomplete or failed copy blocks only that copy. Never import
     provider edits into local memory. Record a provider URL only after exact
     destination read-back.
  2. Resolve the owner Person's approved Telegram route from the active binding.
  3. From the runtime workspace, pipe the rendered document to:

     ```bash
     python ../scripts/authorized_message.py --workspace .hermes.md --profile-home .. --message "owner report" --action-key company-report-<YYYY-Www>
     ```

  4. Render `templates/executive-distribution.md` with the complete Company
     report Markdown, unchanged and unsummarized; every source Department title
     and private locator; and the Final Company locator and version. Include
     only provider URLs whose copies succeeded, then send through the approved
     route.

  If multiple messages are required, split only at Markdown section boundaries,
  preserve order, and label each envelope `part N/M`. Every part needs a
  provider-confirmed receipt for `delivered`; otherwise record `partial` or
  `blocked`. A missing or unauthorized Telegram route blocks delivery and does
  not authorize a fallback channel.

## Output

```text
weekly/context/weekly-context-YYYY-Www.json
weekly/review/weekly-review-result-YYYY-Www.json
weekly/review/weekly-artifact-quality-review-YYYY-Www.json
weeks/<week>/reports/projects/project--<id>.md
weeks/<week>/reports/departments/department--<id>.md
weeks/<week>/reports/company.md
memory/{employees,issues,decisions,sops}/<entity>.md
weeks/<next-week>/project-notes/project--<id>.md
weekly/receipts/weekly-integration-receipt-YYYY-Www.json
```

The receipt records source report versions, promotion dispositions, local
memory locators, integration outcomes, gaps, the Final Company locator,
approved Telegram route, delivery receipts, and provider URLs only for copies
that succeeded. Write the validated Weekly result before any mutation. Record
each integration outcome as it settles. Before any provider write, prove that
the active binding authorizes the exact target and action; otherwise record
`blocked` and stop that effect.
