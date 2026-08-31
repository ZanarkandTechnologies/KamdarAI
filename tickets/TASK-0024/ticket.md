---
template_id: ticket-template
template_version: "0.3.2"
feature_refs:
  - FEAT-0010
ticket_id: TASK-0024
title: Replace Meeting Intake automation with manual meeting processing
status: todo
created_at: 2026-08-31T18:30:00+08:00
updated_at: 2026-08-31T18:30:00+08:00
depends_on: []
---

# TASK-0024: Replace Meeting Intake automation with manual meeting processing

## Summary

Meeting handling is a user-invoked workflow, not a scheduled Company OS
automation. A user supplies meeting notes from a Notion page, a Task body, a
local Markdown file, or stdin. Hermes normalizes those notes into the existing
`templates/meeting.md` contract, proposes Tasks using the existing
`templates/task.md` contract, and creates records only after explicit review.

Meeting summaries may be stored inside a selected Notion Task page or in an
optional dedicated Notion Meetings database. The absence of a Meetings database
must never make setup or the autonomous health check unhealthy.

## Scope

### In scope

- Remove `meeting-intake` from schedules, event triggers, setup health, Company
  Doctor feature rows, cadence delivery policy, and default automation evals.
- Retain FEAT-0010 but redefine it as the manual **Process meeting notes**
  capability so feature history and documentation remain traceable.
- Add one typed meeting-summary storage mode owned by the workspace schema:
  `none`, `task_page`, or `meetings_database`. `none` disables only summary
  storage; manual preparation and reviewed Task creation remain available.
- Extend setup/configure CLI to select the storage mode. A dedicated database
  resolves the existing canonical `meetings` managed datasource binding.
- Add a manual CLI prepare command accepting an exact Notion URL, local file,
  or stdin and an optional target Task URL.
- Normalize the selected source into `templates/meeting.md` before extracting
  Task proposals.
- Render proposed Tasks through `templates/task.md` and preserve source
  provenance, meeting title/date, supporting excerpt, explicit Project, explicit
  owner, explicit due date, and a deterministic source-plus-action key.
- Reuse the existing immutable handoff, review, and provider action executor;
  generalize automation-only naming where necessary instead of creating a
  second delivery engine.
- Add deterministic tests and provider-read acceptance coverage without making
  external writes part of autonomous setup verification.

### Out of scope

- Scheduled or event-triggered meeting ingestion.
- Requiring a dedicated Meetings database.
- Audio transcription, calendar capture, or automatic meeting discovery.
- Inferring owners, due dates, Projects, or commitments not explicit in notes.
- Creating Tasks or writing summaries before explicit review/apply.
- A new meeting template, a parallel Doctor viewer, or a new delivery engine.
- Provider expansion beyond the currently configured Notion and Tasks paths.

### Constraints

- The connected Tasks binding remains the sole destination for approved Tasks.
- `task_page` mode is valid only when the selected target is an editable Notion
  page; the target is supplied per invocation, not stored as a global page ID.
- `meetings_database` mode resolves the canonical `meetings` binding through a
  typed, hash-bound connection receipt; it does not persist a second URL.
- Flexible input is invocation state, not a persistent setup source binding.
- Missing optional metadata becomes a focused review question or an omitted
  field, not a setup failure.
- Private meeting content and generated handoffs stay in the runtime profile and
  are never copied into this repository or HermesCorp.

## Delta

### Before

- `meeting-intake` appears to be an event automation over completed Meeting
  records.
- Setup and eval surfaces can imply a Meetings source is required.
- A meeting body embedded in a Task is conflated with a configured Meetings
  datasource.

### After

- Setup asks where normalized meeting summaries should be stored:
  `Do not store a summary`, `Inside a selected Task page`, or
  `Dedicated Meetings DB`.
- The user invokes one manual prepare command with notes they selected.
- Hermes produces a normalized meeting-summary preview and Task proposals.
- The existing review/apply boundary controls both summary and Task writes.
- Daily and Weekly Doctor runs contain no meeting feature row.

### Example

```text
python setup.py meeting prepare \
  --source "https://notion.so/..." \
  --target-task "https://notion.so/..."

python setup.py deliver --handoff <generated-handoff>
python setup.py deliver --handoff <generated-handoff> --apply
```

The first command performs reads and creates private intermediary artifacts only.
The second displays the exact proposed writes. The final command is the only
external-write step.

## Contract Diagram

```text
[Setup/configure]
        |
        v
MeetingProcessingConfig
  summary_storage: none | task_page | meetings_database
  dedicated destination: canonical `meetings` binding
        |
        v
[Manual invocation]
  source: Notion URL | Markdown path | stdin
  target_task_url: required for task_page unless source is that Task
        |
        v
[Read selected source] -------------------------- read-only
        |
        +--> normalize with templates/meeting.md
        |
        +--> extract explicit commitments
                 |
                 v
          render Task proposals with templates/task.md
                 |
                 v
         immutable reviewed handoff
            |                 |
          review            --apply
            |                 |
        no writes      summary destination + configured Tasks DB
```

### Typed configuration

```python
MeetingStorageMode = Literal[
    "none",
    "task_page",
    "meetings_database",
]

class MeetingProcessingConfig(BaseModel):
    summary_storage: MeetingStorageMode
```

Validation owns these invariants:

- `task_page` does not duplicate the Tasks binding or persist a page URL.
- `meetings_database` requires the canonical `meetings` binding and a matching
  connection receipt proving provider `notion`, resource type `database` or
  `data_source`, canonical resource ID/URL, and exact-source read resolution.
- `none` permits prepare and reviewed Task creation with no summary write.
- Read-only prepare proves resource identity/type, not editability. Editability
  is established only by human-gated apply plus provider read-back.
- An invocation requiring a target fails before model work when the target is
  absent or incompatible.

### Output contract

The manual prepare result contains:

- one `meeting_summary_markdown` rendered from `templates/meeting.md`;
- zero or more `task_proposals` rendered from `templates/task.md`;
- `questions` for ambiguous commitments or missing write-critical fields;
- source references and supporting excerpts;
- deterministic idempotency keys;
- a delivery handoff with no provider actions when review-blocking questions
  remain.

No new generic feature outcome type is introduced.

## Change Plan

### Unit 1 — Retire the false automation contract

Delete the scheduled/event automation definition and remove `meeting-intake`
from workspace delivery rows, Doctor assembly, cadence prepare/delivery types,
viewer feature inventory, distribution allowlists, and cadence tests. Repurpose
FEAT-0010 documentation around manual invocation instead of deleting its ID.

```yaml
owner_paths:
  - automations/meeting-commitment-intake.md
  - docs/features/FEAT-0010-meeting-commitment-intake.md
  - scripts/automation_prepare.py
  - scripts/run_company_doctor.py
  - schemas/automations/delivery.py
  - distribution.yaml
behavior_delta: Meeting processing is absent from every automatic cadence and health surface.
proof:
  - Doctor contains Daily and Weekly only.
  - No schedule, webhook, or completion event references meeting intake.
```

### Unit 2 — Add one owned storage configuration

Add `MeetingProcessingConfig.summary_storage` to the canonical workspace schema
and managed Markdown block. Tighten the existing Notion Meetings catalog test and
connection-certification receipt so it returns and hash-binds `provider=notion`,
`resource_type=database|data_source`, canonical resource ID/URL, and successful
exact-source resolution. `meetings_database` consumes that verified receipt and
canonical managed binding; it does not persist a second URL or datasource.

The read-only receipt proves identity and type only. The reviewed apply/read-back
lane proves write access. Likewise, `task_page` prepare resolves an exact readable
Notion page before model work, while apply/read-back is the editability proof.

```yaml
owner_paths:
  - schemas/workspace.py
  - scripts/setup_cli/flows/workspace.py
  - catalog/data-sources/meetings.json
  - scripts/provider_catalog.py
  - scripts/setup_cli/flows/connections.py
  - workspace.hermes.template.md
  - workspace.hermes.md
behavior_delta: The summary strategy is typed while destinations remain owned by canonical bindings.
proof:
  - Round-trip parsing preserves each valid mode.
  - meetings_database rejects a missing, non-Notion, non-database, receipt-mismatched, or unresolved binding.
  - Connection receipt hashes the canonical resource identity and successful exact-source read.
  - Read-only certification never claims editability.
  - none does not affect setup health and still permits prepare and Task proposals.
```

### Unit 3 — Implement manual prepare using existing templates

Add `setup.py meeting prepare`. Resolve one user-selected source, normalize it
through the canonical meeting template, and extract only explicit commitments
into Task proposals. A Task-embedded meeting is both a valid source and, in
`task_page` mode, a valid summary destination. Rename and repurpose the existing
`MeetingCommitmentIntakeResult` as `MeetingProcessingResult`; retain its
commitment, provenance, missing-field, FeatureOutcome, Task payload, and
idempotency validation. Add only `meeting_summary_markdown` and focused
`questions`, then remove the old class/name without a compatibility alias.

```yaml
owner_paths:
  - scripts/setup_cli/app.py
  - scripts/meeting_processing.py
  - schemas/automations/meeting_commitment_intake_result.py
  - templates/meeting.md
  - templates/task.md
behavior_delta: Flexible notes become one normalized meeting summary and reviewable Task proposals.
proof:
  - Notion page, Task body, Markdown, and stdin fixtures produce the same canonical shape.
  - Absent owner/due/Project values are not invented.
  - Repeated preparation yields identical idempotency keys.
```

### Unit 4 — Reuse review/apply without cadence leakage

Migrate the immutable handoff and receipt contract from cadence-only schema
`kamdar-stage-two-*@1.1.0` to workflow schema `kamdar-stage-two-*@1.2.0`:

| Existing owner/field | Replacement | Rule |
| --- | --- | --- |
| `DeliveryPlan.cadence` | `workflow_id` | `daily`, `weekly`, or `meeting-processing`. |
| `DeliveryReceipt.cadence` | `workflow_id` | Must equal the immutable plan. |
| `DeliveryEnvironment.ISOLATED_EVAL` | add `PRIVATE_RUNTIME` | Cadence proof stays isolated; manual apply uses private runtime. |
| workspace cadence policy | manual policy | Enabled only after exact targets validate; source is `explicit-manual-review`. |
| `setup.py deliver --apply` | unchanged executor gate | Explicit authority for the hashed, reviewed plan. |

No v1.1 compatibility alias is retained before deployment. Handoff hashing
covers the v1.2 plan, result, workspace, source reference, exact targets, and
payloads; any change requires a new prepare. Manual meeting processing never
enters schedule, webhook, Doctor, or cadence registries.

Add destination-specific operations:

| Mode | Summary operation | Target/idempotency | Read-back |
| --- | --- | --- | --- |
| `none` | none | no summary action | action absence |
| `task_page` | `UPSERT_MEETING_SUMMARY_SECTION` | selected Task plus meeting key in managed section marker | reread section; match key and content hash |
| `meetings_database` | `UPSERT_MEETING_RECORD` | canonical Meetings DB plus meeting key property | query record; match properties and body hash |

Approved Task proposals continue to use `CREATE_TASK`, the canonical Tasks
binding, and their existing source-plus-action idempotency key. The executor
queries that key before creation and reports `duplicate` on replay.

```yaml
owner_paths:
  - schemas/automations/delivery.py
  - scripts/automation_delivery.py
  - scripts/run_automation.py
  - scripts/setup_cli/app.py
behavior_delta: One review/apply engine supports daily, weekly, and manual meeting workflows.
proof:
  - Review emits zero writes.
  - Apply rejects modified/stale handoffs.
  - Manual plans use private-runtime and explicit-manual-review without entering Doctor or schedules.
  - none produces Task actions but no summary action.
  - Both summary operations receive provider read-back.
  - Duplicate source-plus-action keys do not create duplicate Tasks.
  - Existing Daily/Weekly delivery tests remain green.
```

### Unit 5 — Replace acceptance coverage and docs

Replace event-automation evals with manual prepare cases. Assert that autonomous
setup health may perform configured reads and model preparation but never meeting
writes. Document both storage modes and the review gate.

```yaml
owner_paths:
  - evals/
  - tests/
  - docs/customer-setup.md
  - docs/systems/company-os-operator-manual.md
behavior_delta: Acceptance proves the real manual workflow instead of a nonexistent automation.
proof:
  - Full repository tests pass.
  - Installed evals contain no meeting cadence case.
  - A live-source prepare receipt identifies the selected source and zero writes.
```

## Lean Check

```yaml
target: manual meeting processing
current_need: Normalize selected notes into meeting.md and reviewed Tasks without a schedule or mandatory Meetings DB.
rung: reuse_local
evidence:
  - templates/meeting.md, templates/task.md, and the existing meeting result schema own the output and extraction contracts.
  - The Notion Meetings catalog entry and optional workspace row already exist.
  - The immutable handoff and provider action executor already own review/apply.
  - Setup CLI already owns managed workspace configuration.
smallest_next_action: Remove scheduled ownership, then add one typed storage binding and one manual prepare command.
proof_preserved:
  - No external writes before explicit apply.
  - Source provenance and deterministic deduplication remain visible.
  - Tasks use the configured Tasks destination.
  - A dedicated Meetings database remains optional.
review_route: review:implementation-plan+architecture+evidence-quality
```

## Done

- [ ] No scheduled, event, Doctor, or setup-health path requires Meeting Intake.
- [ ] FEAT-0010 describes manual meeting processing.
- [ ] Setup/configure supports `none`, `task_page`, and
      `meetings_database` with schema validation.
- [ ] Manual prepare accepts a Notion page, Task body, Markdown file, or stdin.
- [ ] Meeting output conforms to the existing `meeting.md` template.
- [ ] Task proposals conform to the existing `task.md` template.
- [ ] Review shows exact proposed summary and Task writes.
- [ ] Apply is explicit, receipt-backed, idempotent, and rejects stale handoffs.
- [ ] Each summary mode has an exact action/read-back contract; `none` has no
      summary action.
- [ ] Missing optional Meetings storage does not fail setup or Doctor.
- [ ] No private meeting data is written into the source repository.

## QA Strategy

### Deterministic

- Workspace schema round-trip and mode/binding validation tests.
- CLI parser and setup prompt tests for all three modes.
- Source adapter fixtures for Notion payload, Task body, file, and stdin.
- Template-conformance and no-inference assertions.
- Handoff immutability, review-only, stale-plan, and idempotency tests.
- Regression tests proving Daily/Weekly delivery behavior is unchanged.
- Distribution and viewer assertions proving Meeting is not an automation row.

### Integrated read-only

- With a configured Notion connection, read one explicitly selected real source.
- Produce private `meeting.md`, Task proposal, trace, and handoff artifacts.
- Assert the provider write ledger and receipts contain zero writes.
- Compare output against the canonical templates and source excerpts.

### Human-gated write proof

- Review the exact handoff.
- Operate one reviewed `task_page` case and one reviewed `meetings_database`
  case against disposable or explicitly selected targets.
- Confirm destination-specific read-back, Task destination, provenance, and key.
- Reapply each handoff and prove neither summary nor Task is duplicated.

## State

```yaml
current: Scoped from the approved product behavior; implementation has not started.
next: Implement Unit 1 and Unit 2 before adding the manual prepare path.
blocked: false
```
