---
template_id: kamdar-issue
template_version: "0.3.0"
name: "{{ISSUE_NAME}}"
work_item_id: "{{ISSUE_ID}}"
project: "{{PROJECT}}"
department: "{{DEPARTMENT}}"
owner: "{{OWNER}}"
type: "Issue"
status: "{{STATUS}}"
priority: "{{PRIORITY}}"
start_date: "{{START_DATE}}"
due_date: "{{DUE_DATE}}"
progress: "{{PROGRESS}}"
last_meaningful_update: "{{LAST_MEANINGFUL_UPDATE}}"
severity: "{{SEVERITY}}"
detected_at: "{{DETECTED_AT}}"
next_review: "{{NEXT_REVIEW}}"
---

# {{ISSUE_NAME}}

## Problem and impact

<!-- Facts only: what is failing, who is affected, the consequence, and whether
it recurred. Do not present an inference as a fact.

GOLDEN EXAMPLE — replace every fact below; it demonstrates useful detail.
**Observed:** Manual count evidence missed the variance review in three pilots.
**Impact:** The replenishment owner could not approve the next order on time.
END GOLDEN EXAMPLE -->

{{PROBLEM_AND_IMPACT}}

## Evidence and reproduction

<!-- Link the source evidence and smallest repeatable reproduction path. State
an explicit evidence gap when no reproduction is yet known. -->

{{EVIDENCE_AND_REPRODUCTION}}

## Diagnosis

<!-- Hypothesis, contributing factors, confidence, evidence still needed, and
what would confirm or refute it. -->

{{DIAGNOSIS}}

## Containment and next action

<!-- Immediate mitigation, named owner, due date, and next review point. -->

{{CONTAINMENT_AND_NEXT_ACTION}}

## Resolution and verification

<!-- Fix, verification evidence, remaining risk, and linked Decisions or Skills. -->

{{RESOLUTION_AND_VERIFICATION}}

## Related records

<!-- Linked Projects, Work, Decisions, Reports, Skills, and source material. -->

{{RELATED_RECORDS}}
