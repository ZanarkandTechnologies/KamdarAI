---
title: One-step setup customer UX wireflow
status: in_progress
feature_id: FEAT-0011
source: FEAT-0011-seamless-deployment-and-verification.md
updated_at: 2026-08-29
---

# One-step setup customer UX wireflow

This is the implemented customer-visible contract. It deliberately omits
unimplemented report-template and schedule editors. Setup installs the reviewed
defaults and names them in the plan; later tuning requires its own proven flow.

## End-to-end state machine

```text
[S0] Double-click setup.cmd
  |
  v
[S1] Windows prerequisite check
  |--missing Docker/WSL/Compose/Linux mode--> [F1] Open guide or Check again
  `--ready
       |
       v
[S2] setup.py launch inside Docker
  |--no distribution------------------------> [S3] New installation
  |--distribution but incomplete runtime----> [S4] Resume or Exit
  `--complete runtime------------------------> [S5] Maintenance menu

[S3/S4] Install or reconcile
  |
  +--workspace company/data-source questions
  +--reviewed provider choice per selected data source
  +--review plan and Apply
  +--Hermes model authorization when missing
  +--Hermes MCP install/login/test once per unique connection
  +--restricted Composio MCP session for selected Gmail/Drive roles
  +--parallel configured-source evals -> one consolidated judge
  +--optional Cloudflare/Notion webhook values
  `--return action: start runtime + live verification

[S5] Maintenance menu
  |--1 workspace------> [S6] Configure -> preview -> apply -> static check
  |--2 software-------> update distribution -> reconcile -> static check
  |--3 integrations---> certify -> pass OR retry/defer
  |--4 health---------> start runtime -> live verification
  |--5 repair---------> reconcile setup -> start runtime -> live verification
  |--6 dashboard------> start runtime -> open local dashboard
  `--7 exit-----------> no changes

[S7] Verification
  |--required lanes pass---------------------> [S8] READY
  |--only optional live lane fails-----------> [S9] PARTIAL
  `--required lane fails---------------------> [F2] BLOCKED + named action
```

## S0/S1 — Windows launcher

```text
Company OS Setup
Checking Docker Desktop and WSL2...
```

The launcher checks only host requirements and then opens the interactive
wizard. It contains no credentials or product configuration and does not mount
the host Docker socket into Hermes.

Recoverable example:

```text
Docker Desktop is installed but is not ready.
Start Docker Desktop and wait until it reports Ready.
[R] Check again  [X] Exit
```

Assertion: Check again repeats the preflight in the same window. Missing system
software may open only its official installation page and is never silently
installed.

## S3 — First run

```text
+------------------------------------------------------------+
| Welcome to the Company OS                                  |
| New installation detected. Setup will create a private     |
| persistent profile and guide the required authorization.   |
| You do not need Python, WSL commands, or config files.      |
+------------------------------------------------------------+
```

The interactive workspace wizard asks for company name, description, timezone,
and only the data-source roles the customer selects. Each role's Provider field
is a reviewed choice from `catalog/data-sources/<role>.json`; it is not free
text. Existing owner prose is preserved.

Before runtime changes, setup shows:

```text
Review setup plan
+--------------------+----------------------------------+
| Runtime            | Docker Desktop / WSL2            |
| Storage            | Persistent Hermes profile        |
| Notion MCP         | Configure or Disabled            |
| Real-time comments | Configure or Set up later        |
| Automations        | Daily + Weekly                    |
| Report template    | Reviewed repository template     |
| Deletion           | Nothing                          |
+--------------------+----------------------------------+
Apply this setup plan? [Y/n]
```

Assertion: declining Apply leaves runtime services and credentials unchanged;
the reviewed workspace draft remains available for resume.

## S4 — Incomplete setup

```text
+------------------------------------------------------------+
| Resume Company OS setup                                    |
| An incomplete installation was found. Existing workspace   |
| choices and saved credentials are safe. Setup will          |
| reconcile missing steps.                                   |
+------------------------------------------------------------+
Resume setup? [Y/n]
```

Resume reruns the idempotent reconciliation using saved state. It does not
promise an unsupported per-screen checkpoint. Exit performs no update.

## S5 — Existing installation

```text
+------------------------------------------------------------+
| Company OS                                                 |
| Existing installation found.                               |
+------------------------------------------------------------+
  1. Update workspace configuration
  2. Update Company OS software
  3. Test integrations
  4. Run full health check
  5. Repair setup
  6. Open dashboard
  7. Exit
Select [1]:
```

Assertion: merely opening this menu does not pull images, update the profile,
repeat OAuth, start services, or run verification.

## S6 — Workspace-only update

```text
+------------------------------------------------------------+
| Update workspace configuration                             |
| Current values will be shown as defaults. Credentials,     |
| reports, memory, software, and authorization are preserved.|
+------------------------------------------------------------+

<company and selected source prompts>

Review
+----------------+----------+-------------------------------+
| Role           | Provider | Source                        |
+----------------+----------+-------------------------------+
Write this configuration? [Y/n]
```

On confirmation, setup edits the profile-owned
`workspace.hermes.md`, applies it to `workspace/.hermes.md`, reconciles the
workspace-owned schedules, and runs static verification. It never invokes
model authorization, Notion OAuth, Cloudflare provisioning, or the live comment
test.

## S7 — Full health verification

When optional Notion comments are enabled, the health action guides the browser
verification and shows bounded waits:

```text
Waiting for Notion verification request (up to 60 seconds)...
Waiting for one new threaded reply (up to 120 seconds)...
```

Ctrl+C stops safely without changing configuration. Static verification used
after workspace and software updates skips the browser and live-comment gates.

Configured integration tests run role/provider prompts concurrently after all
selected MCPs are authenticated. Hermes stores each session and exports a
redacted trace. Cheap process, session, and tool-result checks run first; one
model call then judges every case against its expected output and assertions.
Tests that create isolated records require explicit confirmation. Changing a
selected provider or source invalidates the previous receipt.

When a row fails, setup shows the row reason and offers only `retry` or
`defer`. Retry reruns the same configuration immediately. Defer keeps the
installed profile and records an explicit deferred receipt; health becomes
`PARTIAL`, and **Test integrations** is the one re-entry point.

## S8/S9/F2 — Result

```text
Installation verification
+--------------------+---------+----------------------------------+
| Lane               | Result  | Meaning                          |
+--------------------+---------+----------------------------------+
| workspace          | pass    | workspace context installed      |
| model_auth         | pass    | model credential present         |
| notion_mcp         | pass    | Notion MCP live connection passed|
| connection_evals   | pass    | configured sources certified     |
| feature_evals      | pass    | frozen contract checks passed    |
+--------------------+---------+----------------------------------+

READY
Support receipt: receipts/setup-<timestamp>.json
```

- `READY`: every required lane passed.
- `PARTIAL`: core operation works but an optional live integration needs action.
- `BLOCKED`: a required lane failed; follow its Meaning column, then rerun the
  health check or choose Repair setup.

## Before / After / Example

```text
BEFORE
setup.cmd -> pull -> install -> authorize -> start -> live verify
             (on every run)

AFTER
setup.cmd -> preflight -> setup.py state detection -> one chosen action

EXAMPLE
setup.cmd
  -> Existing installation
  -> Update workspace configuration
  -> Preview
  -> Apply
  -> Static check
  -> Dashboard remains available
```

## Remaining acceptance boundary

Local tests prove state selection, preservation, command routing, setup
contracts, and verification logic. A clean Windows/WSL2 Docker run must still
operate first install, browser OAuth, stable Cloudflare ingress, Notion webhook
verification, one exact threaded reply, restart persistence, and unchanged
rerun before Windows support is declared complete.
