---
kind: review
ticket_id: TASK-0006
review_focus: plan
status: pass
overall_tas: TAS-A
created_at: 2026-08-21T21:36:00+08:00
updated_at: 2026-08-21T22:10:00+08:00
reviewer: Codex
---

# TASK-0006 plan review

## Verdict

TAS-A / pass. The repaired plan is implementation-ready, with provider sends
still gated by a separate future `operated-send` approval.

## Search scope

- `tickets/TASK-0006/ticket.md`
- `tickets/TASK-0006/ascii-prototype.md`
- `tickets/TASK-0006/cleanup-manifest.md`
- `evals/evals.json`
- `evals/filesystem/scripts/template-first-kamdar.mjs`
- `evals/filesystem/scripts/live-kamdar-poc.mjs`
- `evals/filesystem/tests/template-first-kamdar.test.mjs`
- `workspace.hermes.md`

Rubrics used: implementation-plan, integration-readiness, evidence-quality,
UI/buyer-story clarity, least-control-surface, private-route safety, cleanup
safety.

## Re-review result

The prior blockers are resolved:

- External-send authority is now a hard gate. Ticket approval permits source/UI
  implementation and read-only provider preflight only. Gmail, Drive, Telegram,
  and new Notion mutations require a later `operated-send` approval recorded in
  `progress.md` with provider, route key, payload hash, and idempotency key.
- The provider edge contract is explicit enough to implement and review:
  private route file, mode, route-key shape, allowed public fields, exact Google
  and Hermes command surfaces, preflight/apply signatures, statuses, receipt
  validation requirements, and raw-route rejection are named.
- The cleanup recommendation is exact and safe. `cleanup-manifest.md` pins v2,
  v3, and v4 page IDs, URLs, parent, observed databases, and
  `archive_allowed: false`; it authorizes no archive operation.

## Richer seed scope re-review

TAS-A / pass. The seed expansion is acceptable and does not change the plan
verdict.

Verified against `ticket.md`, `ascii-prototype.md`, and `seed-contract.md`:

- The supplied capture facts are stated correctly: 49 rendered rows, 39 named
  Projects, 10 unnamed/incomplete rows, 7 observed department labels, 0
  Assignees, 0 source URLs, and 0 fetched page bodies.
- Private capture data stays out of Git. The plan stores raw capture, compiled
  seed, operator contacts, Telegram chat IDs, and Notion user IDs only under
  private profile state; tracked artifacts get source hash, aggregate counts,
  sanitized cases, route keys, redacted labels, and hashes.
- The scorer and v4 workspace consume one compiled private seed, avoiding the
  previous frozen/live drift.
- Synthetic data is explicitly labelled as an overlay because the capture lacks
  Tasks, Meetings, People, Assignees, page bodies, contact routes, and operating
  history.
- Weekly reporting covers every observed department: 12 active Project reports
  roll into 7 department reports and one Company report; the Content/no-Project
  row remains a source-gap section rather than a fabricated Project.
- FEAT-0003 email proof is scoped to two grouped emails, each routed only to an
  operator-owned test inbox. Other employees remain `route_not_approved`.
- Notion mention proof requires a verified `notion_user_id`; plain `@Name`
  text cannot pass, and the current token's user-list `403 restricted_resource`
  is handled by specific-user/private-config preflight.
- FEAT-0008 Telegram proof requires one department section per observed
  department report and a matching Demo Owner route receipt.
- No external write, send, or archive is authorized by the plan. Ticket approval
  still permits only source/UI implementation and read-only preflight until a
  separate `operated-send` approval is recorded.

## Template/data-model/feature-proof redesign re-review

TAS-A / pass. The redesign is coherent and implementation-ready as a plan, with
the existing no-external-mutation gate still in force.

Verified against `ticket.md`, `ascii-prototype.md`, and
`data-model-gap-report.md`:

- Template scope is correctly narrowed: irrelevant `Outcome/Why` openings are
  removed from record/message templates, while automation docs may keep them.
- Work contracts split Task, Issue, and Meeting instead of forcing all Work
  shapes through `task.md`.
- FEAT-0001 moves Project memory onto the canonical Project record: zero
  `daily/projects/*.md` product files, zero Daily-memory child pages, and a
  before/after Project mutation receipt.
- FEAT-0007 keeps next-week planning on canonical Project/Work state: Project
  entries are patched, approved Meeting commitments create or reuse linked Work
  entries, and there are zero fake Project-plan Markdown files.
- Work, Decisions, Resources, Reports, and relevant Skills must use real Notion
  relation values to Projects. Matching Project names in rich text explicitly
  do not count.
- Project pages must expose filtered linked views of related Work, Decisions,
  Resources, and Reports; the plan forbids duplicating databases to simulate
  linked views.
- Scenario realism rejects placeholder labels such as `Project owner`,
  `Pilot owner`, `Updated by automation`, and `Inspect linked Work`.
- Stale-plus-incomplete Work receives one combined detailed tagged comment,
  while FEAT-0002 and FEAT-0003 assert their respective parts of that comment.
- Feature docs have a required structure: plain-language intro, Why, Trigger and
  inputs, ASCII Flow, State changes/artifacts, Downstream application, Failure
  modes, Proof contract, and Example.
- The eval resolves rendered feature meaning through existing `feature_id` →
  feature doc, drops duplicate registry title/summary copy, and adds the
  smallest new proof shape: structured `assertions.records`.

Official Notion grounding is adequate:

- Notion data source schemas support `relation` properties whose linked page
  values must belong to the referenced data source; page relation values are
  arrays of page IDs.
- Relation values require the related parent/source database to be shared with
  the connection.
- The Views API supports creating/listing database views and linked database
  views, but requires API version `2025-09-03` or later. The plan correctly
  requires either a supported API/version or app-created views that are then
  verified.

No implementation or external mutation was authorized by the redesign. The
ticket still states this planning pass created no Notion, Email, Drive, or
Telegram writes, and future Notion mutations/sends require a separate
`operated-send` approval.

## Remaining non-blocking risks

- The Google and Telegram command claims must be proven during implementation
  with read-only preflight before any send approval is requested.
- The scorer must validate receipt payload hashes and route hashes before the UI
  can show `SENT` or `APPLIED`; this is already in the plan and should be a
  hard implementation-review check.
- The private seed compiler must prove deterministic output from the capture
  hash and must fail if raw project names, operator contacts, Telegram IDs, or
  Notion user IDs appear in tracked outputs.
- Implementation review must verify the exact Notion API version/path used for
  linked views, or verify pre-created app views, before accepting the relational
  Project page claim.

## Next action

Start implementation on the buyer-led UI, feature copy, private seed compiler,
record-specific templates, structured record assertions, local relation/view
planning, read-only preflight, receipt validation, and cleanup manifest
integration. Do not run provider sends, create/update v4 Notion records or
schema, create new v4 People rows, or archive v2/v3 during default
implementation.
