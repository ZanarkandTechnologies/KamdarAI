---
ticket_id: TASK-0006
title: Make the Kamdar proof buyer-led and complete real delivery evidence
status: active
created_at: 2026-08-21T21:10:00+08:00
updated_at: 2026-08-22T12:20:00+08:00
owner: Codex
source_tickets:
  - TASK-0005
approval: operator-approved-implementation-and-operated-v4-eval-2026-08-22
---

# TASK-0006: Make the Kamdar proof buyer-led and complete real delivery evidence

## Summary

Turn the current technically complete showcase into a guided buyer story, then
replace hardcoded blocked integration receipts with bounded, real Email, Drive,
and Telegram execution against the existing v4 eval environment.

> **Before:** the page opens with assertion counts, raw `TASK-*` and `FEAT-*`
> identifiers, database inventories, templates, and dozens of proof drawers.
> The buyer must infer the business problem and cannot see an actually sent
> email or owner Telegram report. The live edge always blocks Google and
> Telegram without running a readiness check.
>
> **After:** the page leads with the operating problem, value, and one named
> fictional scenario; walks through four Daily and four Weekly outcomes in
> plain language; shows each record change or deliberate artifact beside its
> applied or sent result; and keeps IDs, assertions, templates, and traces in a collapsed audit
> layer. Email, Drive, and Telegram display provider success only from real,
> redacted receipts.
>
> **Example:** “Resolve Penang replenishment variance” is presented as delayed
> work, not `TASK-101`. The buyer sees the six-hour / MYR 720 overrun, the
> unconfirmed cause, the Notion progress bump, the exact follow-up Markdown,
> and a sent-email receipt. The weekly Company report then appears beside the
> owner’s sent Telegram receipt. Expanding “Audit evidence” reveals the stable
> IDs and assertion predicates.

## Scope

- `In:` buyer-first `/showcase`; clearer feature contracts; capture-derived
  Project catalog plus a declared scenario overlay; current v4 Notion
  environment; record-specific templates; flattened Project memory; real
  Project relations and linked views; private allowlisted owner routes; Google
  Drive/Gmail and Telegram readiness plus bounded execution; real redacted
  receipts; integration and visual assertions; explicit cleanup inventory.
- `Out:` a fifth Notion demo, production Kamdar writes, sending to real Kamdar
  staff, placing personal routes in Git, changing the Daily/Weekly feature
  model, activating schedules, or deleting old Notion roots without a separate
  explicit cleanup command.

## Delta

```text
buyer_proof(fixture, feature_contracts, generated_artifacts, provider_receipts)
  -> problem_story
     + daily_outcomes[4]
     + weekly_outcomes[4]
     + trust_and_delivery
     + collapsed_audit_evidence
```

## Decisions and operating boundaries

- The buyer journey is one 768px dark, square, Farplane-style story: problem →
  fixture → four Daily outcomes → four Weekly outcomes → trust → collapsed audit.
- `feature_id` resolves each assertion to one feature document; the document,
  not the eval registry, owns buyer-facing copy and ASCII Flow.
- Projects are canonical memory. Work, Decisions, Resources, Reports, and
  relevant Skills are real Project relations; matching names in text do not count.
- The supplied capture compiles privately to 39 Projects, 10 source gaps, seven
  department views, and a labelled overlay of People/Work/Meetings. v4 remains
  the only demo root; v2/v3 stay recoverable cleanup candidates.
- Private recipient data and Notion user IDs never enter Git. A stale and
  incomplete Work Item receives one detailed tagged comment, then Email; only
  the completed weekly Company report may go to the owner through Telegram.
- The operator explicitly authorized an operated run on 2026-08-22. It may
  mutate only the isolated v4 eval root and may send only through the two
  operator-owned email routes and the private Demo Owner Telegram route. The
  run must still write a provider, route-key, payload-hash, and idempotency-key
  receipt before the dossier presents any action as applied or sent.

The [ASCII](ascii-prototype.md), [seed contract](seed-contract.md),
[data-model gap report](data-model-gap-report.md), and [cleanup manifest](cleanup-manifest.md)
own the detailed decision, fixture, provider, and cleanup contracts.

## Lean receipt

```yaml
target: buyer-led Kamdar proof with real delivery evidence
current_need: current v4 proof is technically inspectable but buyer-hostile and provider delivery is never attempted
rung: reuse_local
evidence:
  - template-first-kamdar.mjs already owns the fixture, assertions, artifacts, and showcase renderer
  - live-kamdar-poc.mjs already owns the bounded v4 Notion edge and receipt overlay
  - v4 already owns the complete eight-database demonstration environment
  - employee-followups and Telegram-summary Markdown already exist as payload artifacts
smallest_next_action: reorder the existing renderer and replace hardcoded blocked receipts with profile-scoped preflight plus adapters
proof_preserved: deterministic frozen scoring, provider-receipt honesty, private route redaction, idempotency, and v4-only writes
review_route: review:implementation-plan + integration-readiness + evidence-quality + visual-qa
```

## Change Plan

0A. **Correct record templates and the Project relational model**
   - Files: `templates/`, template registry/tests, feature docs, workspace
     routing, v4 provisioning edge, and data-model assertions.
   - Operation: replace generic record openings with type-specific templates;
     add Issue and Meeting templates; define real Project relations for Work,
     Decisions, Resources, Reports, and Skills; provision filtered Project
     views where supported.
   - Proof: relation properties contain page IDs; Project pages expose only
     related records; template checks reject misplaced generic headings.
   - Failure boundary: do not infer a relation from matching text or duplicate
     a database to simulate a linked view.

0B. **Flatten Daily Project memory into the Project entry**
   - Files: FEAT-0001 doc, Daily automation, runner, live edge, eval schema,
     generated proof, and UI.
   - Operation: remove per-Project Daily Markdown and child pages; compute one
     structured Project patch, apply it in place, retain a mutation receipt,
     and show its before/after fields in the eval UI.
   - Proof: zero `daily/projects/*.md` events; exactly one Project mutation per
     affected Project; Weekly consumes canonical Project/Work state plus
     receipts.
   - Failure boundary: preserve linked Work/Meeting detail and do not copy raw
     task lists into Project context.

0. **Compile the supplied capture into a richer private seed**
   - Files: a source-owned seed compiler and schema, ignored private compiled
     seed/state, aggregate seed manifest, fixture tests, and
     `tickets/TASK-0006/seed-contract.md`.
   - Operation: normalize all 49 captured rows into 39 named Projects and 10
     source gaps; preserve seven observed department labels; add eight People,
     21 Work Items, and three Meetings as a clearly labelled synthetic overlay.
     Use the exact compiled seed for both scoring and v4 population.
   - Proof: source hash and counts match the capture; raw Project names and
     contacts never enter Git; UI distinguishes capture-derived records from
     synthetic overlay records; unchanged compilation is deterministic.
   - Failure boundary: do not invent Tasks, employees, page bodies, owners, or
     URLs from sparse captured rows.

1. **Make feature docs the buyer and proof contract**
   - Files: `evals/evals.json`, `docs/features/FEAT-0001-*.md` through
     `FEAT-0009-*.md`, `automations/daily-operating-update.md`,
     `automations/weekly-operating-review.md`, `workspace.hermes.md`, and
     focused schema tests.
   - Operation: standardize every feature doc with Why it exists,
     Trigger/Inputs, ASCII Flow, State changes/artifacts, Downstream application,
     Failure modes, Proof contract, and Example. Resolve each assertion's
     existing `feature_id` to that doc and render it above grouped proof rows.
   - Proof: every feature ID resolves one doc; every doc contains the required
     sections and flow; the UI has no second copy of the feature explanation.
   - Failure boundary: do not add feature IDs or duplicate automation scans.

2. **Recompose `/showcase` around one guided operating story**
   - Files: `evals/filesystem/scripts/template-first-kamdar.mjs` and UI tests.
   - Operation: render sections in this order: problem/value, sandbox fixture,
     Daily-to-Weekly flow, four Daily features, four Weekly features, shared
     trust, then collapsed system/audit detail. Hide raw IDs in the default
     view. Inside each feature, group the trigger, manager action, created or
     modified files, content checks, application, receipt, and business result.
   - Proof: first viewport names the buyer problem and value; the guided path
     can be understood without expanding a drawer; `TASK-*`, `FEAT-*`, template
     inventories, and raw assertions remain available in audit detail.
   - Failure boundary: retain the accepted dark square theme, 768px width,
     keyboard-operable details, readable type, and honest blocked states. Do
     not add a second feature example, global file inventory, or separate
     integration diagram to the buyer page.

3. **Install private, allowlisted operator routes**
   - Files: private Hermes profile configuration/state plus source-owned setup
     validation and route-key documentation; no private values in Git.
   - Operation: add one private Demo Owner with the operator's email and
     Telegram label; bind two explicit fictional test employees to the two
     operator-owned email destinations; install the private Telegram bot/home
     mapping under a distinct eval route key; resolve and verify a Notion user
     ID for mention testing; seed v4 People only after external-write approval.
   - Proof: preflight resolves each fixture person to an allowlisted runtime
     route; tracked files and proof artifacts contain no raw email, chat ID,
     token, cookie, or authorization value.
   - Failure boundary: refuse unknown recipients, production contacts, a
     WhatsApp chat ID used as Telegram, or unresolved owner routing.

4A. **Replace hardcoded provider blocks with executable preflight**
   - Files: `evals/filesystem/scripts/live-kamdar-poc.mjs`, provider-edge tests,
     and the existing Hermes Google/Telegram skill invocation path.
   - Operation: implement the provider edge contract; verify the
     profile-scoped Google runtime, Drive folder, Gmail send scope, Telegram
     target, private allowlist, artifact hashes, and action keys before an
     operated command can proceed.
   - Proof: preflight produces redacted `ready` or `blocked` results without a
     provider mutation; the frozen processor remains network-free.
   - Failure boundary: no provider action is inferred from a frozen run or a
     failed preflight.

4B. **Run the operator-authorized v4 demonstration**
   - Files: the same bounded live edge, private delivery state, and
     `tickets/TASK-0006/progress.md` authorization entry.
   - Operation: seed/update only the isolated v4 demo, apply its bounded
     Notion records/comments, upload the approved report artifact to the v4
     Drive location, send grouped Daily employee follow-ups, and send the
     finalized Weekly Company report through Telegram. The system stores only
     route keys and recipient hashes in durable receipts.
   - Proof: Email receipt has provider message ID, sent time, recipient hash,
     artifact hash, and idempotency key; Drive has file ID/URL; Telegram has
     message ID, sent time, chat hash, report hash, and idempotency key.
   - Failure boundary: failure remains `blocked` or `failed` with provider
     detail; never synthesize success. Do not retry a successful idempotency key.

5. **Prove ordering, payload fidelity, privacy, and rerun safety**
   - Files: `evals/evals.json`, `evals/filesystem/tests/*.test.mjs`, generated
     run evidence, and browser captures.
   - Operation: assert one detailed per-Work comment with a real Notion user
     mention, known status/dates/variance/blocker/missing fields, numbered
     questions, and exact update location; source comment before email; two
     grouped employee emails; no Daily
     Telegram chase; 12 active Project reports → 7 department reports → one
     Company report before Telegram; seven department sections in the owner
     message; sent payload hash equals the displayed artifact; exact route
     allowlist; redaction; no healthy-work chase; no duplicate second send.
   - Proof: frozen mode passes without network; operated mode has real receipts
     for each enabled provider; second operated run records `skipped` for the
     same action keys.
   - Failure boundary: local file existence alone cannot pass delivery checks.

6. **Revalidate v4, then prepare recoverable cleanup**
   - Files: `workspace.hermes.md`, v4 private state, TASK-0006 QA receipt.
   - Operation: reread v4 root, databases, People routes, reports, and delivery
     receipts; update only current v4 links. Produce the exact archive manifest
     for v2/v3. Archive them only after a separate explicit operator command.
   - Proof: all dashboard links resolve under v4; no current source references
     v2/v3; the cleanup receipt lists root IDs and confirms `in_trash` after the
     separately authorized operation.
   - Failure boundary: never archive v4, the real Kamdar root, or any child not
     proven to belong to the two superseded namespaces.

## Done / Proof

- [x] The default page explains the problem, four Daily and four Weekly outcomes, and delivery without audit detail; each outcome names its input, action, value, record/file change, and provider state.
- [x] Project, Task, Issue, Meeting, Decision, Resource, Skill/SOP, documentation-request, and follow-up templates use type-specific questions; Project memory is an in-place record diff, not a Daily file or child page.
- [ ] Work, Decisions, Resources, Reports, and relevant Skills hold true Project relations, and Project pages contain filtered linked views. The v4 relations are applied; filtered Project-page views remain unproven.
- [x] Feature docs contain the required flow/proof contract, and the existing `feature_id` renders it before grouped record, file, behavior, and receipt evidence.
- [x] The private seed compiles 39 Projects, 10 source gaps, seven departments, eight People, 21 Work Items, and three Meetings; raw contacts remain private.
- [ ] Detailed combined comments contain a verified user mention and factual progress/data request; 12 Project reports roll into seven department reports, one Company report, and the owner Telegram payload. The comments and report hierarchy are applied, but the v4 People rows are records rather than authenticated Notion users, so the safe implementation links the directory record instead of manufacturing an `@` mention.
- [x] v4 remains the only demo root. Provider success requires allowlisted, hash-matched preflight/apply receipts; repeated runs skip duplicates and raw routes never persist.
- [ ] Browser proof, repository checks, independent implementation/integration/evidence/visual review, and a demo pass. v2/v3 archival remains separately authorized.

## QA Strategy

1. Validate the feature registry, required feature-doc sections/flows,
   record-specific templates, private-route absence, and JSON.
2. Compile the capture twice; verify its hash, 39/10 row disposition, seven
   departments, private-value absence, deterministic output, and overlay counts.
3. Run the frozen scenario twice and verify all business and idempotency checks.
   Confirm zero Daily Project-memory files, exact Project record diffs, real
   relation values, filtered linked views, and one combined comment per Work.
4. Browser-test the default story at desktop and mobile widths; run a plain-
   language comprehension review against the ASCII acceptance path.
5. Read-only preflight the specific Notion mention user, Google Drive/Gmail,
   and Telegram routes.
6. With explicit operated-send approval, send only to the allowlisted
   operator-owned destinations and apply only under v4.
7. Re-read provider receipts and hash-match each payload to its displayed
   artifact; rerun once to prove no duplicate send.
8. Run repository Node/Python suites plus independent implementation,
   integration-readiness, evidence-quality, and visual QA.

## State

- `implementation:` source contracts, templates, feature docs, buyer-first
  showcase, record/file/behavior assertions, and the bounded v4 operator are
  implemented. The receipt-backed operated proof passes 54/54 and v2/v3 remain
  untouched.
- `integration:` on 2026-08-22 the explicit v4 operator added two Project
  fields and five Project relations, then applied 124 redacted Notion actions:
  39 capture-derived Projects, eight People, 21 Work records, 16 in-place
  Project patches, 20 Reports, 12 promotions, and eight detailed comments.
  The Company summary was delivered to the configured Telegram owner route;
  its raw destination and message ID are excluded from durable evidence.
  Gmail and Drive remain honestly `blocked` because this Hermes profile has no
  connected Google account; no email or Drive item was fabricated.
- `seed/model:` the private capture is now compiled deterministically to
  mode-`0600` profile state and verified by the frozen runner against a tracked
  aggregate-only manifest (49 rows, 39 named Projects, 10 gaps, seven
  departments). The tracked fixture remains a sanitized, labelled scenario
  overlay with 8 People, 21 Work Items, and 3 Meetings; it does not claim to be
  a raw-page export.
- `external effects:` operated v4 Notion and the one Telegram summary are
  receipt-backed. Production Kamdar, Gmail, Drive, and v2/v3 cleanup remain
  outside this completed proof and require their own valid provider route.

## Links

- [ASCII prototype](ascii-prototype.md)
- [Current v4 proof](https://app.notion.com/p/Proof-3c3d43a2394281f79098e378e407210f)
- [Current v4 workspace](https://app.notion.com/p/Kamdar-AI-Eval-Demo-3c3d43a239428112b2e1e0a3628b9587)
- [Receipt-backed buyer proof](https://kamdar-company-os-evidence.vercel.app)
- [Prior implementation ticket](../TASK-0005/ticket.md)
- [Read-only cleanup manifest](cleanup-manifest.md)
- [Operated seed contract](seed-contract.md)
- [Data model and feature-proof gap report](data-model-gap-report.md)
- [Goal program](program.md)
- [Goal progress](progress.md)
- [Native Goal prompt](artifacts/native-goal-prompt.md)

## 2026-08-26 correction: grounded v4 delivery

The later v3 template-body deployment regressed the operated proof: it seeded
seven mostly invented Projects, wrote no routable employee contacts, never ran
Weekly, and sent a deployment-status Telegram message instead of the Company
report. The operator has requested a fresh correction; v3 stays frozen as
failure evidence.

```text
captured Project name + Department
        + synthetic_eval Work/People/Meetings
        + safe runtime contact alias
                     │
                     ▼
 Daily result ──> Project / Work / Draft effects ──> delivery receipts
                     │
                     ▼
 Weekly Drafts ──> Final Project reports
                 ──> Final Department reports
                 ──> Final Company report
                     │
                     ▼
              Telegram company-report receipt
```

### Correction plan

1. Replace the seven-project scenario with the captured roster in
   `docs/research/kamdar-seed-grounding-2026-08-26.md`; keep work facts clearly
   marked `synthetic_eval`.
2. Give every Person a complete Person-template body and an approved eval route
   alias resolvable by Hermes. Use the operator-owned Telegram home only; email
   remains unavailable until a provider exists and must never fall back.
3. Rebuild Daily and Weekly contexts, results, hashes, receipts, and read-backs
   around the same IDs and facts.
4. Provision a new isolated Notion root. Do not mutate or delete v3.
5. Operate the Markdown automations: apply Daily effects, finalize Project
   reports, create Department reports, create the Company report, then send the
   actual Company report through Telegram.
6. Require provider message ID, payload hash, action key, and Notion read-back
   before the dossier says `sent` or `applied`.

### Correction proof

- Every People page exposes preferred channel, approved channels, endpoint
  alias, and contact instructions.
- The Notion Reports database contains three Final Project reports, three Final
  Department reports, and one Final Company report sourced in that order.
- The Telegram payload contains the Company report summary and links to the
  Company and Department reports; it is not a deployment-status message.
- A rerun skips the same Notion/report/message action keys.
- Full Daily, Weekly, seed, setup, and filesystem eval suites pass.
