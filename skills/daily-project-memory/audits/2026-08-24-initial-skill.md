---
skill: daily-project-memory
date: 2026-08-24
change_type: new-skill
owner: KamdarAI
status: draft_unrun
review_route: artifact-contract-review
reasoning_basis: TASK-0007 Project-memory boundary
proof_artifacts:
  - SKILL.md
  - templates/project-diff-plan.json
  - ../../automations/examples/golden/daily-context-diff-2026-08-24.json
  - examples/golden/project-diff-plan.json
  - evals/evals.json
eval_required: yes
---

# Initial Daily Project Memory Skill Audit

## Owner decision

The Daily collector owns external reads. This skill owns the judgment that
turns embedded Project/Work/Meeting evidence into a minimal Project patch plan.
`apply-project-diffs` alone may preflight target identity, mutate a Project,
and issue a receipt. Proprietary, project-specific facts stay in the Project
body rather than creating a Docs, Research, or Project-memory child record.

## Rejected placements

- **Daily automation prompt:** it would couple source collection with Project
  content judgment and make a change hard to test by fixture.
- **Integration skill:** integrations validate/apply a reviewed patch; they do
  not decide what belongs in Project knowledge or weekly attention.
- **Generic Research/Docs record:** no proven cross-project reuse lifecycle
  exists; Project knowledge is the smallest canonical surface.

## Initial contract checks

| Check | Result | Evidence |
| --- | --- | --- |
| Stable trigger | pass | One Daily context diff with embedded Project snapshots |
| Distinct output | pass | `kamdar-project-diff-plan` JSON |
| Knowledge/attention boundary | pass | First-load node N2 and golden output |
| Provider-free boundary | pass | SKILL.md prohibits reads, writes, and receipts |
| Normal/hard/boundary evals | drafted | `evals/evals.json`; not yet executed |
| Candidate/no-skill comparison | pending | Required before readiness |

## Remaining proof

Run the normal fixture against an unstructured-Daily baseline, retain both JSON
plans and a judge verdict, then fix and rerun the smallest failing eval.
