---
title: Autonomous testing
status: active
owner: Company OS
created_at: 2026-08-29
updated_at: 2026-08-29
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
node --test evals/filesystem/tests/*.test.mjs
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

## Failure handling

1. Stop at the first failed required lane and keep its output.
2. Reproduce with the narrowest owning test.
3. Repair the source owner; do not patch installed profile copies or generated
   receipts.
4. Rerun the narrow test, then the complete safe default lane.
5. Report the failed check, repair, final command results, and any live lane
   that remained intentionally unrun.
