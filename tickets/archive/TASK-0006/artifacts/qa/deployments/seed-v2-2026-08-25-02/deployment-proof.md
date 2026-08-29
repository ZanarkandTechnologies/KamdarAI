---
ticket_id: TASK-0006
artifact_type: deployment-proof
deployment_id: dpl_D95EA5sYWBz6DEhgT7D6bc1qS6Uf
deployment_url: https://kamdar-company-os-evidence-dnv7bg53s-kenjipcxs-projects.vercel.app
production_alias: https://kamdar-company-os-evidence.vercel.app
deployed_at: 2026-08-25T18:05:33+08:00
status: pass
---

# Compact-seed dossier deployment

## What is deployed

```text
active Projects + today's unprocessed Work/Meetings
  -> one Daily Zod extraction
  -> Project update | documentation question | owner chase | Project Draft
  -> mocked integration receipt + provider read-back + processed guard
  -> Weekly reads Project Drafts
  -> Project/Area/Company reports | knowledge promotion | next-week checklist
  -> frozen buyer dossier
```

The dossier shows 39 capture-grounded Project names, 7 active scenarios,
6 fictional People, and 13 Work/Meeting records. The frozen showcase passes
49/49 checks across 7 workflows with zero processor network calls and zero
external writes.

## Acceptance evidence

| Gate | Result |
| --- | --- |
| Daily judged run | Pass; FEAT-0001..0004 Tier A; deterministic, receipt/read-back, processing-safety, idempotency, and independent-review gates pass |
| Weekly judged run | Pass; FEAT-0005..0007 Tier A; 7 reports, 9 candidate dispositions, 1 guarded Project checklist replacement |
| Mock Weekly integration | 17 effects and 12 exact read-backs; no live provider calls |
| Repository proof | 68/68 Node tests, 22/22 Python tests, focused 22/22 tests, and `git diff --check` pass |
| Browser proof | Public alias returned HTTP 200 and visibly rendered `49/49 checks pass across 7 workflows`; capture: `dossier-first-viewport.jpg` |
| Independent deployment review | TAS-A / pass; no blocking findings |

The first Weekly run (`seed-v2-2026-08-25-01`) is retained. It exposed an
honest FEAT-0006 Tier-C gap: promoted Issue, Decision, and SOP Markdown was
skeletal. The corrected `seed-v2-2026-08-25-02` run renders the complete
destination templates and passed independent review.

## Deployment retention

- New deployment: `dpl_D95EA5sYWBz6DEhgT7D6bc1qS6Uf` — Ready.
- Previous production deployment: `dpl_sYbiAcJuEL6mbsWBRTdmxFKEf2Ei` — retained and Ready at `https://kamdar-company-os-evidence-ri2ft13zr-kenjipcxs-projects.vercel.app`.
- Earlier preview: `dpl_HWWbdisiYd6TJnFeRYoPN4KrA7H6` — retained; never promoted after the Weekly quality gap was found.
- No deployment was deleted.

## Artifact hashes

- Daily result: `2f7e1e21bff9001e5b2e67524adc785c762de1edbec41320ae96598c963f665e`
- Weekly result: `b0de36b88bb518d6431b2b0b0533b7d93d683b200a485119424934474eed1de4`
- Dossier run result: `7dd329b9caaf442c3ef295f512b76a9539cda513004156966dd4c8350fb832da`
- Browser capture: `93347cf031b668db46cae0c3d28d9d4fe77236630d2350200a494d979b443e6c`

## Safety boundary

This deployment is a frozen, no-write proof. Connector-shaped operations are
mocked and receipt-checked. This run did not update Notion or send messages.

Non-blocking review note: the generated Markdown proof has some undefined
artifact labels; the deployed HTML renders the user-facing evidence correctly.
