---
ticket_id: TASK-0004
kind: visual-review
status: pass
overall_tas: TAS-A
verdict: pass
reviewed_at: 2026-08-21T23:58:00+08:00
reviewer: visual_proof_review
target: http://127.0.0.1:4179/showcase
---

# TASK-0004 operated showcase visual review

Expected baseline: `tickets/TASK-0004/ticket.md`, especially Design baseline,
Done / Proof, and QA Strategy.

Best image: `tickets/TASK-0004/artifacts/qa/screens/showcase-visual-review-full.png`

Verdict: pass.

## Review Summary

- `work_type:` operated UI visual and semantic review
- `search_scope:` TASK-0004 ticket, operated proof receipt, live `/showcase`
  HTML, `/api/result/latest`, fresh Playwright captures, visible text/DOM checks
- `rubrics_used:` spec-contract, ui-quality, evidence-quality,
  integration-readiness, visual-qa
- `overall_tas:` TAS-A
- `rerun_required:` no
- `hard_gate_failures:` none
- `blocking_findings:` none

## Evidence Checked

- `tickets/TASK-0004/artifacts/qa/operated-proof.md`
- `tickets/TASK-0004/artifacts/qa/screens/showcase-visual-review.png`
- `tickets/TASK-0004/artifacts/qa/screens/showcase-visual-review-full.png`
- `curl http://127.0.0.1:4179/showcase`
- `curl http://127.0.0.1:4179/api/result/latest`

Observed result state:

```json
{
  "assertions": { "pass": 39, "fail": 0, "total": 39 },
  "features": 9,
  "resultLinks": 17,
  "callStatusCounts": { "planned": 11, "applied": 17, "blocked": 5 }
}
```

## Passing Checks

- `TASK-0004 sections 1-7 -> /showcase -> PASS`
  Sections `1 · STORY AND ENVIRONMENT` through `7 · CONFIRMED DECISIONS` are
  present in the rendered HTML and visible in the full-page capture.
- `Full-story restoration -> showcase-visual-review.png -> PASS`
  The first viewport restores the buyer context: Company OS proof title,
  scattered-truth problem statement, `9/9 features covered · 39/39 assertions
  pass`, operated Notion workspace link, story, and Company OS sample database
  cards.
- `Feature drilldown -> /showcase DOM -> PASS`
  Feature cards include `Inspect feature evidence`; drilldowns expose
  `Artifacts and file content`, template/version lines via `Follows <code>`,
  content assertions, behavior assertions, and downstream application state.
  DOM checks found 9 feature drilldown sections and 19 template/content
  assertion groups.
- `Real Notion links -> /showcase DOM -> PASS`
  The operated workspace link is visible in the hero, and applied Notion
  actions render 17 `Open result` links for namespaced showcase records.
- `Blocked providers -> /api/result/latest + /showcase -> PASS`
  Five provider actions render as `BLOCKED`, not applied/sent. Reasons are
  explicit: Google authentication is expired for Drive/email paths, and the
  Hermes profile has no configured Telegram target.
- `No fake provider send -> /api/result/latest -> PASS`
  `sentLinks` is zero. The UI does not claim email, Drive, or Telegram success
  where the receipt is blocked.

## Geometry Assertions

```json
[
  {
    "screen": "showcase-first-viewport",
    "element": "hero",
    "expected_bbox_pct": { "x": [10, 18], "y": [3, 10], "w": [65, 78], "h": [15, 25] },
    "observed": "hero leads with operated state, title, 9/9 and 39/39 result, and Notion workspace link",
    "verdict": "PASS"
  },
  {
    "screen": "showcase-first-viewport",
    "element": "companyOsSection",
    "expected_bbox_pct": { "x": [10, 18], "y": [45, 98], "w": [65, 78], "h": [45, 55] },
    "observed": "database/template sample cards are aligned in a readable two-column grid",
    "verdict": "PASS"
  },
  {
    "screen": "showcase-full-page",
    "element": "featureDrilldowns",
    "expected": "feature cards expose file/content, behavior, and downstream application panels",
    "observed": "all feature cards render an inspectable details block with the expected panels",
    "verdict": "PASS"
  },
  {
    "screen": "showcase-full-page",
    "element": "blockedProviderStates",
    "expected": "blocked providers must show reason and must not show result links",
    "observed": "Drive/email/Telegram blocks show auth/target reasons and no sent result links",
    "verdict": "PASS"
  }
]
```

## Non-Blocking Notes

- The page is long and has no section navigation. That is not a TASK-0004
  blocker because the accepted contract asks for restored sections and
  drilldowns, not a navigation system. If this becomes a recurring demo page,
  add a compact section nav later.
- The page still includes planned read/preflight calls alongside applied
  results. The labels are honest and do not overclaim provider success.

## TAS by Family

- `spec-contract:` TAS-A. The restored story, Company OS walkthrough, Daily,
  Weekly, feature section, failure view, and decisions are all present.
- `ui-quality:` TAS-A. The hierarchy is readable and buyer-first; feature
  evidence is dense but scannable.
- `evidence-quality:` TAS-A. Fresh screenshots, DOM checks, result JSON, and
  operated receipt agree.
- `integration-readiness:` TAS-A. Applied Notion links and blocked
  Drive/email/Telegram states are separated and honest.
- `visual-qa:` TAS-A. Required visual states are captured and match the
  ticket's semantic contract.

## Next Action

Proceed to completion/integration review. No visual blocker remains.
