---
name: daily-knowledge-capture
description: "Capture source-linked Decisions and SOP candidates from one Daily context directly into the current local Weekly Draft."
tier: 3
group: operations
source: local
capability:
  kind: pipeline
  consumes: [kamdar-daily-context-diff, kamdar-current-weekly-draft]
  produces: [kamdar-current-weekly-draft]
template_uses:
  skill-template: "0.6.1"
allowed-tools: Read, Write, Grep, Glob
---

# Daily Knowledge Capture

## Context

Run fourth after the Daily collector writes complete Work and embedded Meeting
snapshots. It is the direct owner of the current Markdown Weekly Draft's
`Decisions` and `SOPs` anchors. The Draft is the weekly accumulation record;
there is no contribution file, provider adapter, or review queue in between.

Use only the supplied context, supplied current Draft, the canonical Draft
template, and this package's golden. Do not create Docs/Research records,
promote knowledge, write Project memory, or own PM/control anchors.

## Skill Signature

```text
capture_daily_knowledge(context_diff_path, current_weekly_draft_path)
  -> current_weekly_draft_path + applied | duplicate | conflict |
     no_finding | configuration_gap
reads: one Daily context, one existing non-final local Draft, canonical template, local golden
does: extracts grounded Decisions/SOPs and directly source-key upserts them into owned Draft anchors
writes: current_weekly_draft_path only
returns: direct Draft update outcome and changed/duplicate/conflict source keys
```

<!-- BEGIN FARPLANE_IMPORTANT_CHECKLIST -->
## Todo List

- [ ] **N1 — Bind one valid Daily context and current Draft.**
  `context + Draft path -> source map + exact Draft week/anchors | configuration_gap`

  Rule: Require complete source IDs, source URLs, Work/Meeting evidence, and
  one local non-final Draft with all five anchor markers. Missing Draft, final
  state, wrong week, unread evidence, or missing Project relation is a named
  gap. Do not search Notion or infer another Draft.

  Assert:
  - Every candidate source ID exists in the supplied context.
  - No provider handle, provider read, or Draft identity guessed from memory enters the result.

- [ ] **N2 — Admit only concrete Decisions.**
  `choice + alternative/tradeoff + source -> Decision entry | no_finding`

  Rule: Add a `decision:<source_id>` entry only when evidence states a concrete
  choice and its relevant alternative or tradeoff. Preserve missing authority
  as a gap; a recommendation, question, or status line is not a Decision.

  Assert:
  - The entry states choice, authority state, evidence, and the source key.
  - It targets only `## Decisions`.

- [ ] **N3 — Admit only reusable SOP candidates.**
  `method + trigger/output + repeat evidence -> SOP entry | no_finding`

  Rule: Add a `sop:<source_id>` entry only for a repeatable method with its
  trigger or output and recurrence evidence. If repeat use, owner, or proof is
  absent, preserve the gap and mark it Proposed; never turn a one-off fix into
  an SOP.

  Assert:
  - The entry states trigger/output, proof condition, evidence, and source key.
  - It targets only `## SOPs`; proprietary Project facts remain on the Project page.

- [ ] **N4 — Edit the supplied Draft directly and atomically.**
  `eligible entries + current Draft -> applied | duplicate | conflict`

  Rule: Insert exact source-keyed Markdown under the owned anchor markers in
  stable key order. An equal existing key is `duplicate`; a material mismatch
  is `conflict` and leaves the whole file unchanged. This local Markdown write
  is part of the pipeline, not an integration call.

  Assert:
  - The skill changes neither PM attention nor control-owned entries in Problems and inefficiencies, nor another file.
  - One conflict prevents a partial direct-Draft update.

- [ ] **N5 — Return the real in-place result.**
  `Draft update outcome -> path + source keys + gaps`

  Rule: Report the supplied Draft path and applied/duplicate/conflict keys.
  A staged candidate is not promoted; Weekly finalization alone verifies and
  promotes reviewed content.

  Assert:
  - No temporary contribution Markdown, receipt, provider application, or promotion claim is created.
  - `no_finding` leaves the Draft unchanged.
<!-- END FARPLANE_IMPORTANT_CHECKLIST -->

## Templates

- Current Draft contract: [current-weekly-draft.md](../../automations/templates/current-weekly-draft.md).
- Collector input: [Daily context](../../automations/templates/daily-context-diff.json) and
  [sanitized golden](../../automations/examples/golden/daily-context-diff-2026-08-24.json).
- Golden direct result: [updated Draft](examples/golden/current-weekly-draft-after-knowledge-2026-08-24.md).
- Boundary case: [missing Draft](examples/blocked/current-weekly-draft-missing.md).

## Gotchas

- Do not make a provider call, an intermediate diff, a Docs/Research record, or a Decision/SOP promotion.
- Do not write a generic idea, raw transcript, PM finding, cost figure, or Project fact into the Draft.
- Do not overwrite an existing source key; return the conflict and its repair condition.

## Output

The existing `kamdar-current-weekly-draft` file at the supplied path, directly
updated only in `Decisions` and `SOPs`, plus its truthful local outcome. No
intermediate artifact is produced.
