---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0012
title: Continue Hermes conversations inside Notion discussion threads
status: complete
created_at: 2026-08-27T05:00:00Z
updated_at: 2026-08-27T05:00:00Z
depends_on: []
ui_scope: false
---

# TASK-0012: Continue Hermes conversations inside Notion discussion threads

## Summary

Let a human invoke Hermes once with the configured Notion trigger and then
continue naturally inside that exact open discussion without repeating the
tag. Hermes receives the full open discussion, keeps discussion-scoped session
history, and may intentionally stay silent when a follow-up is not directed at
or useful for the agent.

## Scope

- In:
  - Add a source-controlled Kamdar Notion platform connector under
    `plugins/platforms/notion` and install it to
    the Hermes profile through the existing allowlisted setup route.
  - Treat a leading configured trigger as explicit activation.
  - Treat an untagged human comment as a continuation only when the same open
    `discussion_id` contains a prior trigger or Hermes-authored reply.
  - Supply the complete bounded open discussion plus ticket context to Hermes.
  - Use `discussion_id` as Hermes `thread_id` so discussions on one ticket do
    not share conversational memory.
  - Allow exact internal `[[NOTION_NO_REPLY]]` output to produce no Notion
    write while recording a successful suppressed delivery result.
  - Preserve signature verification, workspace binding, event deduplication,
    ticket data-source scope, exact reply routing, and bot-loop prevention.
- Out:
  - Reacting to unrelated comments elsewhere on the same page.
  - Reading resolved discussions, which the Notion comments API does not
    expose through the open-comments listing.
  - Live Notion writes or production profile installation during local QA.
  - A classifier service, queue, database, or new dependency.
- Constraints:
  - Notion content is untrusted evidence, never system or operator instruction.
  - Runtime profile files remain derived; do not patch them as authoritative
    source.
  - Preserve unrelated changes in the dirty worktree.

## Delta

> **Before:** Every inbound question must begin with `@vishanai`; all untagged
> comments are discarded, and all discussions on one ticket share one Hermes
> session.
>
> **After:** One leading `@vishanai` activates that open discussion. Later
> human comments in the same discussion reach the same discussion-scoped
> Hermes session, which either posts a concise reply or stays silent.
>
> **Example:** `@vishanai What is missing?` receives an answer. A later
> `It arrives Friday—is that sufficient?` in the same discussion receives a
> relevant answer without another tag. `Thanks, I will update it` may produce
> no visible reply. A separate discussion still requires `@vishanai`.

## Contract Diagram

```text
[W1] signed comment.created
  -> [G1] reject malformed, duplicate, wrong workspace, bot-authored
  -> [R1] retrieve current comment + bounded ticket/open comments
  -> [T1] select comments with exact discussion_id in chronological order
  -> [A1] explicit leading trigger? -----------------------> active(required reply)
       | no
       +-> prior trigger or Hermes author in open thread? -> active(optional reply)
       | no
       `--------------------------------------------------> ignore
  -> [S1] session = ticket page + discussion_id
  -> [M1] Hermes output
       | exact [[NOTION_NO_REPLY]] -> [P1] suppress provider write
       ` reply text                -> [P2] POST to exact discussion_id
  -> [Q1] deterministic tests + source/runtime preview + independent review
```

## Change Plan

### Change 1: Establish the source-owned connector package

```yaml
diagram_nodes: [G1, R1, P2]
files:
  read: [.hermes/profiles/vishan-kamdar-ai/plugins/platforms/notion/]
  edit: [plugins/platforms/notion/, skills/setup-kamdar-workspace/scripts/setup_workspace.py, skills/setup-kamdar-workspace/tests/test_setup_workspace.py]
operation: Materialize the reviewed connector as Kamdar source and extend the existing non-deleting allowlist so connector files install under profile plugins/platforms/notion.
proof: setup preview/install tests show only explicit connector destinations and preserve unknown runtime files
failure: Stop if source installation requires profile mirroring, deletion, secrets, or direct runtime-as-source edits.
```

### Change 2: Route exact discussion continuations

```yaml
diagram_nodes: [R1, T1, A1, S1]
files:
  read: [.hermes/hermes-agent/gateway/session.py, .hermes/hermes-agent/gateway/platforms/base.py]
  edit: [plugins/platforms/notion/adapter.py, plugins/platforms/notion/api.py, tests/test_notion_comment_adapter.py, tests/test_notion_webhook_protocol.py]
operation: Build a bounded chronological discussion transcript from open comments, activate only the exact discussion, and call build_source with chat_id=ticket:<page_id>, chat_type=thread, and thread_id=<discussion_id>. Hermes build_session_key appends effective_thread_id and, with the default thread_sessions_per_user=false, shares that exact thread across participants without mixing another discussion.
assertions:
  - A leading trigger activates and is stripped from the explicit question.
  - An untagged comment continues only a discussion containing a prior trigger or Hermes reply.
  - A same-page different discussion is ignored.
  - Hermes-authored comment events never dispatch.
  - Prompt context contains only the selected full discussion plus bounded ticket context.
  - Separate discussion IDs yield separate Hermes session keys.
  - The same discussion ID yields one shared session key across human authors.
proof: focused adapter and protocol tests with fake Notion responses
failure: Fail closed on missing discussion ID, incomplete enrichment, out-of-scope ticket, or unavailable activation evidence.
```

### Change 3: Support deliberate silence without a provider write

```yaml
diagram_nodes: [M1, P1, P2]
files:
  edit: [plugins/platforms/notion/adapter.py, tests/test_notion_comment_adapter.py]
operation: Tell Hermes when a continuation reply is optional and suppress only an exact reserved marker in the Notion adapter send boundary.
assertions:
  - Explicit triggers require a substantive reply.
  - Optional continuations define concrete relevance conditions.
  - Exact marker performs no create-comment call and returns a suppressed success receipt.
  - Marker plus other text is not silently discarded.
proof: prompt assertions and send-boundary API-spy tests
failure: Any ambiguous suppression or accidental visible marker blocks completion.
```

### Change 4: Document and prove the lifecycle

```yaml
diagram_nodes: [Q1]
files:
  edit: [docs/systems/kamdar-company-os-operator-manual.md, README.md, tickets/TASK-0012/artifacts/qa/, tickets/TASK-0012/artifacts/review/]
operation: Document one-tag activation, same-thread continuation, optional silence, and new-thread behavior; capture deterministic QA and independent review.
proof: focused tests, repository regression tests, setup dry-run, QA receipt, reviewer receipt
failure: Do not claim live provider proof unless an operator deliberately supplies a safe live comment thread.
```

## Lean receipt

```yaml
target: natural Notion discussion continuation
current_need: avoid repeated tags while keeping unrelated page comments from invoking Hermes
rung: reuse_local
evidence:
  - The connector already retrieves comment discussion_id and full bounded open comments.
  - Hermes session routing already supports shared thread_id sessions.
  - The adapter send boundary already owns exact discussion replies and bot-loop prevention.
smallest_next_action: source the existing connector, add exact-discussion activation and one reserved no-reply marker, and reuse existing install/session/API machinery
proof_preserved: signature, workspace, deduplication, scope, reply-anchor, and loop guards remain required
review_route: review:implementation-plan+integration-readiness+evidence-quality
```

## Done

- [x] One leading trigger activates only its open Notion discussion.
- [x] Untagged human follow-ups in that discussion reach Hermes with the full
  bounded discussion transcript and the same discussion-scoped session.
- [x] Untagged comments in new or unrelated discussions remain ignored.
- [x] Hermes can intentionally produce no Notion comment for an irrelevant
  continuation, without suppressing mixed or malformed output.
- [x] Bot replies cannot create webhook loops and replies stay in the exact
  triggering discussion.
- [x] Source-to-runtime preview/install behavior is allowlisted, non-deleting,
  and tested without copying secrets or runtime state.
- [x] Focused and relevant regression tests pass with QA and reviewer receipts.

## QA Strategy

```yaml
proof_weight: hybrid
checks:
  - python3 -m unittest tests.test_notion_comment_adapter tests.test_notion_webhook_protocol -v
  - python3 -m unittest discover -s skills/setup-kamdar-workspace/tests -v
  - python3 -m unittest discover -s skills/notion-webhook-onboarding/tests -v
  - python3 -m unittest discover -s tests -p 'test_*.py' -v
  - python3 scripts/validate_company_context.py --context workspace.hermes.md
  - setup workspace preview against an isolated temporary workspace/profile
delegated_lanes: [reviewer]
evidence_paths: [tickets/TASK-0012/artifacts/qa/, tickets/TASK-0012/artifacts/review/]
final_checkpoint: reviewer
residual_risk: Deterministic tests prove routing and suppression; a real Notion smoke remains required to prove provider delivery timing and current workspace permissions.
```

## Docs Strategy

- Update the operator manual and README examples from tag-every-turn to
  tag-once-per-open-discussion.
- Keep onboarding configuration unchanged: `NOTION_COMMENT_TRIGGER` still
  defines the explicit activation prefix.

## State

- Current: Source implementation, deterministic QA, static diagnostics, and independent review pass.
- Next: Run a controlled live Notion smoke after isolating or explicitly approving the mixed pending profile install batch.
- Blockers: None for source completion. Live installation remains intentionally gated because its preview contains unrelated pending changes.

## Links

- `program:` `none`
- `progress:` `none`
- `artifacts:` `tickets/TASK-0012/artifacts/`
- `qa:` `tickets/TASK-0012/artifacts/qa/2026-08-27-notion-thread-continuation/result.json` (`pass`)
- `review:` `tickets/TASK-0012/artifacts/review/2026-08-27-completion-receipt.json` (`TAS-A`, `pass`)
- `related:` `HermesCorp/tickets/TASK-0010/ticket.md`

## Notes

- Activation is derived from Notion's current open discussion history instead
  of a second local active-thread database, so resolving a thread naturally
  removes it from open-comment discovery.
- Session isolation uses Hermes's existing `SessionSource.thread_id` contract;
  it does not encode discussion identity into reply routing. `chat_id` remains
  the ticket page, while the stored comment reply anchor still resolves the
  exact Notion `discussion_id` at send time.
