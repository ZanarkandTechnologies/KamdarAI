---
skill: setup-kamdar-workspace
date: 2026-08-27
change_type: behavior
owner: skill-maintenance
status: pass
review_route: self_check
before_ref: 7f59a3c30e323840f26f091b7a2b98bb4b581a28
after_ref: working-tree
reasoning_basis: first_principles + official_hermes_distribution_contract + tests
proof_artifacts:
  - skills/setup-kamdar-workspace/tests/
  - tests/test_distribution.py
  - tickets/TASK-0015/progress.md
eval_required: yes
---

# Native distribution setup audit

## Change

- Before: setup copied source files into an already-created external profile;
  schedules were manual and an installed distribution could not safely install
  its own `workspace/`.
- After: one preview/apply helper supports verified native distributions and
  developer copies, sets native `terminal.cwd`, and reconciles two canonical jobs.
- Why: a client install must be complete without cloning the 104 MB development
  harness into the live profile.
- Tradeoff accepted: Notion authentication remains a separate skill because it
  has independent human and provider gates.

## Binary Rubric

| Check | Verdict | Evidence |
| --- | --- | --- |
| `first_load_sufficiency` | pass | Five executable nodes cover both install modes, schedules, and handoff. |
| `reference_load_precision` | pass | No branch-only reference is needed for the normal setup path. |
| `missing_context_rate` | pass | Profile, source mode, paths, schedules, and next gate are explicit. |
| `noisy_context_rate` | pass | Notion implementation detail stays in its existing owner skill. |
| `duplicated_instruction_count` | pass | Runtime mechanics live in scripts; README is operator entry only. |
| `prompt_size_tokens` | pass | `SKILL.md` remains below 200 physical lines. |
| `task_success_rate` | pass | Focused unit and native distribution smoke checks pass. |
| `review_tas_rate` | pass | Ticket-scoped rubric receipt records TAS-A and the inline-review limitation. |
| `maintenance_locality` | pass | Workspace and schedules share one setup owner. |
| `composition_clarity` | pass | Native install, core setup, and Notion handoff have separate owners. |

## Before Behavior

- Manual profile creation, repository clone, workspace copy, cwd configuration,
  and schedule creation were separate operator steps.

## After Behavior

- Native profile install copies a 356 KB runtime payload. Setup previews and
  applies workspace plus schedule state idempotently; Notion onboarding follows.

## Followups

- Operate one real client install after client-specific credentials and gateway
  configuration are available.
