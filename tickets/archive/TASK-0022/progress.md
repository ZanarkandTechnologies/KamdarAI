---
ticket_id: TASK-0022
updated_at: 2026-08-29T00:00:00Z
status: in_progress
---

# Progress

## Implemented

- Added validated per-data-source provider catalogs for Projects, Tasks,
  People, Knowledge, and Reports.
- Replaced free-form provider entry for managed data sources with reviewed
  catalog selection.
- Delegated MCP install, OAuth, and discovery to Hermes catalog commands.
- Added concurrent Hermes prompt execution, redacted session export,
  deterministic trace prechecks, one consolidated judge call, and owner-only
  configuration-bound receipts.
- Added `setup.py certify`, a **Test integrations** launcher action, and a
  `connection_evals` health lane.
- Added Gmail and Google Drive through one fixed-tool Composio MCP session;
  Hermes stores the project API key and no Composio CLI is installed.
- Added failed-row feedback plus retry/defer recovery. Deferred certification
  preserves setup and renders as partial health.
- Added autonomous fake-Hermes coverage for concurrency, one-call judging,
  provider-only toolsets, failures, side-effect gates, permissions, stale
  configuration, and stale eval contracts.

## Proof

```text
python3 -m unittest discover -s tests -p 'test_*.py' -v
# 97 passed

python3 -m unittest discover -s tests -p 'test_*.py' -v
# 100 passed, 2 skipped, 0 failed

python3 scripts/validate_company_context.py --context workspace.hermes.md
# context_valid=true
```

Hermes CLI help and the installed MCP catalog were also inspected: Notion and
Linear are catalog entries; install, login, test, scoped toolsets, bounded
one-shot chat, and redacted session export are native surfaces.

## Review

- **Rubrics:** setup-operability, eval-quality, least-privilege, truthfulness.
- **Rejection attempts:** unsupported webhook-selector argument, unrestricted
  executor tools, a false judge pass with one failed assertion, stale receipts
  after assertion changes, unconfirmed future side effects, permissive
  receipt-directory permissions, an OAuth status query that could include
  disconnected toolkits, and a defer action that could overwrite failed proof.
- **Repairs:** all eight were fixed and covered by regression tests. Composio
  status now requests connected toolkits only; a defer writes a new receipt
  linked to the preserved failed run.
- **Verdict:** `TAS-A / pass` for local implementation and autonomous test
  evidence. No real-provider or Windows support claim is approved yet.

## Remaining

- Operated authenticated Notion/Linear proof against isolated sinks.
- Operated authenticated Gmail/Drive proof with a real Composio project and
  isolated account/folder.
