---
ticket_id: TASK-0011
artifact_type: assertion-change-review
status: approved
reviewed_at: 2026-08-26T14:05:00+08:00
---

# Assertion change review

One Weekly assertion changed after independent review proved that its original
wording contradicted the required fail-closed Company state. No Daily assertion
changed.

| Feature / scenario | Old assertion | New assertion | Evidence | Independent verdict |
| --- | --- | --- | --- | --- |
| FEAT-0005 / `weekly-report-hierarchy-and-finalization-gate` | The Final Company report cites all three Final Area reports and provides substantive operating content. | The Blocked Company report cites all three Final Area reports, provides substantive operating content, and refuses Final status while the Content input is missing. | The frozen Weekly context records a missing Content Area input; `weekly-review-result-2026-W34.json` correctly returns the Company report as `Blocked`, cites the three available Final Area reports, and retains the blocking configuration gap. | Approved by the independent deployment `-01` FEAT-0005 judge. |

The unsupported fixed `2026-08-27` capacity deadline was removed from candidate
content. The existing FEAT-0003 requirement for an expiring capacity condition
remains supported by TASK-110's frozen evidence: Line 3 is provisional and may
be lost if sample approval slips past Thursday.

All other repairs changed the owning frozen evidence, candidate output, current
template rendering, conflict guard, receipt, or read-back artifact instead of
weakening expected behavior.
