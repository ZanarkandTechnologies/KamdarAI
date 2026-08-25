---
template_id: kamdar-employee-followups
template_version: "0.3.0"
---

Subject: Action requested for {{WORK_ITEM_COUNT}} work items

Hello {{RECIPIENT_NAME}},

Please update the source Work pages below by {{RESPONSE_DUE_AT}}. Each item
contains the facts currently recorded and the exact response needed.

## {{WORK_ITEM_ID}} — {{WORK_ITEM_NAME}}

**Current record:** {{KNOWN_STATUS_AND_PROGRESS}}

**Plan versus actual:** {{TIME_AND_COST_VARIANCE_OR_SOURCE_GAP}}

**Blocker / cause:** {{BLOCKER_AND_CAUSE_CONFIDENCE}}

**Missing evidence:** {{MISSING_FIELDS_OR_NONE}}

Please reply with:

1. {{QUESTION_ONE}}
2. {{QUESTION_TWO}}
3. {{QUESTION_THREE}}
4. {{QUESTION_FOUR}}
5. {{QUESTION_FIVE}}

Update: {{UPDATE_LOCATION}}

Next known action: {{NEXT_ACTION}}

Source: {{WORK_ITEM_URL}}

## Delivery receipt

- `recipient_person:` {{PERSON_ID}}
- `approved_route:` {{ROUTE_OR_GAP}}
- `write_mode:` {{proposal-only | sent}}
