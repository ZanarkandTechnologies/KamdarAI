---
title: Install the Company OS on Hermes for Windows
status: in_progress
owner: Company OS
created_at: 2026-08-29
updated_at: 2026-08-29
feature_refs: [FEAT-0011]
---

# Install the Company OS on Hermes for Windows

This is the customer runbook for the supported Windows deployment. The target
is Docker Desktop using Linux containers on its WSL2 backend. Hermes,
`cloudflared`, Python, and the Company OS runtime run inside containers; the
customer does not install those CLIs on Windows or open a WSL terminal.

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
- For real-time comments only: a Notion internal connection token and one
  named Cloudflare Tunnel created in the Cloudflare dashboard.

Cloudflare Tunnel is available on Cloudflare's Free plan. A domain may have a
separate registration cost, and the Free plan has no uptime SLA. Quick Tunnels
are not supported because their random `*.trycloudflare.com` URL changes when
the process restarts. See [Cloudflare Tunnel](https://developers.cloudflare.com/tunnel/)
and [Cloudflare's tunnel setup](https://developers.cloudflare.com/tunnel/setup/).

## Customer journey

```text
Download or clone the Company OS source
        |
        +--optional comments--> create named tunnel in Cloudflare dashboard
        |
        `--double-click setup.cmd
                |
                +--Docker preflight
                +--Hermes profile and model setup
                +--official Notion MCP authorization
                +--optional tunnel token + stable hostname
                +--workspace, schedules, and templates
                +--start containers
                `--guided Notion webhook verification + health/evals
```

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
the single interactive `setup.py` owner inside the Hermes image. Docker pulls a
missing image when required; opening an existing installation does not perform
an unconditional update or pull.
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
| `Docker Desktop is not installed or is not on PATH.` | Install Docker Desktop with its WSL2 backend, then rerun `setup.cmd`. |
| `Docker Desktop is installed but not running.` | Start Docker Desktop and wait until it reports **Ready**. |
| `WSL2 is not installed or is not ready.` | Install or finish configuring WSL2, restart Windows if requested, then rerun setup. |
| `Docker Desktop is running Windows containers.` | Switch Docker Desktop to Linux containers, then rerun setup. |
| `Docker Compose is unavailable.` | Update Docker Desktop, then rerun setup. |

On a new profile, the interactive wizard asks for company details and shows a
selectable **Data Sources** list. Use the arrow keys to move, Space to select,
and Enter to continue. Before setup changes runtime services or credentials, it
shows a **Review setup plan** table. An incomplete profile offers Resume. An
existing profile instead shows the maintenance menu documented below.

> **What you should see:** Your chosen company values and data sources appear
> in the review table. If Notion is selected, setup offers browser
> authorization. If real-time comments are enabled, it asks for the two hidden
> tokens and the stable HTTPS hostname. Secret values do not appear afterward.

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
When comments are selected, the optional webhook lanes additionally check:

- local webhook health and captured verification state;
- Cloudflare connector readiness;
- stable public HTTPS reachability;
- one new reply in the exact Notion discussion.

A skipped comment integration remains visibly skipped. A failed optional
comment lane produces `partial`; it never becomes a false pass.

The final panel should show one of these states:

| State | Meaning | Next action |
| --- | --- | --- |
| `READY` | Required setup and checks passed. | Open <http://127.0.0.1:9119>. |
| `PARTIAL` | Core setup works, but an optional live-comment check did not pass. | Follow the failed lane in the receipt, then rerun setup. |
| `BLOCKED` | A required check failed. | Fix the named lane before relying on automations. |

> **What you should see:** An **Installation verification** table followed by
> the final state and a profile-relative support receipt. A successful launcher also prints
> `Company OS is ready` with the dashboard address.

## 5. Restart and update

The current proving build's named Docker volume, `kamdar-hermes-data`,
preserves the Hermes profile,
credentials, OAuth state, schedules, receipts, and generated workspace state.
The Cloudflare hostname remains stable when containers or the computer restart.

Rerunning `setup.cmd` on an existing installation shows:

```text
1. Update workspace configuration
2. Update Company OS software
3. Run full health check
4. Repair setup
5. Open dashboard
6. Exit
```

Choose **Update workspace configuration** to edit the profile-owned desired
workspace, apply it, and run a static check without repeating model or Notion
authorization. After downloading repository updates, choose **Update Company OS
software**; setup updates the distribution allowlist, preserves unknown runtime
files, reconciles schedules, and runs static verification. Use **Run full
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
- valid webhook verification is accepted and an invalid signature is rejected;
- one `@hermes` comment receives exactly one threaded reply;
- duplicate delivery produces no duplicate reply;
- Docker restart preserves the hostname, profile, credentials, schedules, and
  webhook state;
- an unchanged `setup.cmd` rerun reaches the maintenance menu without mutating
  profile state or creating duplicates.

Until this operated Windows test passes, the implementation is locally
validated but not a completed clean-machine support claim.
