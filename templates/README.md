# Kamdar record templates

This directory is the reviewed Kamdar configuration source for record and
report shape. Templates retain a stable `template_id` and `template_version`.
Notion-backed record templates define their actual database fields directly in
frontmatter; the document body is only the page content. Run artifacts retain
only their stable template marker because their operational fields belong in
the artifact body.

## Notion ownership rule

| Template source | Notion destination | May appear in the other surface? |
| --- | --- | --- |
| YAML frontmatter (`owner`, `status`, dates, routing, IDs) | Database properties | No. The body may link an ID as evidence, but must not restate the metadata block. |
| Markdown below frontmatter (`## Overview`, `## Notes`, report sections) | Free-form page body | No. Never serialize these sections into rich-text database properties. |
| Provider-only controls (`Run key`, processing version) | Database properties | No. These are operational state, not narrative content. |

Every seeded record stores one complete Markdown body whose ordered `##`
headings exactly match its named template. The seeder writes that body
unchanged; it does not reconstruct page content from a second section schema.
The validator rejects empty sections, template placeholders, frontmatter, or a
duplicated page title in the body. The tracked 39-name scrape remains
capture provenance; only Projects with an explicit feature or control role are
instantiated in the evaluation workspace.

## Inventory and lifecycle

| Lifecycle | Templates | Current consumer |
| --- | --- | --- |
| Active records | `project.md`, `person.md`, `task.md`, `feature.md`, `issue.md`, `meeting.md`, `decision.md`, `skill.md`, `sop.md` | Notion record creation, review, and Weekly promotion. |
| Active private memory | `project-week-notes.md`, `employee-memory.md` | Daily short-term append/freeze and Weekly long-term Employee Memory. |
| Active reports | `weekly-report.md`, `area-operating-rollup.md`, `company-operating-rollup.md` | Weekly projections; these three use Markdown-to-Pydantic synchronization. |
| Active outbound | `documentation-request.md`, `employee-followups.md`, `executive-distribution.md` | Daily Pydantic descriptions source documentation and progress messages from Markdown; Weekly renders owner distribution. |
| Reviewed safety format | `automation-receipt.md` | Current Daily and Weekly execution receipts are primarily Pydantic-validated JSON; this template remains the reviewed Markdown format where one is required. |

`task.md`, `feature.md`, `issue.md`, and `meeting.md` share one Work data model
but deliberately guide different thought: ordinary work, a bounded value
opportunity, a problem to diagnose, and a discussion whose commitments must be
captured. `person.md` is the machine-readable directory contract: routing and
expertise remain frontmatter so an agent can select the right person before it
reads freeform notes. Private cross-week delivery evidence belongs in
`employee-memory.md`, never the public/shared Person record. The active Daily automation writes documentation requests
and progress chases through its schema-validated result. Their wording and
examples come from the two Markdown templates; Pydantic continues to own IDs,
routing fields, verdicts, and deduplication keys.
`skill.md` is a thin registry card for promoted Farplane software capabilities;
the full executable workflow, golden nodes, and evals belong with the source
`SKILL.md`, not in the Notion record. `sop.md` is the canonical employee workflow
record installed into the existing SOPs database. It preserves the observed
ordered method, timing and volume baseline, exceptions, controls, and
Before/After verification. Material problems remain Issue records in the
existing Work data model and link to the affected SOP and workflow step; there
is intentionally no separate Problems database.

Record and message templates do not begin with generic `Outcome` and `Why`
callouts. A Project holds its durable memory, proprietary project knowledge,
and linked Work, Decisions, Reports, and relevant Skills views. The private
`project-week-notes.md` file is short-term operating memory: Daily appends
source-linked observations to one file per Project and week; Weekly freezes the
complete all-Project set before producing official reports, Employee Memory,
and SOP updates. It is not a second public Project record or employee
scorecard. A separate Docs/Research record type remains deferred until
cross-project reuse proves it needs an independent lifecycle.

The setup skill installs this whole directory into the Hermes workspace as
`workspace/templates/`. `workspace.hermes.md` routes real Notion sources and
record types to these filenames. `python3 scripts/sync_report_templates.py`
hash-binds every template into `schemas/automations/template_catalog.py`; report
templates additionally compile into their generated Pydantic report modules.
