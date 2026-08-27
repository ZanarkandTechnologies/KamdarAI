---
ticket_id: TASK-0015
updated_at: 2026-08-27T09:15:00Z
status: complete
---

# Progress

## Changed

- Added a Hermes `distribution.yaml` with an explicit runtime-only allowlist.
- Extended `setup-kamdar-workspace` for verified installed distributions.
- Added profile setup that configures cwd and reconciles Daily/Weekly jobs.
- Replaced manual clone-first client instructions with native profile install.
- Kept `notion-webhook-onboarding` as the separate provider/authentication owner.

## Proof

- Focused setup tests: 12 passed.
- Distribution contract tests: 2 passed.
- Core repository contract checks: 11 passed.
- Native temporary install: passed; 356 KB profile payload.
- Native apply and update: workspace copied, `terminal.cwd` read back, both jobs
  created, and unchanged rerun reported both jobs in sync.
- Gateway-stopped boundary: correctly reports `partial` and
  `scheduler_ready=false` while preserving the installed jobs.
- Excluded paths verified absent: `docs/`, `tickets/`, `tests/`, `seed/`, and
  `skills/company-os-onboard/`.
- Public GitHub install from
  `https://github.com/ZanarkandTechnologies/KamdarAI` passed after push; apply
  created both jobs and correctly reported the stopped smoke gateway as partial.

## Handoff

- Client-owned remaining work: `hermes setup`, gateway start/service install,
  credentials, and the separate `notion-webhook-onboarding` human gates.
