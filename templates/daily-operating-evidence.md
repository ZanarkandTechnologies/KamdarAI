---
template_id: kamdar-daily-operating-evidence
template_version: "0.5.0"
---

# Daily operating evidence — {{LOCAL_DAY}}

## Sources and scope

{{SOURCES_CHECKED_AND_SOURCE_GAPS}}

## Project record patches

| Project | Changed fields | Sourced facts | Linked Work / Meetings | Mutation state |
| --- | --- | --- | --- | --- |
{{PROJECT_PATCH_ROWS}}

<!-- A Project patch updates the canonical Project in place. This artifact is
run-level evidence only; it never becomes a Project-memory child page. -->

## Work and Meeting evidence

| Work Item | Type / status | Plan → actual | Time / cost variance | Problem explanation | Next action | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
{{Work Item rows}}

## Meeting commitments

{{Commitment, linked Task proposal, Decision candidate, SOP candidate, or none}}

## Follow-up proposals

{{Only stale/blocked work or precise documentation requests}}

## Stale-record comments

{{Deduplicated source-record comment proposals, or none}}

## Source gaps

{{Missing, stale, or unparseable source; otherwise none}}
