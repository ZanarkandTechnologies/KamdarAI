---
automation_id: kamdar-weekly-operating-review
automation_version: "1.0.0"
kind: company-os-automation
cadence: weekly
company_timezone: Asia/Kuala_Lumpur
feature_refs: [FEAT-0005, FEAT-0006, FEAT-0007]
---

# Weekly operating review

## Context

Run one bounded sequence from Notion Reports. First, finalize every current-week
Project Report Draft and promote its reviewed knowledge. Second, roll finalized
Project reports into Department reports, then roll finalized Department reports
into one Company report. Read Reports, Projects, and destination database URLs from
`workspace.hermes.md`; never rescan raw Work or Meeting pages.

The default execution mode is `prepare`, which writes only the local plan and
receipt. An explicit `isolated-eval` run may write reports inside the dated
Notion eval root and, after the hierarchy is verified, send the complete Company
report to the configured owner Telegram route. It must never use production
Kamdar records or infer a recipient.

All three report levels use the same core sections: `Summary`, `Outcomes and
open attention`, `Problems and inefficiencies`, `Decisions`, `SOPs`, and
`Next-week priorities`. Each higher level summarizes and links its source
reports instead of copying their evidence verbatim.

In the current report schema and templates, the stored `Area` report level is
the Department rollup. Its `area` value must equal a seeded Project Department;
the automation must not invent another organizational layer.

## Todo List

- [ ] **0 — Prepare and review one complete Weekly result.**

  Load the current-week Project Drafts, related Projects, prior Reports, and
  destination records needed for dedupe. Read
  `automations/schemas/weekly-review-result.zod.mjs` and every destination
  template. Produce and validate one complete Weekly result before any Notion
  mutation. Write it to `weekly/review/weekly-review-result-YYYY-Www.json`.

  Give the exact result bytes, frozen context, destination templates, and
  `evals/rubrics/end-user-artifact-quality.md` to an independent read-only
  reviewer. Validate its response with
  `automations/schemas/artifact-quality-review.zod.mjs` and write
  `weekly/review/weekly-artifact-quality-review-YYYY-Www.json`. Require exact
  coverage of every report, disposition, Project replacement, and gap. Only
  tier A may proceed to Notion writes. Route B/C readability findings through
  `unslop`, regenerate, and review the new hash.

- [ ] **1 — Finalize Project Weekly Drafts and promote reviewed knowledge.**

  Read `workspace.hermes.md` and `skills/kamdar-company-os/SKILL.md` completely,
  including its Notion CLI contract. Before the first provider call, run
  `ntn --help`, `ntn datasources --help`, `ntn pages --help`, and
  `ntn api --help`; use only syntax confirmed there or in the skill contract.
  Never infer an `ntn` resource or argument shape. Then load every current-week
  Project Report with `report_status = Draft`, its
  related Project, and the destination records needed for dedupe. Read each
  full Report page and the complete Project, Issue, Decision, and Skill/SOP
  templates before judging promotion.

  | Use this Draft section | To do this | With this integration |
  | --- | --- | --- |
  | Complete Project Report Draft | Validate the shared report structure, set `report_status = Final`, increment `report_version`, set `finalized_at`, and preserve source links | `notion` skill via `ntn` on the exact Report |
  | `Problems and inefficiencies` | Promote an approved reusable problem into a source-linked Issue; keep weak, duplicate, or project-only findings in report history with their disposition | `notion` skill via `ntn` on the Work/Issue database |
  | `Decisions` | Promote an approved choice with rationale, authority, tradeoff, review trigger, Project relation, and source provenance | `notion` skill via `ntn` on the Decisions database |
  | `SOPs` | Promote an approved repeatable method with trigger, steps, output, owner, reuse proof, Project relation, and source provenance | `notion` skill via `ntn` on the Skills/SOP database |
  | `Next-week priorities` | Replace the related Project's complete `This week's attention` section for the new week | `notion` skill via `ntn` on `notion.projects` |

  Record one disposition for every candidate: `promoted`, `duplicate`,
  `project_only`, `monitor`, `dismissed`, or `blocked`. Missing authority,
  relation, destination URL, template, or dedupe evidence blocks promotion but
  does not block finalizing an otherwise valid Project report.

- [ ] **2 — Roll finalized Project reports into finalized Department reports.**

  Group only this week's Final Project reports by their Project's Department.
  For each Department, read the previous Department report and the complete
  current source reports,
  then create or replace one Report using `templates/area-operating-rollup.md`.
  Preserve the shared section structure, summarize cross-Project patterns, link
  every source Project report, and expose missing Project/Department relations as
  `configuration_gap`. Write through the `notion` skill via `ntn` to Reports.

  Record the Notion URL and finalized version for every Department report. A
  Department with expected active Projects but no Final Project report blocks
  the Company report; do not hide it by omitting the Department.

- [ ] **3 — Roll finalized Department reports into the Company report.**

  Read all Final Department reports for the week and the previous Company report.
  Create or replace one Company Report using
  `templates/company-operating-rollup.md`. Preserve the shared section
  structure, include only company-material patterns, link every Department report,
  set `report_status = Final`, increment `report_version`, and set
  `finalized_at`. Write through the `notion` skill via `ntn` to Reports.

  Do not finalize the Company report when an expected Department report is
  missing or non-Final. Report the gap instead.

- [ ] **4 — In explicit `isolated-eval`, deliver the actual Company report.**

  This step is forbidden in `prepare`. After all expected Project, Department,
  and Company records have been read back from Notion as Final, load the owner
  Person record and resolve its approved `telegram` route alias. Render
  `templates/executive-distribution.md` with:

  - the complete Company report Markdown, unchanged and not summarized;
  - the title and Notion URL of every source Department report; and
  - the final Company report URL and version.

  Send that rendered document to the configured owner Telegram route. If the
  provider requires multiple messages, split only at Markdown section
  boundaries, preserve order, and include `part N/M` in each envelope. Do not
  replace the report with a deployment status, test summary, or link-only
  notification. A provider-confirmed receipt for every part is required before
  delivery is `delivered`; otherwise record `partial` or `blocked` truthfully.
  Missing Telegram configuration does not permit email or another fallback.

## Output

- Final Project, Department, and Company Notion Report URLs
- Promotion dispositions and destination record URLs
- `weekly/review/weekly-review-result-YYYY-Www.json`
- `weekly/review/weekly-artifact-quality-review-YYYY-Www.json`
- One receipt containing source Report versions, integration outcomes, gaps,
  the final Company Report URL, owner route alias, and provider delivery receipts

Write boundary: create the plan and receipt before any Notion mutation. Only an
explicit `isolated-eval` run may perform the bounded Notion writes and final
owner Telegram delivery described above.
