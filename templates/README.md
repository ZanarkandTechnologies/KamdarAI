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

`task.md`, `feature.md`, `issue.md`, and `meeting.md` share one Work data model
but deliberately guide different thought: ordinary work, a bounded value
opportunity, a problem to diagnose, and a discussion whose commitments must be
captured. `person.md` is the machine-readable directory contract: routing and
expertise remain frontmatter so an agent can select the right person before it
reads freeform notes. `area-operating-rollup.md`,
`company-operating-rollup.md`, and the Daily output templates are Kamdar-owned
derived templates. `documentation-request.md`, `knowledge-candidates.md`, and
`executive-distribution.md` remain legacy/showcase artifacts only. The active
Daily automation writes documentation requests and current-week report content
directly through its schema-validated result.
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
and linked Work, Decisions, Reports, and relevant Skills views; a Daily run
does not create a second Project-memory file. A separate Docs/Research record
type is deliberately deferred until cross-project reuse proves it needs an
independent lifecycle. Automation specifications may retain `Outcome` and
`Why` where those headings explain a workflow rather than a record.

The setup skill installs this whole directory into the Hermes workspace as
`workspace/templates/`. `workspace.hermes.md` routes real Notion sources and
record types to these filenames.
