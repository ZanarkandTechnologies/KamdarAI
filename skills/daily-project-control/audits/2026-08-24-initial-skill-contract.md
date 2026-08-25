---
title: Daily Project control initial skill-contract audit
owner: skills/daily-project-control
status: contract-checked-unrun
kind: skill-audit
updated_at: 2026-08-24
eval_required: true
---

# Initial skill-contract audit

## Decision

This skill owns one PM-control artifact because stale detection, ticket-level
chasing, blocked duration, and cost impact must share one evidence judgment.
That avoids competing diagnoses from separate progress and cost pipelines.

## Checks

| Check | Verdict | Evidence |
| --- | --- | --- |
| Single collector input is explicit | pass | `SKILL.md` permits only the Daily context diff and local package files. |
| Provider boundary is explicit | pass | The skill performs no provider read/write; integrations own send/application receipts. |
| Output has one owner | pass | Local JSON template owns control findings, cost basis, and grouped route proposals. |
| Golden and blocked calibration exist | pass | Sanitized valid-route and unapproved-route artifacts are package-local. |
| Normal, hard, boundary evals exist | pass | `evals/evals.json` covers grounded, route/cost-gap, and healthy-work outcomes. |
| Candidate/no-skill comparison ran | deferred | Calibration is `draft_unrun`; no readiness claim is made. |

## Verification

- `python3 -m json.tool skills/daily-project-control/templates/project-control-plan.json` — pass.
- `python3 -m json.tool skills/daily-project-control/evals/evals.json` — pass.
- `python3 -m json.tool automations/examples/golden/daily-context-diff-2026-08-24.json` — pass.
- `awk 'END { print NR }' skills/daily-project-control/SKILL.md` — pass, 133 lines (limit: 200).
- Legacy collector reference scan for `daily-context-diff-*.md` — pass, no match.

These are contract checks only; no profile-backed behavior run or independent
skill-contract review has been performed.

## Rerun rule

Fix and rerun the smallest failing eval before readiness. A future profile-backed
run must retain candidate output, no-skill baseline, and judge verdict.
