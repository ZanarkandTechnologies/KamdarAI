---
title: Autonomous testing
status: active
owner: Company OS
created_at: 2026-08-29
updated_at: 2026-08-31
feature_refs: [FEAT-0011]
---

# Autonomous testing

This runbook is the default verification contract for coding agents and CI.
The autonomous lane is deterministic, network-free, and safe to rerun. Live
provider tests require an explicitly selected profile and separate authority.

## Safe default lane

Run these commands from the repository root:

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/validate_company_context.py --context workspace.hermes.md
python3 scripts/run_installed_evals.py --root .
```

The lane passes only when every command exits zero, context validation prints
`context_valid=true`, and the installed-eval receipt reports `"status":
"pass"`. Do not update expected files merely to turn a failure green.

## Targeted setup lane

Use this smaller loop while changing setup, distribution, or webhook code:

```bash
python3 -m unittest \
  tests.test_setup_architecture \
  tests.test_setup_init \
  tests.test_setup_launch \
  tests.test_setup_runtime \
  tests.test_setup_profile \
  tests.test_setup_workspace \
  tests.test_setup_certify_ux \
  tests.test_provider_catalog \
  tests.test_connection_evals \
  tests.test_composio_session \
  tests.test_distribution \
  tests.test_notion_comment_adapter \
  tests.test_notion_webhook_protocol -v
python3 -m py_compile \
  setup.py scripts/setup_cli/*.py scripts/setup_cli/flows/*.py \
  scripts/setup_runtime.py scripts/setup_profile.py scripts/setup_workspace.py
```

After the targeted lane passes, run the complete safe default lane before
claiming completion.

## Real Docker setup lane

Setup-entrypoint, container, dashboard, and restart claims require the real
pinned image. Run this lane on a Docker-capable macOS or Linux host:

```bash
python3 scripts/run_setup_e2e.py safe-docker \
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

Doctor uses the profile's authenticated Notion connection to read only the
selected Projects, Tasks, Goals, and Areas data sources. It reads active Tasks
plus Done Tasks edited during the current operating week, and fetches complete
page bodies for selected Projects and Tasks. Exact source IDs and
the live Doctor model come from the owner-only
`<profile>/company-os-doctor-bindings.json`; that file must never enter source
control. Doctor filters terminal
history at the provider, paginates every remaining row, freezes a compact
management snapshot, calls that configured live model once per cadence, and
judges only the intermediary files with one separate no-tools model call per
cadence. It writes the canonical `result.json`, rendered `preview.md`, immutable
`source-snapshot.json`, delivery-disabled `handoff.json`, and the cadence's
existing eval artifacts. The existing eval viewer adapts those artifacts and
lists one outcome for every selected feature. Exit `1` means the real run
completed but required source information is missing; it is not a technical
failure. Every trustworthy receipt must say `input_mode: configured_sources`, `model_mode: live`,
`downstream_calls: 0`, list no mutation operations, show unchanged source and
workspace hashes. A truthful missing-information feature is blocked rather than
assigned a false pass grade. Reports and the workspace proposal
remain mode-0600 below the named profile; do not copy their real contents into
Git or CI artifacts.

The installed-distribution setup test also seeds both retired skill paths. Its
preview assertion proves no deletion occurs, then its apply assertion proves
only those exact derived directories are removed while an unrelated customer
skill is preserved.

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
python3 -m unittest tests.test_setup_messaging_live -v
```

This sends exactly one labeled connection-test message. It asserts provider
success, an exact target, a target hash, and a provider message ID without
printing the destination ID. Human receipt confirmation remains a separate
acceptance fact; provider success alone must not enable automatic messaging.

### Stage 2 delivery-contract tests

The global offline suite exercises complete multi-provider plan compilation,
disabled-policy zero-call behavior, missing-destination blocking, provider
read-back, private-workspace application, messaging-guard routing, and
idempotent reruns:

```bash
python3 -m unittest tests.test_automation_delivery -v
```

These tests use a command recorder and make no provider calls. Do not run
`setup.py deliver ... --apply` against a real handoff unless the exact isolated
environment, configured destinations, and resulting actions have been reviewed.

## Failure handling

1. Stop at the first failed required lane and keep its output.
2. Reproduce with the narrowest owning test.
3. Repair the source owner; do not patch installed profile copies or generated
   receipts.
4. Rerun the narrow test, then the complete safe default lane.
5. Report the failed check, repair, final command results, and any live lane
   that remained intentionally unrun.
