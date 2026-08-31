---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0023
title: Deploy the managed Kamdar Company OS MVP
status: todo
claimed_by: null
created_at: 2026-08-31T00:00:00Z
updated_at: 2026-08-31T00:00:00Z
depends_on: []
ui_scope: false
feature_refs: [FEAT-0001, FEAT-0002, FEAT-0003, FEAT-0004, FEAT-0005, FEAT-0006, FEAT-0007, FEAT-0011]
---

# TASK-0023: Deploy the managed Kamdar Company OS MVP

## Summary

Deploy the existing Company OS to one Kamdar-managed Windows/WSL2 Docker host,
connect only the Kamdar Notion sources required for Daily and Weekly management
previews, keep every downstream write disabled, and prove that an operator can
install, inspect, restart, rerun, and recover the MVP.

This ticket replaces the remaining deployment scope in TASK-0016 through
TASK-0022. It does not finish every old acceptance clause. R0 marks those
tickets superseded with an explicit `shipped | deferred | rejected` disposition
so they stop accumulating work.

## MVP Decision

The MVP is a managed, single-customer, prepare-first deployment:

- one fixed Kamdar profile and Compose stack;
- one clean Windows/WSL2 Docker host;
- Notion as the only required provider;
- Daily and Weekly previews from real Kamdar data and a live model;
- one private Doctor-generated review surface for the operator;
- zero automatic Notion, Drive, messaging, employee, or production writes;
- manual OAuth and a manual pre-deployment backup are acceptable.

Success means the core management loop produces trustworthy output on the real
target and survives restart. It does not mean the product is self-service,
multi-customer, feature-complete, or production-autonomous.

## Before / After / Example

### Before

- The setup wizard, provider catalog, Doctor, Daily/Weekly contracts, dashboard,
  and safety gates exist and pass local tests.
- The repository contains a dirty uncommitted release boundary.
- The clean Windows/Kamdar Notion path has not been operated end to end.
- Old tickets mix implemented features with optional providers, delivery,
  webhook, CI, recovery UI, and broad productization proof.

### After

- One committed version installs on the actual Kamdar Windows host.
- Notion authorization and exact Kamdar source bindings pass.
- Daily and Weekly real-data previews are useful, private, and read-only.
- The Doctor viewer, restart, and unchanged rerun work without losing profile
  state. Production cron jobs retain the complete automation instructions;
  Doctor can test the same instructions with only Sync to provider omitted.
- A redacted deployment receipt and a short operator runbook explain how to
  start, inspect, stop, restart, back up, and reinstall or restore the MVP under
  managed support.
- Everything not required for that journey is explicitly deferred.

### Example

The operator double-clicks `setup.cmd`, reviews the Kamdar workspace and Notion
plan, completes browser OAuth, installs the profile, and receives an MVP
deployment receipt whose core rows pass. The operator runs Doctor with sync
disabled; Doctor copies the complete Daily or Weekly instruction, removes only
its Sync-to-provider step, and executes the remaining Analyze instructions.

## MVP Journey

```text
clean Windows host
  -> setup.cmd preflight
  -> new/resume install
  -> Kamdar workspace + Notion only
  -> browser OAuth
  -> install workspace + full production automation instructions
  -> static/live health
  -> real-data Daily + Weekly preview
  -> Doctor viewer/private artifact review
  -> restart + unchanged rerun
  -> redacted deployment receipt
```

## Essential vs Deferred

| Area | MVP disposition | Reason |
| --- | --- | --- |
| Current Project Notes/template work | Ship after clean commit and green checks | Required by Daily/Weekly output |
| Windows install/resume/health/update | Ship one operated happy path | Actual deployment target |
| Notion authentication and bounded reads | Ship | Required source of truth |
| Daily and Weekly real-data previews | Ship | Core customer value |
| Doctor viewer/private artifact inspection | Ship | Operator must see the result |
| Restart and unchanged rerun | Ship | Minimum operational reliability |
| Verified profile backup plus managed reinstall/restore steps | Ship | Minimum recoverability; no wizard or rehearsal needed |
| Docker CI and adversarial failure matrix | Defer | Useful hardening, not first deployment |
| Docker Doctor bridge | Defer | Direct operation on the target is sufficient |
| Linear, Gmail, and Drive certification | Defer | Not required for the selected MVP sources |
| Notion webhook and real-time comments | Defer | Manual Doctor previews are sufficient |
| Production Sync-to-provider proof | Defer | Doctor can first test Analyze with only the sync instruction omitted |
| Telegram/Slack/WhatsApp delivery | Defer | Operator reviews locally |
| Employee follow-up | Reject for MVP | No approved People routes |
| Backup/restore/rollback UI | Defer | Documented operator commands are sufficient |
| Doctor/Apply maintenance-menu actions | Defer | Operator CLI is acceptable for the managed MVP |
| Template and schedule editors | Defer | Reviewed defaults are sufficient |
| Credential rotation/reconfiguration UX | Defer | Managed operator can repair/reinstall manually |
| Generic customer-pack rendering | Defer | This ticket deploys Kamdar only |
| HermesCorp extraction and multi-tenancy | Reject for MVP | Separate productization phase |

## Change Plan

### M0 — Record old-ticket dispositions without gating deployment

- **Files:** current Git diff; TASK-0016 through TASK-0022 State/Links;
  `tickets/TASK-0023/progress.md`.
- **Change:** in parallel with M1–M4, classify current changes, preserve
  unrelated user work, and prepare each old ticket's
  `shipped | deferred | rejected` disposition. Apply superseded status and
  TASK-0023 links at M5 after deployment proof.
- **Assertion:** no old ticket receives new implementation scope and no existing
  evidence is deleted.
- **Failure boundary:** do not reset, stage, overwrite, or absorb unknown work.

### M1 — Cut one clean MVP release boundary

- **Files:** the current Project Notes/template-catalog changes and their owned
  docs/tests/distribution entries.
- **Change:** finish only the current coherent implementation, commit generated
  contracts required by the distribution, and remove drift.
- **Assertion:** full unit suite, frozen evals, template sync, context validation,
  distribution validation, and diff checks pass from the release boundary.
- **Failure boundary:** no provider call, generated preview, or external write.

### M2 — Install the MVP without changing production automation prompts

- **Files:** existing `setup.cmd`, `compose.yaml`, `scripts/setup_profile.py`,
  `scripts/setup_runtime.py`, focused schedule/health tests, and private
  target-host receipts.
- **Change:** operate fresh install or safe resume on the selected clean
  Windows/WSL2 host with the fixed Kamdar identity, Notion only, real-time
  comments disabled and messaging disabled. Keep every automation Markdown file
  complete and keep production cron prompts unchanged: cron always receives the
  full Analyze plus Sync-to-provider instruction. The no-sync behavior belongs
  only to Doctor testing.
- **Assertion:** distribution, workspace, model, exact bindings, Notion MCP,
  gateway, packaged eval, and schedule rows pass. Company OS cron inventory
  contains the complete Daily and Weekly automation prompts. `PARTIAL` is
  acceptable only for explicitly deferred webhook, messaging, and
  optional-provider rows; no core row may be partial or failed.
- **Proof:** redacted setup receipt and target-host screenshots.
- **Failure boundary:** stop on a real blocker; do not broaden provider scope or
  patch around missing OAuth/permissions with fixtures.

### M3 — Prove the core value through selected read-only Doctor previews

- **Files:** `scripts/setup_cli/app.py`, `scripts/run_company_doctor.py`, Doctor
  parser/receipt tests, private run artifacts, and a sanitized QA summary under
  TASK-0023.
- **Change:** preflight
  `/opt/data/profiles/kamdar-ai/company-os-doctor-bindings.json`, require only
  owner-approved Kamdar roots, confirm the Notion credential remains
  profile-private and model/gateway access is live, then run Doctor with a
  repeatable `--cadence` option selecting only `daily` and `weekly`. Validate
  selections against `CADENCE_CONFIG`, execute only the requested cadences, and
  record both `requested_cadences` and excluded cadences in the receipt. Add a
  Doctor-only no-sync option that copies the complete selected automation
  instruction and removes only its existing numbered Sync-to-provider step
  before execution. Do not edit the source Markdown or production cron prompt,
  and do not introduce a new orchestration or delivery design. Let setup choose
  Daily, Weekly, or both, and Analyze only or Analyze plus a prepared sync plan.
  Actual provider application remains the existing separately reviewed
  `setup.py deliver --handoff ... --apply` step.
- **Assertion:** each preview has a private path and hash; material claims link
  to source evidence; no facts or employee ratings are invented; missing data
  appears as an honest gap. The Doctor receipt must record
  `downstream_calls: 0`, `mutation_operations_registered: []`, an allowlisted
  read-operation inventory, unchanged source hashes, and unchanged source-owned
  and installed workspace hashes.
- **Proof:** redacted Doctor receipt plus operator acceptance against those
  literal criteria; no real source content or private screenshot enters Git.
- **Failure boundary:** any mutation registration, unapproved root, changed
  source/workspace hash, or downstream call blocks the MVP.

### M4 — Prove restart, rerun, and a verified backup

- **Files:** target-host state hashes and `docs/customer-setup.md`.
- **Change:** create one named-volume backup before deployment, verify that the
  archive is nonempty and hashable, stop/start Docker, rerun `setup.cmd`, and
  verify the profile and complete production schedules are preserved. Document managed
  recovery as recreating the stack and restoring that backup, or reinstalling
  and reauthorizing when restore is unsuitable; do not claim restore was
  rehearsed.
- **Assertion:** restart and unchanged rerun do not repeat OAuth, alter the
  production automation instructions, delete unknown files, or lose generated private artifacts.
- **Proof:** backup size/hash, before/after hashes, rendered schedule inventory,
  and Doctor viewer availability.
- **Failure boundary:** keep the backup until operator acceptance and do not
  overwrite the live profile for an MVP restore test.

### M5 — Hand off the managed MVP

- **Files:** concise customer setup/recovery docs and
  `tickets/TASK-0023/artifacts/deployment-receipt.json`.
- **Change:** document only the operated Kamdar path: install, OAuth, core-row
  acceptance, Doctor preview/viewer, restart, backup, managed recovery, and
  escalation. Apply the prepared superseded dispositions to TASK-0016–0022.
- **Assertion:** the runbook names the exact core rows that must pass and the
  deferred rows that may remain partial; it does not claim rehearsed restore.
- **Proof:** operated receipt plus independent evidence/integration review.
- **Failure boundary:** no claim for deferred providers, webhook, Sync to provider,
  messaging, self-service, generic customers, or Sync-to-provider execution.

## Lean Verdict

```yaml
target: first managed Kamdar deployment
current_need: operate the existing core value loop on the real customer target
rung: reuse_local
evidence:
  - setup wizard and maintenance flow already implemented
  - Notion catalog, OAuth, Doctor, Daily/Weekly contracts, dashboard, and receipts already implemented
  - full offline test and frozen eval harness already available
smallest_next_action: freeze one release, keep production cron prompts complete, run Doctor with only Sync to provider removed, prove zero-write output, restart, back up, and hand off
proof_preserved: real target, real data reads, live model, exact Doctor zero-write assertions, restart/rerun, and verified backup evidence remain mandatory
review_route: review:implementation-plan+evidence-quality+integration-readiness
```

## Done / Proof

```yaml
metric: one operator-managed Kamdar deployment produces trustworthy Daily and Weekly previews from real Notion data
done:
  - One clean release boundary passes offline checks.
  - The selected Windows/WSL2 host installs or resumes the fixed Kamdar profile.
  - Exact Kamdar Notion roots authenticate and read successfully.
  - Daily and Weekly Doctor previews pass the literal operator acceptance criteria.
  - Doctor cadence selection executes only Daily and Weekly and records Meeting Intake as excluded.
  - Company OS Daily and Weekly Markdown files and cron prompts retain their complete instructions.
  - Doctor's no-sync test copy omits only the existing numbered Sync-to-provider instruction.
  - The Doctor no-sync run performs no provider writes.
  - The Doctor viewer or another private generated review surface is available.
  - Restart, unchanged rerun, and backup size/hash checks pass.
  - One concise operated receipt documents managed reinstall/restore recovery without claiming rehearsal.
rubric_families: [implementation-plan, evidence-quality, integration-readiness]
required_tas_gates: [implementation-plan, evidence-quality, integration-readiness]
hard_gates: [no production mutation, no secret artifact, no fixture-as-live-proof, no unsupported provider claim, no skipped-target pass]
checks:
  - python3 -m unittest discover -s tests -p 'test_*.py' -v
  - python3 scripts/sync_report_templates.py --check
  - python3 scripts/validate_company_context.py --context workspace.hermes.md
  - python3 scripts/run_installed_evals.py --root .
  - setup.cmd on the selected clean Windows/WSL2 host
  - docker compose --profile setup run --rm setup python /distribution/setup.py doctor --profile-home /opt/data/profiles/kamdar-ai --cadence daily --cadence weekly
evidence:
  - tickets/TASK-0023/progress.md
  - tickets/TASK-0023/artifacts/deployment-receipt.json
  - tickets/TASK-0023/artifacts/qa/real-kamdar-preview/result.json
  - tickets/TASK-0023/artifacts/review/completion-receipt.json
```

## State

- **Current:** downscoped MVP plan; implementation has not started.
- **Next:** accept this boundary, execute M1 before touching the target host,
  and prepare M0 dispositions in parallel for application at M5.
- **Human gates:** target Windows access, Kamdar Notion OAuth, exact source-root
  approval, and operator preview acceptance.

## Links

- `tickets/archive/TASK-0016/ticket.md`
- `tickets/archive/TASK-0017/ticket.md`
- `tickets/archive/TASK-0018/ticket.md`
- `tickets/archive/TASK-0019/ticket.md`
- `tickets/archive/TASK-0020/ticket.md`
- `tickets/archive/TASK-0021/ticket.md`
- `tickets/archive/TASK-0022/ticket.md`
- `docs/customer-setup.md`
- `docs/autonomous-testing.md`
