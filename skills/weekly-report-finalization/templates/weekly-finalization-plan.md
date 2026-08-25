---
artifact_type: kamdar-weekly-finalization-plan
artifact_version: "0.1.0"
week: "{{WEEK}}"
state: "{{ready | configuration_gap | no_finding}}"
current_weekly_draft: "{{CURRENT_WEEKLY_DRAFT_PATH}}"
---

# Weekly finalization — {{WEEK}}

## Input Draft

- `path:` {{CURRENT_WEEKLY_DRAFT_PATH}}
- `source_keys:` {{SOURCE_KEYS}}
- `source_gaps:` {{SOURCE_GAPS}}

## Report hierarchy

{{PROJECT_REPORT_PATHS}}

{{DEPARTMENT_REPORT_PATHS}}

{{COMPANY_REPORT_PATH}}

## Promotion review

{{PROMOTION_REVIEW}}

## Completion boundary

- The input Draft was read only.
- Provider publication and executive delivery were not invoked.
