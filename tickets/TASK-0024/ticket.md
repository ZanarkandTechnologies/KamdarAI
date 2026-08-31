---
template_id: ticket-template
template_version: "0.3.2"
ticket_id: TASK-0024
title: Replace Meeting Intake automation with manual meeting processing
status: superseded
created_at: 2026-08-31T18:30:00+08:00
updated_at: 2026-09-01T00:00:00+08:00
depends_on: []
---

# TASK-0024: Superseded Meeting Intake proposal

## Decision

Meeting Intake is outside the two-workflow MVP. Do not add a separate meeting
automation, CLI handoff, storage mode, schema, feature document, or eval suite.

Meetings remain a shared source-record shape in `templates/meeting.md`. PM Daily
may analyze relevant meeting records as part of a project snapshot; PM Weekly
may use the resulting project memory. Neither workflow creates a third product
surface.

## Superseded scope

The former proposal would have added a manual meeting-processing command,
provider write handoffs, configuration, schemas, documentation, and independent
tests. That machinery duplicated the existing agentic workflow and was removed
during the two-workflow consolidation.

## Reconsideration boundary

Open a new ticket only after observed user demand proves that selected meeting
notes must be processed independently of PM Daily. That ticket must demonstrate
a distinct user outcome that cannot be represented by the existing daily input
and output contracts.

## Proof

- Active product behavior is owned by `skills/pm-daily/SKILL.md` and
  `skills/pm-weekly/SKILL.md`.
- `seed/scenarios.json` covers only the seven behaviors composed by those two
  workflows.
- No active product surface references the retired Meeting Intake feature ID.
