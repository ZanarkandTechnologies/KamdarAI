---
kind: qa-evidence
ticket_id: TASK-0007
environment: deterministic-local-run-plus-marked-isolated-notion-seed
status: pass-with-pending-model-calibration
date: 2026-08-25
provider_effects: isolated-notion-only
---

# TASK-0007 direct current-Weekly-Draft proof

## Outcome

The corrected flow works in the intended shape. Daily Knowledge Capture and
Project Control update one local current Weekly Draft directly. Weekly
finalization reads that exact file and produces its report hierarchy. No Draft
diff, contribution file, or Draft provider application exists.

## Verified flow

    one Daily context
          |
          +-- Project memory -> Project plan -> guarded Project edge
          +-- Documentation quality -> message plan -> prepare only
          +-- Knowledge Capture -> current Draft Decisions/SOPs
          +-- Project Control -> current Draft PM/Risks/Cost + prepare only
          |
          v
    current Weekly Draft
          |
          v
    Weekly finalization, Draft read only
          |
          v
    2 Project reports -> 1 Department report -> 1 Company report

## Local deterministic evidence

The fixture run created one context artifact and five Daily artifacts:
daily context, Project memory, documentation quality, Project control, and
knowledge capture. Its current Draft contained source-keyed Decision, SOP, PM,
Risk, and Cost entries.

The immediate unchanged rerun returned:

| Check | Result |
| --- | --- |
| Knowledge Capture | duplicate |
| Project Control | duplicate |
| Draft hash | unchanged |
| Weekly input | the same current Draft path |
| Weekly report hierarchy | 2 Project, 1 Department, 1 Company |
| External effects | 0 Notion writes, 0 messages, 0 executive delivery |

The Department result is intentionally Unassigned because the sanitized
fixture has no Department routing facts. It is recorded as a source gap rather
than inferred.

## Isolated provider evidence

The existing marked TASK-0007 Notion seed passed identity and schema preflight.
The operator preserved the old projection run and used a corrective local run
root for this direct-Draft version.

The corrected operator records the local Draft as an artifact and applies only
finalized report pages to the marked seed. It does not apply the current Draft
to Notion. Durable receipt state includes:

| Isolated action | Observed result |
| --- | --- |
| Finalized Project reports | 2 receipt-backed report actions |
| Finalized Department report | 1 receipt-backed report action |
| Finalized Company report | 1 receipt-backed report action |
| Direct-Draft / finalization artifacts | 3 receipt-backed artifact actions |
| Staff messages | 0 |
| Later identical operator rerun | 0 applied, 91 skipped |

The first provider attempt exposed a report-body CLI argument issue. The
operator was repaired to pass Markdown through standard input, its mock test
was rerun, and the subsequent marked-seed operation completed. No fallback
target or production record was used.

## Commands that passed

    node --test evals/filesystem/tests/current-weekly-draft.test.mjs
    node --test evals/filesystem/tests/run-task0007-fixture-automation.test.mjs
    node --test evals/filesystem/tests/operate-task0007-notion-seed.test.mjs
    node --test evals/filesystem/tests/run-task0007-skill-evals.test.mjs
    python3 -m unittest tests/test_daily_pipeline_skills.py tests/test_kamdar_company_os.py -v
    git diff --check

## Qualification

This proves direct local Markdown behavior, deterministic idempotency, and a
bounded isolated Notion report edge. It does not prove model quality in Hermes:
all seven package calibration records remain draft_unrun. Production provider
writes, schedule activation, and source-to-runtime installation remain
unapproved.
