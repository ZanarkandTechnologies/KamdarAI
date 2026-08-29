---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0016
title: Prove the supported Windows and Docker deployment topology
status: todo
claimed_by: null
created_at: 2026-08-28T08:20:25Z
updated_at: 2026-08-28T08:20:25Z
depends_on: []
ui_scope: false
feature_refs: [FEAT-0011]
---

# TASK-0016: Prove the supported Windows and Docker deployment topology

## Summary

Remove the largest deployment uncertainty before rebuilding setup. Operate the
current Hermes distribution lifecycle on clean native and container targets,
then publish the smallest supported topology and ownership matrix for Windows,
Docker, profile storage, workspace storage, scheduler/gateway processes, CLI
access, OAuth callbacks, and updates.

## Scope

- **In:** macOS/Linux baseline; Windows native, WSL2, and/or Docker candidates;
  persistent container profile/workspace volumes; process lifecycle; CLI from
  host and chat; profile install/update; official Notion MCP OAuth feasibility;
  cron persistence; redacted evidence.
- **Out:** production installer implementation, production Notion writes,
  permanent cloud deployment, broad browser UI, and support claims without a
  real operated target.
- **Split trigger:** unresolved cross-platform and headless OAuth feasibility
  blocks every later build ticket.

## Delta

> **Before:** “Windows and Docker support” is an assumption, and failures are
> discovered during client onboarding.
>
> **After:** KamdarAI names one proven Windows route and one persistent Docker
> route, with unsupported routes and every state owner explicit.
>
> **Example:** Evidence may select WSL2 as the Windows v1 path and show that a
> Docker bind-mounted profile survives container replacement while OAuth is
> completed through a host browser.

## Map

```text
[clean target] -> [Hermes install] -> [profile distribution] -> [MCP auth]
       |                  |                    |                    |
       +------ paths / persistence / process / scheduler / receipt +
```

## Change Plan

1. Define the target matrix and exact pass/fail observations before running it.
2. Operate current Hermes profile install/update, MCP test/login, cron status,
   gateway, and profile persistence on real or faithful clean targets.
3. Test whether chat can safely reach required setup commands; select the
   deterministic host entry point regardless of chat capability.
4. Record the ownership decision and constraints in the feature/PRD evidence,
   with no production implementation hidden in the PoC.

## Done / Proof

```yaml
metric: supported topology matrix pass/fail
done:
  - One Windows topology and one persistent Docker topology complete install and unchanged rerun.
  - Profile, workspace, secret, MCP token, scheduler, and generated-state owners are explicit.
  - Chat CLI access is observed and is not a prerequisite for setup.
  - Unsupported candidates have a concrete failure reason.
rubric_families: [cross-platform-operability, ownership-clarity, secret-safety]
required_tas_gates: [grounding, operated-proof, review]
hard_gates: [no secret capture, no synthetic platform pass]
checks:
  - clean-target install receipt
  - container replacement and persistence receipt
  - profile update preservation receipt
  - cron/gateway and MCP observations
evidence:
  - tickets/TASK-0016/artifacts/topology-matrix.md
  - tickets/TASK-0016/artifacts/receipts/
```

## Agent Contract

- **Open:** use the target-specific clean runner or documented VM/container.
- **Test hook:** one matrix runner that records commands, versions, exit codes,
  redacted stdout/stderr, and persistent-path hashes.
- **Stabilize:** disposable profile names and volumes; fixed distribution commit.
- **Inspect:** profile info, file ownership, process status, MCP list/test, cron
  status/history, and unchanged-rerun diff.
- **Key states:** fresh, human-required, ready, restarted, updated, unsupported.
- **QA cookbook:** none yet.
- **Expected artifacts:** topology matrix and redacted receipts.
- **Delegate with:** TASK-0016 and this file; write evidence under its artifacts.

## Run Hints

```yaml
likely_size: medium
goal_recommended: true
compute_hint: requires real Windows and Docker targets
proof_weight: operated
batchable: false
no_batch_reason: topology decisions depend on sequential observed failures and persistence checks
human_gates: [OAuth consent, target access]
```

## State

- **Current:** todo; current macOS install success does not prove Windows or
  Docker ownership.
- **Next:** run the bounded topology PoC before implementing the installer.
- **Blockers:** access to a clean Windows environment and Docker runtime.

## Links

- `docs/prd.md`
- `docs/features/FEAT-0011-seamless-deployment-and-verification.md`
- `tickets/archive/TASK-0015/ticket.md`
