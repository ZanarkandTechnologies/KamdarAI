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
