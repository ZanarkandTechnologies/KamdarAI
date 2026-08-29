---
artifact: deployment-proof
deployment: seed-v2-2026-08-26-04
date: 2026-08-26
status: operated
---

# Current-seed operated proof with CLI hardening

## Environment

- Fresh isolated Notion root: [EVAL — Kamdar Company OS — clean current seed — 2026-08-26](https://app.notion.com/p/EVAL-Kamdar-Company-OS-clean-current-seed-2026-08-26-3c7d43a23942811eb7b1ca97034b11ce)
- Seed namespace: `kamdar-company-os-isolated-notion-seed-2026-08-26-v1`
- Seeded records: 62 (`39 Projects`, `6 People`, `10 Work`, `3 Meetings`, `4 Reports`).
- The Work data source now includes `Daily review version`. Canonical reseeding patched 13 Work/Meeting rows and skipped the other 49 records.
- TASK-115 and TASK-201 are `daily-review-v1` after their required Notion effects were verified. TASK-101 remains unprocessed because its chase was prepared, not sent.
- Active routes in `workspace.hermes.md` point only to this isolated environment. Earlier deployments remain retained.

## Operated behavior

Daily applied one Project replacement, one completed-ticket documentation comment, and one Weekly Draft knowledge update. It prepared one chase without sending it. Weekly applied three Final Project reports, three Final Area reports, one Blocked Company report, three knowledge promotions, and one next-week Project replacement. Every applied effect referenced by the dashboard has a real Notion URL and provider read-back.

The Daily and Weekly automation entry points now require the installed `kamdar-company-os` skill, all four relevant `ntn ... --help` checks, and exact command syntax before any provider call. A fresh Hermes read-only preflight resolved both configured databases, queried them, fetched a Project and Work page, attempted zero writes, and returned no blocker. See [the preflight result](./ntn-contract-preflight.json).

## Evidence dashboard

- Production alias: https://kamdar-company-os-evidence.vercel.app/
- Immutable deployment: https://kamdar-company-os-evidence-75ve1qx81-kenjipcxs-projects.vercel.app/
- Deployment ID: `dpl_DYiYLT79Jxpbi9QBHws6Tc2gVfae`
- Result: `13/13 passed`, `7 features`, `56 checks`.
- Dashboard deployment ID: `seed-v2-2026-08-26-04`.

## Verification

- Python repository tests: 24/24 passed.
- Workspace setup tests: 7/7 passed.
- Webhook onboarding tests: 12/12 passed.
- Filesystem Node tests: 78/78 passed.
- `workspace.hermes.md`, installed workspace sync, Hermes `terminal.cwd`, Vercel readiness, and production dashboard read-back: passed.

## Honest residuals

- The seed references duplicate `ISSUE-CONSENT-01` but does not contain its destination record, so that duplicate disposition has no provider URL.
- The missing Content Area source intentionally keeps the Company report Blocked and proves the incomplete-rollup path.
- The original operated run needed deterministic adapters after Hermes used invalid CLI syntax. The repaired agent contract now passes an autonomous read-only CLI preflight; a complete autonomous write replay has not been claimed.
