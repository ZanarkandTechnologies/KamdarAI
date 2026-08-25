Ticket / Proof Policy: `tickets/TASK-0001/ticket.md` / Done + QA Strategy + explicit live UI proof path
Verdict: pass

# QA Report

## Runtime Target

- Server: `http://127.0.0.1:4179/`
- Bound routes: `/`, `/?mode=live&tab=run`, `/?mode=live&tab=results`, `/showcase`, `/api/result/latest`
- Best evidence: `desktop-results.png`

## Claim And Critical Path

The Kamdar manager proof must show one comprehensive workflow in Live POC mode:
bounded source snapshot, area reports with project subsections, company rollup,
Notion comments, Drive uploads, two allowlisted Gmail sends, one Telegram send,
redacted receipts, Test / Run / Results UI, and a sanitized showcase.

## Commands And Interactions Run

- `npm test` in `evals/filesystem`: pass, 5/5.
- `python3 -m unittest discover -s tests -p 'test_*.py' -v`: pass, 10/10.
- `python3 -m unittest discover -s skills/setup-kamdar-workspace/tests -v`: pass, 7/7.
- `python3 -m unittest discover -s skills/notion-webhook-onboarding/tests -v`: pass, 12/12.
- `python3 scripts/validate_company_context.py --context workspace.hermes.md`: pass.
- `curl http://127.0.0.1:4179/api/result/latest`: live-poc, 37/37, 13 calls.
- `curl -X POST /api/run {"mode":"live"}` without receipts: HTTP 400 with
  explicit receipt requirement.
- Safari screenshots captured for overview, Run, Results, showcase, and narrow
  responsive states.

## Obligation Reconciliation

- Frozen run passes offline and idempotently: PASS. `npm test` covers frozen
  run, second-run no duplicated files/actions, and live receipt scoring.
- Live preflight identifies provider readiness without secrets: PASS.
  `artifacts/setup/live-poc-setup-receipt.md` plus API readiness.
- Existing project/task/report sources bounded and gaps reported: PASS. Live
  receipts show Tasks/Resources present and Project Memory/Decisions/Reports
  missing.
- Area reports and company rollup generated: PASS. `result.json` reports 5
  file events and 37/37 assertions; Results UI lists generated files.
- Notion/Drive/Gmail/Telegram receipts: PASS. `result.json` contains 13
  redacted external receipts, including two email sends and one Telegram send.
- UI exposes Test / Run / Results and showcase: PASS. Screenshots prove the
  live mode, call trace, file list, score, and showcase.
- Browser proof and visual QA linked: PASS. Screenshot set and
  `visual-qa.md` are in this QA run directory.

## Failure Check

The live scoring endpoint refuses implicit live mode without explicit receipts;
this is covered by `POST /api/run preserves explicit live receipts as live-poc
evidence`, the server guard that throws when `externalReceipts` is absent, and
`live-without-receipts-response.json`.

## Residual Risk

- Live provider URLs and exact recipient receipts remain in private Hermes
  runtime state by design, not in tracked artifacts.
- The production scheduler remains disabled/proposal-only; this POC proves the
  workflow and setup gap, not recurring automation activation.
- Screenshot capture used visible Safari because local Playwright was absent.

## Artifact Inventory

- `desktop-overview.png`
- `desktop-run.png`
- `desktop-results.png`
- `desktop-showcase.png`
- `narrow-results.png`
- `narrow-results-pass.png`
- `tester-report.json`
- `visual-qa.md`
- `api-latest-summary.json`
- `live-without-receipts-response.json`
- `result.json`

## Learning

Outcome: `ticket_only`. The query-param proof URLs are useful for this ticket,
but not yet promoted to a general cookbook path.

QA_RESULT: verdict=pass evidence=tickets/TASK-0001/artifacts/qa/live-proof/result.json reason=live POC proof, UI evidence, and deterministic checks passed
