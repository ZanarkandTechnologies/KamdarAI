---
rubric_id: kamdar-seed-realism
rubric_version: 1.0.0
passing_tier: A
---

# Seed realism review

Review the frozen seed before it is written to an evaluation workspace. This is a semantic gate; deterministic schema, relation, and template checks remain separate.

## Required checks

Every entity and pipeline case must pass all five checks:

1. **Company fit** — the record naturally belongs to the named Kamdar department and operating domain.
2. **Relationship coherence** — owner, Project, Work, Meeting, Report, and evidence links describe one believable world.
3. **Lifecycle consistency** — status, dates, progress, blockers, decisions, and follow-ups agree.
4. **Operational plausibility** — the work is specific enough that a real owner could act on it; it is not generic software-demo filler.
5. **Surrounding context** — an unfamiliar reader can understand every important identifier, claim, and action from a readable label, link, or nearby explanation.

Each review row must label its origin as `captured`, `publicly_grounded`, or `synthetic_scenario`. A captured or publicly grounded row needs a resolvable reference. A synthetic scenario must be labelled honestly and cite the captured Project/department anchor or the exact seed path it extends.

The review must also cite at least one current public source supporting the
company/domain fit. Public evidence may validate plausibility; it must never be
presented as proof that a synthetic event actually happened at Kamdar.

## Tiers

- **A** — every entity and case is covered, all checks pass, origins are honest, and there are no hard-gate failures.
- **B** — broadly plausible but one or more records need repair before seeding.
- **C** — material relationship, lifecycle, or usefulness problems.
- **D** — malformed, ungrounded, unsafe, or not reviewable.

Only tier A may provision or reseed the Notion evaluation workspace. The reviewer is read-only and may not repair the seed while judging it.
