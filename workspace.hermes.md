---
template_id: hermes-company-workspace
template_version: "0.3.0"
kind: hermes-project-context
company_name: "Kamdar AI"
company_description: "AI transformation workspace for Kamdar, a Malaysian fabrics, furnishings, home-decor, and ready-to-wear retailer established in 1972."
company_timezone: "Asia/Kuala_Lumpur"
status: active
execution_modes:
  - frozen
  - isolated-eval
production_write_mode: proposal-only
---

# Kamdar AI Workspace

Kamdar AI is the AI transformation workspace for Kamdar, a Malaysian fabrics, furnishings, home-decor, and ready-to-wear retailer established in 1972. The company operates stores across Malaysia and serves consumers, businesses, and institutions.

## Work

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Notion | Daily and Weekly automations via `ntn` | [Operated Daily–Weekly eval workspace](https://app.notion.com/p/EVAL-Kamdar-Company-OS-operated-Daily-and-Weekly-2026-08-26-3c8d43a2394281ebbf3bcc96103b30a1) → [Projects](https://app.notion.com/p/069e3aefb9b74ec4af7406e1be2de51b) · [Work items](https://app.notion.com/p/884c39fd534940be9f5f885b448cbcf0) | These isolated databases are the active evaluation sources. Projects are human-operated source records; Work contains the seeded Tasks and Meetings used by the Daily and Weekly automations. Fetch each selected page in full. Production Kamdar records are outside this route. |

## Data sources

The Daily automation names these keys; it does not repeat their URLs, authority,
or query rules. Each run records the actual source link, scope, fetch result,
and gap in `daily-context-diff.json`.

<!-- hermes:managed data-sources -->
| Role | Provider | Source | Access | Structure and scope |
| --- | --- | --- | --- | --- |
| `projects` | notion | [Projects](https://app.notion.com/p/069e3aefb9b74ec4af7406e1be2de51b) | read-write | Active seeded Projects related to selected Work. Projects remain human-operated source records; private management assessments and accumulated agent memory belong in the weekly workspace. |
| `tasks` | notion | [Work items](https://app.notion.com/p/884c39fd534940be9f5f885b448cbcf0) | read-write | Linked open or changed Work, plus Done Work whose AI review is not Processed; fetch each selected page completely. |
| `meetings` | notion | `tasks` embedded page content | read | Meeting blocks and `Meeting notes and updates` inside selected Work; this is not a second database query. |
| `people` | notion | [People](https://app.notion.com/p/8f796be4a629420f9148105da2cb8221) | read | Only seeded people referenced by selected Projects or Work; sending remains proposal-only unless explicitly authorized. |
| `operator_email` | gmail | `kenji@znrknd.com` | read-write | Operator-owned isolated-eval inbox; never use it for recipient discovery. |
| `knowledge` | google-drive | [Kamdar AI folder](https://drive.google.com/drive/folders/1QQ-bEjBeMwhB9AHEEJtiOOTYZPceJxBV) | read | Disabled unless a run explicitly enables a bounded retrieval query; no creation or publishing. |
| `reports` | notion | [Eval Reports](https://app.notion.com/p/311fe58301fe467aaf51a84bc49aa71d) | isolated-eval | Approved Final operating reports only. |
| `decisions` | notion | [Eval Decisions](https://app.notion.com/p/f4f78dbab22b423fab1e4d0fc8bd5787) | isolated-eval | Source-backed promoted decisions only. |
| `sops` | notion | [Eval SOPs](https://app.notion.com/p/55a995b1f2104731994582157b8163ba) | isolated-eval | Approved employee workflow baselines only. |
<!-- /hermes:managed data-sources -->

## Optional artifact sync

Hermes always writes canonical artifacts inside its private runtime workspace:
Project Memory files are short-term memory, weekly entity records are long-term
memory, and Final reports have immutable local versions. The table below lists
only optional one-way provider copies. An absent artifact row means local-only;
there is no enabled/default column. Provider and destination must both be
present, and provider edits never flow back into local memory.

<!-- hermes:managed artifact-sync -->
| Artifact | Provider | Destination |
| --- | --- | --- |
<!-- /hermes:managed artifact-sync -->

To mirror memory, add `short-term memory` or `long-term memory` with an exact
operator-approved private destination. Reports may target a management
dashboard. Notion and Drive own destination permissions; configuring a URL does
not prove that the destination is private or writable. Production destinations
remain unbound until setup and operated provider proof confirm them.
The `long-term memory` destination must not equal the configured People source;
the automation must reject that public-directory collision before writing.

## Isolated eval proof environment

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Notion | current-seed operator and Daily/Weekly automations via `ntn` | [Operated Daily–Weekly seed](https://app.notion.com/p/EVAL-Kamdar-Company-OS-operated-Daily-and-Weekly-2026-08-26-3c8d43a2394281ebbf3bcc96103b30a1) → [Projects](https://app.notion.com/p/069e3aefb9b74ec4af7406e1be2de51b) · [People](https://app.notion.com/p/8f796be4a629420f9148105da2cb8221) · [Work items](https://app.notion.com/p/884c39fd534940be9f5f885b448cbcf0) · [Decisions](https://app.notion.com/p/f4f78dbab22b423fab1e4d0fc8bd5787) · [SOPs](https://app.notion.com/p/55a995b1f2104731994582157b8163ba) · [Reports](https://app.notion.com/p/311fe58301fe467aaf51a84bc49aa71d) · [Automation artifacts](https://app.notion.com/p/3af2b3e6940c431a9dfa9d60af5a17b2) | This dated root is the active operated eval environment. It contains 30 template-complete seeded records and no generated Daily/Weekly effects yet. Daily and Weekly may write only inside these databases. `frozen` remains local-only; production Kamdar sources are not active. |

## People

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Notion | Daily and Weekly automations via `ntn` | [Eval People](https://app.notion.com/p/8f796be4a629420f9148105da2cb8221) | Isolated seeded directory for evaluation. Use only stored preferred and approved contact channels; never infer a route. Contact remains proposal-only unless the run explicitly authorizes a test send. |

## Knowledge

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Google Drive | profile-scoped `google-workspace` skill | [Kamdar AI folder](https://drive.google.com/drive/folders/1QQ-bEjBeMwhB9AHEEJtiOOTYZPceJxBV) | Canonical root for Kamdar files. Keep retrieval and new company files inside this folder unless explicitly approved otherwise. |
| Notion | Daily and Weekly automations via `ntn` | [Eval Projects](https://app.notion.com/p/069e3aefb9b74ec4af7406e1be2de51b) · [Eval Reports](https://app.notion.com/p/311fe58301fe467aaf51a84bc49aa71d) · [Eval SOPs](https://app.notion.com/p/55a995b1f2104731994582157b8163ba) | During evaluation, Projects and Work are bounded sources and Reports are an optional Final-report copy. Local Employee/SOP/Decision/Issue Memory is canonical; no intermediary memory is written to the eval databases unless a private artifact-sync destination is explicitly configured. Do not read/write the production Kamdar root. |
| Workspace | installed entity and skill templates | `workspace/templates/` and `workspace/skills/pm-*/templates/` | Runtime-readable artifact contracts installed from KamdarAI. Provider definitions remain in `apps/installer/providers/`. Automations read cadence-owned templates from their skill package and shared entity shapes from `workspace/templates/`. |

## Communications

These choices authorize a message job, not credentials. Hermes owns the private
app connection and exact destination. Automatic delivery additionally requires
a current setup receipt proving the exact destination was received by the named
owner.

<!-- hermes:managed communications -->
| Message | App | Send to | Behavior |
| --- | --- | --- | --- |
<!-- /hermes:managed communications -->

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Telegram | Hermes native messaging skill or MCP | Profile-private exact target from a confirmed setup test | The workspace stores the named owner and behavior; the private profile owns credentials, target IDs, and current delivery proof. |

No owner messages are enabled by default. If configured for drafts, drafts are
written to the current private `weeks/<week>/outbound/` directory and stay
unsent until the owner explicitly approves them through the configured native
messaging integration. Employee
progress and documentation questions default to comments on the exact linked
Work item. A separately configured employee-follow-up route overrides that
default; Hermes never infers a recipient or falls back to a generic channel.

## Isolated-eval delivery map

| Person `Contact endpoint` | Direct command | Actual destination |
| --- | --- | --- |
| `operator_primary_email` or `operator_secondary_email` | `gws gmail users messages send` | `kenji@znrknd.com` only |
| `telegram` | `hermes send --to telegram --json` during an explicit connection test only | Hermes-configured operator-owned Telegram target only |

The Daily and Weekly automations use this map directly. They do not call a
generic message dispatcher or fallback channel. Every test delivery must retain
the fictional intended Person in its subject or first line.

## Decisions

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Local workspace | Weekly automation | `memory/decisions/` | Canonical source-backed Decision Memory. Preserve source Work/Report links and never invent rationale. A configured private long-term-memory destination may receive a one-way copy after local read-back. |

## Notion mention and comment policy

- A Notion API mention requires a Notion `user_id`; an email address alone cannot be resolved or mentioned through the API.
- A guest can be mentioned only after they are already a guest of the connected workspace and their Notion user ID is known.
- Do not invite guests, create Notion users, or post comments automatically.
- Production internal comments are **proposal-only**. In an explicit
  `isolated-eval` run, the installed template map may apply one exact comment to
  the named Eval Work record only after its source, template, verified mention,
  action key, and receipt checks pass. If a source or required template cannot
  be resolved, return `unmapped_template`; never guess a recipient or fall back
  to a production record.

## Intended manager memory model

The manager's reviewed target hierarchy is:

```text
canonical Projects + Work Items + People
  -> one validated platform-neutral Daily result
  -> native schema-guided application
  -> private weeks/<week>/project-memory/ short-term memory
  -> frozen all-Project weekly input
  -> finalized local Project reports
  -> Area rollup (derived template)
  -> Company rollup (derived template)
  -> local Employee / Decision / Issue / SOP long-term memory
  -> optional one-way copies to configured private destinations
```

Each Project Memory file preserves exact progress, blocker,
documentation quality, next action, owner, dates, native source URLs, and any
relevant embedded Meeting evidence. When a plan exists it also preserves planned
versus actual hours, schedule variance, estimated versus actual cost in MYR, the
calculation basis, and a source-backed explanation of the problem. Unknown causes
stay explicitly `unconfirmed`; the manager must not convert a hypothesis into a
fact.

A stale or overdue Work Item produces one deduplicated progress-comment action
on the exact Work item when that route is authorized. The request asks
for the current state, blocker owner, root-cause evidence, revised commitment,
and effort variance. Reports summarize and link; they do not replace canonical
Project or Work source records. The isolated evaluation databases remain proof
fixtures; they are not the target private-state architecture.

The offline local lifecycle is implemented and verified. Production provider
writes remain gated by private destination configuration, authentication,
permissions, and explicit authority.

## Template and meeting-block routing

- Shared entity templates originate in KamdarAI `templates/`; cadence-owned
  templates originate inside each PM skill. Runtime copies are installed only
  through `apps/installer/workspace.py`.
- Projects use `project.md`; ordinary Work uses `task.md`; value opportunities
  use `feature.md`; issue-like Work uses `issue.md`; embedded Meetings use
  `meeting.md`; Decisions use `decision.md`; and employee procedures use
  `sop.md`. Private Person and SOP projections reuse those shared entity
  templates. Project Memory, messages, and reports use the templates inside
  their owning PM skill.
- A modified Task must be fetched as a complete page before Daily extraction.
  Inspect embedded Meeting blocks and `Meeting notes and updates`; do not depend
  on a missing database `Type` property to discover meeting evidence.
- If the Notion representation cannot identify the block content safely, return
  `meeting_block_parse_gap` and preserve the page URL for review.

## Operating guidance

- Use `Asia/Kuala_Lumpur` for time-bounded Kamdar automations.
- Treat the Kamdar AI Drive folder as the canonical root for company files.
- Treat `kenji@znrknd.com` as the only currently authorized Gmail read/send identity and the only email test sink.
- Use the configured `gws` account for this profile. Before a Gmail send, verify the account with a bounded `gws gmail users getProfile` call and inspect `gws schema gmail.users.messages.send`; never expose its credential material.
- Links prove reachability, not authority. `isolated-eval` is the sole source of
  eval write authority and must name the dated namespace; extending production
  scope still needs a separate owner authorization.
- The isolated eval links above are the active Daily/Weekly sources for this
  deployment. They grant no authority over production Kamdar records.

## Boundaries

- Never store credentials, tokens, passwords, private keys, or transient connection health in the live context.
- `frozen` performs no email, Drive, or Notion write. `isolated-eval` may apply
  only reviewed effects inside the dated eval root with a redacted
  receipt and idempotency proof. Production email, calendar, Drive, or Notion
  writes remain separately authorized.
- Do not use the general Notion People CRM; the isolated Eval People database is the only configured directory.
- Do not infer employee abilities, work email addresses, departments, or guest/mention mappings from names alone.
- Automations are maintained as Markdown in `automations/`; `isolated-eval` is
  the current maximum authority for the dated eval only, while production
  remains proposal-only and unscheduled.
