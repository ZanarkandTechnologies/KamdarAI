Ticket / Proof Policy: `tickets/TASK-0003/ticket.md` / Done + QA Strategy
Verdict: pass

# TASK-0003 QA report

## Runtime target and setup

- `runtime:` `http://127.0.0.1:4179/`
- `server:` `node evals/filesystem/scripts/serve.mjs`
- `mode:` frozen mock only; no provider calls or writes.
- `claim:` the UI and showcase group one frozen Daily-to-Weekly proof by
  feature, expose file/template/content assertions, show real configured source
  links, keep unproved Weekly features visible, and avoid fake provider result
  links.

## Commands and interactions

```text
node --test evals/filesystem/tests/*.test.mjs
# pass: 8/8

node evals/filesystem/scripts/template-first-kamdar.mjs
# pass: 23/23; daily_files: 4; weekly_files: 6; ascii_comparison: true; idempotent: true

POST /api/run {"mode":"mock"}
# pass: 23/23; feature-owned assertions cover 6 features; all planned calls have feature_id

GET /api/files?path=../../workspace.hermes.md
# 400

GET /api/source?path=../../workspace.hermes.md
# 400

POST /api/run {"mode":"live"}
# 400
```

Browser journey:

1. Opened `/`.
2. Ran `Run frozen Daily -> Weekly`.
3. Expanded FEAT-0001.
4. Expanded `daily/projects/replenishment-accuracy-2026-08-21.md`.
5. Captured feature/file drilldown screenshot and visible text.
6. Opened `/showcase`.
7. Verified `6/9 features have current eval coverage`, FEAT-0006, and
   developer evidence.
8. Captured showcase screenshot and visible text.

## Obligation reconciliation

- `PASS:` all nine canonical features render in UI and showcase; six are covered
  and FEAT-0006/0007/0008 remain `Designed · not yet proved`.
- `PASS:` every scored assertion and planned call has a valid `feature_id`.
- `PASS:` proved files expand to governing template/version and current content
  assertions; generated output remains inspectable from the UI.
- `PASS:` source links come from configured metadata; source/file escape probes
  return 400 and do not expose content.
- `PASS:` runner remains deterministic, 23/23, idempotent, accepted-ASCII
  aligned, and provider-free.
- `PASS:` browser screenshots, visible text, zero console errors, visual QA,
  plan review, and implementation review are recorded.

## Failure check

The most relevant falsifier was overclaiming: live mode, escaped source paths,
and escaped run-file paths were probed. All are blocked. The UI still displays
unproved features instead of converting them into passes.

## Judgment handoffs

- `plan_review:` `tickets/TASK-0003/artifacts/review/plan-review.md`
- `implementation_review:` `tickets/TASK-0003/artifacts/review/implementation-review.md`
- `visual_qa:` `tickets/TASK-0003/artifacts/qa/frozen-feature-ui/visual-qa.md`

## Verdict and residual risk

`pass`. This proves the local frozen UI/showcase slice only. It intentionally
does not prove live provider delivery or Weekly promotion/planning assertions
for FEAT-0006, FEAT-0007, or FEAT-0008.

## Artifact inventory

- `tickets/TASK-0003/artifacts/qa/frozen-feature-ui/result.json`
- `tickets/TASK-0003/artifacts/qa/frozen-feature-ui/report.md`
- `tickets/TASK-0003/artifacts/qa/frozen-feature-ui/visual-qa.md`
- `tickets/TASK-0003/artifacts/qa/screens/feature-file-drilldown.png`
- `tickets/TASK-0003/artifacts/qa/screens/showcase-feature-summary.png`
- `tickets/TASK-0003/artifacts/qa/screens/ui-visible-text.txt`
- `tickets/TASK-0003/artifacts/qa/screens/showcase-visible-text.txt`
- `tickets/TASK-0003/artifacts/qa/screens/console-errors.json`

## Learning

- `outcome:` ticket_only
- `ref:` null

QA_RESULT: verdict=pass evidence=tickets/TASK-0003/artifacts/qa/frozen-feature-ui/result.json reason=feature-first UI/showcase passed deterministic, API, browser, and visual checks without provider writes
