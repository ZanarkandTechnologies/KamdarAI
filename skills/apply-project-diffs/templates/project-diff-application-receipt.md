---
artifact_type: kamdar-project-diff-application-receipt
artifact_version: "0.1.0"
state: {{applied | duplicate | conflict | blocked | configuration_gap}}
generated_at: {{ISO_8601_TIMESTAMP}}
mode: {{frozen | operated-v4 | production}}
project_diff_plan_id: {{PROJECT_DIFF_PLAN_ID}}
project_id: {{PROJECT_ID}}
target_section: {{This_week_s_attention | Project_knowledge}}
operation: {{append | replace}}
source_ids: [{{SOURCE_IDS}}]
idempotency_key: {{IDEMPOTENCY_KEY}}
proposed_value_hash: {{PROPOSED_VALUE_HASH}}
expected_current_value_hash: {{EXPECTED_CURRENT_VALUE_HASH}}
preflight_current_value_hash: {{PREFLIGHT_CURRENT_VALUE_HASH_OR_NULL}}
provider_reference: {{SAFE_PROVIDER_ID_OR_NULL}}
---

# Project-diff application receipt

## Outcome

{{One sentence: whether the exact patch applied, was duplicate, conflicted, or stopped.}}

## Guard results

- **Source:** {{passed | failed and reason}}
- **Identity:** {{passed | failed and reason}}
- **Idempotency:** {{new | duplicate | conflict}}
- **Expected current value:** {{matched | mismatched | unavailable}}

## Next action

{{Retry key or precise repair condition. Do not include provider payloads or raw
preflight text in this receipt.}}

<!--
GOLDEN SHAPE
state: applied
project_diff_plan_id: PROJECT-DIFF-2026-08-24
project_id: PROJECT-124
target_section: Project_knowledge
operation: append
source_ids: [WORK-124, MEETING-042]
idempotency_key: project-diff:v1:PROJECT-124:knowledge:WORK-124
proposed_value_hash: sha256:bb4e...781f
expected_current_value_hash: sha256:empty
preflight_current_value_hash: sha256:empty
provider_reference: project-adapter:page-demo-124:rev-18

# Project-diff application receipt

## Outcome

Applied the source-linked Project knowledge addition to PROJECT-124 after the
target section still matched its expected empty value.

## Guard results

- **Source:** passed — WORK-124 and MEETING-042 are cited by the reviewed plan.
- **Identity:** passed — PROJECT-124 matched the preflight record.
- **Idempotency:** new
- **Expected current value:** matched

## Next action

Reuse the same idempotency key for an exact retry; re-plan if the source or
current section changes.
END GOLDEN SHAPE
-->
