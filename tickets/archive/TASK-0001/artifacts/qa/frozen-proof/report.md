Ticket / Proof Policy: tickets/TASK-0001/ticket.md / Done + QA Strategy + Agent Contract + implementation Goal Program
Verdict: pass

# Frozen Proof QA

## Runtime Target and Setup

- Runtime: `http://127.0.0.1:4179`
- Fixture: `evals/filesystem/fixtures/template-first-kamdar/snapshot.json`
- Contract: `evals/evals.json`
- Mode: frozen mock only; provider calls and live writes remain out of scope.

## Claim and Critical Path

Claim: the local proof UI and runner execute the approved frozen Kamdar
Daily-to-Weekly workflow from the root template-first contract, expose the
result in a usable proof surface, and make no provider request or external
write.

Critical path: load the approved case, run Daily before Weekly, generate four
Daily files and six Weekly files, score 10 file assertions and 13 behavior
assertions, compare to the ASCII prototype, reject live mode, and capture UI
evidence.

## Commands and Interactions

- `curl -fsS http://127.0.0.1:4179/api/result/latest`
- `curl -fsS -X POST http://127.0.0.1:4179/api/run -H 'content-type: application/json' -d '{"mode":"mock"}'`
- `curl -sS -X POST http://127.0.0.1:4179/api/run -H 'content-type: application/json' -d '{"mode":"live"}'`
- `npx -y playwright@1.47.2 screenshot --browser=chromium --viewport-size=1440,1100 http://127.0.0.1:4179/ .../ui-home-playwright.png`
- `npx -y playwright@1.47.2 screenshot --browser=chromium --viewport-size=1440,1100 http://127.0.0.1:4179/showcase .../showcase-playwright.png`
- `node --test evals/filesystem/tests/mock-kamdar-automation.test.mjs evals/filesystem/tests/template-first-kamdar.test.mjs`

## Obligation Reconciliation

| Obligation | Verdict | Evidence |
| --- | --- | --- |
| Runner/UI consume `evals/evals.json` | PASS | `api/run-final.json`, `generated/result.json` |
| Daily precedes Weekly | PASS | `generated/result.json` daily/weekly outputs and trace |
| Declared assertions pass without providers | PASS | 23/23 in `generated/result.json` |
| Expected file lifecycle | PASS | 10 events: 4 Daily created, Replenishment W34 modified, Festive W34 created, 2 Area created, Company created, weekly receipt created |
| Known source gap preserved | PASS | `TASK-102: Expected Drive QA evidence is missing.` |
| No provider calls/writes | PASS | `network_calls_by_processor: 0`, `external_writes_by_processor: 0`, trace calls all local planned calls |
| Live mode rejected | PASS | `api/live-mode-response.json`, HTTP 400 |
| ASCII comparison | PASS | 8/8 checks in `generated/ascii-comparison.json` |
| UI proof surface | PASS | `screens/ui-home-playwright.png`, `screens/showcase-playwright.png`, `visual-qa.md` |

## Failure Check

The most relevant failure path was `POST /api/run` with `{"mode":"live"}`.
The server returned HTTP 400 with `This approved proof is frozen-mock only; live
provider runs are out of scope.`

## Judgment Handoffs

- Agent QA case plan: `agent-qa-plan.md`
- Independent visual judgment: `visual-independent-review.md`
- Independent agent evidence review: `agent-evidence-review.md`

## Residual Risk

- Browser capture was performed through Playwright after GUI window capture was
  unavailable. This is stronger than the GUI fallback and leaves no ticket
  blocker.
- Live Notion/Drive/email/Telegram integration remains explicitly out of scope.

## Best Evidence and Artifact Inventory

Best evidence: `screens/ui-home-playwright.png`

Artifacts:

- `api/run-final.json`
- `api/live-mode-response.json`
- `generated/result.json`
- `generated/tool-trace.json`
- `generated/ascii-comparison.json`
- `generated/showcase.md`
- `screens/ui-home-playwright.png`
- `screens/showcase-playwright.png`
- `visual-independent-review.md`
- `agent-evidence-review.md`

## Learning

Outcome: `ticket_only`. The proof path is specific to TASK-0001 until the
runner/UI pattern is generalized upstream.

QA_RESULT: verdict=pass evidence=tickets/TASK-0001/artifacts/qa/frozen-proof/result.json reason=frozen Daily-to-Weekly proof passed all declared assertions with UI evidence and no provider writes
