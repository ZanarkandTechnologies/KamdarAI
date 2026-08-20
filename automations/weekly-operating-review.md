---
automation_id: kamdar-weekly-operating-review
automation_version: "0.1.0"
kind: company-os-automation
cadence: weekly
company_timezone: Asia/Kuala_Lumpur
status: proposal-only
owner: Kamdar AI
---

# Weekly operating review

> **Outcome**
>
> Turn approved Daily evidence into a reviewable weekly operating proposal, while preserving Notion projects and tasks as canonical work records.

> **Why**
>
> Select what becomes durable company knowledge rather than allowing every note, issue, or decision candidate to become a record automatically.

## Inputs

- Daily receipts and proposals for the reporting week.
- Kamdar AI project, linked Tasks, and approved source records.
- Owner-approved directory/role mappings when available.

## Review lanes

| Lane | Decision | Potential write after separate approval |
| --- | --- | --- |
| Plan review | plan versus actual and next-week proposal | report draft update |
| Issue promotion | Promote / Duplicate / Monitor / Dismiss | task with approved issue model |
| Decision promotion | Promote / Duplicate / Monitor / Dismiss | Decision record |
| Resource promotion | Promote / Duplicate / Monitor / Dismiss | Resource record |
| Finalization | whether evidence is ready | immutable weekly report |

## Rules

- Every proposed promotion must cite source evidence and named authority.
- Canonical Tasks are linked forward; never cleared, copied as replacements, or deleted.
- Notion comments and emails remain outside this automation unless separately approved.
- No weekly report location, record template, or promotion authority is currently mapped for Kamdar. Return a configuration gap rather than creating a record.

## Write boundary

This proposal-only specification is not scheduled and performs no external write. Enable only after the owner approves the report data source, record templates, promotion authority, and a specific execution schedule.
