---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0022
title: Add a data-source provider catalog and autonomous connection certification
status: in_progress
claimed_by: null
created_at: 2026-08-29T00:00:00Z
updated_at: 2026-08-29T00:00:00Z
depends_on: [TASK-0017]
ui_scope: true
feature_refs: [FEAT-0011]
---

# TASK-0022: Add a data-source provider catalog and autonomous connection certification

## Summary

Make provider choices declarative by data-source role while delegating MCP
installation, OAuth, token storage, tool discovery, and connection probes to
Hermes. Certify selected integrations with the existing prompt, expected
output, and assertions eval contract; execute cases concurrently and grade the
whole batch with one model call.

## Scope

- **In:** one JSON catalog per selectable data-source role; reviewed Hermes MCP
  catalog references; setup provider picker; connection deduplication; generic
  install/login/test orchestration; one restricted Composio session for Gmail
  and Google Drive; prompt-based provider evals; concurrent
  execution; redacted session export; deterministic prechecks; one batch judge;
  configuration-bound private receipts; CLI health rendering; fake-Hermes tests.
- **Out:** another MCP manager, raw shell commands in catalog JSON, structured
  per-tool test recipes, silent external writes, arbitrary unsupported
  providers, production provider mutation, and
  treating connection certification as the read-only Doctor.
- **Split trigger:** add another shared connection driver only when a supported
  provider cannot use Hermes' catalog or the fixed-tool Composio session.

## Delta

> **Before:** setup accepts free-form provider names, only Notion has bespoke
> MCP setup, and health can prove tool discovery without proving a configured
> source operation.
>
> **After:** setup renders reviewed providers from `catalog/data-sources/*.json`,
> Hermes owns every catalog MCP lifecycle, and one certification run proves all
> selected data-source cases before Doctor.
>
> **Example:** selecting Notion for Projects and Tasks installs and authorizes
> `hermes_catalog:notion` once, runs both role-specific prompts concurrently,
> exports their redacted sessions, and returns one batch verdict.

> **Failure example:** a failed Gmail row shows its reason and offers `retry`
> or `defer`. Defer preserves setup, marks health `partial`, and exposes one
> maintenance action: **Test integrations**.

## Contract Diagram

```text
data-source JSON -> setup selection -> unique Hermes MCP connections
                                           |
                               install -> OAuth -> mcp test
                                           |
                         parallel role/provider eval sessions
                                           |
                         deterministic process + trace checks
                                           |
                                  one batch judge call
                                           |
                    config-hash receipt -> CLI health -> Doctor
```

## Change Plan

1. Validate data-source and provider IDs, Hermes catalog references, natural
   eval prompts, expected outputs, assertions, and side-effect gates.
2. Replace free-form data-source provider entry with catalog choices; derive
   unique `hermes mcp install/login/test` actions; and create one fixed-tool,
   sandbox-disabled Composio MCP session for selected Gmail/Drive roles without
   installing the Composio CLI.
3. Run selected eval prompts through `hermes chat --query-file - --quiet` with
   only that provider MCP toolset and no injected workspace rules, export
   redacted sessions, reject missing tool evidence mechanically, and make one
   strict JSON judge call for all remaining assertions.
4. Store owner-only run and `latest` receipts bound to the selected role,
   provider, source, and connection hash; show missing, stale, failed, or passed
   certification as an independent health lane.
5. Prove catalog rejection, connection deduplication, bounded parallelism,
   exactly one judge call, precheck precedence, side-effect authority, receipt
   permissions, and stale-config detection with a fake Hermes runner.

## Done / Proof

```yaml
metric: selected catalog providers receive one trustworthy batch certification
done:
  - Setup choices come only from validated data-source JSON catalogs.
  - Existing Hermes catalog MCPs require no provider-specific setup code.
  - Gmail and Google Drive share one restricted Composio MCP session and Hermes-owned API-key storage.
  - Shared MCP connections install and authorize once across multiple roles.
  - Provider prompts run concurrently with bounded parallelism.
  - Exactly one judge call grades every executed provider result.
  - A missing process session export or tool result cannot be judged green.
  - Reversible or irreversible tests require explicit side-effect authority.
  - The private receipt is owner-only and becomes stale after a binding or eval-contract change.
  - CLI health displays connection certification independently from Doctor.
  - Failed certification offers retry or explicit defer; defer produces partial health rather than aborting installation.
  - Autonomous tests require no credentials network access or external writes.
rubric_families: [setup-operability, eval-quality, least-privilege, truthfulness]
required_tas_gates: [implementation, qa, review]
hard_gates: [no raw catalog commands, no secret output, no silent side effect, no false green]
checks:
  - python3 -m unittest tests.unit.scripts.test_provider_catalog tests.unit.scripts.test_run_connection_evals -v
  - python3 -m unittest discover -s tests -p 'test_*.py' -v
  - python3 setup.py --help
evidence:
  - tickets/TASK-0022/progress.md
  - tickets/TASK-0022/artifacts/receipts/
```

## Autonomous Test Boundary

The agent can run catalog, setup, concurrency, judge, receipt, redaction, and
health tests unattended through fake Hermes sessions. A real provider run can
also run unattended after the profile already has valid OAuth and an approved
isolated sink. One-time browser OAuth, choosing the sink, and authorizing an
irreversible action remain human gates; absence of those gates is
`human_required`, never a passing substitute.

## State

- **Current:** Notion, Linear, Gmail, and Google Drive catalogs; native Hermes
  and Composio MCP orchestration; retry/defer UX; isolated batch runner; health
  lane; and deterministic tests are implemented.
- **Next:** run provider-backed Notion/Linear/Gmail/Drive certification in isolated test
  sinks, then carry the operated command and receipt copy into TASK-0021.
- **Blockers:** operated proof requires authenticated isolated provider sinks
  plus a Composio project API key for Gmail/Google Drive.

## Links

- `catalog/data-sources/`
- `scripts/provider_catalog.py`
- `scripts/composio_session.py`
- `scripts/run_connection_evals.py`
- `setup.py`
- `scripts/setup_runtime.py`
- `tests/unit/scripts/test_provider_catalog.py`
- `tests/unit/scripts/test_run_connection_evals.py`

## Grounding

- **Local Hermes CLI:** `hermes mcp catalog` lists `notion` and `linear`; the
  installed help confirms `mcp install/login/test`, programmatic
  `chat --query-file - --quiet --toolsets`, bounded runs, and redacted session
  export are native commands.
- **Local proof:** the fake-Hermes suite proves orchestration without model
  spend, credentials, network access, or external writes. Provider-backed
  behavior remains an operated acceptance boundary, not an inferred pass.
- **Current Composio docs:** sessions expose `session.mcp.url`; project API
  calls use `x-api-key`; link sessions return hosted OAuth URLs; session
  toolkit/tool allowlists and disabled workbench keep this connection bounded.
