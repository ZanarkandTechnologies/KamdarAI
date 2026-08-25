---
artifact_type: kamdar-employee-message-plan
artifact_version: "0.1.0"
context_diff_id: "{{CONTEXT_DIFF_ID}}"
local_day: "{{LOCAL_DAY}}"
evidence_window: "{{EVIDENCE_WINDOW}}"
state: "{{proposed | no_finding | blocked}}"
delivery_state: proposal-only
---

# Documentation-quality message plan — {{LOCAL_DAY}}

## Provenance

- `context_diff:` {{CONTEXT_DIFF_PATH}}
- `source_ids_used:` {{SOURCE_IDS_USED}}
- `template_refs:` {{STATIC_TEMPLATE_REFS}}
- `run_key:` {{RUN_KEY}}

## Recipient groups

<!--
One group per verified People snapshot. The channel dispatcher—not this
artifact—checks the approved preferred channel, merges same-person
documentation/control messages, and hands off only through that channel skill.

GOLDEN EXAMPLE — replace every identity and fact below.
### Nur Iqbal — documentation updates
- `person_id:` PERSON-NUR
- `preferred_contact_channel:` email
- `approved_contact_channels:` email; notion_comment
- `contact_endpoint:` nur@company.example
- `delivery_status:` proposal-only

#### TASK-102 — Complete launch QA evidence
**Why this needs attention:** Release review cannot assess completion while QA
evidence and reviewer are absent from the Work record.

**Known record:** Blocked; due 2026-08-20; acceptance evidence is not linked.
**Update exactly:** Work properties `Evidence` and `Reviewer`; then `Notes`.
**Please provide:**
1. The linked QA evidence and the reviewer who checked it.
2. The current blocker and accountable resolver, if evidence is still pending.
3. The revised completion date and next action, if the original commitment moved.

**Source:** notion://TASK-102 (`SRC-WORK-102`)
**Idempotency key:** documentation-quality:2026-08-21:TASK-102
END GOLDEN EXAMPLE
-->

{{RECIPIENT_GROUPS}}

## Blocked delivery entries

<!-- List the Work item, exact documentation request, known person ID, missing
route fact, source ID, and `blocked_delivery`. Never invent an address. -->

{{BLOCKED_DELIVERY_ENTRIES_OR_NONE}}

## No-finding records

<!-- List fully read records whose mapped fields are sufficient, with the source
ID and a concise reason. Do not create an empty recipient group for them. -->

{{NO_FINDING_RECORDS_OR_NONE}}

## Handoff

- `delivery_state:` proposal-only
- `integration_owner:` dispatch-employee-messages
- `dedupe_boundary:` {{ONE_MESSAGE_PER_PERSON_AND_WORK_ITEM_OR_INTEGRATION_MERGE_KEY}}
- `source_gaps:` {{SOURCE_GAPS_OR_NONE}}
