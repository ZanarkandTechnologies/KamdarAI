---
name: daily-documentation-quality
description: "Turn one collector-produced Daily context diff into a grounded documentation message plan and its guarded preferred-channel handoff."
tier: 3
group: operations
source: local
capability:
  kind: pipeline
  consumes: [kamdar-daily-context-diff]
  produces: [kamdar-employee-message-plan, kamdar-channel-dispatch-result]
template_uses:
  skill-template: "0.6.1"
allowed-tools: Read, Write, Grep, Glob
---

# Daily Documentation Quality

## Context

Run after the collector writes one bounded Daily context diff. Find useful
documentation gaps in changed Work and write one grouped message plan—not one
comment artifact per Work item.

Use the context diff, this package's template and golden, and the canonical
record template selected from each Work item's `record_type`. This pipeline
creates one documentation message plan, then calls the reusable dispatcher with
that plan. It never fetches a provider, chooses a channel, or sends directly;
the dispatcher selects the approved preferred-channel skill.

## Skill Signature

```text
run_daily_documentation_quality(context_diff_path, dispatch_mode = prepare, output_path)
  -> employee-message-plan.md + channel-dispatch result | configuration_gap
reads: one Daily context diff, local output/golden, and one canonical record template per Work type
does: validates snapshots, finds mapped gaps, groups precise requests, and owns the dispatcher handoff
writes: output_path and the dispatch result; provider effects belong to the selected channel skill
returns: proposed | prepared | duplicate | blocked | no_finding | configuration_gap
```

<!-- BEGIN FARPLANE_IMPORTANT_CHECKLIST -->
## Todo List

- [ ] **N1 — Bind one complete collector snapshot.**
  `context_diff + local template map -> usable Work/People/template evidence | configuration_gap`

  Rule: Require a context ID, local-day window, stable source IDs, changed Work
  snapshots, People route facts, and a record type that resolves to one local
  canonical template. Treat a missing snapshot, unread full page, or unknown
  record type as a named gap; do not read around it.

  Assert:
  - Every planned request cites a source ID present in the context diff.
  - No provider handle, URL lookup, or inferred record type enters the plan.

- [ ] **N2 — Select only a useful, mapped documentation request.**
  `fully read Work + resolved template -> missing mapped fields + known context | no_finding | configuration_gap`

  Rule: Use the resolved record template as the field map. Request a field only
  when it is absent or unusably vague and would change the next operating
  action. Preserve stated blocker, variance, and cause confidence as context;
  unknown dates, causes, owners, or costs remain explicit gaps.

  Assert:
  - Each requested field names its exact Work-property or Notes location.
  - Complete records create no manufactured question or documentation nag.

- [ ] **N3 — Adapt the golden into grouped employee-ready drafts.**
  `selected gaps + People snapshot + golden -> recipient groups + blocked delivery entries`

  Rule: Start from the local golden's shape, replacing every fact with current
  evidence. Group requests by `person_id`; preserve the person's preferred and
  approved channel as routing facts, but do not choose a provider. When the
  person, approved route, or endpoint is missing, retain the record as
  `blocked_delivery` instead of guessing a recipient.

  Assert:
  - A group has one named person and one source-linked entry per Work record.
  - The plan does not duplicate a progress/control diagnosis or promise a send.

- [ ] **N4 — Render and self-review the message plan.**
  `reviewed groups + employee-message-plan template -> output_path + proposal state`

  Rule: Fill the local template, including context provenance, message intent,
  exact requested updates, source IDs, idempotency keys, no-findings, and route
  gaps. Mark all delivery as `proposal-only` before the nested dispatcher runs.

  Assert:
  - No unresolved placeholder, golden-only fact, guessed contact, or provider URL remains.
  - The artifact is useful unchanged to the channel dispatcher and is inspectable by a person.

- [ ] **N5 — Dispatch through the approved channel alias.**
  `documentation plan + dispatch mode -> dispatch result | no_finding | blocked`

  Rule: Call [`dispatch-employee-messages`](../dispatch-employee-messages/SKILL.md)
  with this plan only. `prepare` is the default and makes no channel call.
  `send` delegates unchanged rendered content only to the selected in-scope
  channel skill and preserves its receipt or gap.

  Assert:
  - The pipeline never calls email, Telegram, or WhatsApp directly.
  - A missing/disabled handler is a `configuration_gap`, never a fallback.
<!-- END FARPLANE_IMPORTANT_CHECKLIST -->

## Templates

- Collector input: [Daily context template](../../automations/templates/daily-context-diff.json)
  and [sanitized golden](../../automations/examples/golden/daily-context-diff-2026-08-24.json).
- Output contract: [employee-message-plan.md](templates/employee-message-plan.md).
- Calibration shape: [golden message plan](examples/golden/employee-message-plan.md).
- Canonical field contracts: the matching local `../../templates/{task,feature,
  issue,meeting}.md` contract selected by the context record type; the artifact
  does not create a second field rubric.
- Nested integration: [`dispatch-employee-messages`](../dispatch-employee-messages/SKILL.md).

## Gotchas

- Do not turn plain `@Name`, an unapproved route, or an absent endpoint into a
  deliverable recipient. Keep it `blocked_delivery` for the integration gate.
- Do not ask for generic “more detail,” duplicate stale-work chasing, or revive
  a completed record just because it was included in the evidence window.
- Do not copy the golden's people, record IDs, facts, or questions; it teaches
  shape, not content.
- Do not write to Notion, email, chat, Drive, or a provider directly. Only the
  nested dispatcher and selected channel skill may claim a channel receipt.

## Output

One `kamdar-employee-message-plan` Markdown artifact at `output_path`, with
one group per supported person, explicit blocked-route entries, and a
`proposal-only` delivery state; plus its channel-dispatch result. Return
`configuration_gap` with no artifact when the collector cannot supply a safe
Work/template snapshot.
