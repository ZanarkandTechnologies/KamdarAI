---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0018
title: Replace Notion read write adapters with an MCP-first provider boundary
status: todo
claimed_by: null
created_at: 2026-08-28T08:20:25Z
updated_at: 2026-08-28T08:20:25Z
depends_on: [TASK-0016]
ui_scope: false
feature_refs: [FEAT-0011, FEAT-0010]
---

# TASK-0018: Replace Notion read write adapters with an MCP-first provider boundary

## Summary

Adopt the official hosted Notion MCP as the default interactive read/write
route and remove redundant Kamdar Notion CLI/adapter requirements where the
MCP proves capability parity. Keep inbound Notion events as an explicit
separate boundary: official MCP does not receive `comment.created`, and its
user OAuth is not a headless bearer-token contract.

TASK-0022 owns the reusable provider catalog and certification runner. This
ticket supplies the first operated Notion capability proof and removal
decision; it must not reimplement setup selection, Hermes OAuth, or judging.

Gmail and Google Drive route through TASK-0022's restricted Composio MCP
session; they do not expand this Notion-specific ticket.

## Scope

- **In:** required Notion capability inventory; official MCP endpoint and
  bounded tools; Hermes profile-local OAuth; read/write smoke; database/root
  access validation; adapter elimination matrix; Docker OAuth path; headless
  mode decision; comment webhook ingress decision and health contract; source
  cleanup only after replacement proof.
- **Out:** pretending MCP receives webhooks; relying on the unmaintained local
  Notion MCP by default; production writes without authority; changing the
  Company OS data model; deleting the current connector before proof.
- **Split trigger:** external OAuth and webhook provisioning can block
  independently from the distribution lifecycle.

## Delta

> **Before:** Kamdar ships and enables a custom Notion plugin/CLI and separately
> onboards a webhook tunnel, with overlapping access logic and unclear Docker
> ownership.
>
> **After:** Official hosted MCP owns supported read/write tools and OAuth;
> Kamdar owns capability policy and event-to-automation logic; public webhook
> ingress remains only where event-driven comments are enabled.
>
> **Example:** A desktop operator authorizes `https://mcp.notion.com/mcp`, passes
> bounded page/database read and isolated write/read-back, while health reports
> Notion comments as `disabled` until a separate public webhook is configured.

## Map

```text
Hermes chat/automation -> official Notion MCP -> Notion read/write
Notion comment --------> public webhook -----> Kamdar event trigger
                                  (separate capability and credential mode)
```

## Change Plan

1. Enumerate every current Notion operation and map it to MCP, webhook ingress,
   or an unavoidable residual integration.
2. Prove official MCP OAuth, bounded tools, access scope, and isolated
   read/write/read-back in the selected native and Docker topologies.
3. Choose and document supported interactive, scheduled, headless, and comment-
   event modes; fail closed where OAuth/ingress cannot support a mode.
4. Replace and remove custom code only for rows with operated parity proof;
   preserve the smallest event ingress owner separately.

## Done / Proof

```yaml
metric: required Notion capability coverage with operated proof
done:
  - Every current operation maps to official MCP, webhook ingress, retained residual, or rejected scope.
  - Official MCP passes bounded auth read and isolated write/read-back in each claimed topology.
  - Interactive OAuth and unattended/headless support are described truthfully.
  - MCP health and webhook event health are independent verdicts.
  - Redundant adapter and CLI code is removed only after parity proof.
rubric_families: [provider-parity, least-privilege, deployment-operability, truthfulness]
required_tas_gates: [research, security-review, operated-qa, cleanup-review]
hard_gates: [no production mutation, no token logging, no webhook-via-MCP claim]
checks:
  - hermes mcp test notion
  - isolated Notion read and write/read-back smoke
  - comment.created ingress smoke when event mode is enabled
  - connector capability and removal tests
evidence:
  - tickets/TASK-0018/artifacts/capability-matrix.md
  - tickets/TASK-0018/artifacts/receipts/
```

## Agent Contract

- **Open:** Hermes profile MCP list/test/login and isolated Notion eval root.
- **Test hook:** bounded provider smoke with exact allowed root and disposable
  record; separate webhook test comment.
- **Stabilize:** fixed official endpoint, explicit OAuth identity, isolated root,
  and source-owned capability list.
- **Inspect:** discovered tool list, auth identity/scope without secrets,
  provider IDs/read-back, webhook delivery, and adapter code references.
- **Key states:** unauthenticated, authorized/no root, read-ready, write-ready,
  webhook-disabled, webhook-ready, headless-blocked.
- **QA cookbook:** none yet.
- **Expected artifacts:** capability matrix and redacted operated receipts.
- **Delegate with:** TASK-0018 and this file; write evidence under its artifacts.

## Run Hints

```yaml
likely_size: large
goal_recommended: true
compute_hint: networked provider QA
proof_weight: operated
batchable: false
no_batch_reason: OAuth and external capability findings determine safe cleanup
human_gates: [Notion OAuth, isolated-root sharing, webhook verification]
```

## State

- **Current:** todo; official hosted MCP is the preferred read/write candidate,
  while comment events still require public webhook ingress.
- **Next:** prove capability parity after TASK-0016 selects the deployment path.
- **Blockers:** TASK-0016 and provider authorization for operated QA.

## Links

- `plugins/platforms/notion/`
- `scripts/setup_cli/flows/webhook.py`
- [Official Notion MCP setup](https://developers.notion.com/guides/mcp/get-started-with-mcp)
- [Official Notion webhooks](https://developers.notion.com/reference/webhooks)
