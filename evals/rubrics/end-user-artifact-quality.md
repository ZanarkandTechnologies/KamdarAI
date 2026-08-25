---
rubric_id: kamdar-end-user-artifact-quality
rubric_version: 1.0.0
passing_tier: A
---

# End-user artifact quality review

Review every generated Daily or Weekly output row before integration writes. Deterministic validators own JSON shape and template headings; this reviewer owns whether the rendered result makes sense to the person who receives it.

## Required checks

1. **Referential clarity** — no unexplained ID, placeholder, or template token. A named entity has a link, readable label, or immediate surrounding context.
2. **End-user value** — the content gives a useful conclusion, impact, next action, or evidence. It does not merely restate source data.
3. **Readability** — concise human language; no evaluator instructions, implementation jargon, filler, or internal control metadata in user-facing prose.
4. **Template fidelity** — the complete destination template is followed and each populated section serves its intended purpose.
5. **Groundedness** — material claims and actions can be traced to the frozen context; uncertainty is explicit and missing information becomes a precise question.

## Tiers

- **A** — every output row is covered and passes all five checks with cited evidence.
- **B** — useful but needs a bounded prose or context repair.
- **C** — materially confusing, incomplete, or weakly grounded.
- **D** — malformed, unsafe, invented, or not reviewable.

Only tier A may proceed to integration writes. The evaluator remains read-only. A B/C readability finding routes the candidate back through the `unslop` repair step and regeneration; it is never silently edited by the reviewer.
