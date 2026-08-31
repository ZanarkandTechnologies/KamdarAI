---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0019
thread_id: "01a04c05-95d7-75c3-85ad-b6e94144d919"
title: Make Project Notes the Daily memory and Weekly projection source
status: in_progress
claimed_by: null
created_at: 2026-08-28T08:20:25Z
updated_at: 2026-08-31T00:00:00Z
depends_on: []
ui_scope: false
feature_refs: [FEAT-0001, FEAT-0002, FEAT-0003, FEAT-0004, FEAT-0005, FEAT-0006, FEAT-0007, FEAT-0011]
---

# TASK-0019: Make Project Notes the Daily memory and Weekly projection source

## Summary

Use one structured, append-only Project Notes file per active Project and week
as the only Daily-owned memory. Weekly reads every Project Notes file for the
week, freezes the set, and projects it into official Project, Department, and
Company reports plus targeted Employee Memory, Decision, Issue, and SOP updates.

This is a file workflow, not an event platform. Daily appends short notes under
known Markdown sections. Weekly groups those notes by stable Project, Person,
Work, and workflow keys. Completed notes stay archived as evidence; unresolved
items are copied into the next week's notes.

The Markdown-to-Pydantic report sync, Project Notes writer, Daily contract,
Weekly map/reduce, entity templates, and offline proof are implemented. The
remaining deployment gate is separately authorized provider integration proof
against the client's configured private destinations.

## Scope

- **In:** one weekly Project Notes file per active Project; append-only Daily
  notes; stable source keys; structured sections; one complete Weekly read of
  all Project Notes; Project/Department/Company reports; cross-Project Employee
  Memory; cross-Project workflow/SOP samples; Decision and Issue promotion;
  carry-forward; archive; optional artifact-sync bindings; conflict-safe targeted
  provider mirrors; local-first reports and entity memory;
  template-to-Pydantic drift checks; offline eval proof.
- **Out:** an event database, queue, stream processor, metrics warehouse,
  separate Daily employee/SOP files, Daily edits to People or SOP records,
  rescanning raw Work during Weekly, automatic employee ratings, personality or
  intent inference, inferred effort, automatic SOP baseline replacement,
  public intermediate state, provider-owned canonical memory, bidirectional
  memory synchronization, or a second schema runtime.
- **Migration:** replace the current shared Draft writer with one Project Notes
  writer. Convert an existing active Draft once when its source keys can be
  preserved; otherwise block with a repair message. Do not run dual writers or
  keep a compatibility alias.

## Delta

> **Before:** Daily source-key upserts mutate a current Weekly Draft. Weekly
> consumes Project Draft reports, but it has no Employee Memory result, no
> cross-Project workflow reducer, and no clean short-term/persistent boundary.
>
> **After:** Daily only appends source-linked notes to each Project's weekly
> file. Weekly freezes all Project Notes, validates one complete result, and
> routes each note to the report or persistent entity that owns it.
>
> **Example:** Aisha's TASK-101 note in Project A and TASK-204 note in Project B
> both update `PERSON-AISHA` during Weekly. Workflow samples from both Projects
> update the same SOP only when they share an explicit `workflow_key`.

### Local canonical memory and optional sync

Short-term memory and long-term memory are lifecycles inside the same private
runtime workspace, not separate storage providers:

```text
Daily -> weeks/<week>/project-notes/        short-term memory
Weekly -> memory/{employees,sops,...}/      long-term memory
Weekly -> weeks/<week>/reports/             finalized local reports
```

Local writes always occur. A complete `artifact + provider + destination`
binding adds a one-way provider copy after its owning local write reads back.
An absent binding means local-only. A partial binding is invalid. Provider
copies never become canonical and provider edits never flow back into memory.
The provider receives the completed canonical local Markdown, not a separately
regenerated artifact from the incremental extraction payload.
The supported artifact roles are `short-term memory`, `long-term memory`, and
`reports`; there is no separate enabled/default column.

Memory destinations must be operator-approved private locations. Reports may
target a management dashboard. Work-item progress and documentation comments
remain bounded source-record actions rather than memory synchronization.
The shipped Kamdar configuration leaves artifact sync and owner communications
empty: local-only is the default. Documentation questions and progress chases
map to exact linked Work comments. A configured employee-follow-up route may
override chase comments, but the system never infers a recipient or generic
fallback channel.

## Contract Diagram

```text
Projects + Work + Meetings + artifact links
                    |
             Daily extraction
                    |
       append to Project Notes by section
                    |
 weeks/YYYY-Www/project-notes/project--<id>.md
                    |
       Weekly reads and freezes every file
                    |
        +-----------+-----------+-------------+
        |           |           |             |
    project_id  employee_id  workflow_key  candidate kind
        |           |           |             |
 Project reports Employee   SOP record   Decision / Issue
        |         Memory       update       promotion
        v
 Department reports -> Company report -> approved outbound
```

## Data contracts

### Project Notes file

```text
frontmatter: project_id, week, note_version, last_appended_at, source_note_keys

sections:
  Work and employee updates
  Completed outcomes and artifacts
  Documentation questions
  Problems and inefficiencies
  Decisions
  Workflow and SOP signals
  Carry-forward items
```

The file itself stays append-only. Week state lives in hidden runtime metadata:

```text
no freeze manifest                       = accumulating
atomic freeze manifest with file hashes  = frozen
validated consolidation receipt          = consolidated
```

Daily may append only when no freeze manifest exists. Weekly never rewrites
note content.

Each Daily note carries:

```text
note_key, observation_kind, observed_at, source_updated_at, source_revision,
project_id, section, source_ids, work_id?, employee_ids[], workflow_key?,
structured_payload, markdown
```

The deterministic applier derives `note_key` from `project_id`, `section`,
`observation_kind`, primary source ID, and `source_revision`; the model does not
invent it. An exact duplicate is a no-op. Different content under the same key
is a conflict. This does not create a new event-store abstraction.

`source_revision` is the provider's stable revision when available; otherwise
it is the SHA-256 of the normalized collected source record. It is an identity,
not a sortable timestamp.

`work_snapshot` and `documentation_question` notes contain complete current
state, not partial patches. Weekly groups them by `work_id` and selects the
greatest `source_updated_at`. Multiple snapshots at that timestamp must have the
same normalized payload; otherwise consolidation conflicts. `source_revision`
and `note_key` make ordering reproducible but never break a semantic tie.
Outcomes, Problems, Decisions, and workflow samples remain immutable
observations rather than latest-state rows.

Carry-forward uses the newest complete Work and documentation-question
snapshots. Carry forward when Work is not Done/Cancelled, a documentation
question is open, or an expected artifact is not accepted. A sufficient,
accepted completed outcome does not carry forward.

### Persistent entity records

| Entity | Persistent section | Replaceable weekly section | Match key |
| --- | --- | --- | --- |
| Employee Memory | Durable accepted outcomes | Latest weekly evidence across Projects | `person_id` |
| SOP Memory | Approved workflow and reviewed baseline | Latest weekly samples across Projects | `workflow_key` |
| Decision Memory | Accepted choice, authority, tradeoff, review trigger | None | destination dedupe key |
| Issue Memory | Problem, economics, intervention, evidence | None | destination dedupe key |

These records live under the private runtime `memory/` directory and are
Weekly-only. Daily never loads or edits them. Weekly loads a lightweight ID/key
index, then fetches full records only for employees and workflows referenced by
that week's Project Notes. Public People records remain directory sources and
never receive Employee Memory.

### Weekly freeze protocol

All Daily and Weekly note operations use one exclusive lock scoped to the week.
Daily holds it only while preflighting and atomically replacing one Project
file. A multi-Project Daily result applies per Project and records each outcome;
one Project conflict does not roll back another Project's successful append.
The related Work is processable only when its owning Project append succeeds.

Weekly acquires the same lock, verifies expected Project coverage, validates all
notes, hashes every Project file, and atomically writes one immutable freeze
manifest. It then releases the lock. Daily refuses further appends for that
week. Every Weekly retry must match the manifest paths and hashes. This avoids a
multi-file transaction and prevents Daily from writing into a mixed snapshot.

### Employee Memory update schema

```text
person_id, week, source_project_ids[], source_work_ids[], source_note_keys[],
expected_record_version, expected_persistent_text_sha256,
persistent_observations[], latest_weekly_evidence_markdown,
disposition: update | no_change | blocked, gaps[]

persistent observation:
  observation_key = person_id + work_id
  project_id, work_id, accepted_outcome, accepted_artifact_ids[],
  elapsed_hours?, documentation_state, accepted_at, evidence_refs[]
```

Only accepted completed outcomes enter persistent observations. Open, blocked,
stale, or documentation-pending Work appears only in the replaceable latest
weekly section. Duplicate `observation_key`s do not create another persistent
row. The renderer must include every source Project and Work ID.

### SOP update schema and baseline policy

```text
workflow_key, sop_id?, week, source_project_ids[], source_work_ids[],
source_note_keys[], expected_record_version, expected_baseline_version,
samples[], candidate_timing?, latest_weekly_samples_markdown,
disposition: samples_only | baseline_proposed | no_change | blocked, gaps[]

sample identity = workflow_key + work_id
sample fields = project_id, work_id, output_artifact_type, elapsed_hours?,
                active_hours?, wait_hours?, accepted_at, evidence_refs[]
```

Samples are comparable only when `workflow_key` and `output_artifact_type`
match, the Work outcome and artifact are accepted, documentation is sufficient,
and elapsed time is sourced. The first slice never changes a canonical baseline
automatically. With at least three comparable samples across at least two
Projects, Weekly may propose the arithmetic mean plus min/max and evidence
window. The SOP owner must approve it; until then the prior baseline and version
remain unchanged. Fewer or incomplete samples are retained as `samples_only`.

### Current-Draft migration

| Old surface | New surface | Requirement |
| --- | --- | --- |
| `PM attention` keyed block | `Work and employee updates` note | Exact Project ID and source ID recoverable |
| `Problems and inefficiencies` keyed block | matching notes section | Exact Project ID and source ID recoverable |
| `Decisions` keyed block | matching notes section | Exact Project ID and source ID recoverable |
| `SOPs` keyed block | `Workflow and SOP signals` note | Exact Project ID, source ID, and workflow identity recoverable |

The converter accepts only source-keyed blocks, derives a `legacy:` note key
from the preserved old key, and writes all new Project files into one sibling
staging directory on the same filesystem. The final Project Notes directory
must not already exist. After every staged file and the migration manifest
validate, one atomic directory rename publishes the complete set.
It rejects unkeyed non-placeholder content, ambiguous/missing Project identity,
key collisions, or missing source identity. Only after every output validates
does it publish the directory. On failure the staging directory is not visible
to the writer, the old Draft remains unchanged, no new writer starts, and
hidden runtime state records the exact blocked block/key and repair action.

## Reused foundations

- `DailyContextDiffSchema` already supplies bounded Projects, Work, Meetings,
  and People with stable relations.
- `DailyReviewResultSchema` supplies the single structured extraction now bound
  to the complete Project Notes contract.
- `scripts/project_week_notes.py` already proves mode-0600 atomic writes,
  source-key idempotency, and conflicts. Reuse those mechanics while changing
  mutable upserts into append-only Project-scoped notes.
- `WeeklyContextSchema` forbids raw Work/Meeting input and now consumes the
  frozen Project Notes set.
- `WeeklyReviewResultSchema` produces report rollups, promotion dispositions,
  cross-Project Employee Memory updates, and cross-Project SOP sample merges.
- `templates/person.md` remains a public directory card;
  `templates/employee-memory.md` owns private employee evidence;
  `templates/sop.md` separates the approved baseline from Weekly samples.
- `python3 scripts/sync_report_templates.py` and its Pydantic drift checks are implemented and remain the
  report-template authoring path; do not rebuild them.

## Lean verdict

```yaml
target: Daily memory and Weekly entity rollups
current_need: preserve daily changes and roll them up across Projects
rung: reuse_local
evidence:
  - current writer already owns atomic private Markdown and source-key idempotency
  - Daily and Weekly already use Pydantic contracts and filesystem evals
  - the Stage 2 planner already owns typed local actions, provider actions, idempotency, and read-back
smallest_next_action: add one typed optional artifact-sync table and make local actions prerequisites of provider copies
proof_preserved: conflict handling, frozen Weekly input, exact source IDs, tier-A artifact review, provider read-back, and offline evals remain required
review_route: review:implementation-plan
```

## Change Plan

### 1. Replace the shared Draft template and writer

- **Files:** `templates/current-weekly-draft.md` →
  `templates/project-week-notes.md`, `scripts/project_week_notes.py`, template
  registry, and distribution allowlist.
- **Operation:** define the seven sections above; create one mode-0600 file per
  Project/week; append complete note blocks by `note_key`; allow only metadata
  freeze/consolidation manifests during Weekly; add the bounded one-time Draft
  conversion and week-scoped exclusive lock.
- **Assertion:** two Projects receive separate notes; exact rerun changes no
  bytes; conflicting key changes no bytes; a frozen week rejects Daily append;
  ambiguous legacy content blocks without changing the old Draft.
- **Failure boundary:** preserve the original file and return a repair message;
  never partially convert or append.

### 2. Make Daily produce Project Notes entries

- **Files:** `schemas/automations/daily_review_result.py`,
  `automations/daily-operating-update.md`, Daily fixtures and integration receipt.
- **Operation:** replace Draft-oriented knowledge output with validated
  `project_note_entries`; route progress, completed outcomes, documentation
  questions, problems, decisions, and workflow signals to one section. Require
  complete Work/question snapshots, stable source revision/time and IDs,
  employee IDs where applicable, and `workflow_key` only for explicitly
  comparable work. Apply a multi-Project result per Project, not as a false
  cross-file transaction.
- **Assertion:** one Daily result can append notes to multiple Projects; no note
  contains an employee rating, inferred intent/personality, or unsourced effort.
- **Failure boundary:** invalid or conflicted notes leave that Project file
  unchanged; other per-Project outcomes remain independently valid. Only Work
  whose owning Project append succeeded may advance processing.

### 3. Build Weekly context from all Project Notes

- **Files:** `schemas/automations/weekly_context.py`, Weekly context builder,
  `automations/weekly-operating-review.md`, Weekly fixtures.
- **Operation:** enumerate every expected active Project's notes under
  `weeks/<week>/project-notes/`; validate coverage and source-key uniqueness;
  acquire the week lock and atomically freeze one path/hash manifest; include
  prior reports plus lightweight Person and SOP indexes; load full matching
  entity records only for referenced keys.
- **Assertion:** a missing active Project file blocks Company finalization; raw
  Work and Meetings remain forbidden; unrelated Person/SOP bodies are absent.
- **Failure boundary:** failed collection leaves accumulating files untouched;
  failed extraction leaves the complete set frozen and retryable.

### 4. Add cross-Project Weekly reducers

- **Files:** `schemas/automations/weekly_review_result.py`,
  `templates/employee-memory.md`, `templates/sop.md`, generated/hand-authored schema
  contracts and fixtures.
- **Operation:** add `employee_memory_updates[]` grouped by `person_id` and
  `sop_updates[]` grouped by `workflow_key`. Employee Memory updates contain a durable,
  source-linked memory addition plus one replaceable latest-week summary. SOP
  updates retain samples from multiple Projects, preserve the prior baseline,
  and follow the schemas and no-auto-baseline policy above. Make Project
  relations explicitly multi-valued and include expected destination versions
  or hashes plus a disposition for every referenced entity.
- **Assertion:** one employee and one workflow each roll up evidence from at
  least two Projects without duplicate Work; one sample cannot establish or
  replace a baseline; three comparable samples across two Projects produce only
  an approval-gated candidate baseline.
- **Failure boundary:** an unknown Person, ambiguous workflow key, conflicting
  current version, or missing authority blocks only that entity update and is
  visible in the reviewed Weekly result.

### 5. Apply validated outputs in dependency order

- **Files:** Weekly applier/reference automation, provider adapter calls,
  `schemas/workspace.py`, `workspace.hermes.md` bindings, integration receipt
  schema.
- **Operation:** validate the full Weekly result and artifact-quality review
  before writes; then write short-term memory, long-term
  Employee/SOP/Decision/Issue memory, and finalized reports locally. Parse the
  optional `short-term memory`, `long-term memory`, and `reports` sync bindings.
  For each configured binding, apply a one-way provider copy only after its
  owning local action reads back. Use expected versions/text, source note keys,
  and action dependencies for idempotency. Write the consolidation receipt only
  after all required local projections and configured provider copies read back.
- **Assertion:** an exact rerun creates no duplicate memory, SOP sample, report,
  Decision, Issue, or message; no sync binding produces no provider action; a
  partial binding fails validation; a provider failure preserves local output
  and keeps notes frozen.
- **Failure boundary:** local/private outputs survive blocked publication;
  external effects never infer a destination or permission.

### 6. Carry forward and archive

- **Files:** Weekly applier, Project Notes writer, automation docs and fixtures.
- **Operation:** after successful consolidation, retain the unchanged frozen
  notes in their original week and initialize next week's Project Notes with source-linked unresolved
  Work and documentation questions. Completed items do not carry forward.
- **Assertion:** late answers append to the new week's file under the original
  Work ID; finalized reports and retained frozen notes remain immutable.
- **Failure boundary:** failure to create next week's file does not alter the
  archived source or persistent entity records; receipt exposes repair action.

### 7. Migrate the proof suite and durable docs

- **Files:** current Draft and reference-automation tests (renamed to Project
  Notes), Daily/Weekly schema tests, unified eval fixtures, `docs/prd.md`,
  Company OS system/operator docs, TASK-0019 progress.
- **Operation:** replace shared-Draft assertions with two-Project append and
  cross-Project reducer cases. Keep report-template sync tests unchanged except
  where Person/SOP template versions require regenerated fixtures.
- **Assertion:** normal, exact-rerun, conflict, missing Project, multi-Project
  employee, multi-Project workflow, insufficient baseline, partial provider,
  retry, carry-forward, late-answer, equal-timestamp divergent-snapshot, and
  mid-publication migration-failure cases all pass offline.

## Done / Proof

```yaml
metric: one frozen weekly Project Notes set produces complete idempotent downstream projections
done:
  - Daily appends only structured source-linked notes to one file per active Project and week.
  - Daily never reads or edits Employee Memory, SOPs, Decisions, Issues, or final reports.
  - Weekly reads every expected Project Notes file and never rescans raw Work or Meetings.
  - Weekly produces Project Department and Company reports from the frozen notes set.
  - One employee working across multiple Projects receives one deduplicated weekly memory update.
  - One workflow observed across multiple Projects receives one source-linked SOP sample update.
  - Local Employee and SOP Memory separate Weekly-owned persistent memory from replaceable latest-week evidence.
  - All short-term memory long-term memory and finalized reports write locally before any configured provider copy.
  - Missing sync bindings mean local-only; configured provider and destination pairs create one-way copies.
  - Public People records never receive Employee Memory.
  - Employee updates contain no inferred ratings personality intent or unsourced effort.
  - One workflow sample cannot establish or silently replace an SOP baseline.
  - A consolidation receipt exists only after required projections validate and read back.
  - Retained frozen notes and finalized reports remain immutable; unresolved items carry forward.
  - Report template sync remains the only Markdown-to-Pydantic authoring path.
rubric_families: [spec-contract, implementation-plan, evidence-quality, integration-readiness]
required_tas_gates: [implementation-plan, evidence-quality, integration-readiness]
hard_gates: [no event platform, no mixed Weekly snapshot, no Daily entity writes, no missing Project input, no duplicate projection, no inferred employee rating, no silent baseline replacement, no lossy Draft migration, no public intermediate state]
checks:
  - python3 -m unittest tests.unit.scripts.test_project_week_notes -v
  - python3 -m unittest tests.unit.scripts.test_project_week_notes tests.unit.scripts.test_project_note_reducers -v
  - python3 -m unittest tests.unit.schemas.test_automation_contract_validation -v
  - python3 -m unittest tests.unit.schemas.test_daily_review_result tests.harness.evals.test_validate_eval_run -v
  - python3 -m unittest tests.unit.schemas.test_weekly_and_meeting_contracts tests.harness.evals.test_validate_eval_run -v
  - python3 -m unittest discover -s tests -p 'test_*.py' -v
  - python3 scripts/sync_report_templates.py --check
  - python3 scripts/validate_company_context.py --context workspace.hermes.md
evidence:
  - tickets/TASK-0019/progress.md
  - tickets/TASK-0019/artifacts/template-drift-cases/
  - tickets/TASK-0019/artifacts/review/project-notes-plan-review.md
```

## Agent Contract

- **Open:** TASK-0019 plus the accepted PRD and Project Notes template.
- **Test hook:** fixed two-Project/two-employee/two-workflow fixtures with one
  exact rerun and one conflict.
- **Stabilize:** append idempotency, frozen-input hash, destination version
  guards, provider read-back, and immutable archive.
- **Inspect:** Project Notes, Weekly context/result JSON, Employee/SOP updates,
  report hierarchy, integration receipt, archive, and carry-forward file.
- **Key states:** accumulating, frozen, consolidated, duplicate, conflict,
  blocked projection, retry, and late answer.
- **Expected artifacts:** Project Notes fixtures, downstream projection
  snapshots, read-back receipt, and reviewer receipt.

## Run Hints

```yaml
likely_size: large
goal_recommended: true
compute_hint: local deterministic tests
proof_weight: deterministic + integration contract
batchable: false
no_batch_reason: the Project Notes and Weekly schema migration is one coupled contract
human_gates: [accept Project Notes section names, authorize real provider destinations]
```

## State

- **Current:** Offline implementation and ticket-scoped QA are complete. Project
  Notes, all-Project freeze, report/entity projections, legacy migration,
  guarded application, carry-forward, docs, and packaged contracts pass.
- **Lifecycle:** The ticket remains `in_progress` only until the current dirty
  implementation is committed and the repository close route completes. This
  is closeout state, not missing local behavior.
- **Next:** bind private provider destination URLs and run separately authorized
  Notion, Drive, and messaging proof when the client is ready.
- **Blockers:** none for offline implementation. Real provider proof requires
  configured destination URLs, authenticated isolated sinks, and explicit write
  authority.

## Links

- `docs/prd.md`
- `templates/project-week-notes.md`
- `templates/person.md`
- `templates/sop.md`
- `schemas/automations/daily_review_result.py`
- `schemas/automations/weekly_context.py`
- `schemas/automations/weekly_review_result.py`
- `scripts/project_week_notes.py`
- `scripts/project_note_reducers.py`
- `automations/daily-operating-update.md`
- `automations/weekly-operating-review.md`
- `tickets/TASK-0019/progress.md`
- `tickets/TASK-0019/artifacts/qa/20260831-project-notes-projection/report.md`
- `tickets/TASK-0019/artifacts/qa/20260831-project-notes-projection/result.json`
- `tickets/TASK-0019/artifacts/qa/20260831-minimal-private-setup/report.md`
- `tickets/TASK-0019/artifacts/qa/20260831-minimal-private-setup/result.json`
- `tickets/TASK-0019/artifacts/qa/20260831-minimal-private-setup/review.md`
