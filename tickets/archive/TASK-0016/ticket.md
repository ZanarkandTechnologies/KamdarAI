---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0016
title: Automate isolated Docker setup topology proof
status: todo
claimed_by: null
created_at: 2026-08-28T08:20:25Z
updated_at: 2026-08-30T00:00:00Z
depends_on: []
ui_scope: false
feature_refs: [FEAT-0011]
---

# TASK-0016: Automate isolated Docker setup topology proof

## Summary

Replace setup confidence based on command-string assertions and occasional
Windows walkthroughs with one operated matrix runner. Its safe default mode
must execute the real pinned Hermes image and exact Compose setup path on
macOS/Linux inside disposable resources, prove service startup, persistence,
verification, and rerun behavior, then destroy only its own test resources.
TASK-0020 owns real connected-data and model proof through a separate read-only
Doctor lane; this topology runner must not duplicate provider behavior.

The runner supplements rather than replaces the Windows acceptance lane:
`setup.cmd` remains a thin prerequisite/action-code wrapper, while the shared
container path receives continuous proof on Docker-capable hosts.

## Scope

- **In:** unique Compose project, volume, network, and dashboard port per run;
  the real source-controlled workspace contract; exact `setup.py launch` container
  invocation; bounded launcher exit-code handling; gateway/dashboard startup;
  dashboard reachability; static health lanes; stop/start persistence;
  unchanged update/rerun; protected-resource assertions; redacted JSON receipt;
  deterministic runner tests; setup-change CI lane after local stability; and
  an optional bridge that invokes TASK-0020 Doctor in the proven Compose
  topology once that command exists.
- **Out:** production Notion, Gmail, Drive, or messaging writes; copying OAuth
  tokens into source control or ordinary CI; automatic OAuth consent; claiming
  Windows UI proof from a Linux runner; deleting any resource not named by the
  current run; treating a skipped Doctor lane as passed; and installing Zanarkand
  through Kamdar's hard-coded profile, volume, or workspace identity.
- **Split trigger:** a real Zanarkand deployment belongs in a dedicated
  Zanarkand company project scaffolded from HermesCorp. This ticket may prove
  the generic workflow here and run Kamdar's existing isolated eval targets;
  it must not mix Zanarkand data into `kamdar-ai` or `kamdar-hermes-data`.

## Delta

> **Before:** unit tests prove that `setup.cmd` contains the intended command,
> but they do not start the setup container. A manual run can still discover
> image-entrypoint, TTY, volume, port, service-start, or health failures late.
>
> **After:** one command operates the exact Docker path against disposable
> resources, records every state transition, proves restart and rerun behavior,
> and fails closed before a protected profile or provider target can be touched.
>
> **Example:** a setup change opens a pull request; Linux CI runs the pinned
> image with `company-os-e2e-<run-id>` resources, observes the launch action,
> starts gateway/dashboard, verifies expected lanes, restarts the stack, reruns
> update without drift, writes a redacted receipt, and removes only that run's
> volume. A separately operated TASK-0020 receipt can later prove real
> configured-source reads and intermediary output quality with no downstream
> provider mutation.

## Contract Diagram

```text
[C1 safe Docker lane]
source commit + real workspace contract
              |
              v
unique project / volume / port ----guard----X kamdar-hermes-data :9119
              |
              v
compose run setup python /distribution/setup.py launch --non-interactive
              |
       action code -> up gateway/dashboard -> static verify
              |                                  |
              +---- stop/start -> rerun ----------+
                              |
                      redacted receipt
                              |
                 down -v exact run resources

[C2 read-only Doctor bridge; owned by TASK-0020]
explicit Compose project/volume + configured source bindings
              |
              v
exact read allowlist -> private snapshot -> direct no-tools inference/eval
              |
       intermediary files + redacted zero-mutation receipt

[C3 platform claim]
safe Docker lane = shared container-path proof
Windows self-hosted run = setup.cmd / Docker Desktop / WSL2 proof
```

## Change Plan

1. **Isolate the real Compose topology (`C1`).** Add
   `tests/e2e/compose.e2e.yaml` as a test-only override for a required
   run-specific volume and host dashboard port. Use the actual distribution and
   source-controlled `workspace.hermes.md`; do not substitute a fictional or
   provider-free fixture. The runner operates from a temporary source copy so
   product setup gains no test-only workspace flag. Before execution, render Compose
   config and reject the production volume name, port, an empty run ID, or any
   unexpanded variable. Preserve the product's internal
   `/opt/data/profiles/kamdar-ai` contract, but prove `/opt/data` is backed only
   by the current run's unique volume. Treat the rendered model as
   authoritative: it must contain exactly one dashboard mapping, proving that
   the test overlay replaced rather than appended to port `9119`.
2. **Operate setup with one standard-library runner (`C1`).** Add
   `scripts/run_setup_e2e.py` with `safe-docker` as the default mode. It records
   Docker/Compose versions, pulls only the pinned image, runs the exact Python
   setup command, asserts the expected bounded action code, starts
   gateway/dashboard, proves their long-running Compose container identities,
   probes the mapped dashboard port and gateway service over the Compose
   network, runs verification, stops and restarts services, reruns
   update/reconcile, compares protected and managed state, and emits one
   redacted JSON receipt. A gateway process started inside the one-off setup
   container is never accepted as proof of the `gateway` service. `finally` teardown may
   call `compose down -v --remove-orphans` only after matching the generated
   project and volume names for this run.
3. **Test the runner through real Docker only (`C1`, `C3`).** Add
   `tests/e2e/test_run_setup_e2e.py` as an environment-gated operated suite that invokes
   the actual Docker/Compose commands for launch-code propagation, bounded
   timeout, secret redaction, partial/failed lanes, interruption cleanup, exact
   resource ownership, and refusal to touch `kamdar-hermes-data` or port `9119`.
   Derive failure cases by interrupting or misconfiguring the disposable real
   run, never by replacing Docker with a fake command recorder. Docker
   unavailability is an explicit unproved state, not a pass.
4. **Promote the same runner to CI after representative proof (`C1`).** Add
   `.github/workflows/setup-e2e.yml` as manual dispatch first so the unchanged
   runner can accumulate five macOS-local and five hosted-Linux passes. Only
   after those receipts agree, enable its setup-related pull-request path
   filter. Upload redacted success and failure receipts throughout the
   ten-run promotion window; after promotion retain failure receipts and the
   latest passing receipt. Cancel superseded runs and enforce a time limit. Do
   not place provider credentials in this workflow.
5. **Bridge to the real-data Doctor without owning it (`C2`).** After the safe
   topology lane passes and TASK-0020 ships, allow the runner to invoke
   `setup.py doctor` inside an explicitly named persistent Compose project and
   volume. Resolve service containers and mounts by Compose labels and reject
   the production-named volume. Accept only a TASK-0020 receipt with
   `input_mode: configured_sources`, `model_mode: live`, a reviewed read-only
   operation inventory, zero registered mutation handlers, zero downstream
   calls, and private intermediary artifacts. This ticket owns only proof that
   Doctor runs correctly through the Compose topology; TASK-0020 owns source
   fetching, workspace proposal generation, evaluation, privacy, and the
   no-delivery boundary.
6. **Retain honest platform and company boundaries (`C3`).** Keep one final
   self-hosted Windows/WSL2 run for double-click behavior, prerequisite copy,
   browser opening, and action-code handoff. Generalize the proven runner in
   HermesCorp only after Kamdar proof is stable. Scaffold Zanarkand as its own
   company project before any Zanarkand OAuth or Notion write; do not rename or
   reuse the Kamdar deployment in place.

## Done / Proof

```yaml
metric: exact setup topology passes safe Docker and can host the read-only Doctor lane
done:
  - One safe command runs the pinned setup container on macOS/Linux without touching the production-named volume or port.
  - Fresh launch reaches the Python setup entry point and returns the expected bounded launcher action.
  - Gateway and dashboard long-running service containers start, the mapped dashboard and network gateway respond, verification reports honest lane states, and no one-off setup process or skip is promoted to pass.
  - Stop/start preserves the disposable profile and an unchanged rerun produces no unexpected managed-state drift.
  - Success, failure, timeout, and interruption remove only the current safe-lane resources.
  - The receipt contains commands, versions, durations, exit codes, lane verdicts, hashes, and cleanup state without secrets or provider payloads.
  - CI invokes the same runner used locally and fails on setup entrypoint, container, service, health, persistence, rerun, or cleanup regressions.
  - The optional TASK-0020 bridge accepts only a real configured-source and live-model Doctor receipt with zero mutation surface and zero downstream calls.
  - Windows support remains unclaimed until the self-hosted setup.cmd acceptance run passes.
rubric_families: [implementation-plan, integration-readiness, evidence-quality]
required_tas_gates: [plan, implementation, qa, review]
hard_gates: [no protected-volume access, no provider mutation, no secret artifact, no fake or fixture lane, no synthetic Windows pass]
checks:
  - python3 -m unittest tests.e2e.test_run_setup_e2e tests.unit.scripts.test_setup_runtime -v
  - python3 scripts/run_setup_e2e.py safe-docker --receipt <temporary-artifact-path>
  - python3 -m unittest discover -s tests -p 'test_*.py' -v
  - python3 -m unittest discover -s tests -p 'test_*.py' -v
  - python3 scripts/run_setup_e2e.py doctor --compose-project <explicit-project> --data-volume <explicit-volume> --receipt <private-artifact-path>
evidence:
  - tickets/TASK-0016/progress.md
  - tickets/TASK-0016/artifacts/topology-matrix.md
  - tickets/TASK-0016/artifacts/receipts/
```

## Agent Contract

- **Open:** Docker Desktop or Linux Docker Engine; explicit persistent Compose
  project and volume only for the optional TASK-0020 Doctor bridge.
- **Test hook:** the real pinned-image runner against disposable Docker resources.
- **Stabilize:** fixed source commit/image digest, generated run ID, disposable
  volume/project/port, real workspace contract, bounded waits, and exact cleanup.
- **Inspect:** rendered Compose config, command/exit timeline, dashboard probe,
  health lanes, managed-state hashes, container restart state, and volume list.
- **Key states:** docker unavailable, fresh, launched, services ready, honestly
  partial, stopped, restarted, unchanged rerun, timed out, interrupted,
  cleaned, Doctor topology mismatch, Doctor blocked, Doctor passed.
- **QA cookbook:** safe mode never reads an ambient Hermes profile or provider
  credential; the Doctor bridge never infers its project, volume, profile, or
  provider target from ambient state.
- **Expected artifacts:** redacted matrix and per-run receipts only.
- **Delegate with:** this ticket and `docs/autonomous-testing.md`; write progress
  and proof under `tickets/TASK-0016/`.

## Run Hints

```yaml
likely_size: large
goal_recommended: true
compute_hint: local Docker plus optional read-only Doctor and Windows runners
proof_weight: hybrid
batchable: false
no_batch_reason: later states depend on the exact profile and resource state produced by earlier states
human_gates: [one-time OAuth and exact configured roots for Doctor, Windows self-hosted access]
```

## Lean / Review Receipt

- **First sufficient rung:** `minimum_new_code` after reusing the current
  Compose services, setup exit codes, verification lanes, connection-eval
  runner, and Python standard library. One override and one runner are needed
  because no existing code operates or isolates the container topology.
- **Smallest first action:** implement and pass the local safe-Docker lane; add
  CI only after ten representative passes and bridge TASK-0020 only after its
  read-only contract is implemented.
- **Rejected expansion:** new E2E framework, duplicate installer, test-only
  flags in product setup, generic secret manager, browser automation for OAuth,
  automatic production writes, and a Kamdar-to-Zanarkand rename inside this
  ticket.
- **Proof preserved:** real image, real Compose command, real service lifecycle,
  honest health lanes, exact cleanup, and a separately owned real-data Doctor
  receipt.
- **Review verdict:** TAS-A / pass after independent re-review. The operated
  lane uses real Docker commands, the real pinned image, and the real source
  workspace; no command substitute or fictional E2E input remains. Minimality
  is owned by the lean receipt above rather than the cleanup-only
  debloatability rubric.

## State

- **Current:** planning revised after the setup command-override incident.
  String-level and unit proof pass, but Docker is stopped on the current Mac;
  no disposable operated container receipt exists yet.
- **Next:** approve this scope, start Docker Desktop, and implement Change Plan
  units 1-3 before any provider or CI work.
- **Blockers:** safe Docker work has no design blocker. Doctor proof requires
  TASK-0020 plus an owner-selected Compose project/volume, configured roots, and
  one-time OAuth inside that deployment. Windows proof
  requires a self-hosted Windows/WSL2 Docker target. Zanarkand setup requires a
  dedicated company project rather than the Kamdar client pack.

## Links

- `compose.yaml`
- `setup.cmd`
- `setup.py`
- `scripts/setup_cli/`
- `scripts/setup_runtime.py`
- `scripts/run_connection_evals.py`
- `docs/autonomous-testing.md`
- `docs/customer-setup.md`
- `tickets/TASK-0017/ticket.md`
- `tickets/TASK-0022/ticket.md`
- `tickets/TASK-0020/ticket.md`
- `/Users/kenjipcx/Zanarkand Technologies/projects/HermesCorp/scripts/create_company_project.py`
