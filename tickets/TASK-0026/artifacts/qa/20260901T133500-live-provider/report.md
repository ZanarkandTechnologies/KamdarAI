Ticket / Proof Policy: tickets/TASK-0026/ticket.md / Done + QA Strategy + Agent Contract
Verdict: revise

# Live provider and Docker acceptance

## Tested path

The selected `kamdar-ai` profile retained `terminal.backend=docker` and the
host workspace mount. A bounded Hermes session operated the configured
Composio MCP: it created a synthetic Drive text file, read back its metadata,
verified the name, and trashed it. The same session sent exactly one authorized
Gmail message to the authorized operator test inbox. Provider identifiers are preserved
only as hashes in the evidence receipt.

Native `hermes send --to telegram` was then operated with the authorized
synthetic executive message. It failed before delivery because the selected
profile has no Telegram credential or target. The workspace's communications
and artifact-sync tables are empty, so production behavior is currently
local-only and cannot claim Telegram delivery or automatic Drive sync.

## Findings

| Claim | Result | Evidence |
| --- | --- | --- |
| Docker-backed Hermes can call configured MCP tools | PASS | Composio Drive create/read/trash and Gmail send returned provider receipts |
| Drive write is reversible | PASS | Exact test file was read back and then reported trashed |
| Gmail can send the synthetic employee follow-up | PASS | One provider message ID returned for the authorized recipient |
| Native Hermes Telegram delivery works in this profile | BLOCKED | `hermes send` reports Telegram is not configured |
| Current automations sync reports to Drive | BLOCKED | Artifact-sync table has no destination row |
| Eval latency is caused by Docker | FAIL hypothesis | 458.6 of 486.9 seconds were model API latency across 39 model calls |

## Decision

Keep the Docker backend. It is not the latency bottleneck and real provider
effects work alongside it. Before claiming the complete customer journey,
rerun setup to configure an exact Drive report destination and a tested
Telegram recipient under this profile.

Learning: `ticket_only`.
