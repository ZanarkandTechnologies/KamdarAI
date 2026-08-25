---
artifact: deployment-proof
deployment: seed-v3-2026-08-26-05
date: 2026-08-26
status: partial
---

# Template-body seed proof

## Before

Seed records split page narrative into fields such as `overview`, `knowledge`,
and `attention`. The Notion operator reconstructed Markdown, which duplicated
some values as properties and body content and allowed empty or shallow pages.

## After

- Fresh isolated Notion root: [EVAL — Kamdar Company OS — template-body seed — 2026-08-26](https://app.notion.com/p/EVAL-Kamdar-Company-OS-template-body-seed-2026-08-26-3c7d43a23942818aa945c5b03876460e)
- Seed contract: `kamdar-company-os-seed@3.0.0`.
- Each record stores only `id`, `template`, exact Notion `properties`, one complete Markdown `body`, and optional scenario metadata.
- The operator writes `body` unchanged. It does not reconstruct narrative content.
- The loader requires every property and every ordered `##` section from the named template; it rejects YAML, duplicate H1 titles, placeholders, unknown properties, and empty sections.
- Scope remains focused: 7 Projects, 6 People, 10 Tasks, 3 Meetings, and 4 Reports (30 records).

## Example

The [Festive E-commerce W34 report](https://app.notion.com/p/Festive-E-commerce-Launch-Week-of-2026-08-17-3c7d43a2394281599aa9e51c7b862c90) now contains a three-sentence summary, a four-row outcome table, a two-row problem table, six decision review points, six SOP review points, three owned priorities, and a receipt. The [Penang Project](https://app.notion.com/p/Penang-Replenishment-Accuracy-3c7d43a23942817988b4e11529da8ab9) has the complete Project template in its page body rather than JSON stored in a property.

## Proof

- Initial seed: 30 applied, 0 skipped.
- Idempotency rerun: 0 applied, 30 skipped, 0 external messages.
- Filesystem suite: 81/81 passed.
- Python repository/setup/onboarding suites: 43/43 passed.
- Workspace context validation and source-to-runtime install: passed with zero deletions.
- Telegram delivery proof: sent to the configured home route, provider message `16`.

## Honest residuals

- The autonomous Daily one-shot timed out before returning artifacts or a provider receipt. No Daily Notion mutation or employee chase is claimed.
- Email is blocked because the `vishan-kamdar-ai` Hermes profile has no configured email provider.
- The fresh v3 root is intentionally seed-only. Earlier operated deployments are retained for comparison and were not deleted.
