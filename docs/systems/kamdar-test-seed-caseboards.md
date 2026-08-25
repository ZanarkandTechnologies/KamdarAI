---
title: Kamdar seed caseboards
status: proposed
owner: KamdarAI
created_at: 2026-08-25
system_id: SYS-0001
feature_refs:
  - FEAT-0001
  - FEAT-0002
  - FEAT-0003
  - FEAT-0004
  - FEAT-0005
  - FEAT-0006
  - FEAT-0007
refs:
  - ../../evals/seed/kamdar-company-os.seed.json
---

# Seed caseboards

These are human-readable views of the seven cases in the canonical seed. The
JSON owns the exact input; Daily and Weekly eval suites own exact assertions.

## FEAT-0001 — Update Project memory

| Setup | Expected diff |
| --- | --- |
| Penang Project, overdue TASK-101, and decision Meeting TASK-201 | Replace Overview and Project knowledge; check completed prior work; retain open work; add the current blocker and meeting commitments. Reject a stale-section overwrite. |

## FEAT-0002 — Request missing evidence

| Setup | Expected diff |
| --- | --- |
| Completed TASK-115 lacks attribution method, sample source, and decision reason. TASK-116 is complete. | Add one precise comment to TASK-115 naming the missing evidence and update location. Do not comment on TASK-116. Mark processed only after comment or verified no-finding. |

## FEAT-0003 — Chase delivery risk

| Setup | Expected diff |
| --- | --- |
| Penang weekly target is at risk; TASK-101 is overdue and blocked with a recorded time variance; TASK-109 is healthy. | Resolve Jun through People and prepare one grounded chase for TASK-101. Do not chase TASK-109. |

## FEAT-0004 — Update the Weekly Draft

| Setup | Expected diff |
| --- | --- |
| Meetings TASK-201..203 contain a problem, decision, reusable method, and deliberate authority/reuse gaps. A current Penang Draft exists. | Put PM attention first; replace the relevant Draft sections; increment the report version once; request missing authority or reuse evidence. |

## FEAT-0005 — Finalize and roll up reports

| Setup | Expected diff |
| --- | --- |
| Three current Project Drafts, one prior Final, seven Departments, and the material Content source gap. | Finalize current Drafts; leave the prior Final unchanged; roll Project reports into Area reports and then Company; block Company finalization while Content lacks a Project source. |

## FEAT-0006 — Promote reusable knowledge

| Setup | Expected diff |
| --- | --- |
| Project Draft candidates cover promoted, duplicate, project-only, monitor, blocked, and dismissed outcomes. | Read candidates from Drafts, not raw Work. Create canonical records only for promoted candidates; record every other disposition without creating a destination. |

## FEAT-0007 — Replace next-week priorities

| Setup | Expected diff |
| --- | --- |
| Final Penang report, unresolved TASK-101/TASK-104, and approved TASK-201 commitment. | Replace the Project's weekly checklist with carried work and the rollout-decision priority, including owner, due condition, and sources. Do not mutate source Work or create a second plan file. |

## Minimum useful inventory

```text
 7 purposeful scenario Projects
 6 People
10 Tasks + 3 Meetings
 4 Reports
 7 feature cases
```

Every retained record either produces an observable result or proves a no-op,
block, duplicate, conflict, or idempotency boundary.
