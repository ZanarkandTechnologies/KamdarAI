---
ticket_id: TASK-0004
title: Restore the full Kamdar story and operate every feature pipeline
status: blocked
created_at: 2026-08-21T16:25:00+08:00
updated_at: 2026-08-21T23:40:00+08:00
owner: Codex
source_tickets:
  - TASK-0001
  - TASK-0002
  - TASK-0003
approval: operator-correction-2026-08-21
---

# TASK-0004: Restore the full Kamdar story and operate every feature pipeline

## Summary

Repair the proof after TASK-0003 mistakenly replaced the complete TASK-0001
buyer journey with the narrower TASK-0002 feature-results concept. Preserve the
story, Company OS/database walkthrough, Daily walkthrough, Weekly walkthrough,
failure view, and decisions. Replace only the old expectations/results section
with the feature-grouped assertion drilldown. Implement and prove all nine
feature pipelines, then create one namespaced live Notion showcase and display
real provider receipts and links instead of labelling every downstream action
as mocked.

> **Before:** the showcase starts at feature scores, omits the company/data
> story, freezes three Weekly outcomes as examples of missing proof, and shows
> planned calls even when an operated proof is the buyer-relevant claim.
>
> **After:** the original narrative remains intact; section 5 groups assertions
> by feature; every Daily and Weekly feature has artifacts and behavior checks;
> an operated showcase links to the namespaced Notion records and distinguishes
> `applied`, `sent`, `blocked`, and `planned` evidence.
>
> **Example:** Weekly knowledge promotion expands from the Meeting candidate to
> reviewed Decision, Resource, and SOP/skill records, then shows the resulting
> Notion/Drive links. Executive distribution shows the Telegram artifact and
> provider receipt instead of `Designed · not yet proved`.

## Scope

- `In:` compose TASK-0001 sections 0-4 and 6-7 around the TASK-0002 feature
  assertion UI; add artifacts/assertions/application traces for FEAT-0002,
  FEAT-0004, FEAT-0006, FEAT-0007, and FEAT-0008 gaps; extend the existing live
  edge adapter to create one namespaced showcase under the Kamdar Notion root;
  write sample Projects, Work Items, People, Decisions, Resources, Reports, and
  Skills/wiki records; apply bounded comments/updates; upload proof artifacts;
  send only previously authorized proof email/Telegram messages; persist
  redacted receipts and provider links safe for the local UI.
- `Out:` enabling production schedules, mutating existing production project
  or task records, public sharing, guest invites, deleting/trashing records,
  storing credentials in the repo, or treating the showcase databases as the
  production Company OS.

## Design baseline

- `section ownership:` TASK-0001 owns the complete proof journey. TASK-0002 is
  a replacement for TASK-0001 section 5 only.
- `core action:` follow Daily and Weekly from source records to artifacts,
  downstream applications, and inspectable provider results.
- `subtraction:` no separate second UI, no separate run per feature, and no
  duplicated narrative hidden in another dossier.
- `deliberate no:` an absent receipt never renders as applied or sent; a frozen
  run stays clearly frozen even though an operated showcase also exists.
- `runtime boundary:` the deterministic processor remains network-free. The
  existing `live-kamdar-poc.mjs` edge performs only exact namespaced provider
  operations and returns receipts to the same scorer.

## Lean receipt

```yaml
target: full-story feature-first operated Kamdar proof
current_need: TASK-0003 removed accepted buyer context and proved only six of nine features with mock-labelled downstream calls
rung: reuse_local
evidence:
  - TASK-0001 already specifies the complete story and section order
  - TASK-0002 already specifies the feature-grouped section-5 replacement
  - template-first-kamdar.mjs already owns templates, assertions, artifact generation, and showcase rendering
  - live-kamdar-poc.mjs already owns namespaced Notion, Drive, Gmail, and Telegram edge operations
smallest_next_action: compose the two accepted UI contracts and extend the existing scenario and live edge; build no parallel proof system
proof_preserved: deterministic frozen mode, namespaced live writes, receipt honesty, idempotency, source allowlists, browser evidence, and independent review
review_route: review:implementation-plan + evidence-quality + integration-readiness
```

## Change Plan

1. **Correct the proof contract — ASCII, feature docs, `evals/evals.json`**
   - Record that TASK-0002 replaces TASK-0001 section 5 only.
   - Add template-backed files and feature-specific behavior rows for every
     currently missing pipeline: documentation comment, Problem/Decision/
     Resource/SOP promotion, Project/Task next-week updates, and executive
     Telegram distribution.
   - Proof: all nine feature IDs own at least one file or behavior assertion;
     the declared counts match the loader and feature docs.

2. **Generate complete Daily and Weekly evidence — template-first runner**
   - Reuse current templates and add the minimum derived templates needed for
     documentation requests, promotion records, planning updates, and executive
     distribution.
   - Make `template-first-kamdar.mjs` the only scorer for both modes. Its
     `runTemplateFirstProof({mode, externalReceipts})` entry point owns the
     feature-tagged assertions, files, calls, and showcase. It validates each
     external receipt against an expected feature/adapter/operation tuple and
     overlays `applied`, `sent`, or `blocked` plus returned URLs onto the same
     planned-call rows. Frozen mode supplies no receipts and stays `planned`.
   - `serve.mjs` never performs live provider calls. It reads the one saved
     template-first result; the UI therefore renders frozen and operated proof
     through the same JSON schema and cannot inherit the legacy scorer.
   - Proof: one source scan produces all Daily outcomes; one Weekly pass
     produces Project → Area → Company reports plus promotions, planning, and
     distribution; rerun remains idempotent.

3. **Restore the buyer journey — UI and shareable showcase**
   - Render Story → Company OS/databases/templates/samples → Daily prompt and
     observed outputs → Weekly prompt and observed outputs → feature-grouped
     assertions → failure view → decisions.
   - The feature section keeps expandable file/template/content assertions and
     places raw trace/ASCII comparison in developer evidence.
   - Proof: browser capture shows the opening story, at least one database
     sample, Daily and Weekly walkthroughs, a file drilldown, and an operated
     downstream link/receipt.

4. **Operate one namespaced provider showcase — live edge adapter**
   - Create a new `[SHOWCASE] Kamdar Manager Eval 2026-08-21` Notion root with
     sample databases/records and source-linked proof pages. Apply only to its
     children. Upload derived artifacts to its namespaced Drive folder and send
     only the two authorized proof emails and one Telegram summary.
   - Replace the legacy `mock-kamdar-automation.mjs` import in
     `live-kamdar-poc.mjs` with `runTemplateFirstProof`. Use a new immutable
     namespace `[SHOWCASE] Kamdar Manager Eval 2026-08-21` and a new checkpoint
     root `runtime-showcase/kamdar-manager-eval-2026-08-21-v2/state.json`.
     Startup must reject any checkpoint whose namespace/version differs, verify
     every stored Notion root is not trashed before reuse, and create a fresh
     root when no v2 state exists. The edge may resume incomplete v2 children
     idempotently but never reuse or delete the trashed TASK-0001 POC subtree.
   - Proof: post-write reads verify every created database/record, comments and
     updates, Drive files, sent messages, and redacted receipts. The local UI
     links to the exact showcase root and output records.

## Done / Proof

- [x] The full TASK-0001 story and walkthrough are visible again; only its
      expectations/results section is replaced by the feature-first UI.
- [x] All nine feature pages have actual scenario assertions; no Weekly feature
      remains `Designed · not yet proved` merely because the ASCII used it as an
      example.
- [x] Frozen mode remains honest and deterministic; operated mode shows actual
      receipt states and provider links rather than blanket `MOCKED` labels.
- [x] The namespaced Notion showcase contains the declared database set,
      templates/sample entries, Daily/Weekly outputs, and feature application
      evidence, with post-write read verification.
- [ ] Live Drive/email/Telegram operations are bounded to the showcase and
      prior allowlists, with redacted receipts and no credential leakage.
      Current operated state is honestly `BLOCKED`: Google auth is expired and
      the Hermes profile has no Telegram target.
- [ ] Node/Python tests, API checks, operated browser captures, integration
      receipts, and independent implementation/visual/completion review pass.
      Tests and visual review pass; implementation review is `TAS-B / revise`
      until the three external providers produce real receipts.

## QA Strategy

1. Validate contract/template metadata and run the complete frozen scenario
   twice into an owned root.
2. Assert all nine features are covered, all expected artifacts pass content
   checks, and the second pass creates no duplicates.
3. Run the live edge only after read-only auth and exact-parent preflight;
   checkpoint each namespaced resource immediately and stop on the first
   provider mismatch.
4. Re-read every created Notion/Drive output and sent-message receipt; score
   only external receipts supplied by the edge.
5. Operate the local UI in the browser and capture the narrative, feature/file
   drilldown, and actual downstream result links.
6. Reconcile independent implementation, integration-evidence, visual, and
   completion reviews before closing.

## State

- `approval:` explicit operator correction authorizes the bounded showcase and
  the previously stated proof recipients/routes.
- `current:` local and Notion implementation pass; external Drive/Gmail/
  Telegram delivery remains blocked by profile configuration.
- `external_gate:` Codex Notion connector/browser auth is unavailable, but the
  existing Hermes `ntn` edge may proceed only if its read-only preflight still
  succeeds.
- `blockers:` Google Workspace requires an operator OAuth round-trip; the
  Hermes profile has no Telegram delivery target. These block 2 Drive actions,
  1 Gmail action, and 2 Telegram actions.

## Links

- `full_story_contract:` `tickets/TASK-0001/ascii-prototype.md`
- `section_5_replacement:` `tickets/TASK-0002/ascii-prototype.md`
- `feature_registry:` `docs/features/README.md`
- `company_os:` `docs/systems/kamdar-company-os.md`
- `assertion_contract:` `evals/evals.json`
- `processor:` `evals/filesystem/scripts/template-first-kamdar.mjs`
- `live_edge:` `evals/filesystem/scripts/live-kamdar-poc.mjs`
- `operated_receipt:` `tickets/TASK-0004/artifacts/qa/operated-proof.md`
- `implementation_review:` `tickets/TASK-0004/artifacts/review/implementation-review.md`
- `visual_review:` `tickets/TASK-0004/artifacts/review/visual-review.md`
- `farplane_style_qa:` `tickets/TASK-0004/artifacts/qa/2026-08-21-farplane-style/visual-qa.md`
- `farplane_style_review:` `tickets/TASK-0004/artifacts/review/farplane-style-review.md`
- `neutral_theme_visual_qa:` `tickets/TASK-0004/artifacts/qa/2026-08-21-farplane-style/neutral-theme-visual-qa.md`
- `notion_demo_v3:` `tickets/TASK-0004/artifacts/qa/notion-demo-v3.md`
- `operated_link_routing:` `tickets/TASK-0004/artifacts/qa/operated-link-routing.md`
