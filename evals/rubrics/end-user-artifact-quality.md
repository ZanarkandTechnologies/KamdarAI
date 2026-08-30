---
rubric_id: kamdar-end-user-artifact-quality
rubric_version: 1.0.0
passing_tier: A
---

# End-user artifact quality review

Review every generated Daily or Weekly output row before integration writes. Deterministic validators own JSON shape and template headings; this reviewer owns whether the rendered result makes sense to the person who receives it.

## Required checks

1. **Referential clarity** — no unexplained ID, placeholder, or template token.
   Opaque UUIDs and hashes belong only in structured machine evidence, never in
   reader prose. Use the readable entity name or a natural description instead;
   human-facing references such as `TASK-101` may remain. A named entity has a
   link, readable label, or immediate surrounding context.
2. **End-user value** — the content gives a useful conclusion, impact, next action, or evidence. It does not merely restate source data.
3. **Readability** — concise human language; no evaluator instructions, implementation jargon, filler, or internal control metadata in user-facing prose.
4. **Template fidelity** — the complete destination template is followed and each populated section serves its intended purpose.
5. **Groundedness** — material claims and actions can be traced to the frozen context; uncertainty is explicit and missing information becomes a precise question.
6. **Workflow reconstructability** — a workflow observation names its trigger,
   actors, ordered steps, systems/handoffs, output, timing/volume baseline or
   gaps, evidence window, and confidence well enough for another person to
   inspect the current method.
7. **Baseline integrity** — a problem names its affected workflow step and
   measurement window. Any financial value shows its sourced formula; missing
   volume, time, wage, or cost becomes an owned measurement gap. Forecast value
   is never presented as verified value.

## Tiers

- **A** — every output row is covered and passes all applicable checks with cited evidence.
- **B** — useful but needs a bounded prose or context repair.
- **C** — materially confusing, incomplete, or weakly grounded.
- **D** — malformed, unsafe, invented, or not reviewable.

Only tier A may proceed to integration writes. The evaluator remains read-only. A B/C readability finding routes the candidate back through the `unslop` repair step and regeneration; it is never silently edited by the reviewer.
