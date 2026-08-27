---
id: TASK-0009
title: Turn Daily and Weekly evidence into workflow and problem baselines
status: complete
approval: owner-directed-implementation
created: 2026-08-26
updated: 2026-08-26
owner: vishan-kamdar
feature_refs: [FEAT-0004, FEAT-0005, FEAT-0006]
---

# Turn Daily and Weekly evidence into workflow and problem baselines

## Decision

Reuse the existing Notion data model. Employee workflows and approved procedures
live in the existing SOPs database. Material problems live as Issue records in
the existing Work/Issue database and link back to the affected workflow and
step. Reports remain the Daily staging and Weekly rollup surface; there is no
separate Problems database.

Daily captures current workflow observations before requiring promotion-quality
reuse proof. It records actors, ordered steps, systems, handoffs, frequency,
volume, timing, exceptions, evidence, and confidence. Problem observations
preserve a measurable Before baseline or create a precise measurement request.
Weekly qualifies those observations and promotes only complete canonical SOP or
Issue records. After evidence remains on the Issue so verified value can be
compared with the immutable Before baseline.

## Contract diagram

```text
Work + Meeting evidence
          |
          v
Daily Review result
  workflow observations + problem baselines + measurement gaps
          |
          v
Current Weekly Report Draft
          |
          v
Weekly qualification
   |                         |
   v                         v
SOPs database             Work/Issue database
workflow baseline         problem + economics baseline
   |                         |
   +------------+------------+
                v
       Before/After value proof
```

## Scope

- Add a dedicated employee SOP template while preserving `skill.md` for
  executable Farplane capability registry cards.
- Extend Issue records with workflow linkage, baseline economics, intervention,
  and After measurement.
- Make Daily workflow and problem extraction structured and gap-aware.
- Make Weekly promotion render `sop.md` and require baseline completeness for
  promoted Issues.
- Update examples, feature/system documentation, seed/install inventory, and
  deterministic eval assertions.
- Preserve the existing Reports, SOPs, and Work/Issue databases.

## Change plan

| Unit | Owner surface | Change | Proof |
| --- | --- | --- | --- |
| A | `templates/sop.md`, `templates/issue.md` | Define canonical employee workflow and problem-baseline records. | Template inventory and required-section tests pass. |
| B | Daily schema and automation | Emit structured workflow observations, problem baselines, and measurement gaps. | Zod rejects incomplete baseline shapes and the golden parses. |
| C | Weekly schema and automation | Promote workflows to SOPs and problems to Issues without losing baseline evidence. | Golden promotions use the correct templates and preserve links/economics. |
| D | feature/system docs and workspace setup | Make Reports staging, SOP ownership, and Issue ownership unambiguous. | Context and setup tests pass. |
| E | evals and goldens | Require one measured workflow, quantified problem, and explicit missing-measurement case. | Focused Daily/Weekly eval tests pass. |

## Done

- Employee workflow analysis has one canonical home in SOPs.
- Problem analysis has one canonical home as an Issue linked to an SOP step.
- A promoted Issue preserves a dated Before baseline and supports After proof.
- Missing time, volume, or cost evidence becomes a named measurement task; no
  financial value is invented.
- Focused schema, template, workspace, and eval tests pass.

## Safety and residual gates

This source change does not authorize production Notion writes, employee
messages, schedule activation, or installation into the Hermes runtime. Those
remain separately operated steps with receipts.

The current acceptance surface is the unified Daily and Weekly golden-run
validators. Legacy template-first/v4 comparison surfaces were removed during
the 2026-08-27 harness consolidation.

## Acceptance

Source implementation is complete. Every selected real Hermes Daily normal case
and the Weekly SOP/Issue promotion case reached tier A. The final independent
review returned TAS-A with no blockers. Runtime installation and production
writes remain separate operational gates.
