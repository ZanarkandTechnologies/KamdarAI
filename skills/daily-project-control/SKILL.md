---
name: daily-project-control
description: "Detect grounded stale or blocked work, prepare approved outreach, and update the current local Weekly Draft's control anchors directly."
tier: 3
group: operations
source: local
capability:
  kind: pipeline
  consumes: [kamdar-daily-context-diff, kamdar-current-weekly-draft]
  produces: [kamdar-project-control-plan, kamdar-current-weekly-draft, kamdar-channel-dispatch-result]
template_uses:
  skill-template: "0.6.1"
allowed-tools: Read, Write, Grep, Glob
---

# Daily Project Control

## Context

Run after the Daily collector writes its one context diff. This pipeline owns
stale/blocked detection, evidence-bound cost context, accountable-owner
outreach, and direct local updates to the current Weekly Draft's `PM attention`
and `Problems and inefficiencies` anchors.

The Weekly Draft is a supplied Markdown file, not a provider edge. The
dispatcher remains the only communication boundary. Use no provider read to
fill a missing Project, Work, People, or Draft snapshot.

## Skill Signature

```text
run_daily_project_control(context_diff_path, current_weekly_draft_path,
                          dispatch_mode = prepare, output_path)
  -> project-control-plan.json + updated current Draft + channel dispatch result |
     no_finding | configuration_gap | conflict
reads: one Daily context, current non-final local Draft, local plan/golden, People route facts
does: detects grounded control findings, source-key updates owned Draft anchors, groups outreach
writes: output_path, current_weekly_draft_path, and dispatcher result; only selected channel owns sends
returns: plan, direct Draft outcome, and prepared/blocked/duplicate dispatch state
```

<!-- BEGIN FARPLANE_IMPORTANT_CHECKLIST -->
## Todo List

- [ ] **N1 — Bind one complete context and current Draft.**
  `context + Draft + People snapshots -> usable control input | configuration_gap`

  Rule: Require source IDs, affected Project/Work identity, current state, and
  one non-final local Draft with all four markers. A missing Work, Project,
  People route, or Draft is a named gap; do not fetch or invent it.

  Assert:
  - Every finding cites input source IDs and the exact Draft path.
  - No provider handle, provider read, or inferred Draft identity enters the plan.

- [ ] **N2 — Detect stale or blocked work from dated facts.**
  `Work state + dated evidence -> material control finding + duration basis | no_finding`

  Rule: Flag only an overdue commitment, explicit blocker, or threshold breach.
  Calculate duration from named timestamps in the local timezone. A status label
  alone never proves staleness; unknown cause/duration/due remains explicit.

  Assert:
  - Each finding preserves Work, Project, status, blocker, and calculation evidence.
  - Healthy work produces no chase or Draft entry.

- [ ] **N3 — Preserve cost and route uncertainty.**
  `finding + plan/actual + People route -> cost basis + grouped request | gap`

  Rule: Calculate variance only from recorded values; otherwise state unknown
  inputs. Resolve the accountable Project owner and only an approved preferred
  channel. A missing route is blocked, never a fallback.

  Assert:
  - Every number names currency, formula/basis, and source evidence.
  - No message is marked sent or given a fabricated receipt.

- [ ] **N4 — Update owned Draft anchors directly.**
  `material findings + current Draft -> applied | duplicate | conflict`

  Rule: Directly source-key upsert `pm_attention:<source_id>` and the
  `problem:`, `inefficiency:`, `risk:`, or `cost:` source entries only where
  supported. All problem-definition kinds share the `Problems and
  inefficiencies` anchor.
  Equal entries are duplicates; a material mismatch blocks the whole local
  batch. This is pipeline work, not a Weekly integration.

  Assert:
  - The pipeline cannot edit Decisions, SOPs, Project memory, or final reports.
  - A missing cost source omits the amount rather than inventing one.

- [ ] **N5 — Render the control plan and dispatch through the alias.**
  `findings + Draft outcome -> JSON plan + channel result`

  Rule: Render the local JSON plan with the direct-Draft outcome, source gaps,
  messages, and idempotency keys. Call
  [`dispatch-employee-messages`](../dispatch-employee-messages/SKILL.md) only
  with the grouped message proposals. `prepare` contacts nobody.

  Assert:
  - The plan is valid JSON and tells Draft application apart from message delivery.
  - Missing/disabled handlers are configuration gaps, never permission to send.
<!-- END FARPLANE_IMPORTANT_CHECKLIST -->

## Templates

- Runtime plan: [project-control-plan.json](templates/project-control-plan.json).
- Current Draft: [current-weekly-draft.md](../../automations/templates/current-weekly-draft.md).
- Golden normal plan: [2026-08-24 control plan](examples/golden/project-control-plan-2026-08-24.json).
- Blocked route: [unapproved route plan](examples/blocked/project-control-plan-unapproved-route.json).
- Collector fixture: [Daily context](../../automations/examples/golden/daily-context-diff-2026-08-24.json).

## Gotchas

- Do not scan a Project, Work Item, person, chat, or provider outside the context.
- Do not estimate cost, infer cause, or call healthy work stale.
- Do not create a Weekly diff, a contribution artifact, or another Draft; edit only the supplied current Draft.
- Do not send directly or select a fallback channel.

## Output

One valid `kamdar-project-control-plan` JSON at `output_path`, its truthful
direct current-Draft update outcome, and its channel-dispatch result. A
`no_finding`, `configuration_gap`, or `conflict` creates no provider effect.
