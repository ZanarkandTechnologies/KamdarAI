# Kamdar automation specifications

Every Kamdar automation is represented as a Markdown contract in this directory. Markdown is the editable source of truth: review and version the behavior here before scheduling or deploying any runner.

The buyer-visible capability owners live in [`docs/features/`](../docs/features/README.md),
and the [Kamdar Company OS system page](../docs/systems/kamdar-company-os.md)
shows how one Daily scan and one Weekly pass compose them. Automation files own
cadence, procedure, and authority; feature pages own stable outcomes and proof.

## Status

| Automation | File | Status | External writes |
| --- | --- | --- | --- |
| Daily Notion documentation check | `daily-notion-documentation-check.md` | Retired; superseded by the structured Daily Review | None |
| Daily operating update | `daily-operating-update.md` | Active-Project collection → one Zod-shaped result → guarded integrations | None in default `prepare`; explicit `isolated-eval` may write only to the dated Notion root and relay chases to the configured Telegram eval sink with provider receipts |
| Weekly operating review | `weekly-operating-review.md` | Project → Department → Company report hierarchy | None in default `prepare`; explicit `isolated-eval` may write the verified hierarchy and send the complete Company report to the approved owner Telegram route |
| Evaluate seed | `evaluate-seed.md` | Exact-hash seed realism and complete entity/case coverage | None |
| Evaluate Daily Review | `evaluate-daily-review.md` | Deterministic gates → feature judges → artifact quality → independent review | Mocked only |
| Evaluate Weekly Review | `evaluate-weekly-review.md` | Deterministic gates → feature judges → artifact quality → independent review | Mocked only |

Runtime receipts and generated proposals go to ignored directories (`receipts/`, `proposals/`, `runs/`). They are not the editable specification and must not be committed.

The active acceptance contracts are `evals/daily-review-evals.json` and
`evals/weekly-review-evals.json`, both grounded in the reviewed seed and using
canonical Farplane case fields with Kamdar proof bindings under
`metadata.extensions.kamdar`. The retained `evals/evals.json` is the legacy
template-first buyer showcase and does not feed the active dossier.

`evals/filesystem/` retains the prior template-first and split-pipeline
runner/UI as frozen comparison baselines. TASK-0007's earlier direct-Draft proof is owned by
`run-task0007-fixture-automation.mjs`: it applies the two local Daily Draft
writers, verifies a zero-write rerun, and finalizes the actual Draft. Neither
lane changes the default `prepare` boundary or authorizes provider calls.

An operated eval is not a mock and must not report proposed effects as applied.
Notion writes require read-back evidence. Telegram provider acceptance requires
the real provider result, message ID, and returned destination bound to the
configured route. It does not prove a seeded employee or operator saw it. An
unavailable employee email or WhatsApp channel remains a visible blocked route;
it is never silently substituted.

For the shared Daily/Weekly Interval contract, each completed scenario also
records these invariants:

```text
interval_parent_calls_per_run: 1
bounded_evidence_windows_per_run: 1
daily_canonical_promotions: 0
weekly_dispositions_before_promotion: yes
promotion_policy_separate_from_external_side_effect_gates: yes
generic_routing_validation_owner: interval-update
pulse_heartbeat_count: 1
ticket_execution: none
```
