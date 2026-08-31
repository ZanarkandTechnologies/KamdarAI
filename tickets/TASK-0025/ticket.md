---
template_id: ticket-template
template_version: "0.3.2"
ticket_id: TASK-0025
title: Repackage Company OS as PM Daily and PM Weekly
status: in_progress
created_at: 2026-08-31T19:30:00+08:00
updated_at: 2026-09-01T02:30:00+08:00
depends_on: [TASK-0023]
ui_scope: false
feature_refs: []
---

# TASK-0025: Repackage Company OS as PM Daily and PM Weekly

## Summary

Represent the Company OS as two file-producing skills, PM Daily and PM Weekly.
Each skill reads bounded context plus existing local memory, follows canonical
Markdown templates, and writes complete artifacts directly. Automations own
fetching and authorized provider effects.

Remove the intermediary structured-extraction layer, generated template
catalog, template-to-Pydantic compiler, deterministic Markdown mapper, and
separate feature runtime inventory.

## Decision

```text
Daily automation = fetch snapshot -> run PM Daily -> review files -> sync authorized effects
Weekly automation = freeze Project Memory -> run PM Weekly -> review files -> sync authorized effects

skill       = analysis and file-writing behavior
template    = artifact shape, writing guidance, and golden example
evals.json  = normal, hard, and boundary behavior cases
automation  = schedule, source collection, authority, and provider effects
```

There is no `output.py`. Files are the skill interface. Deterministic code is
reserved for setup, exact authority checks, connection proof, and compact
receipts—not semantic extraction or Markdown generation.

## Contract Diagram

```text
configured providers
        |
        v
bounded snapshot ---- current Project Memory
        |                       |
        +--------> PM Daily <---+
                     |
                     v
       Project Memory + message drafts
                     |
                     v
        native authorized provider effects

complete frozen Project Memory
        |
        v
     PM Weekly
        |
        v
reports + long-term memory + next-week memory + distribution draft
        |
        v
native authorized provider effects
```

## Scope

- Create `skills/pm-daily/` and `skills/pm-weekly/`.
- Keep each `SKILL.md` under 200 lines and free of runtime code.
- Store each skill's cases and frozen evidence beside it.
- Use only normal, hard, and boundary cases with explicit file assertions.
- Make the Daily and Weekly automation contracts invoke the matching skill.
- Keep artifact templates canonical under `templates/`; do not copy them into
  skill packages.
- Install only the two `SKILL.md` files into the runtime workspace.
- Package skill eval fixtures for offline evaluation without installing them as
  runtime instructions.
- Remove Company OS extraction schemas, generated report schemas, template
  sync/catalog code, obsolete eval runners, and stale tests/docs.
- Preserve exact source grounding, bounded reads, local-first artifacts,
  provider authority, read-back, and truthful receipts.

## Non-goals

- No new management outcome, provider, destination, schedule, or UI.
- No generic skill platform or end-user automation builder.
- No direct provider calls from either PM skill.
- No compatibility aliases for deleted schema or eval paths.
- No live provider writes or runtime cleanup in this ticket.

## Done / Proof

- [x] Exactly two PM skills exist; neither contains `output.py` or `scripts/`.
- [x] Each skill declares inputs, outputs, workflow, golden behavior, and proof.
- [ ] Daily reads a bounded snapshot plus current Project Memory and writes
  Project Memory plus precise message drafts.
- [ ] Weekly reads the complete frozen Project Memory set and writes reports,
  durable memory, carry-forward, and an executive draft.
- [x] Templates are read directly; no generated template catalog or generated
  report schema remains.
- [x] Automation instructions contain no intermediary extraction object.
- [x] Each skill owns normal, hard, and boundary cases plus frozen evidence;
  installation health does not misrepresent their presence as behavior proof.
- [x] Distribution contains the two runtime skills and their offline eval data.
- [x] Context validation, complete tests, stale-reference audit, and
  `git diff --check` pass.

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 apps/installer/validate_context.py --context workspace.hermes.md
rg -n 'apps/company_os|templates/sync|templates/schemas|evals/(daily|weekly)' \
  --glob '!tickets/archive/**' --glob '!**/__pycache__/**' .
git diff --check
```

## 2026-09-01 consolidation receipt

- Deleted the shared structural validator, its tests, and its rubric.
- Merged reader clarity, grounded measurement, uncertainty, and honest-value
  checks into each skill's `Proof` section.
- Replaced the misleading `feature_evals` health lane with a direct
  `skill_packages` presence check.
- Preserved quality gates inside the skills: reader clarity, no opaque internal
  identifiers, template fidelity, grounded financial formulas, owned
  measurement gaps, and quality failure blocking provider application.
- Proof: 138 tests passed, 2 live tests skipped; context validation and
  `git diff --check` passed. Operated skill behavior remains a separate proof
  lane and was not claimed by this consolidation.
- Deliberately did not recreate structural tests for `evals.json`; those tests
  proved package shape rather than skill behavior. Operated eval tooling owns
  parsing and rejection of malformed cases.
