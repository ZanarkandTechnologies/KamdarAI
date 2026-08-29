---
ticket_id: TASK-0001
kind: configuration-review
status: pass
overall_tas: TAS-A
reviewed_at: 2026-08-21
review_scope: template-routing-source-foundation
---

# Template-routing configuration review

## Verdict

`TAS-A` — pass. The configuration foundation is coherent and preserves the
runtime boundary; it is not evidence that the unbuilt frozen runner/UI works.

## Reviewed claim

- `templates/` contains pinned HermesCorp contracts and active Kamdar-derived
  Area, Company, Daily, outreach, and receipt templates.
- `workspace.hermes.md`, `kamdar-company-os`, and Daily/Weekly contracts route
  the real Kamdar sources, installed workspace templates, and complete changed
  Task pages with hidden Meeting-block handling.
- Root `evals/evals.json` declares the canonical template-first contract: ten
  durable file assertions and thirteen behavior/safety assertions, including
  an existing current-week draft modification and a new report creation.
- The runtime skill does not ship a duplicate eval definition. It reads
  templates and produces receipts; this repository owns assertion evaluation.

## Repair during review

The first review found a duplicate deferred skill-local eval could shadow the
root contract after installation. It was removed, the skill frontmatter no
longer declares a local eval, and its proof notes now explicitly identify the
root source-only assertion contract. Targeted rereview found no blocker.

## Checks

- Root repository tests: 11 passing.
- Setup installer tests: 7 passing.
- Workspace-context validator and JSON parse: passing.
- Real runtime installer preview: `changes_pending`, `deletion_count: 0`.
- `git diff --check`: passing.

## Boundary

The preview was not applied because the workspace context remains
`proposed-owner-review`. No database, comment, email, message, schedule, or
other provider write occurred.
