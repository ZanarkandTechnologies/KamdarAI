---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0015
title: Package a lean Hermes Company OS distribution
status: complete
claimed_by: codex-root
created_at: 2026-08-27T08:30:00Z
updated_at: 2026-08-27T08:30:00Z
depends_on: [TASK-0014]
ui_scope: false
feature_refs: [FEAT-0009]
---

# TASK-0015: Package a lean Hermes Company OS distribution

## Summary

Turn the public KamdarAI repository into a native Hermes distribution that
creates a new profile while copying only runtime-owned Company OS files. Extend
`setup-kamdar-workspace` to install the workspace and reconcile Daily and Weekly
scheduled jobs without shipping the development harness.

## Scope

- In: `distribution.yaml`, exact payload allowlist, workspace setup helper,
  idempotent cron reconciliation, setup documentation, and
  clean-install proof.
- Out: repository-history rewriting, deleting tests/evidence, credentials,
  production Notion writes, gateway service installation, and stale live-only
  skill copies retired by the consolidated automation contracts.

## Delta

> **Before:** A client clones the full 104 MB development repository, manually
> creates a profile, runs a source-to-runtime installer, and separately creates
> scheduled jobs.
>
> **After:** `hermes profile install` creates the profile and copies an explicit
> sub-megabyte runtime payload. The existing `setup-kamdar-workspace` skill
> installs the workspace and reconciles both jobs.
>
> **Example:** Installing as `acme-company-os` preserves client credentials and
> state, excludes `tickets/`, `tests/`, `seed/`, and full eval suites, and
> schedules Daily at 08:00 weekdays and Weekly at 18:00 Friday.

## Contract Diagram

```text
[public KamdarAI git repo]
          |
          | hermes profile install --name <client>
          v
[new profile + explicit distribution-owned files]
          |
          | setup-kamdar-workspace
          v
[workspace contracts] + [Daily cron] + [Weekly cron]
          |
          +--> separate optional notion-webhook-onboarding

Excluded: tickets, tests, seed, screenshots, run evidence, credentials, state
```

## Change Plan

1. Add a path-aware Hermes distribution manifest whose allowlist includes the
   two existing setup skills and excludes development-only surfaces.
2. Extend the existing workspace installer for verified installed-distribution
   mode and add deterministic profile/cadence reconciliation under that skill.
3. Replace the manual README path with native install, setup, onboard, update,
   and optional Notion commands.
4. Prove the exact copied payload in a temporary HOME, rerun all repository
   tests, review the skill contract, then commit and push.

## Done

- [x] Native `hermes profile install` creates a named profile from this repo.
- [x] Installed profile visibly contains both existing setup skills and no facade.
- [x] Client payload excludes development tickets, tests, seed, and run evidence.
- [x] Onboarding preview is non-mutating and apply is idempotent.
- [x] Daily and Weekly cron jobs are created or reconciled with client-local paths.
- [x] README states when the profile is created, configured, onboarded, and updated.
- [x] Focused, full, install-smoke, and skill-contract checks pass.

## QA Strategy

```yaml
proof_weight: hybrid
checks:
  - python3 -m unittest discover -s skills/setup-kamdar-workspace/tests -v
  - python3 -m unittest discover -s tests -p 'test_*.py' -v
  - node --test evals/filesystem/tests/*.test.mjs
  - HOME=<temporary> hermes profile install . --name kamdar-install-smoke -y
evidence_paths: [tickets/TASK-0015/progress.md, tickets/TASK-0015/artifacts/review/]
final_checkpoint: payload inspection plus skill-contract review
residual_risk: Live provider credentials and Notion authority remain client-owned onboarding gates.
```

## State

- Current: complete; public GitHub install and apply proof passed.
- Next: run `hermes setup` and Notion onboarding on the client machine.
- Blockers: none.
