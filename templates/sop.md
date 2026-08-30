---
template_id: kamdar-employee-sop
template_version: "1.1.0"
name: "{{SOP_NAME}}"
sop_id: "{{SOP_ID}}"
workflow_key: "{{WORKFLOW_KEY}}"
projects: "{{PROJECTS}}"
department: "{{DEPARTMENT}}"
owner: "{{OWNER}}"
status: "{{STATUS}}"
baseline_version: "{{BASELINE_VERSION}}"
effective_date: "{{EFFECTIVE_DATE}}"
last_reviewed: "{{LAST_REVIEWED}}"
next_review: "{{NEXT_REVIEW}}"
---

# {{SOP_NAME}}

## Purpose and outcome

<!-- State why the workflow exists, who receives its output, and the observable
completion condition. This is an employee operating procedure, not a Farplane
software skill or a summary card. -->

{{PURPOSE_AND_OUTCOME}}

## Trigger, actors, and inputs

<!-- Name the event that starts the workflow, accountable owner, participating
roles, required inputs, and entry conditions.

GOLDEN EXAMPLE — replace every fact below.
- **Trigger:** An approved merchandising batch is ready for Ecommerce publication.
- **Owner:** Ecommerce Lead.
- **Actors:** Merchandising owner → Ecommerce catalog owner.
- **Inputs:** Approved sample, product facts, price, stock, and final images.
END GOLDEN EXAMPLE -->

{{TRIGGER_ACTORS_AND_INPUTS}}

## Current workflow

<!-- Record the observed ordered steps. Each step names its actor, system or
tool, input, action, output, receiver or handoff, and known exception. Preserve
the current method even when it is inefficient; improvements belong below. -->

{{ORDERED_WORKFLOW_STEPS}}

## Timing and volume baseline

<!-- Preserve the dated Before baseline: frequency, volume, active minutes,
waiting time, exception/rework rate, measurement window, evidence, and
confidence. Unknown values remain explicit measurement gaps. -->

{{TIMING_AND_VOLUME_BASELINE}}

## Latest weekly samples

<!-- Weekly replaces this section with accepted, source-linked samples grouped
by workflow_key across Projects. Each sample names its Work ID, Project,
artifact type, elapsed/active/wait hours when sourced, and acceptance evidence.
Samples never change the approved baseline automatically. -->

{{LATEST_WEEKLY_SAMPLES}}

## Exceptions and controls

<!-- Expected exception paths, approval points, quality checks, escalation
conditions, and actions that must never be skipped. -->

{{EXCEPTIONS_AND_CONTROLS}}

## Improvement and verification

<!-- Approved intervention, expected change, test window, success measure, and
the After measurement used to compare against the preserved baseline. -->

{{IMPROVEMENT_AND_VERIFICATION}}

## Evidence and related records

{{EVIDENCE_AND_RELATED_RECORDS}}
