---
name: dispatch-employee-messages
description: "Route one or more prepared employee message plans to approved preferred-channel skills; prepare by default and send only through selected skill authority."
tier: 3
group: operations
source: local
capability:
  kind: integration
  consumes: [kamdar-employee-message-plan, kamdar-project-control-plan, kamdar-person-contact-route]
  produces: [kamdar-channel-dispatch-result]
template_uses:
  skill-template: "0.6.1"
allowed-tools: Read, Write, Grep, Glob
---

# Dispatch Employee Messages

## Context

Use this inside a message-producing Daily pipeline after it prepares its
documentation-quality or Project-control message plan. This is a channel alias,
not a transport: it reads each person's approved preferred channel, finds its
named handler in the workspace channel-alias registry, and hands off only in
explicit `send` mode.

`prepare` is the default. It groups duplicate message intents and returns a
channel-dispatch result without contacting anyone. A missing, disabled, or
out-of-scope handler is a `configuration_gap`, not permission to use another
channel. `telegram-message` currently serves Kenji only; email and WhatsApp
remain unavailable until their owned skills are installed and approved.

## Skill Signature

```text
dispatch_employee_messages(message_plans[], people_routes, channel_aliases,
                           dispatch_mode = prepare, result_path,
                           prior_results? = [])
  -> channel-dispatch-result.md | prepared | duplicate | configuration_gap | blocked
reads: one or more named message plans, recipient route facts, channel aliases, and prior
       redacted results; the selected channel skill reads its own configuration
does: deduplicates message intents, resolves one approved preferred channel,
      prepares a handoff, or invokes exactly one named channel skill in send mode
writes: result_path; provider effects belong only to the selected channel skill
returns: per-recipient dispatch state, handler name, and safe receipt reference
```

<!-- BEGIN FARPLANE_IMPORTANT_CHECKLIST -->
## Todo List

- [ ] **N1 — Bind only prepared message deltas.**
  `message plans[] -> normalized message intents | no_finding`

  Rule: Accept only entries with recipient ID, rendered content, source record
  IDs, request kind, and idempotency key. Group equal recipient/key/payload
  intents before selecting a channel. Do not diagnose stale work or rewrite the
  caller's message.

  Assert:
  - Every dispatch row names its source artifact and source record IDs.
  - Empty or non-actionable input returns `no_finding` with no channel call.

- [ ] **N2 — Resolve the preferred channel through the alias registry.**
  `recipient route + channel aliases -> named channel skill | configuration_gap`

  Rule: Require one recipient, preferred channel, approved-channel match,
  endpoint reference, and enabled handler whose recipient scope matches. Do not
  infer a channel or fall back from Telegram, email, WhatsApp, or another route.

  Assert:
  - The result names the preferred channel and selected handler or exact gap.
  - An unavailable email or WhatsApp handler stays a configuration gap.

- [ ] **N3 — Deduplicate and prepare the handoff.**
  `resolved handler + idempotency key + prior results -> prepared | duplicate | conflict`

  Rule: An equal successful key and payload is `duplicate`; the same key with
  different content is `conflict`. Otherwise `prepare` returns `prepared` with
  no provider call and no provider reference.

  Assert:
  - Prepare, duplicate, and conflict do not invoke a channel skill.
  - The result keeps a payload hash, never the raw endpoint or credentials.

- [ ] **N4 — Invoke only the selected channel skill in send mode.**
  `prepared handoff + send mode + selected handler -> channel receipt | blocked`

  Rule: `send` invokes only the selected, in-scope channel skill with unchanged
  content and that skill's required input. A missing handler, unavailable
  authority, failed channel call, or missing receipt is `blocked`.

  Assert:
  - A provider reference appears only when the named channel skill returns it.
  - This skill never calls a generic email, Telegram, or WhatsApp API itself.

- [ ] **N5 — Render the dispatch result.**
  `dispatch states + local template -> channel-dispatch-result.md`

  Rule: Render [the local result template](templates/channel-dispatch-result.md).
  Include recipient ID, preferred channel, handler, state, source IDs,
  idempotency result, and safe receipt reference; redact endpoints and bodies.

  Assert:
  - A reviewer can tell prepared from sent, duplicate, blocked, and gap.
  - An unsupported channel has a named enablement repair path.
<!-- END FARPLANE_IMPORTANT_CHECKLIST -->

## Templates

- Output contract: [channel dispatch result](templates/channel-dispatch-result.md).
- Calibration golden: [prepared Telegram handoff](examples/golden/prepared-telegram-handoff.md).

## Gotchas

- `telegram-message` is currently scoped to Kenji; do not use it for another
  employee merely because their preferred channel is Telegram.
- Email and WhatsApp are planned aliases, not fallback channels. Their owners
  must install and approve their channel skills before `send` can use them.
- A local prepared result is not a delivery receipt. Only the invoked channel
  skill may claim a provider effect.

## Output

- One redacted `kamdar-channel-dispatch-result` using the local template; or
  explicit `no_finding`, `prepared`, `duplicate`, `conflict`, `blocked`, or
  `configuration_gap` with no unclaimed provider effect.
