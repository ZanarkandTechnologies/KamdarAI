---
automation_id: kamdar-evaluate-daily-review
automation_version: "1.0.0"
kind: company-os-eval-automation
cadence: on-demand
feature_refs: [FEAT-0001, FEAT-0002, FEAT-0003, FEAT-0004]
---

# Evaluate Daily Review

## Context

Evaluate one completed Daily Review without changing its inputs or contacting a
provider. The run root is immutable input. Deterministic checks prove the file,
schema, provenance, and integration contracts; native read-only subagents judge
whether each feature's extracted content is useful and grounded. A tester may
not approve its own evidence.

Use these paths under `<run_root>`:

- `daily/context/daily-context-diff-YYYY-MM-DD.json`
- `daily/review/daily-review-result-YYYY-MM-DD.json`
- `daily/receipts/daily-integration-receipt-YYYY-MM-DD.json`
- `eval/deterministic.json`
- `eval/judges/FEAT-0001.json` through `eval/judges/FEAT-0004.json`
- `eval/evidence-review.json`
- `eval/artifact-quality-review.json`
- `eval/integrations.json`
- `eval/result.json`

All eval files are written by the parent automation. Subagents remain read-only
and return machine-readable JSON for the parent to validate and save. Never use
live Notion, Telegram, email, WhatsApp, or other provider writes in this eval.

## Todo List

- [ ] **1 — Load the suite and validate the immutable run.**

  Load `evals/daily/suite.json`,
  `seed/manifest.json`,
  `schemas/automations/daily_review_result.py`, and
  `schemas/automations/daily_integration_receipt.py`. Treat the three base
  run artifacts declared by the suite as immutable. Stop before subagents when
  a required input is missing or changed.

  Run deterministic checks first: parse every JSON file; validate the extracted
  result with `python -m schemas.automations.validate validate
  daily-review <result-path>`; verify its date and source IDs exist
  in the context and seed; require the four feature arrays; reject undeclared
  intermediate files under `<run_root>/daily`; and verify every declared receipt
  and embedded read-back target can be traced to one extracted result. Write the complete
  check list and failures to `<run_root>/eval/deterministic.json`.

- [ ] **2 — Run one feature-scoped tester subagent per Daily feature.**

  Spawn four native read-only tester subagents. Give each tester only its feature
  case from the eval suite, relevant seed evidence, corresponding extraction
  slice, and that slice's Pydantic field descriptions and golden examples:

  | Tester | Extraction slice | Judge for |
  | --- | --- | --- |
  | FEAT-0001 | `project_note_updates[].progress_notes[]` | Complete, evidence-grounded Work, outcome, and documentation snapshots appended to the owning Project Notes file |
  | FEAT-0002 | `documentation_reviews[]` | One explicit sufficiency verdict per selected Done Work item; precise questions for missing rationale or evidence |
  | FEAT-0003 | `weekly_progress_chases[]` | Accountable, evidence-led chases only when weekly targets are stale, blocked, or unlikely to finish |
  | FEAT-0004 | `project_note_updates[].knowledge_notes[]` | Structured workflow observations, problem baselines linked to affected steps, and source-linked Decisions appended to Project Notes |

  Each tester must return exactly this machine shape (the parent supplies the
  absolute `verdict_path` in the judge packet):

  ```json
  {
    "feature_id": "FEAT-0001",
    "tier": "A",
    "verdict": "pass",
    "rubric": {
      "groundedness": "A",
      "completeness": "A",
      "usefulness": "A",
      "repeatability": "A",
      "length_balance": "A"
    },
    "assertions": [
      {
        "assertion": "exact authored assertion",
        "met": true,
        "evidence_refs": ["TASK-201 at project_note_updates[0].knowledge_notes[0].source_ids"]
      }
    ],
    "evidence_refs": ["TASK-201 at project_note_updates[0].knowledge_notes[0].source_ids"],
    "failures": [],
    "verdict_path": "/absolute/run/root/eval/judges/FEAT-0001.json"
  }
  ```

  Grade all five rubric dimensions from `A` through `D`. These grades describe
  the candidate artifact itself; they do not restate the overall feature tier.

  Allow only `pass`, `fail`, or `blocked` verdicts and A/B/C/D tiers. Only a
  `pass` with tier A, every assertion met, cited evidence, and no failures can
  pass its gate. Require `verdict_path` to equal the absolute manifest path for
  that feature. The parent validates and writes the returned JSON; a tester
  cannot read or judge another feature.

- [ ] **3 — Review evidence independently.**

  After all four tester verdicts exist, spawn a separate read-only evidence
  reviewer that did not produce them. Give it `eval/deterministic.json`, the
  four verdict files, their cited immutable evidence fragments, and the eval
  acceptance rules. It checks that every assertion has a resolvable citation,
  failures were not hidden, and no tester approved unsupported content. It may
  confirm or downgrade a verdict but cannot upgrade `fail` or `blocked` without
  new evidence. The parent writes its returned JSON to
  `<run_root>/eval/evidence-review.json`.

- [ ] **4 — Review the generated artifacts as an end user.**

  Spawn a separate read-only artifact reviewer. Give it the exact result bytes,
  frozen context, destination templates, and
  `evals/rubrics/end-user-artifact-quality.md`. It must inspect every row in all
  four result arrays for referential clarity, end-user value, readability,
  template fidelity, groundedness, workflow reconstructability, and baseline
  integrity. The parent validates the response with
  `schemas/automations/artifact_quality_review.py` and writes
  `<run_root>/eval/artifact-quality-review.json`. Only tier A proceeds. Route
  B/C prose findings through an `unslop` repair and regeneration; the reviewer
  never edits its candidate.

- [ ] **5 — Check mocked integration contracts and reconcile one result.**

  Pass each extracted JSON section through its local mocked integration adapter;
  do not call a live provider. Match every expected effect to the immutable
  receipt and read-back by feature ID, operation, target record/person ID,
  action or idempotency key, payload hash, status, and result URL or provider ID.
  Assert that read-back values equal the intended rows, comments, report text,
  or messages. A receipt link without matching read-back is not proof. Also
  verify blocked/failed effects do not mark Work processed and successful or
  duplicate effects do not apply twice. Write
  `<run_root>/eval/integrations.json` with boolean `pass`, top-level
  `failures[]`, and exactly these four gates: `effects-match-receipt`,
  `read-back-matches-intent`, `processing-safety`, and `idempotency`. Every gate
  contains `gate_id`, boolean `pass`, `evidence_refs[]`, and `failures[]`; a
  passing gate requires evidence and no failures. The top-level pass must equal
  all gates passing with no top-level failures.

  For FEAT-0003 in an isolated operated run, require the exact chase payload to
  resolve through the seeded Person route and the receipt state to be
  `delivered_to_eval_sink`. Require `delivery_scope = operator_owned_eval_sink`,
  the intended Person ID, Telegram provider message ID, exact payload hash,
  configured destination hash, matching provider destination hash, and matching
  read-back. A message ID without destination binding fails. Reject `applied`,
  `duplicate`, a Notion receipt URL, or wording that claims the fictional Person
  or operator saw the message.

  Reconcile deterministic checks, independently reviewed feature verdicts,
  tier-A artifact quality, and integration checks into
  `<run_root>/eval/result.json`. The overall verdict is
  `pass` only when every required gate passes; otherwise return `fail` or
  `blocked` with exact artifact paths and the smallest rerun boundary.

## Output

- `<run_root>/eval/deterministic.json`
- `<run_root>/eval/judges/FEAT-0001.json` through `FEAT-0004.json`
- `<run_root>/eval/evidence-review.json`
- `<run_root>/eval/artifact-quality-review.json`
- `<run_root>/eval/integrations.json`
- `<run_root>/eval/result.json`
