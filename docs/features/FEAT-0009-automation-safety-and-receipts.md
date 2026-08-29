---
title: Make every action inspectable and safe to rerun
status: active
execution_modes: [frozen, operated-v4]
production_mode: proposal-only
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-29
tags: [company-os, feature, shared, safety]
feature_id: FEAT-0009
feature_key: system.safety
system_id: SYS-0001
category: safety
public: true
surfaces:
  - workspace.hermes.md
  - templates/automation-receipt.md
source_refs:
  - tickets/archive/TASK-0006/data-model-gap-report.md
evidence_refs:
  - evals/daily/suite.json
  - evals/weekly/suite.json
known_limits: "A frozen local receipt is not evidence of an external provider write; operated-v4 receipts never authorize production effects."
---

# Make every action inspectable and safe to rerun

The Company OS bounds each Daily and Weekly run to declared sources, templates,
authority, and delivery routes, then records what was proposed, applied,
blocked, failed, or safely skipped.

## Why it exists

An AI manager must make its scope and side effects clear. A local file, a draft,
and a real provider delivery are different states and must never be conflated.

## Trigger and inputs

Automation run, source map, template map, write policy, delivery route policy,
prior receipts, action keys, and provider preflight state.

## Pipeline signature

```text
operate_safely(run, source_policy, template_map, route_policy, prior_receipts)
  -> evidence_bundle + redacted_receipts[] + apply|block|fail|skip result
     + downstream receipt binding
```

`frozen` proves deterministic behavior with zero network or external writes.
`operated-v4` binds every permitted v4 application to a redacted provider and
idempotency receipt; production remains proposal-only.

## Flow

```text
run + declared sources/templates/routes
              │
              ▼
validate scope, permissions, lifecycle, and action identity
              │
              ▼
propose | apply after approval | block | fail | skip duplicate
              │
              ▼
write redacted receipt → expose proof beside the feature result
```

## State changes and artifacts

- Creates Daily/Weekly automation receipts with scope, templates, gaps, action
  keys, write mode, and idempotency result.
- Preserves Final reports, redacts private routes, and emits a provider receipt
  only after a real provider response.

## Downstream application

Every feature uses the receipt to distinguish record changes, Markdown
artifacts, Notion application, Drive publication, Gmail delivery, and Telegram
delivery. The saved receipts bind those states to the owning feature.

## Failure modes

Unknown sources, unmapped templates, unsafe routes, insufficient authority,
privacy leakage, Final-record mutation, or duplicate actions become explicit
blocked/failed/skipped states. No integration success is synthesized.

## Proof contract

`FEAT-0009` asserts source and route bounds, template resolution, private-value
redaction, lifecycle protection, frozen-mode zero network/external writes,
provider receipt fidelity, and idempotent reruns.

## Example

The frozen run can render an email artifact but labels it `planned`; an operated
email becomes `sent` only when its recipient hash, payload hash, provider ID,
timestamp, and idempotency key are recorded. Repeating it returns `skipped`.
