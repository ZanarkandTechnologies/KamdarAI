---
name: pm-daily
description: Turn one bounded Daily project snapshot and the current weekly Project Memory files into grounded memory updates and message drafts.
---

# PM Daily

## Use when

Run once per workday after the automation has fetched active Projects and their
recent in-progress or completed Work. This skill edits local artifacts only. It
does not fetch provider data, post comments, send messages, or sync files.

## Inputs

- `daily/context/daily-snapshot-YYYY-MM-DD.json`
- `weeks/<week>/project-memory/project--<project-id>.md` for every selected Project
- `templates/project-memory.md`
- `templates/documentation-request.md`
- `templates/employee-followups.md`

The snapshot must contain exact Project, Work, Person, relation, status, date,
source URL, and source revision values. Missing evidence stays missing.

## Outputs

- Updated current-week Project Memory files
- Documentation-request drafts under `daily/messages/documentation/`
- Progress-follow-up drafts under `daily/messages/progress/`
- No other files

## Workflow

- [ ] **1 — Bind each Work item to one Project.**
  Rule: use only exact relations from the snapshot. Never match by title or
  infer a Project, Person, route, date, or status.
  Assert: every proposed change cites source IDs and belongs to one selected
  Project; unresolved relations are reported as gaps and produce no edit.

- [ ] **2 — Update Project Memory in place.**
  Rule: read the complete existing file and memory template. Preserve valid
  history and unrelated content. Update the operating picture, durable Project
  knowledge, and this week's attention from current evidence. Do not copy full
  ticket bodies or meeting transcripts.
  Assert: the file still matches the template headings; every new claim cites
  an exact source ID; unresolved targets and blockers are not silently removed.

- [ ] **3 — Draft documentation requests.**
  Rule: review completed Work only. When evidence is insufficient, render one
  precise request from the documentation template. Ask only for facts needed
  to verify the claimed outcome. Sufficient Work produces no draft.
  Assert: each draft names the exact Work item, missing evidence, intended
  recipient, and source URL without inventing metrics or a delivery route.

- [ ] **4 — Draft progress follow-ups.**
  Rule: chase only stale, overdue, blocked, or materially ambiguous Work. Use
  the progress template and ask one answerable question tied to the next action.
  Assert: healthy or recently updated Work produces no draft; one issue does
  not create duplicate documentation and progress messages.

- [ ] **5 — Verify the artifact boundary.**
  Rule: inspect the changed-file list and reread every changed artifact.
  Assert: only declared outputs changed, all Markdown is readable, every claim
  is grounded, and no provider action was attempted.

## Golden behavior

When a completed Work item claims a result but lacks the measurement source,
retain its factual progress in Project Memory and draft a documentation request
for that source. Do not mark the result verified, estimate the number, or also
send a generic progress chase.

## Proof

Cases and frozen inputs live in `evals.json` and `evals/`. Evals assert changed
paths, required headings, source citations, preserved memory, precise drafts,
and the absence of unauthorized files or provider effects. Review every output
for readable conclusions and next actions, complete template use, explicit
uncertainty, and source-grounded measurements. Do not expose placeholders,
internal control metadata, unexplained opaque IDs, or hashes in reader prose.
Financial claims must show their sourced formula; missing inputs become an
owned measurement gap. A failed quality review blocks provider application.
