---
artifact_type: task-architecture
task_id: TASK-0007
status: active
updated_at: 2026-08-25
---

# TASK-0007 architecture

## Core decision

The current Weekly Draft is a local Markdown record. It is the only
accumulation surface for weekly Decisions, SOPs, PM attention, risks, and cost.
There is no Weekly contribution artifact, Draft diff, or provider integration
for it.

The only external boundaries are Project-memory application and employee
delivery. They remain nested in their owning pipelines.

## Before and after

    BEFORE
    Daily contribution file -> Draft integration -> current Draft
    Weekly evidence bundle -> Draft diff -> Draft integration -> current Draft
    Project control -> no current-Draft update

    AFTER
    Daily knowledge -> current Draft Decisions/SOPs
    Daily control -> current Draft PM/Risks/Cost
    Weekly finalization reads current Draft only

## Runtime graph

    [one Daily source scan]
              |
              v
    daily-context-diff-YYYY-MM-DD.json
              |
    +---------+------------+-------------+------------------+
    |                      |             |                  |
    v                      v             v                  v
    Project memory     Documentation  Knowledge capture  Project control
    project plan       message plan    same Draft         control plan + same Draft
    |                  |               Decisions/SOPs     PM/Risks/Cost
    |                  |                     |                  |
    v                  v                     +--------+---------+
    guarded Project    preferred-channel               |
    application        dispatcher                       v
                         \                       Daily receipt
                          \                            |
                           +----------------------------+
                                                        |
                                                        v
                                     current-weekly-draft-YYYY-Www.md
                                                        |
                                                        v
                           weekly-report-finalization(Draft read only, routing snapshot)
                                                        |
                                                        v
                   Project reports -> Department reports -> Company report

## File graph

    daily/context/daily-context-diff-YYYY-MM-DD.json
    daily/project-memory/project-diff-plan-YYYY-MM-DD.json
    daily/documentation-quality/employee-message-plan-YYYY-MM-DD.md
    daily/project-control/project-control-plan-YYYY-MM-DD.json
    weekly/current/weekly-report-draft-YYYY-Www.md     <-- shared direct target
    daily/receipt-YYYY-MM-DD.json
    weekly/finalization/weekly-finalization-plan-YYYY-Www.md
    weekly/reports/projects/<project>-YYYY-Www.md
    weekly/reports/departments/<department>-YYYY-Www.md
    weekly/reports/company/YYYY-Www.md
    weekly/receipt-YYYY-Www.json

The Draft is both the input and output of its two Daily mutator pipelines. It
is not copied between them: canonical anchor order serializes their direct
writes, and source-key idempotency makes an unchanged rerun zero-write.

## Ownership matrix

| Surface | Owner | Mutability |
| --- | --- | --- |
| Daily context JSON | collector | created once per run |
| Project knowledge / weekly attention | Project memory through guarded adapter | external, explicit mode only |
| Documentation message plan | Documentation quality | local artifact |
| Draft Decisions / SOPs | Knowledge Capture | direct local Markdown |
| Draft PM / risks / cost | Project Control | direct local Markdown |
| Employee channel result | dispatcher and selected channel skill | provider boundary |
| Weekly reports / finalization plan | Weekly finalization | local output root |
| Report pages in isolated proof | isolated operator | marked seed only |

## Direct-Draft safety

1. The supplied Draft must be state Draft, match the requested week, and expose
   all five anchor start/end markers.
2. Each entry has a kind, its one allowed anchor, one key prefixed by the kind,
   non-empty source IDs, and non-empty Markdown.
3. Existing equal keyed content is duplicate. Existing changed keyed content
   creates a conflict and prevents any entry in that update batch from writing.
4. The Daily receipt preserves hashes and outcomes; the Draft contains only
   concise review content.
5. Weekly validates the same shape, reads it, and never changes it.

## Open proof gates

- Static normal/hard/boundary eval contracts are present, but profile-backed
  model calibration is still draft_unrun.
- The deterministic fixture proves local Markdown semantics and the isolated
  operator proves only marked Notion Project/report pages.
- Production provider writes, schedule activation, and source-to-runtime
  installation require separate owner authority.
