---
skill: KamdarAI project skill set
date: 2026-08-27
change_type: structure
owner: skill-maintenance
status: pass
review_route: reviewer
before_ref: skills/
after_ref: skills/
reasoning_basis: first_principles
proof_artifacts:
  - automations/daily-operating-update.md
  - automations/weekly-operating-review.md
  - tests/test_automation_contracts.py
eval_required: yes
---

# KamdarAI skill consolidation audit

## Change

- Before: eight project skills duplicated or decomposed Daily and Weekly
  automation behavior; setup and webhook onboarding were separate procedures.
- After: only `setup-kamdar-workspace` and `notion-webhook-onboarding` remain.
- Why: the automation Markdown files are the runtime procedure owners and now
  perform schema-validated extraction and guarded application directly.
- Tradeoff accepted: historical tickets and proof artifacts may retain old skill
  names as historical evidence; active contracts and tests may not depend on
  deleted packages.

## Deletion scope

- `apply-project-diffs`
- `daily-documentation-quality`
- `daily-knowledge-capture`
- `daily-project-control`
- `daily-project-memory`
- `dispatch-employee-messages`
- `kamdar-company-os`
- `weekly-report-finalization`

The dedicated `run-task0007-skill-evals` script and test are also removed.

## Owner routing

```text
Daily/Weekly schedule -> automations/*.md
environment and authority -> workspace.hermes.md
structured results and receipts -> schemas/automations/
installation -> skills/setup-kamdar-workspace/
optional Notion webhook setup -> skills/notion-webhook-onboarding/
```

## Binary rubric

| Check | Verdict | Evidence |
| --- | --- | --- |
| `first_load_sufficiency` | pass | Each automation contains its complete ordered procedure. |
| `reference_load_precision` | pass | Automations load the workspace binding and schemas directly. |
| `noisy_context_rate` | pass | Eight redundant skill packages are removed from installation. |
| `duplicated_instruction_count` | pass | The `kamdar-company-os` wrapper and child instructions are removed. |
| `task_success_rate` | pass | Project, retained-skill, and filesystem suites pass. |
| `maintenance_locality` | pass | Setup and onboarding remain independently owned packages. |
| `composition_clarity` | pass | Automation, schema, binding, and setup owners are distinct. |

## Proof artifacts

- `python3 -m unittest discover -s tests -p 'test_*.py' -q`: 14 passed.
- `python3 -m unittest discover -s skills/setup-kamdar-workspace/tests -q`: 7 passed.
- `python3 -m unittest discover -s skills/notion-webhook-onboarding/tests -q`: 12 passed.
- `node --test evals/filesystem/tests/*.test.mjs`: 123 tests, 113 passed and 10 skipped.
- `python3 scripts/validate_company_context.py --context workspace.hermes.md`: passed.
- `git diff --check`: passed.
- The skill-maintenance `check_skills.py --write` validator is unavailable from
  the installed skill because it cannot locate its Farplane repository root.

## Review focus

Confirm that only the two approved skill directories remain, active automation
and workspace contracts contain no dependency on deleted skills, historical
references are confined to tickets/proof, and the replacement tests exercise
the direct automation ownership boundary.

## Reviewer receipt

Independent review passed: the source tree retains only the two approved skill
packages, active references are reconciled, all declared proof commands pass,
and no live runtime deletion occurred.
