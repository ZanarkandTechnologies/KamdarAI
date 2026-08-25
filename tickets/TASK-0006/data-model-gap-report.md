---
ticket_id: TASK-0006
kind: gap-report
status: proposed
created_at: 2026-08-21
updated_at: 2026-08-21
target_surfaces:
  - templates
  - notion-data-model
  - feature-docs
  - eval-contract
  - scenario-overlay
---

# Data model, template, and feature-proof gap report

## Target

Make the demo behave like a real Company OS: each Notion record has a useful,
type-specific shape; Project memory lives on the Project; related records are
actually related; communications ask concrete questions; and the eval UI can
render each feature's documented flow beside the assertions that prove it.

```text
company_os(records, relations, automation_window)
  -> in_place_record_changes + deliberate_artifacts
     + provider_receipts + feature_owned_proof
```

## Current contract

- Project, Task, Decision, Resource, Skill, and Documentation Request templates
  reuse generic `Outcome` and `Why` blocks.
- FEAT-0001 writes one `daily/projects/<project>-<date>.md` file, then creates a
  linked child page below the Project instead of updating the Project entry.
- v4 has separate Decisions and Resources databases, but their Project fields
  are plain text. Work and Reports also use text fields, so these records are
  not relationally connected to Projects.
- Project pages contain prose placeholders for Decisions, Resources, Work, and
  Reports rather than filtered linked views.
- Feature docs have different section shapes and each carries an ASCII
  signature, but no required `Flow`, `State changes`, or `Proof contract`
  sections.
- Eval assertions already carry `feature_id`, and the feature registry already
  maps each ID to a feature doc. The UI links the doc but does not render it.

## Gaps

| Area | Status | Severity | Evidence | Fix owner |
| --- | --- | --- | --- | --- |
| Generic template openings | overbroad | important | `Outcome/Why` appears in Project, Task, Decision, Resource, Skill, and Documentation Request regardless of record purpose | individual record templates |
| Work types share one body | misplaced | important | Task, Issue, and Meeting all use `templates/task.md` despite different questions and evidence | `task.md`, new `issue.md`, new `meeting.md` |
| Project memory is a duplicate artifact | misplaced | blocker | FEAT-0001 creates Daily Markdown and the live edge creates a child evidence page | FEAT-0001 + Project mutation contract |
| Project relationships are text | missing | blocker | v4 databases define `Project` as rich text and create no relation properties | Notion seed/provisioning edge |
| Project page lacks connected tables | missing | important | template contains comments, not linked Work/Decision/Resource/Report views | Project template + Notion views |
| Mock scenario is generic | weak | important | generated rows use labels such as `Project owner`, `Pilot owner`, and `Inspect linked Work` | private scenario overlay |
| Chase comments lack a full answer contract | weak | important | current call detail asks for state/blocker/cause/date/variance but does not render a specific mention, known facts, questions, or update location | FEAT-0002/0003 comment contract |
| Feature documentation is inconsistent | weak | important | feature pages have different section headings and proof detail | all `docs/features/FEAT-*.md` |
| Eval duplicates feature presentation | ambiguous | important | registry stores title/summary/doc while UI separately hardcodes presentation | `evals/evals.json` + showcase renderer |
| Project state change has no structured assertion | missing | blocker | eval schema has only `files` and `behavior`; FEAT-0001 is proved through a file | eval schema + mock Notion state |

## Recommended record templates

Generic `Outcome` and `Why` callouts should not be a template convention. Use
the questions natural to each record:

| Record | Opening fields / sections | Main body |
| --- | --- | --- |
| Project | Objective, owner, department, status, health, progress, current context, next action | success measures; risks/blockers; filtered Work, Decisions, Resources, Reports views |
| Task | Definition of done, status, owner, due date, priority | latest update; next action; effort/cost; evidence; resolution |
| Issue | Problem, impact, owner, severity, state | observed facts; suspected cause/confidence; containment; resolution; evidence |
| Meeting | Purpose, date, attendees | agenda; notes; decisions; commitments with owners/dates; source links |
| Decision | Decision in force, status, approver, decided date | context; options; rationale; consequences; applies to; evidence |
| Resource | Summary, type, owner, quality, reviewed date | use when; source/provenance; limitations; related Projects/Decisions/Skills |
| Skill / SOP | Trigger, owner, review state | inputs; procedure; outputs; exceptions; evidence; authority |
| Documentation request | Responsible person and exact missing fields | known context; required update; where to update; why the field is needed; source; receipt |
| Employee follow-up | Recipient and grouped Work | known facts per item; numbered questions; requested response date; links; delivery receipt |

Automation Markdown may still use `Outcome` and `Why` when those headings help
explain the workflow. The change is specific to record and message templates.

## Project as the memory surface

FEAT-0001 should update the canonical Project entry directly:

```text
daily_project_memory(project, changed_work[], meetings[])
  -> Project{
       status,
       health,
       progress,
       current_context,
       next_action,
       blockers,
       last_meaningful_update
     }
     + linked_task_proposals[]
     + mutation_receipt
```

There is no `daily/projects/*.md` product artifact and no `Daily memory` child
page. The eval shows a Project before/after diff and the real Notion receipt.
Daily history belongs in automation receipts and Notion edit history; Weekly
reports are the durable interval summaries.

## Relational Project page

```text
Projects
  ├─ Work.Project       → Projects
  ├─ Decisions.Projects → Projects
  ├─ Resources.Projects → Projects
  ├─ Reports.Project    → Projects
  └─ Skills.Projects    → Projects (when relevant)

Project page
  ├─ current properties and context
  ├─ linked Work view filtered to this Project
  ├─ linked Decisions view filtered to this Project
  ├─ linked Resources view filtered to this Project
  └─ linked Reports view filtered to this Project
```

Notion supports relation properties between data sources. Current official
Notion documentation also exposes linked database views through the Views API;
the implementation must use a supported API/version or create the views once in
the Notion app and then verify them. Relation values—not matching text—are the
proof that a record belongs to a Project.

## Detailed owner-action comments

Progress and documentation requests should share one Work-level comment when
the same record is both stale and incomplete:

```text
@Responsible person — action needed on {Work name}

What the record currently says
- status, owner, due date, last meaningful update
- planned/actual hours and MYR cost when sourced
- blocker and suspected cause with confidence
- fields or evidence still missing

Please reply with
1. work completed since the last update
2. current blocker and who owns it
3. evidence for the cause or result
4. revised hours/cost when the plan changed
5. revised completion date and next action

Update: {exact properties or page sections}
Source: {Work URL}
Requested by: {date/time and automation receipt}
```

The eval must inspect a real rich-text user mention, the known facts, numbered
questions, update location, source URL, and idempotency key. Plain `@Name` text
does not pass. FEAT-0002 owns missing-field precision; FEAT-0003 owns stale
context, routing, grouping, and delivery. Both may assert different parts of
the same comment without duplicating the comment.

## Feature docs as the UI source

Every feature page should use the same required sections:

```text
# Feature name
one plain-language paragraph

## Why it exists
## Trigger and inputs
## Flow
ASCII flow owned by this feature
## State changes and artifacts
## Downstream application
## Failure modes
## Proof contract
## Example
```

No second shared identifier is needed:

```text
assertion.feature_id
       │
       ▼
evals.features[feature_id].doc
       │
       ├─ render feature explanation and ASCII Flow
       └─ group record, file, behavior, and receipt assertions below it
```

The feature Markdown owns the explanation. `evals.json` owns executable proof,
not duplicate buyer prose. The registry keeps only the ID, stable key, doc path,
and source-link IDs required for resolution.

## Eval shape

The smallest required schema extension is one `records` assertion group:

```json
{
  "id": "project-current-context-updated",
  "feature_id": "FEAT-0001",
  "target": {"database": "projects", "record_id": "PROJECT-KEY"},
  "event": "updated",
  "changes": {
    "current_context": "contains sourced material changes",
    "next_action": "present",
    "last_meaningful_update": "equals frozen clock"
  }
}
```

The UI groups four proof types below the rendered feature doc:

```text
Record changes · Files · Behavior · Applications/receipts
```

FEAT-0001 therefore shows a Project record diff, not a fake file. FEAT-0005
still shows report files because reports are deliberate artifacts.

## Realism contract for the scenario overlay

Every synthetic record must be specific enough to explain an action:

- named Project, department, responsible role, and relationship IDs;
- concrete Work name, state, due date, last update, and next action;
- sourced planned/actual hours and MYR basis when cost is shown;
- observed facts separated from suspected cause and confidence;
- specific missing property, evidence, or decision;
- source links or an explicit source gap;
- realistic Meeting notes with named commitments, dates, Decisions, Resources,
  and SOP signals;
- healthy controls that receive no mutation or message.

Labels such as `Project owner`, `Pilot owner`, `Updated by automation`, and
`Inspect linked Work` fail the realism contract.

## Verification

- Template registry rejects generic `opens_with: [outcome, why]` where the
  record contract does not define those concepts.
- Project-memory run creates zero `daily/projects/*.md` files and updates the
  expected Project fields exactly once.
- Relations resolve to actual page IDs; linked Project views show only related
  records.
- Detailed comments contain the verified mention and all required context.
- Every feature doc contains the required sections and one ASCII Flow.
- Every assertion `feature_id` resolves to exactly one feature doc, and the UI
  renders that doc before the grouped proof rows.
- Scenario realism checks reject placeholder owners/actions and unsupported
  financial or causal claims.

## Grounding

- Local templates, feature docs, eval schema, runner, live Notion edge, system
  spec, and v4 contract were inspected.
- Official Notion references:
  [data source relations](https://developers.notion.com/reference/property-object),
  [page relation values](https://developers.notion.com/reference/page-property-values),
  and [linked database views](https://developers.notion.com/guides/data-apis/working-with-views).
