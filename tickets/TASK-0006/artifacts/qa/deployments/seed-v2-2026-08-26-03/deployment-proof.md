---
artifact: deployment-proof
deployment: seed-v2-2026-08-26-03
date: 2026-08-26
status: operated
---

# Current-seed operated proof

## Environment

- Fresh isolated Notion root: [EVAL — Kamdar Company OS — clean current seed — 2026-08-26](https://app.notion.com/p/EVAL-Kamdar-Company-OS-clean-current-seed-2026-08-26-3c7d43a23942811eb7b1ca97034b11ce)
- Seed namespace: `kamdar-company-os-isolated-notion-seed-2026-08-26-v1`
- Canonical seed SHA-256: `e6cb8efd255829cc8e4a41e05b3d679c5c7ab7e36e6eb55e28d771d091d8b9e0`
- Seeded records: 62 (`39 Projects`, `6 People`, `10 Work`, `3 Meetings`, `4 Reports`)
- Idempotency: first run applied 62; second run applied 0 and skipped 62.
- Active routes in `workspace.hermes.md` point only to this isolated environment. The previous demo and deployments were retained.

## Operated behavior

Daily produced one Project replacement, one completed-ticket documentation comment, one prepared chase, and one Weekly Draft knowledge update. Notion read-back confirmed the Project, comment, and Draft effects; no external message was sent.

Weekly produced three Final Project reports, three Final Area reports, one Blocked Company report, nine promotion dispositions, three applied promotions, and one next-week Project replacement. Provider read-back confirmed the representative Project, Area, Company, Issue, Decision, SOP, and Project checklist records.

The feature-to-provider links are the source-controlled [operated evidence map](./operated-evidence.json).

## Evidence dashboard

- Production alias: https://kamdar-company-os-evidence.vercel.app/
- Immutable deployment: https://kamdar-company-os-evidence-4xw0ai8jf-kenjipcxs-projects.vercel.app/
- Deployment ID: `dpl_FLnsUZ7sSG5EGM3fb9dB9jxnS4Jk`
- Result: `13/13 passed`, `7 features`, `56 checks`
- Visual verification: 7 feature groups and 13 case rows rendered at 1280 px with no horizontal overflow; the selected evidence link resolved to `app.notion.com`, with no visible `notion.example.test` link.

## Verification

- Python repository tests: 23/23 passed.
- Workspace setup tests: 7/7 passed.
- Webhook onboarding tests: 12/12 passed.
- Filesystem Node tests: 78/78 passed, including the operated-evidence overlay.
- `workspace.hermes.md` validation and `git diff --check`: passed.

## Honest residuals

- Work lacks a persisted Daily review version/processed property, so processing safety is recorded in the run receipt rather than the database.
- The seed references duplicate `ISSUE-CONSENT-01` but does not contain its destination record, so that duplicate disposition has no provider URL.
- The missing Content Area source intentionally keeps the Company report Blocked and proves the incomplete-rollup path.
- Hermes produced the typed Daily and Weekly extraction artifacts, but deterministic integration adapters applied several Notion writes after Hermes repeatedly used invalid CLI syntax. This is integration-boundary evidence, not a claim of a fully autonomous run.
