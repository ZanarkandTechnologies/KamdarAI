---
title: Kamdar Company OS template-routing skill audit
owner: skills/kamdar-company-os
status: accepted-source-foundation
kind: skill-audit
updated_at: 2026-08-21
eval_required: true
---

# Template-routing audit

## Change

- **Before:** Hermes had no Kamdar operational skill that could resolve the
  canonical templates, real Notion routes, or embedded Meeting evidence.
- **After:** `kamdar-company-os` reads the installed workspace template registry
  and the real Kamdar source map, then specifies Daily and Weekly routing,
  promotion gates, and proposal-only boundaries.
- **Tradeoff:** The skill deliberately stops at a configuration/source gap
  instead of filling missing schema or provider behavior with a best guess.

## Checks

| Check | Verdict | Evidence |
| --- | --- | --- |
| Skill is source-owned and installable | pass | Setup preview includes `profile:skills/kamdar-company-os/*`. |
| Templates remain one readable config source | pass | The skill reads `workspace/templates/`; it contains no profile-local template fork. |
| Hidden Meeting blocks are treated as evidence | pass | Full changed Task page read and `meeting_block_parse_gap` are explicit. |
| File assertions are template-first | pass | Root `evals/evals.json`: 10 file assertions include template ID/version/path; it is intentionally not installed with the runtime skill. |
| Proposal-only boundary is retained | pass | Contracts/tests forbid provider writes. |
| Frozen assertion execution | deferred | The new runner/UI has not been rebuilt to execute the root template-first contract. |

## Verification

- `python3 -m unittest discover -s tests -p 'test_*.py' -v` — 11 passing.
- `python3 -m unittest discover -s skills/setup-kamdar-workspace/tests -v` — 7 passing.
- `python3 scripts/validate_company_context.py --context workspace.hermes.md` — passing.
- JSON parsing for root `evals/evals.json` — passing.
- Real runtime installer preview — `changes_pending`, `deletion_count: 0`; no
  installation applied because `workspace.hermes.md` is still
  `proposed-owner-review`.

## Follow-up

Build the frozen runner/UI to consume `evals/evals.json`, run the Daily then
Weekly mock chain, and attach its execution evidence before calling this skill
ready for runtime installation.
