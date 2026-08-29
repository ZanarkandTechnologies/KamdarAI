---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0017
title: Ship one deterministic install reconcile and update entry point
status: in_progress
claimed_by: null
created_at: 2026-08-28T08:20:25Z
updated_at: 2026-08-29T00:00:00Z
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
  workspace/config/schedule reconciliation;
  preview/apply; resumable redacted receipt; idempotency; supported paths from
  TASK-0016; optional chat wrapper that calls the same entry point.
- **Out:** provider-specific live proof, health/eval implementation, Notion
  event ingress, secret values in repo config, deleting unknown runtime files,
  and making profile export the update mechanism.
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
  - Repo-owned desired state is inspectable and profile-owned state is preserved.
  - An unchanged rerun reports no duplicate or unnecessary mutations.
rubric_families: [installability, idempotency, ownership-safety, error-actionability]
required_tas_gates: [plan, implementation, qa, review]
hard_gates: [no POSIX-shell-only contract, no secret output, no unknown-file deletion]
checks:
  - python3 -m unittest tests.test_setup_architecture tests.test_setup_init tests.test_setup_launch -v
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
  unchanged rerun, update with local user state.
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
  Compose services, profile reconciliation, and verification commands; add only
  lifecycle detection, one menu, a workspace-only operation, and bounded
  launcher routing.
- **Rejected expansion:** separate customer scripts, a new GUI, Docker-socket
  access inside Hermes, report/schedule editors without underlying contracts,
  and a second setup state database.
- **Review verdict:** local implementation and contract proof pass. Windows UX
  signoff remains blocked only on the clean Windows/WSL2 operated run.

## State

- **Current:** implementation and local contract proof pass for the canonical
  Windows launcher, Compose stack, interactive setup, reconciliation, receipts,
  health lanes, and packaged frozen contract evals.
- **Next:** run the clean Windows/WSL2 installation and provider-backed Notion
  MCP, Cloudflare ingress, signature, restart, and threaded-reply proof.
- **Blockers:** access to a clean Windows/WSL2 Docker runtime and provider
  credentials for the operated acceptance run.

## Links

- `distribution.yaml`
- `setup.py`
- `scripts/setup_cli/`
- `docs/features/FEAT-0011-setup-ux-ascii.md`
- `tickets/TASK-0017/progress.md`
- `tickets/archive/TASK-0015/ticket.md`
