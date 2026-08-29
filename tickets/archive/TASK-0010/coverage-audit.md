---
ticket_id: TASK-0010
kind: eval-coverage-audit
status: current
updated_at: 2026-08-26
---

# Eval coverage audit

## Verdict

No skill eval cases or authored assertions were deleted. The seven owned skill
packages still contain 21 normal/hard/boundary cases, 23 file bindings, and 83
content assertions. The regression was in projection and truth reconciliation:
four Daily feature evals were collapsed into one UI row, and stale saved judge
assertions could inherit PASS.

Both projection defects are corrected. Every Company OS feature is now a
first-class scenario, output-file and result-path checks are visible, and stale
judges render NOT RUN until the feature is freshly judged. The fresh grading
run then exposed real candidate and evidence defects instead of converting them
to PASS.

## Coverage map

| Feature behavior | Skill eval owner | Workflow output file and asserted content |
| --- | --- | --- |
| Update Project context from progress | `daily-project-memory`, `apply-project-diffs` | Daily review result → `project_updates` |
| Check completed-work documentation | `daily-documentation-quality` | Daily review result → `completed_ticket_comments` |
| Chase the right owner from stalled progress | `daily-project-control`, `dispatch-employee-messages` | Daily review result → `weekly_progress_chases` |
| Update Weekly Draft problems, decisions, and SOPs | `daily-knowledge-capture` | Daily review result → `knowledge_updates` |
| Create Project, Department, and Company reports | `weekly-report-finalization` | Weekly review result → `$.report_results[*]` |
| Promote qualified problems, decisions, and SOPs | `weekly-report-finalization` plus unified feature judge | Weekly review result → `$.promotion_dispositions[*]` |
| Carry unresolved priorities into the owning Project | unified Weekly feature judge | Weekly review result → `$.next_week_project_replacements[*]` |

The exact output file path, content path, feature-judge artifact, and authored
assertion results are rendered in each dashboard inspector.

## Fresh grading state

- Authored skill inventory: 7 packages, 21 cases, 23 file bindings, 83 assertions.
- Dashboard inventory: 7 feature scenarios plus 4 Daily workflow safeguards.
- Fresh immutable grading run: `task0010-fresh-2026-08-26-01`.
- Dashboard result: 11 scenarios, 144 checks, 3 PASS, 8 FAILED, 0 NOT RUN.
- Weekly FEAT-0005/0006/0007: independently judged tier A.
- Daily FEAT-0001/0002/0003/0004: independently judged C/C/B/B and failed.
- Daily failures: stale Project conflict guards; unbound TASK-201 documentation
  claim; unsupported 27 August line-hold expiry; TASK-201 Decision contradicts
  its cited source.
- Artifact quality: Daily and Weekly are both tier D because the frozen contexts
  do not contain enough source detail to substantiate their generated claims;
  Weekly also violates current report/template contracts.
- Daily idempotency: failed honestly because no unchanged second-run receipt or
  read-back exists in the frozen run.
- Focused regression: 50/50 passed after adding strict Daily deterministic and
  suite-result reconciliation.
- Canonical Farplane contract: 9 manifests passed.

## Repair boundary

Do not weaken the assertions or edit verdicts. Regenerate Daily and Weekly
candidate artifacts from source-complete frozen context, update them to current
templates, add an unchanged Daily second-run artifact, and rerun the same seven
independent feature judges plus both artifact-quality reviews.
