---
title: Ask for the missing information
status: active
execution_modes: [source-contract]
production_mode: proposal-only
owner: KamdarAI
created_at: 2026-08-21
updated_at: 2026-08-24
tags: [kamdar, feature, daily, documentation]
feature_id: FEAT-0002
feature_key: daily.document-quality
system_id: SYS-0001
category: quality
public: true
surfaces:
  - automations/daily-operating-update.md
  - skills/daily-documentation-quality/SKILL.md
  - skills/daily-documentation-quality/templates/employee-message-plan.md
  - skills/dispatch-employee-messages/SKILL.md
  - templates/task.md
  - templates/feature.md
  - templates/issue.md
  - templates/meeting.md
source_refs:
  - workspace.hermes.md
  - tickets/TASK-0007/ticket.md
evidence_refs:
  - skills/daily-documentation-quality/evals/evals.json
known_limits: "No delivery adapter is shipped. Production messages remain proposal-only."
---

# Ask for the missing information

Kamdar turns evidence-backed missing Work-record information into a precise,
grouped employee message plan and its guarded preferred-channel handoff.

## Why it exists

Progress, cost, risk, and decisions cannot be operated from vague or incomplete
Work records. A named field and update location is answerable; “please add more
detail” is not.

## Trigger and inputs

The Daily automation collects one bounded `daily-context-diff-YYYY-MM-DD.json`
containing fully read changed Work pages, their record type, People route facts,
source IDs, and source gaps. This skill resolves the matching static
Task/Feature/Issue/Meeting field contract locally; it does not query Notion,
chat, Drive, or a provider.

## Pipeline signature

```text
run_daily_documentation_quality(context_diff, dispatch_mode = prepare)
  -> employee-message-plan.md + channel-dispatch result | configuration_gap
```

[`daily-documentation-quality`](../../skills/daily-documentation-quality/SKILL.md)
owns this pipeline: it produces one reviewable Daily plan grouped by person,
then calls [`dispatch-employee-messages`](../../skills/dispatch-employee-messages/SKILL.md)
with that plan. It preserves a missing or unapproved contact route as
`blocked_delivery`; `prepare` has no provider effect and `send` invokes only
the selected channel skill.

## Flow

```text
context diff → documentation-quality plan → dispatcher
                                           → prepared / sent / blocked
```

## State changes and artifacts

- Creates one `kamdar-employee-message-plan` Markdown artifact per Daily run.
- Each selected entry names the Work record, missing mapped fields, known facts,
  exact update location, source IDs, and idempotency key.
- Groups requests by verified person ID but keeps any route failure in the plan.
- Does not post a Work comment, update a record, create a Task, or send a message.

## Downstream application

The pipeline returns a redacted prepared result by default. Its nested
dispatcher may hand reviewed content unchanged to the named preferred-channel
skill only in explicit `send` mode. A local plan or prepared result is never
evidence of delivery.

## Failure modes

An unread page, unknown record type, or absent source ID is a configuration
gap. A complete record is `no_finding`. Plain text `@Name`, an unapproved
channel, or an absent endpoint does not create a deliverable recipient.

## Proof contract

The skill's local eval suite covers a grounded normal plan, a route/template
gap, and a complete-record suppression case. Readiness additionally requires a
candidate-versus-baseline run and a retained judge verdict; no provider proof is
claimed by the artifact skill.

## Example

Two replenishment tasks assigned to the same verified person lack an evidence
link and a revised completion date. The plan groups them into one message with
two source-linked entries and explicit locations to update; delivery stays
blocked if that person's approved endpoint is absent.
