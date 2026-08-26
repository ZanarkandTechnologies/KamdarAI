---
artifact_type: kamdar-channel-dispatch-result
artifact_version: "0.1.0"
state: {{prepared | delivered_to_eval_sink | delivered_to_employee | duplicate | conflict | blocked | configuration_gap | no_finding}}
generated_at: {{ISO_8601_TIMESTAMP}}
dispatch_mode: {{prepare | isolated-eval | send}}
source_artifacts: [{{ARTIFACT_IDS}}]
provider_effects: {{none | observed}}
---

# Employee message dispatch

## Outcome

{{One sentence: what was prepared, sent by a named channel skill, or stopped.}}

## Dispatches

| Intended Person | Intended channel | Actual handler/sink | Source records | State | Idempotency | Safe receipt reference |
| --- | --- | --- | --- | --- | --- | --- |
{{ONE_ROW_PER_RECIPIENT}}

## Repair

{{Exact next action for a missing route, disabled handler, conflict, or failed send.}}

<!--
GOLDEN SHAPE
state: prepared
dispatch_mode: prepare
source_artifacts: [QUALITY-DELTA-2026-08-24, CONTROL-DELTA-2026-08-24]
provider_effects: none

# Employee message dispatch

## Outcome

Prepared one Telegram handoff for Kenji. No channel skill or provider was called.

## Dispatches

| Intended Person | Intended channel | Actual handler/sink | Source records | State | Idempotency | Safe receipt reference |
| --- | --- | --- | --- | --- | --- | --- |
| PERSON-KENJI | telegram | telegram-message | TASK-101, TASK-102 | prepared | dispatch:v1:PERSON-KENJI:telegram:2026-08-24 | none |

## Repair

Set `dispatch_mode: send` only after the Telegram recipient scope and gateway
receipt requirements pass.
END GOLDEN SHAPE
-->
