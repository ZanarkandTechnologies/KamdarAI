---
artifact: deployment-proof
deployment: seed-v4-2026-08-26-06
date: 2026-08-26
status: operated
---

# Grounded Kamdar v4 operated proof

## Before

The previous environment mixed generic release-QA and festive-launch examples
with a large scraped Project catalog. Several pages were empty or shallow,
body sections were duplicated into database properties, employee routes were
not usable, and the evidence dashboard linked to placeholder provider URLs.
The Weekly adapter also wrote Reports without applying promoted Issues,
Decisions, or SOPs.

## After

- [Fresh isolated Notion root](https://app.notion.com/p/EVAL-Kamdar-Company-OS-grounded-v4-2026-08-26-3c7d43a23942810caff1d937e577ae91), with every earlier environment retained.
- Seven captured Kamdar Project names and Departments; six fictional People;
  ten Tasks, three Meetings, and four prior Reports. Operational facts are
  explicitly synthetic evaluation data.
- Every seeded page follows its entity template. Work bodies contain realistic
  scattered notes; body sections are not duplicated as database properties.
- The Work `Status` property is a Notion status and `Type` is a select. Five
  successfully handled records now read back as `Processed` with
  `daily-review-v1`; the blocked record remains unprocessed.
- Two precise missing-information comments were posted to real Work pages.
  One overdue chase was sent to the operator-owned Telegram evaluation sink in
  an explicit intended-recipient envelope. It is not represented as delivery
  to an employee account. Email was unavailable and no email is claimed.
- Weekly applied and read back three Final Project reports, three Final
  Department reports, one Final Company report, one Issue, one Decision, and
  one SOP. A repeat application skipped all 10 destinations.

## Examples

- [Company report](https://app.notion.com/p/Kamdar-Week-of-2026-08-17-3c7d43a2394281f18485d143543b4e23)
- [CMT Department report](https://app.notion.com/p/CMT-Week-of-2026-08-17-3c7d43a23942814e9fcfd07002800e5e)
- [Detailed CMT Issue](https://app.notion.com/p/CMT-production-handoff-lacks-one-approved-source-3c7d43a239428142849bdd6077cd4ee1)
- [Durable CMT Decision](https://app.notion.com/p/Use-the-signed-sample-as-construction-baseline-3c7d43a2394281db906fe0f3ef99b365)
- [Reusable Ecommerce SOP](https://app.notion.com/p/Prepare-a-publish-ready-product-listing-handoff-3c7d43a23942810bbd2ee4a3a662e569)
- [Meta documentation comment](https://app.notion.com/p/Publish-weekly-Meta-performance-update-3c7d43a2394281ccb190f23cbd73662f)

The publishable URL inventory is in [operated-evidence.json](./operated-evidence.json).

## Evidence dashboard

- Production alias: https://kamdar-company-os-evidence.vercel.app/
- Immutable deployment: https://kamdar-company-os-evidence-bfcitu0lr-kenjipcxs-projects.vercel.app/
- Vercel deployment ID: `dpl_6yDAGQ9hqqbRpBe6uERD5vpy7yhA`
- Result: `13/13 passed`, `7 features`, `56 checks`.
- Daily and Weekly feature judges: Tier A.
- The published HTML contains no absolute local filesystem paths.

## Verification

- Filesystem Node tests: 80 passed, 0 failed, 10 skipped superseded legacy comparisons.
- Python repository tests: 28/28 passed.
- Workspace setup tests: 7/7 passed.
- Webhook onboarding tests: 12/12 passed.
- Company-context validation, runtime workspace sync, HTTP 200 dashboard
  read-back, receipt hashes, provider read-backs, and `git diff --check`: passed.

The deterministic extraction eval retains mocked connector receipts so it can
be replayed without provider side effects. The separate operated evidence above
proves the same prepared changes against the isolated real Notion workspace and
the configured Telegram evaluation sink.
