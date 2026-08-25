---
ticket_id: TASK-0007
artifact_type: skill-contract-review
reviewed_at: 2026-08-24
reviewer: independent-reviewer
scope: skills/daily-documentation-request
verdict: structurally-ready-behaviorally-uncalibrated
---

# Daily documentation request review

## Verdict

`daily-documentation-request` is structurally ready as a single artifact skill.
It is not yet behaviorally calibrated and must not be scaled to other features
or described as proven until its profile-backed candidate/no-skill comparison
is retained.

## Accepted contract

```text
fully read Work item + resolved template + safe comparator
  -> daily-documentation-request
  -> one proposal-only documentation-request.md
  -> future integration skill only
  -> provider URL + receipt
```

- The artifact capability produces exactly `kamdar-documentation-request` and
  does not claim a platform result.
- The root Company OS owns source collection, cadence, and future application
  ordering; the leaf owns only the request artifact.
- `templates/documentation-request.md` owns every top-level output section,
  including the proposed source-record comment. Golden comment detail stays in
  nested headings, so it cannot drift outside the output contract.

## Evidence

- 15 Python repository tests passed, including three skill-specific checks.
- 23 Node filesystem tests passed.
- The frozen Daily-to-Weekly run remained 54/54 and idempotent.
- The Farplane frontmatter normalizer accepted the new package with
  `capability.kind: artifact` and `skill-template: 0.6.1`.
- Setup preview lists the new package files and reports `deletion_count: 0`.

## Remaining proof gate

`skills/daily-documentation-request/evals/evals.json` is intentionally
`draft_unrun`. Before behavior readiness, run its primary task with identical
fixture, model, sandbox, and budget in both conditions:

```text
candidate skill -> candidate-output.md
no-skill baseline -> baseline-output.md
same judge -> judge-verdict.json
```

Use the normal, unmapped-template, and complete-record cases. Repair and rerun
the smallest failed case before changing the skill or scaling the pattern.
