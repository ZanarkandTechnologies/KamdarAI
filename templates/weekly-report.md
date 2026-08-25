---
template_id: company-os-weekly-report
template_version: "0.8.0"
name: "{{PROJECT_NAME}} — Week of {{WEEK_START}}"
report_type: "Project"
project: "{{PROJECT}}"
department: "{{DEPARTMENT}}"
week_start: "{{WEEK_START}}"
report_status: "{{REPORT_STATUS}}"
report_version: "{{REPORT_VERSION}}"
finalized_at: "{{FINALIZED_AT}}"
previous_report: "{{PREVIOUS_REPORT}}"
source_report_ids: "{{SOURCE_REPORT_IDS}}"
---

# {{PROJECT_NAME}} — Week of {{WEEK_START}}

## Summary

<!-- Exactly three evidence-backed sentences: material change, highest-leverage
attention, and next priority. No raw activity log. -->

{{SUMMARY}}

## Outcomes and open attention

| Outcome or attention | Current state | Evidence | Next owner action |
| --- | --- | --- | --- |
{{OUTCOME_ROWS}}

## Problems and inefficiencies

<!-- Combine grounded problems, inefficiencies, risks, blockers, and cost
consequences. Preserve impact, recurrence, next proof, and source links.

GOLDEN EXAMPLE — replace every fact below.
| Supplier updates arrive in three incompatible formats | Repeated manual remapping blocks the five-store comparison | MYR 300 over plan from recorded values | Confirm one import map by 2026-08-27 | [TASK-105](task://TASK-105) |
END GOLDEN EXAMPLE -->

| Problem definition | Operating impact | Cost consequence | Next proof / intervention | Evidence |
| --- | --- | --- | --- | --- |
{{PROBLEM_OPPORTUNITY_ROWS}}

## Decisions

{{DECISIONS_VIEW_OR_LIST}}

## SOPs

<!-- Staged Daily candidates are clearly marked `Proposed` until Weekly
finalization verifies recurrence, owner, and proof. Do not mistake a candidate
for an adopted procedure. -->

{{SOPS_VIEW_OR_LIST}}

## Next-week priorities

<!-- This is the report's handoff, not a second live plan. Weekly updates the
canonical Project's This week's attention checklist separately. -->

{{NEXT_WEEK_HANDOFF}}

## Automation receipt

- `evidence_window:` {{START_TIMESTAMP}}..{{END_TIMESTAMP}}
- `sources_checked:` {{Stable source names or locators}}
- `source_gaps:` {{Missing or stale sources, or none}}
- `last_successful_daily_receipt:` {{Receipt locator}}
