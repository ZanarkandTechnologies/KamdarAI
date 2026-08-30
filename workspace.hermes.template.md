---
template_id: hermes-company-workspace
template_version: "1.0.0"
kind: hermes-project-context
company_name: REPLACE_ME
company_description: REPLACE_ME
company_timezone: REPLACE_ME
status: draft
production_write_mode: proposal-only
automation_delivery:
  daily: disabled
  weekly: disabled
  meeting-intake: disabled
---

# Company Workspace

## Company

Replace this paragraph with the company context Hermes needs to do its work.

## Data sources

Choose a semantic role, provider, and source URL. Other instructions should
refer to the role instead of repeating the URL.

<!-- hermes:managed data-sources -->
| Role | Provider | Source | Access | Structure and scope |
| --- | --- | --- | --- | --- |
| `projects` | REPLACE_ME | REPLACE_ME | read | Human-operated project source records; private derived management state stays in the Hermes weekly workspace |
| `tasks` | REPLACE_ME | REPLACE_ME | read-write | Current work items linked to projects |
| `people` | REPLACE_ME | REPLACE_ME | read | People referenced by configured work only |
| `knowledge` | REPLACE_ME | REPLACE_ME | read | Canonical company files |
| `reports` | REPLACE_ME | REPLACE_ME | proposal-only | Optional destination URL for approved Final operating reports; accumulating reports remain private |
| `operator_email` | REPLACE_ME | REPLACE_ME | isolated-eval | Operator-owned inbox used only for bounded connection certification |
| `decisions` | REPLACE_ME | REPLACE_ME | proposal-only | Optional destination for source-backed promoted decisions |
| `sops` | REPLACE_ME | REPLACE_ME | proposal-only | Optional destination for approved employee workflow baselines |
<!-- /hermes:managed data-sources -->

Fill each provider independently. Roles may share one provider or use different
providers. The setup wizard leaves skipped roles as `—` so they remain available
for later configuration; automations must only use configured roles. Notion or
Drive owns permissions at a configured URL. Hermes records only its bounded
authority and never infers another destination.

The setup wizard currently configures all provider roles in this one managed
table. Semantically, `projects`, `tasks`, `people`, and `knowledge` are Stage 1
sources, while `reports` is an optional Stage 2 destination binding. Its location
in the setup table does not make accumulating reports a provider source or
authorize a write.

## Private weekly workspace

```text
weeks/
`-- YYYY-Www/
    |-- reports/
    |   |-- project--<stable-project-id>.md
    |   |-- department--<stable-department-id>.md
    |   `-- company.md
    `-- outbound/
        `-- <stable-action-key>.md
```

Daily validates one platform-neutral structured result before mapping its fields
into this workspace. Weekly finalizes the Project reports and rolls them upward.
Do not add user-facing drafts, follow-ups, publish queues, or receipt directories;
report state stays on reports and minimal delivery metadata stays in hidden run
state.

## Outputs

| Output | Template | Destination role |
| --- | --- | --- |
| Approved Final operating report | templates/weekly-report.md | reports |

## Communications

Choose what kind of message Hermes may prepare or send. Setup asks only for
the message, app, recipient, and whether Hermes should draft or send it:

- `owner report` is a completed company report for the owner or boss.
- `owner alert` is a short message about something that needs their attention.
- `employee follow-up` uses contact details already approved for that employee.

One message type never substitutes for another.

<!-- hermes:managed communications -->
| Message | App | Send to | Behavior |
| --- | --- | --- | --- |
<!-- /hermes:managed communications -->

## Operating guidance

- Use the configured company timezone.
- Resolve sources and destinations through the Data sources roles above.
- Treat a reachable link as connectivity, not write authority.
- Report missing sources, properties, relations, or permissions as configuration gaps.

## Boundaries

- Never store credentials, tokens, passwords, or private keys in this document.
- Production writes remain proposal-only until explicitly authorized here.
- Never infer a source, destination, recipient, or fallback route.
