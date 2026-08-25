---
name: kamdar-company-os
description: "Run a template-routed Kamdar Daily or Weekly review from the real company sources, while preserving Projects, Work Items, and promotion gates."
tier: 3
group: operations
source: local
qa_checklist: qa_checklist.md
---

# Kamdar Company OS

Use this skill for Kamdar's Daily Operating Update and Weekly Operating Review.
The runtime workspace is the live source map; `workspace/templates/` is the
installed template contract. Do not create a parallel template copy in the
profile skill package or infer template requirements from memory.

## Skill Signature

```text
run_kamdar_company_os(cadence, local_day_or_week, write_policy = proposal_only)
  -> record_diffs + deliberate_files + integration_plans + receipts + source_gaps
reads: .hermes.md, automations/, templates/, configured Kamdar Notion sources
writes: ignored local run artifacts; external mutations only after a separate approval gate
```

## Todo List

1. Read `.hermes.md`, the selected file in `automations/`, and
   `templates/README.md` from the current workspace. Resolve
   every source, template filename/version, record type, and write policy. Stop
   with `configuration_gap` when any required routing is unresolved.
2. For Daily, collect the bounded real-source window once into
   `daily-context-diff-YYYY-MM-DD.json`. Resolve source keys through the
   workspace Daily source catalog, then record each source's link, scope,
   fetch state, IDs, timestamps, and gap in its source manifest—never a summary
   or provider handle. For every changed Work item, fetch the complete page,
   including embedded Meeting blocks and `Meeting notes and updates`, even when
   the database has no `Type` property.
3. Call [`daily-project-memory`](../daily-project-memory/SKILL.md),
   [`daily-documentation-quality`](../daily-documentation-quality/SKILL.md),
   [`daily-project-control`](../daily-project-control/SKILL.md), and
   [`daily-knowledge-capture`](../daily-knowledge-capture/SKILL.md) with the
   one context artifact. Knowledge Capture writes Decisions/SOPs and Project
   Control writes PM/Risk/Cost directly into their disjoint anchors of the
   supplied current Weekly Draft. None performs a second source scan. A missing
   template, source, Draft, or unparseable Meeting block is a named gap, never
   an invented fact.
4. `daily-project-memory` owns its guarded
   [`apply-project-diffs`](../apply-project-diffs/SKILL.md) child call.
   Documentation quality and Project control each own their nested
   [`dispatch-employee-messages`](../dispatch-employee-messages/SKILL.md) call.
   Prepare makes no channel call; send invokes only the recipient's named
   preferred-channel skill. Healthy work receives no chase; a missing route or
   disabled channel skill remains a gap rather than a guess.
5. For Weekly, read the completed current Draft and a supplied local Project
   routing snapshot through
   [`weekly-report-finalization`](../weekly-report-finalization/SKILL.md).
   Finalization does not write the Draft or re-mine Daily Work/Meeting evidence.
   It renders Project reports, then Department and Company rollups from report
   references, and prepares reviewed candidate promotion. Final reports stay
   immutable; canonical Project and Work Item records remain links.
6. Evaluate the run against `evals/evals.json`: group record changes, deliberate
   files, behavior, and downstream applications by `feature_id`. Files first
   name a template/version; record proof exposes before/after field changes.
   Return rendered assertions, receipts, and exact gaps.
7. Keep proposal-only mode unless the caller has explicit scope, template,
   record-location, comment, delivery, and schedule authority. Never convert a
   read or mock receipt into a provider write.

## Notion CLI contract

Use the installed `ntn` CLI literally; do not invent resource subcommands.

```text
database URL -> database UUID -> ntn datasources resolve <database-uuid> --json
data source UUID -> ntn datasources query <data-source-uuid> --json
page UUID -> ntn pages get <page-uuid> --json
page metadata -> ntn api v1/pages/<page-uuid>
page property update -> ntn api -X PATCH v1/pages/<page-uuid> -d @payload.json
page body replacement -> ntn pages edit <page-uuid> < replacement.md
comment create -> ntn api v1/comments -d @payload.json
```

Query only the database IDs configured in `.hermes.md`, filter the returned
small eval collection locally, and fetch selected pages in full. Before a
write, read back the exact page and compare the expected current value. Put
large Markdown and JSON payloads in ignored run files rather than shell-quoted
arguments. After a write, read the same page back and record its provider URL,
payload hash, and idempotency key. `ntn --help`, `ntn datasources --help`,
`ntn pages --help`, and `ntn api --help` are the only syntax discovery path.

## Gotchas

- A hidden Meeting block inside a ticket is still source evidence. Read the full
  page after a modified-record query; do not rely on the database properties.
- A Project page is not a task list or a child-memory folder. Keep durable,
  concise facts in `Project knowledge`, weekly actions in `This week's
  attention`, and commitments as linked Task records.
- `task.md`, `feature.md`, `issue.md`, and `meeting.md` are distinct contracts:
  delivery work, a bounded value opportunity, a problem to resolve, and a
  discussion whose commitments are captured. Never flatten an embedded Meeting
  block into a generic Task.
- Department and Company rollups aggregate reports, never raw tasks or meeting
  text.
- Treat unknown Notion block serialization as a `meeting_block_parse_gap`, not
  proof that no meeting occurred.

## Proof

- Validate the template registry, workspace installation preview, and
  source-controlled `KamdarAI/evals/evals.json` schema before use. That eval
  contract is intentionally not copied into the installed profile skill: the
  runtime reads templates and produces receipts; the source repository owns
  assertions and proof.
- Run the frozen Daily case before the Weekly case; assert no provider writes in
  proposal-only mode. Use the live adapter only as a read-only preflight until
  a separately recorded operated-send approval authorizes an exact route,
  payload hash, and idempotency key.

## Output

Return the evidence window, source/template map, selected records, Project and
Work Item deltas, meeting extraction, follow-up/promotion proposals, generated
files, rendered assertion verdicts, source/configuration gaps, and write mode.
