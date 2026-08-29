---
artifact_type: research-gap-report
artifact_version: "0.1.0"
ticket_id: TASK-0019
method: research:gap
date: 2026-08-29
status: complete
---

# Tool auth and private-report automation gap

## Decision

Keep tool authentication outside both the source repository and generated
workspace artifacts. Reuse Hermes' profile-local credential and MCP storage.
Do not add Composio to the TASK-0019 critical path: the current direct Notion
MCP is the first sufficient integration rung. Treat Composio as a later adapter
choice when a required toolkit lacks a satisfactory direct MCP or the client
accepts a centralized connected-account control plane.

## Local baseline

| Concern | Existing owner | Evidence | Plan implication |
| --- | --- | --- | --- |
| Static API keys and webhook secrets | Hermes profile `.env` | `scripts/setup_runtime.py::save_profile_secret` uses Hermes' secure environment writer | Continue installing named secrets through the setup route; never put values in templates, reports, or Git. |
| MCP definitions and tool filters | Hermes profile `config.yaml` | `scripts/setup_runtime.py` writes `mcp_servers.notion.*` with `hermes config set --force` | Store non-secret server configuration and allowlists here. |
| Native MCP OAuth state | Hermes profile `mcp-tokens/` | Installed Hermes `HermesTokenStorage` resolves under `HERMES_HOME/mcp-tokens` | Let Hermes own OAuth token, client-registration, and server-metadata files. |
| Profile selection | Process environment | `scripts/setup_runtime.py` supplies the exact profile as `HERMES_HOME` to Hermes commands | Keep Kamdar auth isolated from the global/default Hermes profile. |
| Daily extraction | `DailyReviewResultSchema` | `schemas/automations/daily-review-result.zod.mjs` already validates one result containing project, documentation, chase, and knowledge sections | Retarget the result semantics; do not invent a second extraction pipeline. |
| Daily application | Daily automation step 4 | `automations/daily-operating-update.md` already says “Apply each JSON section and verify its effects” | Replace its direct Notion-first mapping with local-artifact-first mapping. |
| Private weekly accumulation | `scripts/current_weekly_draft.mjs` | Atomic mode-0600 writes, week checks, source-key idempotency, and conflict protection already exist | Generalize this writer from one shared draft to one Project report per Project/week. |
| Weekly report hierarchy | `ReportResultSchema` | `schemas/automations/weekly-review-result.zod.mjs` already supports Project, Area, and Company report results | Point Weekly at the private Project report set and preserve the existing hierarchy. |

## Auth ownership contract

```text
KamdarAI repository                     Hermes profile
-------------------                     --------------
secret names + setup logic -----------> .env (static API keys)
reviewed MCP defaults ----------------> config.yaml (URLs, tool filters)
                                         mcp-tokens/ (native MCP OAuth)

workspace.hermes.md                     generated workspace
-------------------                     -------------------
semantic route + destination URL -----> weeks/YYYY-Www/{reports,outbound}
NO token material                        NO token material
```

If Composio is adopted later, the Composio project/consumer API key remains a
profile `.env` secret, provider OAuth credentials remain in Composio connected
accounts, and only reviewed non-secret toolkit/auth-config/account identifiers
belong in profile-local configuration. Ephemeral MCP session URLs or headers
must not be committed or rendered into reports.

## External findings

- Composio separates reusable auth configs from user-specific connected
  accounts; connected accounts hold provider credentials and refresh tokens.
  Source: [Authentication](https://docs.composio.dev/docs/authentication) and
  [Auth Configs](https://docs.composio.dev/reference/api-reference/auth-configs).
- Connected accounts provide credential masking and managed refresh; proxy
  execution avoids handing full credentials to the caller.
  Source: [Connected Accounts](https://docs.composio.dev/docs/auth-configuration/connected-accounts).
- Composio MCP sessions expose a session URL and headers, but MCP execution
  bypasses SDK execution modifiers, interception, logging, and gating. That is
  a material control-plane tradeoff for an employee-performance workflow.
  Source: [Using sessions via MCP](https://docs.composio.dev/docs/sessions-via-mcp).
- Developer and consumer connections are separate and connected accounts are
  user-scoped. Project API keys are privileged.
  Source: [Consumer/project boundaries](https://docs.composio.dev/kb/guide/consumer-project-boundaries-and-auth-selection).

## Actual gap

The missing architecture is not “add Stage 1 and Stage 2.” Those stages and a
private-draft writer already exist. The remaining work is to:

1. make Stage 2 write one private Project report per Project/week;
2. make Weekly consume those reports and produce the Department/Company rollup;
3. restrict provider writes to explicit outbound/destination mappings after the
   local artifact exists;
4. keep connection health, dedupe keys, and delivery IDs as hidden runtime
   metadata rather than end-user artifact classes; and
5. bind the template, result shape, mapping, example, and QA to one versioned
   contract so they cannot drift independently.

## Lean check

- **Verdict:** `reuse_local`
- **First sufficient rung:** adapt `current_weekly_draft.mjs`, the existing
  Daily apply step, and the Weekly schemas/reference runner.
- **Avoid now:** a database, publish queue, general workflow engine, Composio
  dependency, or second schema language.
- **Promotion evidence:** add a provider adapter only when a named required
  provider cannot be served safely by an existing direct MCP, or centralized
  connected-account administration becomes an accepted requirement.
