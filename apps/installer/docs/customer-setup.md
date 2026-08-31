---
title: Install the Company OS on Hermes for Windows
status: in_progress
owner: Company OS
created_at: 2026-08-29
updated_at: 2026-08-30
---

# Install the Company OS on Hermes for Windows

This is the customer runbook for the supported Windows deployment. The target
is Docker Desktop using Linux containers on its WSL2 backend. Hermes,
ngrok, Python, and the Company OS runtime run inside containers; the
customer does not install those CLIs or Python on Windows or open a WSL
terminal. The installed extraction contracts execute with Hermes' bundled
Python and Pydantic.

The screens below use the generic product labels. The current KamdarAI proving
build may still show legacy Kamdar labels until the setup implementation is
renamed; the actions and expected states are the same.

## What the customer provides

- A Windows computer that remains on while automations and comments should
  work, or an always-on office computer/VPS using the same Compose stack.
- Docker Desktop configured for Linux containers and its WSL2 backend.
- This repository, obtained with Git or Download ZIP.
- A Hermes model login or API key.
- Notion authorization for the official hosted MCP.
- When Gmail or Google Drive is selected: one Composio project API key and the
  Google account login. Setup stores the API key in Hermes and opens hosted
  OAuth links; no Composio CLI is installed.
- For real-time comments only: a Notion internal connection token, an ngrok
  account authtoken, and the account's assigned HTTPS development domain.

ngrok's Free plan provides one assigned development domain without a forced
endpoint timeout, subject to its usage limits and without a production SLA.
See [ngrok's Free plan limits](https://ngrok.com/docs/pricing-limits/free-plan-limits/)
and [Docker Compose setup](https://ngrok.com/docs/using-ngrok-with/docker/compose/).

## Customer journey

```text
YOU                         SETUP                       RESULT
 |                            |                           |
 |-- open setup.cmd --------->|                           |
 |                            |-- asks for company info   |
 |<-- approve each service ---|                           |
 |                            |-- checks each connection  |
 |<-- fix or skip a problem --|                           |
 |                            |-- installs and verifies ->|
 |                                                        |
 |<---------------- dashboard, schedules, health ---------|
```

Real-time Notion comments add one optional ngrok step before setup. Daily
and Weekly scheduled reviews do not require it.

## 1. Prepare ngrok for real-time comments

Skip this when scheduled operation is enough. The Notion plugin owns the
ngrok endpoint, token, webhook subscription, and safety instructions; follow
its [real-time comment setup](../../../plugins/platforms/notion/README.md#configure-real-time-comments)
before launching this installer.

## 2. Launch setup

Download and unzip the repository, or clone it with Git. Then double-click
`setup.cmd` from the repository folder. Git is optional.

The launcher checks Docker, Linux-container mode, and Compose. It then starts
the packaged `setup.py` entry point inside the Hermes image; that entry point
dispatches the guided flow in `apps/installer/cli/`. Docker pulls a missing image
when required; opening an existing installation does not perform an
unconditional update or pull.
Docker Desktop is the only host prerequisite; if it is absent, setup opens the
official installer page but does not silently install system software.

The command window should show this sequence:

```text
Company OS Setup
Checking Docker Desktop and WSL2...
Opening the guided setup...
```

If setup stops before the image pull, the same window stays open and names the
failed prerequisite:

| Message | What to do |
| --- | --- |
| `Docker Desktop is required and was not found.` | Install Docker Desktop with its WSL2 backend, then rerun `setup.cmd`. |
| `Docker Desktop is installed but is not ready.` | Start Docker Desktop and wait until it reports **Ready**. |
| `WSL2 is required and is not ready.` | Install or finish configuring WSL2, restart Windows if requested, then rerun setup. |
| `Docker Desktop is running Windows containers.` | Switch Docker Desktop to Linux containers, then rerun setup. |
| `Docker Compose is unavailable. Update Docker Desktop, then try again.` | Update Docker Desktop, then rerun setup. |

On a new profile, the interactive wizard asks for company details, data sources,
and optional owner messages. Messaging asks ordinary questions only: completed
reports and/or owner alerts, the owner's name, Telegram/Slack/WhatsApp, and
**Prepare drafts in the private workspace** or **Send automatically**. Leaving
these choices empty is the lean default. Task-specific documentation and
progress questions use comments on the exact linked Work item; they need no
separate messaging setup.
Before setup changes runtime services or credentials, it shows a **Review setup
plan** table. An incomplete profile offers Resume. An
existing profile instead shows the maintenance menu documented below.

If owner messages are selected, setup opens Hermes' own messaging setup; tokens
remain in the private Hermes profile. A connection test is always a separate
opt-in send. Automatic delivery remains blocked until Hermes returns an exact
destination and the named owner confirms receiving that test. The private
receipt is tied to the current message choices, recipient, app, and exact
target, so changing any of them requires a new test.

Draft-first does not send. The automation writes the draft under the private
`weeks/<week>/outbound/` directory for review. An approved send uses the native
messaging skill or MCP and the exact confirmed route; there is no custom
messaging dispatcher or approval CLI.

> **What you should see:** Your chosen company values and data sources appear
> in the review table. If Notion is selected, setup offers browser
> authorization. If Gmail or Drive is selected, setup asks once for the hidden
> Composio project API key and shows a hosted OAuth link for each selected
> Google toolkit. If real-time comments are enabled, it asks for the two hidden
> tokens and the stable HTTPS hostname. Secret values do not appear afterward.

Candidate Composio and Notion keys are checked with their provider before they
replace any saved value. The ngrok authtoken is checked by starting the pinned
agent because ngrok agent tokens cannot authenticate its REST API; setup stops
before claiming readiness if the agent rejects the token or endpoint.

The setup creates one restricted Composio session containing only the selected
Gmail/Drive tools, disables Composio's remote workbench, and registers that
session in Hermes as `composio-google`. Gmail and Drive share the session but
retain separate Google OAuth connections. The Composio project key and hosted
MCP URL remain inside the private Hermes profile. Hermes authenticates every
hosted MCP request with the profile's `COMPOSIO_API_KEY`; the secret value is
never copied into the MCP configuration. A rejected saved key can be replaced
during interactive setup, and the old value remains saved until its replacement
has been accepted by Composio.
This follows Composio's current
[session MCP](https://docs.composio.dev/docs/sessions-via-mcp),
[session configuration](https://docs.composio.dev/docs/configuring-sessions),
and [hosted authentication](https://docs.composio.dev/docs/authentication)
contracts.

After authorization, setup certifies every configured provider. If a row
fails, its reason is shown and setup offers only:

```text
retry  - rerun the same certification immediately
defer  - keep the installation and test later
```

Deferring does not undo setup. Health reports `PARTIAL`, and the customer
reruns `setup.cmd` and chooses **Test integrations**. The underlying
container command is `setup.py certify`; customers do not need to type it.

When prompted for real-time comments, provide:

```text
Notion internal connection token: <hidden input>
ngrok agent authtoken:             <hidden input>
Assigned ngrok HTTPS domain:       https://example-name.ngrok-free.app
```

The setup rejects `trycloudflare.com`, localhost, non-HTTPS URLs, query
strings, fragments, and unrelated paths. It normalizes the accepted endpoint
to:

```text
https://example-name.ngrok-free.app/notion/webhook
```

No credential is written to the repository or printed in the receipt.

## 3. Verify the Notion webhook

After the gateway and ngrok agent start, complete the plugin's
[verification steps](../../../plugins/platforms/notion/README.md#configure-real-time-comments).

Expected checkpoints:

| After this action | What you should see |
| --- | --- |
| Create the subscription | Setup reports that it received Notion's verification request. |
| Paste the one-time token | Notion reports that the subscription is verified. |
| Post the test comment | One new Hermes reply appears in the same Notion discussion. |

Troubleshooting and the external protocol references live with the plugin so
this customer journey does not duplicate its implementation contract.

## 4. Read the result

Setup returns `ready`, `partial`, or `blocked` and writes a redacted receipt in
the persistent Hermes profile. `ready` requires core profile, workspace,
model, schedules, official Notion MCP, gateway, and installed PM skill packages.
Messaging adds separate `messaging_configured` and `messaging_delivery` lanes;
a running gateway alone is not accepted as proof that the owner route works.
When comments are selected, the optional webhook lanes additionally check:

- local webhook health and captured verification state;
- stable public HTTPS reachability;
- one new reply in the exact Notion discussion.

A skipped comment integration remains visibly skipped. A deferred integration
certification or failed optional comment lane produces `partial`; neither
becomes a false pass.

The final panel should show one of these states:

| State | Meaning | Next action |
| --- | --- | --- |
| `READY` | Required setup and checks passed. | Open <http://127.0.0.1:9119>. |
| `PARTIAL` | Core setup works, but provider certification was deferred or an optional integration check needs attention. | Follow the named lane in the receipt, then rerun setup and choose **Test integrations** or **Run health check**. |
| `BLOCKED` | A required check failed. | Fix the named lane before relying on automations. |

> **What you should see:** An **Installation verification** table followed by
> the final state and a profile-relative support receipt. A successful launcher also prints
> `Company OS is ready` with the dashboard address.

The dashboard is still local-only in Docker. Current Hermes releases no longer
permit `--insecure` to bypass authentication on a container-wide bind, so the
Company OS starts Hermes on container loopback and uses its packaged bridge to
publish only `127.0.0.1:9119` on the host. If logs mention a refused
`0.0.0.0` dashboard bind, update the repository and rerun **Update Company OS
software**; do not add an unauthenticated public bind.

## Evaluate an automation

`setup.py doctor` asks native Hermes to execute Daily or Weekly in
analysis-only mode. It disables provider writes, messaging, and artifact sync;
review its generated result and evaluator output. Scheduled jobs use the same
automation contracts but may apply only the exact effects authorized in the
workspace. Missing artifact-sync rows mean local-only, and successful external
effects require provider acceptance or read-back in the cadence receipt.

## 5. Restart and update

The current proving build's named Docker volume, `kamdar-hermes-data`,
preserves the Hermes profile,
credentials, OAuth state, schedules, receipts, and generated workspace state.
The assigned ngrok hostname remains stable when containers or the computer restart.

Rerunning `setup.cmd` on an existing installation shows:

```text
1. Update workspace configuration
2. Update Company OS software
3. Test integrations
4. Run full health check
5. Repair setup
6. Open dashboard
7. Exit
```

Choose **Update workspace configuration** to edit the profile-owned desired
workspace, apply it, and run a static check without repeating model or Notion
authorization. After downloading repository updates, choose **Update Company OS
software**; setup updates the distribution allowlist, preserves unknown runtime
files, reconciles schedules, and runs static verification. Use **Test
integrations** to retry the same provider certification without reinstalling
anything. Use **Run full
health check** when browser OAuth, webhook ingress, and the live Notion comment
path must be tested again. Use **Repair setup** to replace a revoked ngrok
authtoken or assigned domain; the launcher recreates the ngrok container before
running live verification.

Moving to an office computer or VPS uses the same
Compose stack and the same stable hostname; move the persistent profile state
through an explicit backup/restore procedure rather than copying tracked repo
files into it.

> **What you should see on rerun:** The maintenance menu appears before any
> update. Existing company values appear as defaults only when workspace update
> is selected. You should not receive duplicate schedules, repeated OAuth, or a
> new ngrok hostname.

## Acceptance test

The first customer-equivalent test is complete only when all of these are
observed on Windows:

- fresh `setup.cmd` run without a host Hermes, Python, Notion, or ngrok CLI;
- generated owner-only `ngrok.yml` accepted by `ngrok config check` inside the
  digest-pinned container;
- dashboard reachable only at `http://127.0.0.1:9119`;
- official Notion MCP connects;
- restricted Composio MCP connects to Gmail and Google Drive without a host CLI;
- one self-addressed Gmail test is sent and read back, and one isolated Drive
  test file is created, read back, and trashed;
- valid webhook verification is accepted and an invalid signature is rejected;
- one `@hermes` comment receives exactly one threaded reply;
- duplicate delivery produces no duplicate reply;
- Docker restart preserves the hostname, profile, credentials, schedules, and
  webhook state;
- an unchanged `setup.cmd` rerun reaches the maintenance menu without mutating
  profile state or creating duplicates.

Until this operated Windows test passes, the implementation is locally
validated but not a completed clean-machine support claim.
