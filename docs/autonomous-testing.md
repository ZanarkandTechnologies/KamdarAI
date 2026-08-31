---
title: Autonomous testing
status: active
owner: Company OS
created_at: 2026-08-29
updated_at: 2026-08-31
---

# Autonomous testing

This runbook is the default verification contract for coding agents and CI.
The autonomous lane is deterministic, network-free, and safe to rerun. Live
provider tests require an explicitly selected profile and separate authority.

## Safe default lane

Run these commands from the repository root:

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 apps/installer/validate_context.py --context workspace.hermes.md
```

The lane passes only when every command exits zero and context validation prints
`context_valid=true`. Do not update expected files merely to turn a failure green.

Tests live beside their behavioral owners in `apps/*/tests/`,
`seed/tests/`, and plugin packages. Root `tests/contracts/`
holds repository-wide invariants; `tests/test_owned_packages.py` provides one
standard discovery bridge. Installer E2E and live-provider cases remain
explicit gated lanes in `apps/installer/tests/`.

## Targeted setup lane

Use this smaller loop while changing setup, distribution, or webhook code:

```bash
python3 -m unittest \
  apps.installer.tests.test_architecture \
  apps.installer.tests.test_init \
  apps.installer.tests.test_launch \
  apps.installer.tests.test_connections \
  apps.installer.tests.test_runtime \
  apps.installer.tests.test_profile \
  apps.installer.tests.test_workspace \
  apps.installer.tests.test_provider_catalog \
  apps.installer.tests.test_connection_evals \
  apps.installer.tests.test_composio_session \
  tests.contracts.test_distribution \
  plugins.platforms.notion.tests.test_comment_adapter \
  plugins.platforms.notion.tests.test_webhook_protocol -v
python3 -m py_compile \
  setup.py apps/installer/cli/*.py apps/installer/cli/flows/*.py \
  apps/installer/runtime.py apps/installer/profile.py apps/installer/workspace.py
```

After the targeted lane passes, run the complete safe default lane before
claiming completion.

## Real Docker setup lane

Setup-entrypoint, container, dashboard, and restart claims require the real
pinned image. Run this lane on a Docker-capable macOS or Linux host:

```bash
python3 apps/installer/e2e.py safe-docker \
  --receipt /absolute/private-or-ticket-artifact-path/docker-receipt.json
```

The runner creates a unique Compose project, data volume, network, and
loopback dashboard port. It rejects `kamdar-hermes-data` and port `9119`, runs
the exact `python /distribution/setup.py launch` entry point, distinguishes the
expected unattended wizard boundary from a routed `hermes launch` error,
reconciles the newly created native profile, probes the real dashboard, and
proves stop/start recovery. It retries interrupted image pulls and accepts
both JSON-array and newline-delimited Compose `ps` output. Cleanup is limited
to names beginning with `company-os-e2e-`; use `--keep` only for immediate
visual inspection and then remove that exact run.

The container dashboard remains bound to Hermes' loopback interface. The
packaged `dashboard_bridge.py` exposes it to the container port while Compose
publishes that port only on host `127.0.0.1`; it does not use the removed
`--insecure` bypass.

## Real PKMS Doctor lane

When the task explicitly authorizes reads and model spend against one named
profile, run:

```bash
python3 setup.py doctor --profile-home "$COMPANY_OS_PROFILE"
```

Doctor asks native Hermes to read the installed workspace and selected cadence
contract, use its configured skills and MCP tools, and stop after producing and
reviewing the declared local output files. Its prompt explicitly disables provider
mutations, messaging, and artifact sync. Missing information must remain a
named blocker rather than a guessed value. Generated private results stay below
the named profile and must not be copied into Git or CI artifacts.

## Installed and live lanes

Installed-profile verification is allowed only against the profile named by
the task. Use a task-specific variable rather than relying on ambient profile
selection:

```bash
COMPANY_OS_PROFILE=/absolute/path/to/profile
python3 setup.py verify --profile-home "$COMPANY_OS_PROFILE" --skip-connections
```

`--live`, connection tests, Notion comments, email, Drive writes, and
`--allow-side-effects` are not part of autonomous default testing. Run them only
when the task explicitly authorizes the provider, account, destination, and
write scope. Preserve the redacted receipt and report `ready`, `partial`, or
`blocked`; never convert a skipped live lane into a pass.

### Global Telegram delivery test

The global Python discovery includes one provider-backed Telegram acceptance
test, skipped by default. When the task explicitly authorizes one message to the
configured owner route, run:

```bash
COMPANY_OS_RUN_TELEGRAM_LIVE=1 \
COMPANY_OS_PROFILE=/absolute/path/to/the/named/profile \
python3 -m unittest apps.installer.tests.test_messaging_live -v
```

This sends exactly one labeled connection-test message. It asserts provider
success, an exact target, a target hash, and a provider message ID without
printing the destination ID. Human receipt confirmation remains a separate
acceptance fact; provider success alone must not enable automatic messaging.

## Failure handling

1. Stop at the first failed required lane and keep its output.
2. Reproduce with the narrowest owning test.
3. Repair the source owner; do not patch installed profile copies or generated
   receipts.
4. Rerun the narrow test, then the complete safe default lane.
5. Report the failed check, repair, final command results, and any live lane
   that remained intentionally unrun.
