---
template_id: kamdar-company-operating-rollup
template_version: "0.5.0"
name: "Kamdar — Week of {{WEEK_START}}"
report_type: "Company"
week_start: "{{WEEK_START}}"
report_status: "{{REPORT_STATUS}}"
report_version: "{{REPORT_VERSION}}"
finalized_at: "{{FINALIZED_AT}}"
previous_report: "{{PREVIOUS_REPORT}}"
source_report_ids: "{{AREA_REPORTS}}"
---

# Kamdar — Week of {{WEEK_START}}

## Summary

<!-- Exactly three evidence-backed sentences: material company change,
highest-leverage attention, and next company priority. -->

{{SUMMARY}}

## Outcomes and open attention

| Area | Current result | Open attention | Next owner action | Source report |
| --- | --- | --- | --- | --- |
{{DEPARTMENT_RESULT_ROWS}}

## Problems and inefficiencies

<!-- Company rows only when the problem crosses Areas or has a material
shared impact. The proposed intervention stays bounded and testable.

GOLDEN EXAMPLE — replace every fact below; it demonstrates useful detail.
| Supplier evidence reaches Merchandising and CMT in incompatible formats | Merchandising, CMT | Two Area reports cite the same reconciliation delay | Draft one source-linked exception brief with a proposed common intake format | Trial for the next two reviews; success = both leads identify a variance decision in under 10 minutes. |
END GOLDEN EXAMPLE -->

| Problem | Areas / workflows | Evidence and recurrence | Quantified baseline or measurement gap | Confidence | Narrow intervention | First test and success signal |
| --- | --- | --- | --- | --- | --- | --- |
{{PROBLEM_OPPORTUNITY_ROWS}}

## Decisions

{{DECISIONS_VIEW_OR_LIST}}

## SOPs

{{SOPS_VIEW_OR_LIST}}

## Next-week priorities

{{NEXT_WEEK_HANDOFF}}

## Automation receipt

- `evidence_window:` {{START_TIMESTAMP}}..{{END_TIMESTAMP}}
- `area_reports:` {{Area rollup locators}}
- `source_gaps:` {{Missing Area reports or source evidence, or none}}
- `previous_company_report:` {{Report locator or none}}
