# Kamdar automation configuration

This directory is the source-controlled automation surface for the Kamdar
harness. Treat these Markdown files like infrastructure configuration: each
file declares one active automation's cadence, inputs, procedure, authority,
and outputs.

| Automation | File |
| --- | --- |
| Daily operating update | `daily-operating-update.md` |
| Weekly operating review | `weekly-operating-review.md` |

Supporting files live with their owners:

- Runtime data contracts: `schemas/automations/`
- Evaluation workflows: `evals/automations/`
- Evaluation-only schemas: `evals/schemas/`
- Daily evaluation package: `evals/daily/`
- Weekly evaluation package: `evals/weekly/`

Runtime receipts, proposals, and runs belong in ignored runtime directories.
They are generated state, not automation configuration, and must not be
committed here.

## Two-stage execution

Stage 1 generates and judges an immutable cadence result, then writes
`delivery-plan.json` and `handoff.json`. It never applies provider effects.
Stage 2 is a separate invocation that verifies the result, plan, workspace,
quality state, exact destinations, and `automation_delivery.<cadence>` policy
before applying anything:

```bash
python3 setup.py deliver --handoff /absolute/private/run/daily/handoff.json
python3 setup.py deliver --handoff /absolute/private/run/daily/handoff.json --apply
```

The review lists every configured downstream provider. `--apply` consumes the
same hashes without regenerating content. Receipts are stored beside the
private handoff and idempotency state remains in the private Hermes profile.

This layout cleanup changes repository source only. The workspace setup process
copies an allowlist and never deletes runtime files. Removing stale files from a
live Hermes workspace requires separately approved cleanup.
