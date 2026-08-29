---
title: Install and verify the Company OS from one entry point
status: in_progress
execution_modes: [install, reconcile, verify]
production_mode: human-gated
owner: Company OS
created_at: 2026-08-28
updated_at: 2026-08-29
tags: [company-os, deployment, onboarding, health, eval]
feature_id: FEAT-0011
feature_key: platform.seamless-deployment
system_id: SYS-0001
category: platform
public: true
surfaces:
  - distribution.yaml
  - scripts/setup_workspace.py
  - scripts/setup_profile.py
  - evals
source_refs:
  - ../prd.md
  - ../customer-setup.md
  - ../../tickets/TASK-0016/ticket.md
  - https://developers.cloudflare.com/tunnel/setup/
  - https://developers.notion.com/reference/webhooks
evidence_refs: []
known_limits: "OAuth, Notion sharing, one-time named-tunnel dashboard provisioning, webhook verification, and production writes remain explicit human gates; clean Windows proof is pending."
---

# Install and verify the Company OS from one entry point

## Why it exists

A copied profile is not a working Company OS. The installer needs one supported
journey that owns desired configuration, identifies unavoidable human gates,
and proves the installed features before automations are trusted.

## Trigger and inputs

A fresh install or version update, a chosen supported topology, the Company OS
distribution source, a Hermes profile name, client credentials, the approved
Notion scope, and the selected output templates.

## Pipeline signature

```text
distribution source + profile + topology + human gates + templates
  -> reconciled runtime + health lanes + feature verdicts + redacted receipt
```

## Flow

```text
launch -> detect new/incomplete/existing
             |          |          |
          install     resume    maintenance menu
             |          |          |
             +------ reconcile ----+-> focused or live health -> eval
                          |
                          +-> human_required -> rerun/resume
```

## State changes and artifacts

The distribution updates only declared repo-owned paths. Hermes profile state
owns secrets, OAuth, memories, sessions, MCP runtime state, and scheduler state.
The live workspace owns generated operating artifacts. Setup emits one redacted,
resumable receipt containing versions, lane verdicts, and the exact next action.

Selectable providers are owned by one JSON file per data-source role under
`catalog/data-sources/`. A provider row references an approved Hermes MCP plus
one natural eval prompt, expected output, assertions, and side-effect class.
Setup derives Hermes commands from that reference; catalog files never contain
raw commands or credentials.

## Supported deployment boundary

Windows uses Docker Desktop with Linux containers on its WSL2 backend. The
customer downloads or clones the repository and starts `setup.cmd`; Hermes,
Python, and `cloudflared` are supplied by pinned container images rather than
host installations. The persistent named Docker volume owns the Hermes profile.

Scheduled work uses the official hosted Notion MCP. Real-time comments use the
profile-owned Notion webhook adapter because inbound events cannot arrive over
MCP. The customer creates one remotely managed named Cloudflare Tunnel and
published hostname in the web dashboard. Setup stores its tunnel token, starts
the existing tunnel, and verifies it. Quick Tunnels are invalid because their
URL changes across process restarts.

```text
repo desired state --> setup container --> persistent Hermes profile
                              |                       |
Notion hosted MCP <-----------+                       +--> schedules/workspace
Notion events --> stable Cloudflare hostname --> private adapter:8645
```

## Downstream application

Daily, Weekly, and Meeting Intake automations run only after their required
runtime, provider, schedule, and frozen-eval gates are ready. A partial provider
does not invalidate network-free feature proof, but it blocks claims that the
provider-backed workflow is operational.

## Failure modes

Unsupported platform, missing Hermes version, non-persistent container volume,
profile/path mismatch, missing credential, incomplete OAuth, unauthorized
Notion root, unavailable MCP, stopped scheduler/gateway, webhook URL drift,
template/schema drift, or a failing feature eval. Every failure maps to one
owner and next action; skipped live checks never become passes.

## Proof contract

The clean-machine matrix proves install and unchanged rerun on the supported
Windows and Docker paths. Contract tests prove distribution/user ownership and
secret redaction. Health proves static, process, MCP, provider certification,
webhook, and scheduler lanes independently. Frozen evals prove buyer-visible
feature behavior from packaged fixtures. An operated provider probe is required
before claiming live provider readiness.

Connection certification executes the selected role/provider prompts with
bounded concurrency, performs deterministic process/session/tool checks, and
uses one consolidated judge call. Its owner-only receipt is bound to the exact
selected providers and sources; health rejects a missing or stale receipt.
Doctor remains a later read-only output-quality proof.

The exact customer steps and acceptance matrix are owned by
[`docs/customer-setup.md`](../customer-setup.md). This feature owns behavior;
the runbook owns the operator journey.

## Example

An operator runs the Company OS setup entry point in a fresh persistent Docker
deployment. It installs the distribution, pauses at Notion OAuth with one URL,
resumes after consent, reconciles the workspace and schedules, passes frozen
Daily/Weekly evals, and returns `partial` because comment webhooks were not
enabled. The receipt states that scheduled polling works and event-triggered
Notion discussions do not.
