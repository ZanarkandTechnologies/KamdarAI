---
title: Install the Company OS on Hermes for Windows
status: in_progress
owner: Company OS
created_at: 2026-08-29
updated_at: 2026-08-30
feature_refs: [FEAT-0011]
---

# Install the Company OS on Hermes for Windows

This is the customer runbook for the supported Windows deployment. The target
is Docker Desktop using Linux containers on its WSL2 backend. Hermes,
`cloudflared`, Python, and the Company OS runtime run inside containers; the
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
- For real-time comments only: a Notion internal connection token and one
  named Cloudflare Tunnel created in the Cloudflare dashboard.

Cloudflare Tunnel is available on Cloudflare's Free plan. A domain may have a
separate registration cost, and the Free plan has no uptime SLA. Quick Tunnels
are not supported because their random `*.trycloudflare.com` URL changes when
the process restarts. See [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
and [Cloudflare's tunnel setup](https://developers.cloudflare.com/tunnel/setup/).

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

Real-time Notion comments add one optional Cloudflare step before setup. Daily
and Weekly scheduled reviews do not require it.

## 1. Prepare Cloudflare for real-time comments

Skip this section if scheduled operation is enough and `@hermes` comments are
not needed.

In the Cloudflare web dashboard:

1. Go to **Networking → Tunnels** and create a remotely managed named tunnel,
   for example `company-hermes`.
2. Choose the Docker connector and copy the tunnel token from the generated
   command. Treat the token as a password; anyone holding it can run the
   tunnel. The setup wizard stores it in the private Hermes profile volume.
3. Add one **Published application** route:

   ```text
   Hostname:    hermes.<customer-domain>
   Service URL: http://gateway:8645
   ```

4. Save the route. Do not run the generated Docker command manually; the
   Compose stack already owns the `cloudflared` container.

> **What you should see:** Cloudflare lists the named tunnel and the published
> hostname you entered. The tunnel may show as inactive until `setup.cmd`
> starts the connector. You should also have the copied tunnel token ready to
> paste into setup.

Do not place a Cloudflare Access login challenge in front of this hostname:
Notion cannot complete an interactive login. The adapter serves only its
webhook and health routes; webhook requests are protected by HTTPS,
payload-size limits, and Notion HMAC signature verification.

## 2. Launch setup

Download and unzip the repository, or clone it with Git. Then double-click
`setup.cmd` from the repository folder. Git is optional.

The launcher checks Docker, Linux-container mode, and Compose. It then starts
the packaged `setup.py` entry point inside the Hermes image; that entry point
dispatches the guided flow in `scripts/setup_cli/`. Docker pulls a missing image
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
**Prepare drafts in the private workspace** or **Send automatically**. Employee
follow-up is visibly unavailable until approved People-directory routes exist.
Setup also asks one plain-language evaluation question: **Prepare only** or
**Reviewed Stage 2**. Prepare only is the default and changes no downstream
system. Reviewed Stage 2 permits a later Apply action, but does not apply
anything during setup and never authorizes production.
Before setup changes runtime services or credentials, it shows a **Review setup
plan** table. An incomplete profile offers Resume. An
existing profile instead shows the maintenance menu documented below.

If owner messages are selected, setup opens Hermes' own messaging setup; tokens
remain in the private Hermes profile. A connection test is always a separate
opt-in send. Automatic delivery remains blocked until Hermes returns an exact
destination and the named owner confirms receiving that test. The private
receipt is tied to the current message choices, recipient, app, and exact
target, so changing any of them requires a new test.

Draft-first does not send. The typed guard writes one idempotent Markdown draft
per stable action key under the private `weeks/<week>/outbound/` directory; a
different body with the same key fails as a conflict. After reviewing a draft,
the owner can explicitly approve that exact file through the same guard's
`--approve-draft` action. The guard still requires the current confirmed owner
route and never exposes its target ID. Normal automation delivery cannot bypass
this approval or reuse an old route.

From the runtime workspace, the explicit approval command is:

```text
python ../scripts/authorized_message.py --workspace .hermes.md --profile-home .. --message "owner report" --approve-draft weeks/<YYYY-Www>/outbound/<action-key>.md
```

> **What you should see:** Your chosen company values and data sources appear
> in the review table. If Notion is selected, setup offers browser
> authorization. If Gmail or Drive is selected, setup asks once for the hidden
> Composio project API key and shows a hosted OAuth link for each selected
> Google toolkit. If real-time comments are enabled, it asks for the two hidden
> tokens and the stable HTTPS hostname. Secret values do not appear afterward.

The setup creates one restricted Composio session containing only the selected
Gmail/Drive tools, disables Composio's remote workbench, and registers that
session in Hermes as `composio-google`. Gmail and Drive share the session but
retain separate Google OAuth connections. The Composio project key and hosted
MCP URL remain inside the private Hermes profile.
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
Cloudflare named-tunnel token:     <hidden input>
Stable public hostname:            https://hermes.<customer-domain>
```

The setup rejects `trycloudflare.com`, localhost, non-HTTPS URLs, query
strings, fragments, and unrelated paths. It normalizes the accepted endpoint
to:

```text
https://hermes.<customer-domain>/notion/webhook
```

No credential is written to the repository or printed in the receipt.

## 3. Verify the Notion webhook

After the gateway and tunnel start, setup guides the remaining Notion browser
gate:

1. Open the internal connection's **Webhooks** tab.
2. Create a subscription using the exact public endpoint shown by setup.
3. Select `comment.created`. Enable the connection's **Read content**, **Read
   comments**, and **Insert comments** capabilities so it can inspect the page
   and reply in the existing discussion.
4. Wait for setup to detect the one-time verification token.
5. Paste the token shown by setup into Notion and verify the subscription.
6. Share the isolated test page with the same connection.
7. Add `@hermes setup healthcheck` to that page.

Expected checkpoints:

| After this action | What you should see |
| --- | --- |
| Create the subscription | Setup reports that it received Notion's verification request. |
| Paste the one-time token | Notion reports that the subscription is verified. |
| Post the test comment | One new Hermes reply appears in the same Notion discussion. |

If setup reports that no verification request arrived, stop there and check
the published Cloudflare hostname and tunnel status. Do not create several new
subscriptions while the endpoint is still unreachable.

Notion requires a secure public endpoint and does not allow the webhook URL to
change after verification without recreating the subscription. See
[Notion webhooks](https://developers.notion.com/reference/webhooks).
The capability boundary is documented in
[Notion connection capabilities](https://developers.notion.com/reference/capabilities).

## 4. Read the result

Setup returns `ready`, `partial`, or `blocked` and writes a redacted receipt in
the persistent Hermes profile. `ready` requires core profile, workspace,
model, schedules, official Notion MCP, gateway, and packaged feature evals.
Messaging adds separate `messaging_configured` and `messaging_delivery` lanes;
a running gateway alone is not accepted as proof that the owner route works.
When comments are selected, the optional webhook lanes additionally check:

- local webhook health and captured verification state;
- Cloudflare connector readiness;
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

## Review and apply an evaluation

`setup.py doctor` creates the real-data previews and one private handoff for
Daily, Weekly, and Meeting Intake. It always stops after Stage 1. Review a
cadence's complete downstream plan with:

```text
python setup.py deliver --handoff <private-run>/<cadence>/handoff.json
```

After checking the provider/action counts, explicitly apply that unchanged
handoff with:

```text
python setup.py deliver --handoff <private-run>/<cadence>/handoff.json --apply
```

Stage 2 covers local memory/report writes plus every configured external
destination, not only Telegram. A disabled policy returns `not_requested`.
Missing artifact-sync rows mean local-only; missing required Work or messaging
routes remain visibly blocked. Successful actions require filesystem read-back,
provider read-back, or provider acceptance and write a redacted
`delivery-receipt.json` beside the handoff.

## 5. Restart and update

The current proving build's named Docker volume, `kamdar-hermes-data`,
preserves the Hermes profile,
credentials, OAuth state, schedules, receipts, and generated workspace state.
The Cloudflare hostname remains stable when containers or the computer restart.

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
path must be tested again.

Moving to an office computer or VPS uses the same
Compose stack and the same stable hostname; move the persistent profile state
through an explicit backup/restore procedure rather than copying tracked repo
files into it.

> **What you should see on rerun:** The maintenance menu appears before any
> update. Existing company values appear as defaults only when workspace update
> is selected. You should not receive duplicate schedules, repeated OAuth, or a
> new Cloudflare hostname.

## Acceptance test

The first customer-equivalent test is complete only when all of these are
observed on Windows:

- fresh `setup.cmd` run without a host Hermes, Python, Notion, or Cloudflare CLI;
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
