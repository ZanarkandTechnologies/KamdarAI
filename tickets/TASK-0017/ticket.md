---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0017
title: Ship one deterministic install reconcile and update entry point
status: in_progress
claimed_by: null
created_at: 2026-08-28T08:20:25Z
updated_at: 2026-08-31T00:00:00Z
depends_on: [TASK-0016]
ui_scope: true
feature_refs: [FEAT-0011]
---

# TASK-0017: Ship one deterministic install reconcile and update entry point

## Summary

Replace the multi-command, chat-dependent setup path with one cross-platform,
resumable entry point that composes Hermes native profile install/update,
profile-local env and MCP configuration, workspace installation, config,
plugins only where still required, and native schedules. Keep the repo as
desired-state owner and preserve every Hermes user-owned path.

## Scope

- **In:** install/reconcile/update modes; preflight; Hermes version gate;
  distribution source/version; profile selection; env requirement status;
  declarative data-source provider catalog and Hermes MCP references;
  workspace/config/schedule reconciliation; plain-language owner-report,
  owner-alert choices and a visibly disabled employee-follow-up future state;
  Hermes-native messaging-app
  setup; one explicitly approved connection test; messaging health and
  redacted delivery receipts;
  preview/apply; resumable redacted receipt; idempotency; supported paths from
  TASK-0016; optional chat wrapper that calls the same entry point.
- **Out:** production employee-message operation, inferred employee contact
  routes, a custom messaging SDK or credential store, Notion event ingress,
  secret values in repo config, deleting unknown runtime files, and making
  profile export the update mechanism.
- **Split trigger:** this is the shared lifecycle foundation reused by provider,
  health, eval, and documentation work.

## Delta

> **Before:** Install, workspace copy, plugin enablement, terminal cwd, and cron
> reconciliation are separate steps whose real completion is ambiguous.
>
> **After:** One command converges declared repo state and returns `ready`,
> `partial`, `blocked`, or `human_required` with one next action.
>
> **Example:** The same invocation installs v1.1 on a fresh profile or updates a
> v1.0 profile without changing `.env`, OAuth tokens, memories, or sessions.

The accepted setup interaction is state-aware. `setup.cmd` remains the only
Windows entry point and performs only host prerequisite checks plus bounded
Compose follow-up actions. The interactive `setup.py launch` command detects a
new, incomplete, or existing profile. New and incomplete profiles enter or
resume onboarding; existing profiles receive a maintenance menu for workspace
configuration, software update, full health verification, repair, dashboard,
or exit. A workspace-only change never repeats model or provider authorization.

The simplicity boundary is deliberate: there are no separate customer scripts,
no host Python requirement, no Docker socket mounted into Hermes, and no direct
editing of the live `workspace/.hermes.md`. Report and schedule customization
remain deferred until their underlying contracts can be changed safely; setup
installs and reviews the current recommended defaults rather than displaying
nonfunctional choices.

Messaging follows the same boundary. Customers choose ordinary outcomes—send
completed reports to the owner, alert the owner, or prepare employee
follow-ups—and choose `Prepare drafts for approval` or `Send automatically`.
Setup derives test/live mode and recipient safety rules; those internal fields
are never customer questions. `Connection test` is an explicit setup action,
not a reusable automation route. Employee follow-ups resolve only through an
approved People-directory contact and never inherit the owner's destination.

## Map

```text
setup.cmd --interactive terminal--> setup.py launch
                                      |
                    +-----------------+-----------------+
                    |                 |                 |
                  new             incomplete         existing
                    |                 |                 |
                 install            resume       maintenance menu
                                                        |
                               workspace | update | health | repair
                                                        |
setup.py --bounded action code--> setup.cmd --start/verify--> receipt

message choices -> typed workspace binding -> Hermes gateway setup
                                           -> optional test send
                                           -> messaging health + receipt
```

## Change Plan

1. Make `setup.py launch` the interaction owner: detect profile state, enter
   onboarding or resume when required, and show the maintenance menu only for
   an existing profile.
2. Add a workspace-only configure, preview, apply, and focused verification
   path that edits the profile-owned source and never invokes model or Notion
   authorization.
3. Reduce `setup.cmd` to prerequisite checks, one interactive wizard call, and
   explicit action-code branches for runtime start, static verification, live
   health verification, and dashboard opening. Do not mount the Docker socket.
4. Convert silent waits, raw retry language, and inaccessible receipt paths
   into progress feedback and customer-readable recovery copy.
5. Add state/action tests and reconcile the customer docs and ASCII baseline so
   every shown screen and recovery branch is implemented.
6. **Make messaging choices customer-readable (`schemas/workspace.py`,
   `workspace.hermes.template.md`, `scripts/setup_cli/flows/workspace.py`,
   `tests/test_workspace_schema.py`, `tests/test_setup_init.py`; map `M1–M2`).**
   Render selectable `owner report` and `owner alert` jobs and show employee
   follow-up as unavailable until People-directory routes exist. Ask for the
   owner recipient and messaging app only where required; derive runtime and
   recipient rules. Default every new binding to draft-first, stored under the
   existing private `weeks/<week>/outbound/` path. Reject invalid or overlapping bindings before writing the
   workspace. **Failure boundary:** retain the previous workspace and show one
   plain-language field error; never partially rewrite the managed table.
7. **Reuse Hermes for connection ownership (`scripts/setup_cli/flows/messaging.py`,
   `scripts/setup_cli/flows/lifecycle.py`, `scripts/setup_cli/process.py`,
   `tests/test_setup_messaging.py`; map `M3`).** Invoke `hermes gateway setup`
   only after the reviewed plan is accepted. Do not infer readiness from
   `hermes send --list`: an empty directory can still exit successfully. Do not
   read, copy, or print bot tokens. **Failure
   boundary:** preserve the workspace draft, mark messaging incomplete, and
   continue only in draft-first mode.
8. **Add an explicit connection-test gate (`scripts/setup_cli/flows/messaging.py`,
   `scripts/setup_runtime.py`, `tests/test_setup_messaging.py`; map `M4`).** Ask
   before one `hermes send --to <app> --json` test message, parse only the
   provider-safe result fields, ask the named owner to confirm receipt, and
   write an owner-only `ResolvedMessagingTarget` receipt containing the exact
   Hermes target plus configuration, recipient, and target hashes. Skip leaves
   messaging visibly untested. **Failure boundary:** the typed send guard blocks
   automatic delivery unless this exact receipt remains current; no fallback app.
9. **Separate messaging health from gateway health (`scripts/setup_runtime.py`,
   `scripts/setup_cli/flows/verification.py`, `tests/test_setup_runtime.py`;
   map `M5`).** Keep `gateway` as process readiness. Add
   `messaging_configured` and `messaging_delivery` only from a current,
   recipient-confirmed exact-target receipt. A draft-only binding may remain
   ready with delivery skipped; an automatic-send binding without current
   proof is partial. **Failure boundary:** a running gateway never promotes an
   unconfigured or untested app to pass.
10. **Enforce every normal downstream send (`scripts/authorized_message.py`,
    `automations/*.md`, `tests/test_setup_messaging.py`; map `M5`).** Parse the
    Pydantic binding immediately before delivery, require `send automatically`,
    resolve only the matching profile-private exact target, and invoke Hermes.
    Draft-first atomically writes an idempotent action-keyed artifact under
    `weeks/<week>/outbound/`; a human may approve only that exact file through
    `--approve-draft`. Stale, absent, or tampered route proof returns
    `owner_route_not_confirmed` without calling Hermes.
11. **Reconcile copy and operated proof (`tickets/TASK-0017/design.md`,
    `docs/features/FEAT-0011-setup-ux-ascii.md`, `docs/customer-setup.md`,
    `workspace.hermes.md`, `automations/*.md`; map `M5`).** Use `hermes send`
    everywhere, document setup/recovery without exposing IDs or secrets, and
    capture the review screen plus success/failure result in the existing
    setup evidence route. **Failure boundary:** no live test send during offline
    QA; provider-backed proof remains an explicit human-gated acceptance run.

## Done / Proof

```yaml
metric: one entry command reaches a converged idempotent state
done:
  - Fresh install and existing-profile update use the same discoverable entry point.
  - An existing profile opens a maintenance menu instead of automatically running the full installer.
  - Workspace configuration applies without model OAuth provider OAuth unconditional image pulls or a live webhook test.
  - An incomplete profile offers an idempotent resume path and preserves its existing draft and secrets.
  - Long provider waits show bounded progress and every failure names one customer action.
  - Only unavoidable credential, OAuth, sharing, and deploy gates require a human.
  - Setup renders reviewed providers by data-source role and deduplicates shared Hermes MCP connections.
  - Failed provider certification offers retry or defer; defer preserves setup and exposes Test integrations on rerun.
  - Customers choose message jobs and draft/send behavior without seeing internal environment or recipient-policy types.
  - Messaging credentials remain Hermes-owned and setup reuses the native gateway configuration flow.
  - A connection test requires explicit confirmation and records a redacted owner-only receipt.
  - Gateway process health, app configuration, and tested delivery are separate truthful lanes.
  - Employee follow-ups never reuse an owner destination and automatic send is not claimed without current route proof.
  - Repo-owned desired state is inspectable and profile-owned state is preserved.
  - An unchanged rerun reports no duplicate or unnecessary mutations.
rubric_families: [installability, idempotency, ownership-safety, error-actionability]
required_tas_gates: [plan, implementation, qa, review]
hard_gates: [no POSIX-shell-only contract, no secret output, no unknown-file deletion]
checks:
  - python3 -m unittest tests.test_setup_architecture tests.test_setup_init tests.test_setup_launch -v
  - python3 -m unittest tests.test_workspace_schema tests.test_setup_messaging tests.test_setup_runtime -v
  - python3 -m unittest discover -s tests -p 'test_*.py' -v
  - disposable clean install update and rerun smoke
evidence:
  - tickets/TASK-0017/progress.md
  - tickets/TASK-0017/design.md
  - tickets/TASK-0017/artifacts/receipts/
```

## Agent Contract

- **Open:** installed command help plus `preview`, `apply`, and `update` modes.
- **Test hook:** disposable profile/home fixture with fake Hermes command
  recorder and one real clean-profile smoke.
- **Stabilize:** fixed distribution commit, fake secrets by presence only, and
  deterministic desired schedules.
- **Inspect:** plan diff, owner class for every path, command log, receipt, and
  pre/post hashes of protected user state.
- **Key states:** fresh preview, human-required, applied, interrupted/resumed,
  unchanged rerun, update with local user state, messaging skipped,
  draft-first configured, connection-test approved/skipped/failed/passed, and
  automatic send blocked by stale or missing proof.
- **QA cookbook:** none yet.
- **Expected artifacts:** redacted receipts and protected-state diff.
- **Delegate with:** TASK-0017 and this file; write progress/evidence here.

## Run Hints

```yaml
likely_size: large
goal_recommended: true
compute_hint: local tests plus clean-profile integration
proof_weight: hybrid
batchable: false
no_batch_reason: shared lifecycle owner and single-writer distribution boundary
human_gates: [final clean-machine apply]
```

## Lean / Review Receipt

- **First sufficient rung:** reuse the existing `setup.py` orchestration,
  Compose services, profile reconciliation, verification commands, Hermes
  `gateway setup`, and Hermes `send`; add only typed message choices, one thin
  messaging flow, configuration-bound receipts, and separate health lanes.
- **Rejected expansion:** separate customer scripts, a new GUI, Docker-socket
  access inside Hermes, report/schedule editors without underlying contracts,
  a messaging SDK, a second credential store, raw token prompts, and a second
  setup state database.
- **Review verdict:** initial hostile review blocked the plan on exact-target
  resolution, send-boundary enforcement, the employee dead end, and false
  readiness from target listing. The repaired implementation requires a
  recipient-confirmed exact-target receipt and disables employee follow-up.
  Post-implementation review then found installed-path, result/recovery, and
  draft-handoff gaps; all were repaired. Final narrow review is `TAS-A —
  pass-ready` for the messaging scope.

## State

- **Current:** the repaired messaging UX, typed workspace boundary, exact-target
  receipt, installed downstream send guard, idempotent draft/approval path, and
  focused tests are implemented alongside the canonical
  Windows launcher, Compose stack, interactive setup, reconciliation, receipts,
  health lanes, and packaged frozen contract evals.
- **Next:** reconcile final independent review, then run the clean
  Windows/WSL2 installation and provider-backed Notion
  MCP, Cloudflare ingress, signature, restart, and threaded-reply proof.
- **Blockers:** access to a clean Windows/WSL2 Docker runtime and provider
  credentials for the operated acceptance run.

## Links

- Live Telegram QA (provider accepted message `27`; human confirmation pending):
  `tickets/TASK-0017/artifacts/qa/20260830T173638Z-telegram-live/result.json`

- `distribution.yaml`
- `setup.py`
- `scripts/setup_cli/`
- `schemas/workspace.py`
- `workspace.hermes.template.md`
- `docs/features/FEAT-0011-setup-ux-ascii.md`
- `tickets/TASK-0017/progress.md`
- `tickets/archive/TASK-0015/ticket.md`
