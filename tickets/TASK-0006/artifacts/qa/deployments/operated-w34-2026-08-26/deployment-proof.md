---
artifact: deployment-proof
deployment: operated-w34-2026-08-26
date: 2026-08-26
status: published
---

# Receipt-bound W34 dossier deployment

## Before

The public alias opened an older `3c7...` seed root and mixed its operated-link
overlay with retained evaluator scores. That scorecard could not prove the
current `3c8...` Daily → Weekly run, and its v1 eligibility manifest is
invalid under the current fail-closed v2 contract.

## After

- Production alias: https://kamdar-company-os-evidence.vercel.app/
- Immutable deployment:
  https://kamdar-company-os-evidence-gu2q4y2zy-kenjipcxs-projects.vercel.app/
- Vercel deployment: `dpl_5nNA4n3SX9prpjHpdN4Z4YD8r7eB`
- The page is a receipt-only `Kamdar Company OS — W34` dossier, bound to the
  isolated `3c8...` Notion root.
- It contains the Daily receipt, Daily documentation-quality result, Weekly
  result, source Work, test Gmail evidence with mailbox caveats, report chain,
  promoted Decision, retained SOP state, and promoted Issue.
- Static receipt pages are generated under `evidence/`; they contain sanitized
  readouts rather than profile state or local runtime paths.

## Example

`TASK-101` → CMT Pipeline context → Aisha Gmail test-route thread → Daily
receipt; then CMT/Deepavali report evidence rolls forward to the Company
report, Decision, monitored SOP candidates, and CMT Issue.

## Verification

- `node --test evals/filesystem/tests/*.test.mjs`: 119 passed, 10 skipped.
- `python3 scripts/validate_company_context.py --context workspace.hermes.md`:
  `context_valid=true`.
- `git diff --check`: passed.
- Public alias, `public-model.json`, and `evidence/daily-receipt.html`: HTTP
  200 and expected W34 content.
- Public read-back confirms no old `3c7...` root and no `/Users/kenjipcx` path.
- Visual QA: desktop 1280px and mobile 375px passed; see
  [visual-qa.md](./visual-qa.md).

## Build binding

- Public model SHA-256:
  `e4a551285e2f97e741b8fca878782c47e72fb07f1454fb33850746d125fa345f`
- Build receipt SHA-256:
  `646effa23ad383763e338e293e54dffc86d13b9bb7ce914a30dc2d3ff4541295`

Residual qualification: Gmail links require the operator test mailbox, and
Telegram has no stable public deep link. The dossier does not claim delivery to
real employees or expose private Telegram route data.
