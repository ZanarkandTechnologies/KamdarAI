---
ticket_id: TASK-0009
updated: 2026-08-26
state: complete
runtime_state: changes-pending
---

# TASK-0009 progress

## Implemented

- Employee workflow observations now stage in the Daily/Weekly report path and
  promote to the existing SOPs database with `kamdar-employee-sop@1.0.0`.
- Material workflow problems promote to the existing Work/Issue database with
  workflow/step linkage, dated Before economics, intervention, and After proof.
- Direct-cost claims require all inputs, a visible formula, and correct
  arithmetic. Unknown inputs remain named measurement gaps with an owner.
- Weekly promotion requires structured problem-baseline proof and rejects
  missing or placeholder baselines.
- The current TASK-0007 and retained v4 operators route employee procedures as
  SOPs rather than software skill cards.

## Verification

- `node --test evals/filesystem/tests/*.test.mjs`: 108 tests, 98 passed, 10
  intentionally skipped, 0 failed.
- `python3 -m unittest discover -s tests -p 'test_*.py' -v`: 28 passed.
- Workspace setup tests: 7 passed.
- Notion webhook onboarding tests: 12 passed.
- Syntax, `git diff --check`, and company-context validation passed.
- Independent re-review: TAS-A, pass, no blocking findings.

## Real Hermes calibration — 2026-08-26

- Ran the repository's safe-mode model calibration against profile
  `vishan-kamdar-ai`: 7 skills / 21 structural cases, with four Daily normal
  cases receiving real candidate, baseline, and judge model calls.
- All 12 Hermes calls completed successfully with no provider tools or writes.
- Runner verdict: `needs-revision`. Tiers were B, C, B, and B; none met the
  required A gate.
- Daily knowledge capture was a useful near miss, but omitted expected source
  IDs plus explicit frequency/volume, timing, evidence/confidence, and promotion
  state fields.
- Independent evidence review returned `fail`. At least two failures also expose
  stale fixture/assertion wiring, so the next action is repair the eval inputs,
  then rerun before separating remaining model-quality failures.
- Evidence: `artifacts/qa/model-calibration-2026-08-26/summary.json` and
  `artifacts/qa/model-calibration-2026-08-26/evidence-review.json`.
- Source-to-runtime preview completed with `state=changes_pending`,
  `deletion_count=0`; no runtime files were written.

## Eval prerequisite repair and freeze — 2026-08-26

- Independent Goal Packet review returned TAS-A with no blocking findings.
- Rebound project-memory, documentation-quality, and knowledge-capture normal
  cases to facts and identities actually present in the shared Daily context.
- Added a source-level listing-workflow observation covering trigger, actors,
  ordered steps, systems, handoff, reuse, exceptions, output, confidence, and
  explicit timing/volume/rework/cost measurement gaps.
- Preserved the current grounded CMT project-control case without overwriting
  its concurrent owner changes.
- Suite is now frozen for the fresh real-model baseline. Canonical eval
  assertions and input fixture will not change during hardening.
- Proof: JSON parsing passed; `tests.test_daily_pipeline_skills` passed 16/16;
  unified Daily schema/provenance tests passed 11/11.

## Real-model hardening result — 2026-08-26

- Daily project-memory: A, 5/5. False reset replacements are rejected and a
  Project-memory claim cites only evidence that substantiates that claim.
- Daily documentation-quality: A, 5/5. TASK-104 requests only due date,
  blocker, and next action through Aisha's approved proposal-only route.
- Daily project-control: A, 6/6. It uses truthful 4/6 elapsed-day arithmetic,
  preserves `(10 - 6) × MYR 90 = MYR 360`, and groups both findings into one
  Aisha proposal.
- Daily knowledge-capture: A, 6/6. It writes a reconstructable observed
  workflow with explicit time, volume, rework, and cost gaps to the current
  Weekly Draft.
- Weekly finalization/promotion: A, 6/6. A qualified workflow promotes to the
  existing SOPs database with `kamdar-employee-sop@1.0.0`; a material measured
  problem promotes to the existing Work database as an Issue with
  `kamdar-issue@1.0.0`; a weaker workflow remains `project_only`.
- All model calls used Hermes safe mode with local fixtures only. No provider
  read, write, employee delivery, publication, or runtime installation occurred.

## Remaining operational gate

Install the reviewed allowlist into the Hermes runtime only through the setup
script after owner approval. Production Notion writes, employee messages,
schedule activation, and runtime installation were not performed.

## Final acceptance — 2026-08-26

- Independent final acceptance review: TAS-A, pass, no rerun required, no hard
  gates or blocking findings.
- Current seed review SHA was recomputed and matched; all 30 entity reviews, 7
  case reviews, and 5 realism checks passed.
- All four selected Daily real-model outputs and the Weekly promotion output
  remain tier A; the Weekly proof preserves the MYR 360 Before baseline and
  routes records to the existing SOPs and Work/Issue databases.
- `git diff --check` passed. Source-level completion does not authorize or imply
  a Hermes runtime install or any production provider write.
