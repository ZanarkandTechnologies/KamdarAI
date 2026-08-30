# TASK-0017 Setup UX Baseline

## U1 — New installation

Reader question: What will happen, and do I need developer tooling?

```text
+------------------------------------------------------------+
| Welcome to Kamdar Hermes                                   |
| New installation detected.                                 |
| Setup will create a private persistent profile and guide   |
| the required company, model, and Notion authorization.     |
| You do not need Python, WSL commands, or configuration files.|
|                                              [Continue]     |
+------------------------------------------------------------+
```

Action: continue into the existing reviewed install plan.
Assertion: a missing profile enters onboarding without showing maintenance
choices, and configuration changes still require the Apply confirmation.

## U2 — Resume incomplete setup

Reader question: Is my prior work safe, and what happens next?

```text
+------------------------------------------------------------+
| Resume Kamdar Hermes setup                                 |
| An incomplete installation was found.                      |
| Existing workspace choices and saved credentials are safe. |
| Setup will reconcile the missing steps.                    |
|                                  [Resume]  [Exit]           |
+------------------------------------------------------------+
```

Action: resume the idempotent install path.
Assertion: declining exits without a profile update; resuming preserves the
existing workspace draft and unknown profile files.

## U3 — Existing installation

Reader question: What maintenance task do I want to perform?

```text
+------------------------------------------------------------+
| Kamdar Hermes                                              |
| Existing installation found.                               |
|                                                            |
| 1. Update workspace configuration                          |
| 2. Update Kamdar software                                  |
| 3. Test integrations                                       |
| 4. Run full health check                                   |
| 5. Repair setup                                            |
| 6. Open dashboard                                          |
| 7. Exit                                                    |
| Select [1]:                                                |
+------------------------------------------------------------+
```

Action: run exactly one selected operation.
Assertion: opening the wizard does not update the distribution, pull every
image, repeat authorization, restart services, or verify until an action is
selected.

## U4 — Workspace-only update

Reader question: What configuration will change?

```text
+------------------------------------------------------------+
| Update workspace configuration                             |
| Current company and source values are shown as defaults.   |
|                                                            |
| Review                                                     |
| <company and selected source summary>                      |
|                                                            |
| This updates workspace context only. Credentials, reports, |
| memory, and software are preserved.                        |
|                                  [Apply]  [Cancel]          |
+------------------------------------------------------------+
```

Action: write the profile-owned `workspace.hermes.md`, apply it to the live
workspace, then request a static verification.
Assertion: this path never invokes `hermes setup`, `hermes mcp login`, image
pulling, webhook verification, or the live comment test.

## U5 — Health and recovery

Reader question: Is Hermes working, and what exactly should I do if not?

```text
+------------------------------------------------------------+
| Checking Kamdar Hermes                                     |
| [✓] Workspace                                              |
| [✓] Model                                                  |
| [•] Waiting for Notion connection (up to 120 seconds)      |
|                                                            |
| You can press Ctrl+C to stop without changing setup.       |
+------------------------------------------------------------+
```

Success copy: `Kamdar Hermes is ready. Dashboard: http://localhost:9119`

Failure copy: `Kamdar Hermes needs attention. Complete the action shown beside
the failed check, then run the health check again.`

Assertion: waits show bounded progress; receipts use a profile-relative support
reference; required failures never display Ready.

## Before / After / Example

- **Before:** every `setup.cmd` run pulls, installs, starts, reauthorizes, and
  performs live verification.
- **After:** the launcher opens one state-aware wizard and performs only the
  selected operation.
- **Example:** double-click → existing installation → update workspace → preview
  → apply → static check → dashboard link.

## M1 — Choose message jobs

Reader question: What kinds of messages should Hermes help with?

```text
+------------------------------------------------------------+
| Messages                                                   |
| What should Hermes help with?                              |
|                                                            |
| [x] Send completed reports to the company owner            |
| [x] Alert the owner when something needs attention         |
| [ ] Follow up with employees — Needs People routes        |
|                                                            |
|                                              [Continue]     |
+------------------------------------------------------------+
```

Visible copy:
- Heading: `Messages`
- Question: `What should Hermes help with?`
- Choices: `Send completed reports to the company owner` and `Alert the owner
  when something needs attention`
- Disabled state: `Follow up with employees — Needs People routes`
- CTA: `Continue`

Proof shown: selected message jobs only; no connection or delivery claim.
Intended takeaway: the customer chooses business outcomes, not internal modes.
Action: continue with the selected jobs or leave every choice clear to skip.
Assertion: the screen never exposes environment, recipient-rule, sink, route,
or eval terminology.

## M2 — Configure owner messages

Reader question: Who receives owner messages, through which app, and will
Hermes draft or send them?

```text
+------------------------------------------------------------+
| Owner messages                                             |
| Who should receive these messages?                         |
| > Vishan Kamdar                                            |
|                                                            |
| Which app should Hermes use?                               |
| (x) Telegram   ( ) Slack   ( ) WhatsApp                    |
|                                                            |
| What should Hermes do?                                     |
| (x) Prepare drafts in the private workspace — Recommended  |
| ( ) Send automatically                                     |
|                                              [Continue]     |
+------------------------------------------------------------+
```

Visible copy:
- Heading: `Owner messages`
- Recipient label: `Who should receive these messages?`
- App label: `Which app should Hermes use?`
- Behavior choices: `Prepare drafts in the private workspace — Recommended` and
  `Send automatically`
- CTA: `Continue`

Proof shown: reviewed intended recipient, selected app, and behavior.
Intended takeaway: draft-first is the safe default; sending is an explicit
customer choice.
Action: continue to connection setup.
Assertion: owner reports and alerts may share this binding; employee follow-ups
never inherit it.

## M3 — Connect the messaging app

Reader question: Why is setup opening Hermes, and where are credentials stored?

```text
+------------------------------------------------------------+
| Connect Telegram                                           |
| Telegram is not connected yet.                             |
|                                                            |
| Setup will open Hermes' secure messaging configuration.    |
| Passwords and tokens are not saved in this workspace.      |
|                                                            |
|                                   [Connect Telegram]       |
+------------------------------------------------------------+
```

Visible copy:
- Heading: `Connect <app>`
- State: `<app> is not connected yet.`
- Safety: `Setup will open Hermes' secure messaging configuration. Passwords and
  tokens are not saved in this workspace.`
- CTA: `Connect <app>`

Proof shown: none yet; Hermes setup only establishes credentials. An exact
target is accepted only after the next connection test returns a destination
and the named owner confirms receipt.
Intended takeaway: Hermes owns the account connection and credentials.
Action: open `hermes gateway setup`, then return to the explicit connection test.
Assertion: setup never asks for, logs, or stores a messaging token itself.

## M4 — Approve one connection test

Reader question: Will this test contact anyone or enable automatic messages?

```text
+------------------------------------------------------------+
| Check the connection                                       |
| Send one test message to Vishan on Telegram?               |
|                                                            |
| This only confirms that the connection works.              |
| It will not contact employees or enable automatic messages.|
|                                                            |
|                 [Skip for now]  [Send test message]        |
+------------------------------------------------------------+
| Did Vishan receive the test message?                       |
|                              [No]  [Yes, I received it]     |
+------------------------------------------------------------+
```

Visible copy:
- Heading: `Check the connection`
- Question: `Send one test message to <owner> on <app>?`
- Safety: `This only confirms that the connection works. It will not contact
  employees or enable automatic messages.`
- CTAs: `Skip for now`, `Send test message`

Proof shown: no proof before confirmation; afterward, the private profile stores
the provider-returned exact target, hashes, delivery state, and message ID. The
workspace and support receipt never expose the target.
Intended takeaway: the send is bounded, optional, and separate from automation.
Action: skip or send exactly one connection-test message.
Assertion: skipping performs no send; failure offers only retry or drafts-only.

## M5 — Messaging result and review

Reader question: What is configured, what was tested, and what remains off?

```text
+------------------------------------------------------------+
| Review messaging setup                                     |
|                                                            |
| Completed reports   Telegram   Vishan   Drafts in workspace|
| Owner alerts        Telegram   Vishan   Drafts in workspace|
| Employee follow-up  —          —        Not enabled        |
|                                                            |
| Connection test: Delivered                                 |
| Message ID: <provider message ID>                          |
|                                                            |
|                                [Back]  [Apply setup]        |
+------------------------------------------------------------+
```

Success copy: `Test message delivered. <app> is ready.`
Failure copy: `The connection needs attention. Nothing was enabled.`
Failure actions: `Try again`, `Save as drafts only`

Proof shown: selected jobs, recipient, app, draft/send behavior, connection-test
state, and provider message ID when returned.
Intended takeaway: the customer can distinguish configured, tested, and enabled.
Action: go back or apply the reviewed setup.
Assertion: a running gateway or successful target listing alone never renders
`Delivered` or `ready`; an automatic-send selection without current exact-target
proof remains visibly blocked at the typed send boundary.

## Messaging Focus & Simplicity Pass

- **Customer benefit:** get owner reports and alerts through a familiar app
  without learning Hermes configuration vocabulary.
- **Core action:** choose the messages, recipient, app, and draft/send behavior.
- **Removed or derived:** environment, recipient scope, route policy, connection
  hashes, credentials, and provider IDs.
- **Deliberate no:** no custom messaging client, no global employee destination,
  no automatic test send, and no fallback to another person or app.
