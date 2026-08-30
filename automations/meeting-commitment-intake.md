---
automation_id: kamdar-meeting-commitment-intake
automation_version: "1.0.0"
kind: company-os-event-workflow
cadence: on-new-completed-meeting
company_timezone: Asia/Kuala_Lumpur
feature_refs: [FEAT-0010]
---

# Meeting commitment intake

## Context

Turn explicit commitments from one newly completed Meeting into canonical Work
Tasks. This workflow does not infer tasks from discussion notes and does not
create Decisions, Issues, or SOPs.

## Authority

Read `workspace.hermes.md` for the exact Meeting and Work data sources. Writes
are allowed only inside the selected isolated test root or an explicitly
authorized production source. Run `ntn --help`, `ntn pages --help`, and
`ntn api --help` before the first provider call.

## Todo List

- [ ] Load the complete triggering Meeting and its linked Project and People.
- [ ] Read `schemas/automations/meeting_commitment_intake_result.py`, run
  `python -m schemas.automations.validate schema meeting-commitment-intake`,
  and extract only explicit commitments from the Meeting's Commitments section.
- [ ] Validate the result with `python -m schemas.automations.validate
  validate meeting-commitment-intake <result-path>` before any write.
- [ ] Require a stable commitment key, action, linked Project, accountable
  Person, and due date. Put incomplete rows in `blocked_commitments`; never
  invent missing values.
- [ ] Render each accepted row with `templates/task.md`. Preserve the Meeting ID
  and source URL in Notes and derive an idempotency key from Meeting ID plus
  commitment key.
- [ ] Before creation, query Work for that idempotency key or stable Work ID.
  Existing matches are `duplicate`, not new writes.
- [ ] Create accepted Tasks through `ntn`, read back every required Task
  property and Notes body, and record the provider URL and observed values.
- [ ] On an unchanged rerun, create zero new records. A failed or mismatched
  read-back is not success.

## Output

- `meeting-intake/context/<meeting-id>.json`
- `meeting-intake/review/<meeting-id>-result.json`
- `meeting-intake/receipts/<meeting-id>-integration.json`
- `meeting-intake/read-back/<meeting-id>-work.json`
