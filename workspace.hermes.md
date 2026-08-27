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
| Notion | Daily and Weekly automations via `ntn` | [Operated Daily–Weekly eval workspace](https://app.notion.com/p/EVAL-Kamdar-Company-OS-operated-Daily-and-Weekly-2026-08-26-3c8d43a2394281ebbf3bcc96103b30a1) → [Projects](https://app.notion.com/p/069e3aefb9b74ec4af7406e1be2de51b) · [Work items](https://app.notion.com/p/884c39fd534940be9f5f885b448cbcf0) | These isolated databases are the active evaluation sources. Projects are canonical manager memory; Work contains the seeded Tasks and Meetings used by the Daily and Weekly automations. Fetch each selected page in full. Production Kamdar records are outside this route. |

## Daily source catalog

The Daily automation names these keys; it does not repeat their URLs, authority,
or query rules. Each run records the actual source link, scope, fetch result,
and gap in `daily-context-diff.json`.

| Source key | Configured source | Default collection | Boundary |
| --- | --- | --- | --- |
| `notion.projects` | [Projects](https://app.notion.com/p/069e3aefb9b74ec4af7406e1be2de51b) | Active seeded Projects related to selected Work | Read the Project's `Project knowledge` and `This week's attention` sections. |
| `notion.work_items_this_week` | [Work items](https://app.notion.com/p/884c39fd534940be9f5f885b448cbcf0) | Linked open or changed Work for Project progress, plus Work where `Status = Done` and `AI review != Processed` for documentation review | Fetch each selected page in full. Do not reload unchanged Done Work whose AI review is Processed. |
| `notion.embedded_meetings` | Full selected Work pages | Meeting blocks and `Meeting notes and updates` found in selected Work | This is not a second database query. |
| `notion.people` | [People](https://app.notion.com/p/8f796be4a629420f9148105da2cb8221) | Only seeded people referenced by selected Projects or Work | Use contact preferences for routing decisions; sending remains proposal-only unless a run explicitly authorizes it. |
| `gmail.kamdar` | `gws gmail` as `kenji@znrknd.com` | Operator-owned test inbox | In `isolated-eval`, `operator_primary_email` and `operator_secondary_email` both resolve only to this test inbox. Use it for a bounded send/read-back, never for recipient discovery. |
| `drive.kamdar` | [Kamdar AI folder](https://drive.google.com/drive/folders/1QQ-bEjBeMwhB9AHEEJtiOOTYZPceJxBV) | Disabled unless a run explicitly enables a bounded file query | Retrieval only; no file creation or publishing. |

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
| Notion | Daily and Weekly automations via `ntn` | [Eval Projects](https://app.notion.com/p/069e3aefb9b74ec4af7406e1be2de51b) · [Eval Reports](https://app.notion.com/p/311fe58301fe467aaf51a84bc49aa71d) · [Eval SOPs](https://app.notion.com/p/55a995b1f2104731994582157b8163ba) | During evaluation, Project pages hold canonical project knowledge, Reports stage Daily observations and finalized rollups, SOPs hold canonical employee workflow baselines, and material Problems remain Issue records in Work linked to the affected SOP step. Do not read or write the production Kamdar root. |
| Workspace | installed `templates/` folder | `workspace/templates/{project,person,task,feature,issue,meeting,decision,skill,sop,weekly-report,area-operating-rollup,company-operating-rollup}.md` | Runtime-readable template contracts installed from KamdarAI. `skill.md` is software-only; employee workflow baselines use `sop.md`. The skill resolves template ID/version here; it never relies on a profile-local copy. |

## Communications

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Telegram eval sink | `kamdar send --to telegram --json` | Hermes-configured operator-owned home target | Operated eval messages include the intended Person and are receipted as `delivered_to_eval_sink`—never as employee delivery. |
| Gmail eval sink | `gws gmail users messages send` | `kenji@znrknd.com` | `operator_primary_email` and `operator_secondary_email` resolve only to this operator-owned inbox. Capture the returned Gmail message/thread identifier in the run receipt. |

## Isolated-eval delivery map

| Person `Contact endpoint` | Direct command | Actual destination |
| --- | --- | --- |
| `operator_primary_email` or `operator_secondary_email` | `gws gmail users messages send` | `kenji@znrknd.com` only |
| `telegram` | `kamdar send --to telegram --json` | Hermes-configured operator-owned Telegram target only |

The Daily and Weekly automations use this map directly. They do not call a
generic message dispatcher or fallback channel. Every test delivery must retain
the fictional intended Person in its subject or first line.

## Decisions

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Notion | Daily and Weekly automations via `ntn` | [Eval Decisions](https://app.notion.com/p/f4f78dbab22b423fab1e4d0fc8bd5787) | Promote source-backed decisions from the current Weekly Draft into this isolated database. Preserve the source Work or Report link and never invent rationale. |

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
  -> in-place Daily Project memory and proprietary knowledge patch + linked Task proposals
  -> Weekly Project report (canonical weekly-report template)
  -> Area rollup (derived template)
  -> Company rollup (derived template)
  -> selective Decisions / Problems / SOPs promotion
```

Each Work Item memory entry preserves exact progress, blocker, documentation
quality, next action, owner, dates, native source URLs, and any embedded Meeting
blocks. When a plan exists it also preserves planned versus actual hours,
schedule variance, estimated versus actual cost in MYR, the calculation basis,
and a source-backed explanation of the problem. Unknown causes stay explicitly
`unconfirmed`; the manager must not convert a hypothesis into a fact.

A stale or overdue Work Item produces one deduplicated progress-comment proposal
on the source record before any off-platform chase. The comment asks for the
current state, blocker owner, root-cause evidence, revised commitment, and effort
variance. Reports summarize and link; they do not replace canonical Project or
Work Item records. The isolated evaluation workspace provides Projects, Work
Items, People, Decisions, SOPs, Reports, and Automation artifacts as separate
databases.

## Template and meeting-block routing

- The source template registry is KamdarAI `templates/`; the runtime copy is
  `workspace/templates/`, installed only through `setup-kamdar-workspace`.
- Projects use `project.md`; ordinary Work uses `task.md`; value opportunities
  use `feature.md`; issue-like Work uses `issue.md`; embedded Meetings use
  `meeting.md`; Decisions use `decision.md`; employee procedures use `sop.md`;
  Farplane capability cards use `skill.md`; Reports use their corresponding
  report templates.
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
