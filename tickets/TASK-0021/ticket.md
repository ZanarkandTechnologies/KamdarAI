---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0021
title: Consolidate the product documentation around the tested lifecycle
status: todo
claimed_by: null
created_at: 2026-08-28T08:20:25Z
updated_at: 2026-08-28T08:20:25Z
depends_on: [TASK-0017, TASK-0018, TASK-0019, TASK-0020, TASK-0022]
ui_scope: false
feature_refs: [FEAT-0011]
---

# TASK-0021: Consolidate the product documentation around the tested lifecycle

## Summary

Replace the current implementation-led README and scattered onboarding prose
with one concise, tested product journey: choose a supported topology, install,
complete unavoidable human gates, verify, tune the report template, operate,
update, and recover. Retire or redirect stale duplicate setup instructions.

## Scope

- **In:** audience-specific quickstart; supported topology table; one-command
  install/reconcile/update/verify; human gates; ownership model; template-tuning
  guide; health receipt interpretation; MCP vs webhook explanation; Docker and
  Windows paths; recovery/troubleshooting; command/link validation; stale-doc
  consolidation.
- **Out:** documenting unsupported routes, duplicating Hermes reference docs,
  broad Company OS operating-manual rewrite, marketing site, screenshots with
  secrets or client data, and docs ahead of tested behavior.
- **Split trigger:** documentation must follow the accepted implemented command
  and provider contracts rather than speculate in parallel.

## Delta

> **Before:** The README exposes internal scripts, environment variables, plugin
> commands, webhook phases, and development eval details as one long setup path.
>
> **After:** A client sees one tested quickstart and only opens focused pages for
> topology, authorization, template tuning, update, or recovery.
>
> **Example:** The Windows quickstart names the proven WSL2 or Docker route,
> shows one command, explains the OAuth pause, and ends by interpreting one
> `kamdar verify` receipt.

## Map

```text
README quickstart
  +-- supported deployment
  +-- authorize Notion / optional webhook
  +-- tune output template
  +-- verify and interpret
  `-- update / recover
```

## Change Plan

1. Inventory current product docs and mark canonical, merge, redirect, or
   remove based on the implemented lifecycle owners.
2. Write the shortest client quickstart and focused task pages using real
   commands and representative redacted receipts.
3. Explain repo desired state vs profile secrets/auth/user data vs live
   workspace/generated state, and distribution update vs export snapshot.
4. Run docs command/link checks and a fresh-reader walkthrough; remove obsolete
   duplicate setup instructions.

## Done / Proof

```yaml
metric: documented commands and links pass/fail
done:
  - One canonical client quickstart covers install through verified readiness.
  - Windows and Docker support claims exactly match TASK-0016 evidence.
  - MCP read/write OAuth and separate webhook ingress are explained plainly.
  - Template tuning and repo-to-profile update have one canonical guide each.
  - Stale setup commands are removed or redirected without duplicate ownership.
rubric_families: [clarity, task-completion, technical-accuracy, information-architecture]
required_tas_gates: [docs-qa, fresh-reader-review]
hard_gates: [no untested command, no secret example, no unsupported claim]
checks:
  - docs link checker
  - command help/smoke validation
  - fresh clean-profile walkthrough against the quickstart
evidence:
  - tickets/TASK-0021/progress.md
  - tickets/TASK-0021/artifacts/docs-qa.md
```

## Agent Contract

- **Open:** root README first; every later page must be reachable from its task.
- **Test hook:** extract documented commands and validate `--help` or safe smoke;
  link checker plus clean-reader checklist.
- **Stabilize:** fixed released command/version and redacted sample receipts.
- **Inspect:** doc ownership inventory, broken/stale link report, and reader path.
- **Key states:** fresh install, human-required, partial health, ready, update,
  recovery.
- **QA cookbook:** none yet.
- **Expected artifacts:** docs inventory and operated walkthrough report.
- **Delegate with:** TASK-0021 and this file; write progress/evidence here.

## Run Hints

```yaml
likely_size: medium
goal_recommended: false
compute_hint: local docs checks plus one walkthrough
proof_weight: hybrid
batchable: false
no_batch_reason: final docs must reconcile the accepted lifecycle as a whole
human_gates: [fresh-reader review]
```

## State

- **Current:** todo; existing docs accurately expose many internals but do not
  present a seamless tested client journey.
- **Next:** consolidate after TASK-0017 through TASK-0020 settle commands and
  receipts.
- **Blockers:** TASK-0017, TASK-0018, TASK-0019, TASK-0020.

## Links

- `README.md`
- `docs/systems/kamdar-company-os-operator-manual.md`
- `templates/README.md`
