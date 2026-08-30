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

Run one bounded sequence from private workspace reports. First, finalize every
current-week Project report and promote its reviewed knowledge. Second, roll finalized
Project reports into Department reports, then roll finalized Department reports
into one Company report. Read the private report root, Projects, and optional
destination URLs from `workspace.hermes.md`; never rescan raw Work or Meeting
pages.

## Authority

`workspace.hermes.md` is the active environment binding. It supplies the exact
Notion sources, write authority, and message routes for this run. Use only those
resources and stop when a required action is not authorized. Never infer a
destination or substitute another route.

All three report levels use the same core sections: `Summary`, `Outcomes and
open attention`, `Problems and inefficiencies`, `Decisions`, `SOPs`, and
`Next-week priorities`. Each higher level summarizes and links its source
reports instead of copying their evidence verbatim.

In the current report schema and templates, the stored `Area` report level is
the Department rollup. Its `area` value must equal a seeded Project Department;
the automation must not invent another organizational layer.

## Todo List

- [ ] **A — Load the contracts and bounded Weekly context.**

  - Read `workspace.hermes.md` completely for source routing and authority.
  - Before the first provider call, run `ntn --help`,
    `ntn datasources --help`, `ntn pages --help`, and `ntn api --help`. Use only
    syntax confirmed by the installed CLI.
  - Load every current-week private Project report with
    `report_status = Draft`, its related Project, prior reports, and the
    destination records needed for dedupe.
  - Read each full private report and the complete Project, Issue, Decision, and
    Skill/SOP templates. Do not read raw Work or Meeting pages.
  - Freeze the input as `weekly/context/weekly-context-YYYY-Www.json`.

  Never infer an `ntn` resource or argument shape.

- [ ] **B — Produce and validate one complete Weekly result.**

  - Read `schemas/automations/weekly_review_result.py` completely and run
    `python -m schemas.automations.validate schema weekly-review`.
  - Give the emitted JSON Schema, schema instructions, golden examples, frozen context, and every
    destination template to one structured extraction call.
  - Produce and validate one complete Weekly result before any workspace or
    provider mutation.
  - Write the exact result bytes to
    `weekly/review/weekly-review-result-YYYY-Www.json`.
  - Validate that file with `python -m schemas.automations.validate
    validate weekly-review <result-path>`.
  - Stop before integrations if validation fails.

- [ ] **C — Pass the end-user artifact quality gate.**

  - Give the exact result bytes, frozen context, destination templates, and
    `evals/rubrics/end-user-artifact-quality.md` to an independent read-only
    reviewer.
  - Validate its response with
    `schemas/automations/artifact_quality_review.py` using `python -m
    schemas.automations.validate validate artifact-quality-review
    <review-path>`.
  - Write `weekly/review/weekly-artifact-quality-review-YYYY-Www.json`.
  - Require exact coverage of every report, disposition, Project replacement,
    and gap.
  - Proceed to workspace or provider writes only for tier A.
  - For B/C readability findings, run `unslop`, regenerate the result, and
    review the new hash.

- [ ] **1 — Finalize Project Weekly Drafts and promote reviewed knowledge.**

  | Source | Action | Destination |
  | --- | --- | --- |
  | Complete private Project report | Finalize the exact report using the rules below | Exact `weeks/<week>/reports/project--<id>.md` path |
  | `Problems and inefficiencies` | Promote each qualifying problem or record its disposition | `notion` skill via `ntn` on the existing Work/Issue database |
  | `Decisions` | Promote each qualifying reusable Decision or record its disposition | `notion` skill via `ntn` on the Decisions database |
  | `SOPs` | Promote each qualifying approved employee workflow or record its disposition | `notion` skill via `ntn` on the existing SOPs database |
  | `Next-week priorities` + evidenced open-Work rows | Replace the related Project's complete `This week's attention` section with one merged open-work checklist for the new week | Configured provider on `projects` |

  Apply these rules in order:

  1. Validate the shared Project Report structure. Set `report_status = Final`,
     increment `report_version`, set `finalized_at`, and preserve source links.
  2. Promote a recurring or materially costly problem only when the Issue
     preserves the affected workflow or step, dated Before baseline, cost
     calculation or explicit measurement gap, confidence, measurement owner,
     and next test. Keep weaker findings in report history with their
     disposition.
  3. Keep routine execution choices in the Project report. Promote only a
     reusable customer-handling precedent, Project operating standard, monetary
     commitment, material risk or compliance choice, recurring cross-team
     tradeoff, or costly-to-reverse choice. Compare 2–3 real options in the
     style of `advise`; preserve the selected option, rationale, authority,
     accepted tradeoff, consequences, review trigger, Project relation, and
     provenance.
  4. Promote an approved employee workflow with `templates/sop.md`. Preserve
     its trigger, actors, ordered steps, systems, handoffs, timing or volume
     baseline, exceptions, output, owner, reuse proof, Project relation, and
     source provenance. Never use the Farplane `skill.md` registry card.
  5. Build the related Project's new-week `This week's attention` from accepted
     `Next-week priorities` plus open-Work rows already evidenced in the
     finalized Project report. Preserve stable Work IDs and current owners,
     states, due/review conditions, expected artifacts, and evidence. Do not
     rescan raw Work. Do not copy completed or cancelled Work into the new open
     view, and never delete it from canonical Work or finalized report history.
  6. Do not create the next accumulating report during Weekly. The first Daily
     run of the new week initializes it from the bounded live Work context and
     the canonical carry-forward checklist. New Meeting-created Work joins the
     same view through Daily reconciliation.

  A human response that arrives after finalization updates live Work or
  documentation-review state and appears in the next accumulating report. Do
  not reopen or rewrite finalized Project, Department, or Company reports.

  Record one disposition for every candidate: `promoted`, `duplicate`,
  `project_only`, `monitor`, `dismissed`, or `blocked`. Missing authority,
  relation, destination URL, template, or dedupe evidence blocks promotion but
  does not block finalizing an otherwise valid Project report.

  A report sentence is not automatically a Decision candidate. First ask what
  future manager, customer-service owner, or Project lead would reuse. If the
  answer is only “what this team will do next,” mark it `project_only`. Monetary
  materiality may be an amount, exposure, budget boundary, or an explicit
  measurement gap with an owner; never invent a value.

  Reports hold weekly findings and provide the management view. The SOP record
  is the canonical employee-workflow baseline. The Issue is the canonical
  problem and economics baseline linked to the affected workflow step. Do not
  create a separate Problems database.

- [ ] **2 — Roll finalized Project reports into finalized Department reports.**

  For each Department:

  - Group only this week's Final Project reports by their Project's Department.
  - Read the previous Department report and the complete current source reports.
  - Create or replace one Report using
    `templates/area-operating-rollup.md` in the private weekly workspace.
  - Preserve the shared section structure, summarize cross-Project patterns,
    and link every source Project report.
  - Record missing Project or Department relations as `configuration_gap`.
  - Write the finalized rollup under the exact private weekly report root;
    optional publication remains a separately authorized mapped effect.

  Record the private report locator and finalized version for every Department
  report, plus an optional provider URL only when publication succeeds. A
  Department with expected active Projects but no Final Project report blocks
  the Company report; do not hide it by omitting the Department.

- [ ] **3 — Roll finalized Department reports into the Company report.**

  - Read all Final Department reports for the week and the previous Company
    report.
  - Create or replace one Company Report using
    `templates/company-operating-rollup.md` in the private weekly workspace.
  - Preserve the shared section structure.
  - Include only company-material patterns and link every Department report.
  - Set `report_status = Final`, increment `report_version`, and set
    `finalized_at`.
  - Write the finalized Company report under the exact private weekly report
    root; optional publication remains a separately authorized mapped effect.

  Do not finalize the Company report when an expected Department report is
  missing or non-Final. Report the gap instead.

- [ ] **4 — Deliver the actual Company report.**

  After all expected Project, Department, and Company files have been read back
  from the private weekly workspace as Final:

  - Load the owner Person record and resolve its approved Telegram route through
    the active environment binding.
  - Run `kamdar send --help`.
  - Render `templates/executive-distribution.md` with the complete Company
  report Markdown, unchanged and not summarized; the title and private locator
  of every source Department report; and the final Company report locator and
  version. Include provider URLs only for reports that were separately
  published successfully.
  - Send the rendered document through the approved route.

  If the provider requires multiple messages, split only at Markdown section
  boundaries, preserve order, and include `part N/M` in each envelope. Do not
  replace the report with a deployment status, test summary, or link-only
  notification. A provider-confirmed receipt for every part is required before
  delivery is `delivered`; otherwise record `partial` or `blocked` truthfully.
  A missing or unauthorized Telegram route blocks delivery; it does not permit
  email or another fallback.

## Output

- Final Project, Department, and Company private report locators, plus optional
  provider URLs for successful publication effects
- Promotion dispositions and destination record URLs
- `weekly/context/weekly-context-YYYY-Www.json`
- `weekly/review/weekly-review-result-YYYY-Www.json`
- `weekly/review/weekly-artifact-quality-review-YYYY-Www.json`
- `weekly/receipts/weekly-integration-receipt-YYYY-Www.json`, containing source
  report versions, integration outcomes, gaps, the final Company report
  locator and optional provider URL, approved Telegram route, and provider
  delivery receipts

Write the validated Weekly result before any workspace or provider mutation.
Record each integration outcome in the receipt as it settles. Before any
provider write,
prove that the active environment binding authorizes the exact target and
action. Otherwise record `blocked` and stop that effect.
