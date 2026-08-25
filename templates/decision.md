---
template_id: company-os-decision
template_version: "0.5.0"
name: "{{DECISION}}"
decision_id: "{{DECISION_ID}}"
project: "{{PROJECT}}"
department: "{{DEPARTMENT}}"
proposer: "{{PROPOSER}}"
approver: "{{APPROVER}}"
status: "{{STATUS}}"
decided_at: "{{DECIDED_AT}}"
review_date: "{{REVIEW_DATE}}"
---

# {{DECISION}}

> **Promotion gate**
>
> Keep this only when the Decision is costly to reverse, affects several people,
> establishes precedent, resolves a recurring tradeoff, or explains an important
> constraint.

## Context

<!-- Problem, constraints, affected people, and the evidence that made a
decision necessary.

GOLDEN EXAMPLE — replace every fact below; it demonstrates useful detail.
The pilot has three verified count samples but no consistent expansion rule.
Without one, managers apply different thresholds and cannot compare results.
END GOLDEN EXAMPLE -->

{{CONTEXT}}

## Options and tradeoffs

<!-- Include only realistic options and the decisive tradeoff. -->

{{OPTIONS_AND_TRADEOFFS}}

## Decision rationale

<!-- Why this option won; authority, date, and status are frontmatter. -->

{{RATIONALE}}

## Consequences and review trigger

<!-- Expected tradeoffs, who is affected, and exactly what would reopen this
decision. -->

{{CONSEQUENCES_AND_REVIEW}}

## Evidence and related records

{{EVIDENCE_AND_RELATED_RECORDS}}
