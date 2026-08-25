---
ticket_id: TASK-0005
title: Make the Kamdar demo operationally intelligent and evidence-first
status: complete
created_at: 2026-08-21T17:05:00+08:00
updated_at: 2026-08-21T20:20:00+08:00
owner: Codex
source_tickets:
  - TASK-0004
approval: approved-by-operator-2026-08-21
---

# TASK-0005: Make the Kamdar demo operationally intelligent and evidence-first

## Summary

Rebuild the operated proof around one coherent mock environment and make the
manager demonstrate the buyer-relevant behavior: plan-versus-actual time and
cost, source-backed explanations for problems, stale-record comments before
off-platform chases, and inspectable intermediate artifacts linked to their
applied Notion results.

> **Before:** the live demo mixes scraped `KMD-*` seed rows with synthetic
> `PROJ-*` / `TASK-*` eval actions, creates connector-shaped titles such as
> `Update Project Plan · PROJ-REPLENISH`, lists artifact paths without showing
> their contents, and records progress without a measurable time/cost model or
> an honest explanation of why work slipped.
>
> **After:** the frozen fixture is the single source for the local run and the
> namespaced Notion demo; canonical Projects and Work Items keep one ID system;
> generated updates become linked evidence or comments instead of duplicate
> records; every applicable Work Item shows planned/actual hours, MYR estimate/
> actual cost, schedule variance, basis, cause confidence, and confirmation gap;
> the showcase renders each generated Markdown artifact and links its exact
> Notion application.
>
> **Example:** `TASK-101` shows `12h planned → 18h actual`, `MYR 1,440 → MYR
> 2,160`, and `+1 day`. The suspected supplier-feed mismatch remains explicitly
> unconfirmed. Daily adds one deduplicated progress comment to `TASK-101`, then
> prepares the owner chase. The showcase expands the Daily evidence Markdown
> and opens the exact Project evidence page in the demo workspace.

## Scope

- `In:` readable 768px single-column showcase; one coherent frozen/live data
  model; effort, cost, schedule, and cause-confidence fields; stale-comment-
  before-chase behavior; expandable generated Markdown; exact Notion links;
  one clean v4 namespaced demo; feature/eval/docs updates; browser proof.
- `Out:` production schedule activation, writes to real Kamdar Projects or
  Tasks, inferred salary/cost rates, guessed root causes, repairing Google or
  Telegram authentication, deleting the older v3 demo, and per-assertion image
  generation when a stronger artifact or provider link exists.

## Delta

The source contract is:

```text
operating_proof(frozen_fixture, template_contracts, external_receipts?)
  -> generated_markdown[] + feature_assertions[]
     + planned_or_applied_actions[] + showcase
```

The same fixture must populate the clean Notion demo before receipt-backed
actions are applied. `.hermes.md` owns runtime routing and policy, but it is not
the executable eval data source by itself; the fixture, templates, automation
contracts, scorer, and live edge must change together.

### Context decisions

- `feature classification — reuse:` do not mint new feature IDs. Time/cost and
  cause evidence extend FEAT-0001; stale-comment-first extends FEAT-0003; weekly
  variance rollups extend FEAT-0005. The coherent fixture, v4 demo, artifact
  previews, typography, and screenshot fallback are proof infrastructure or UX.
  Promote a capability only when it gains an independent trigger, input/output
  contract, operator, or proof lifecycle.
- `data model — create:` use the exact frozen fixture for both the scored run
  and v4 Notion baseline. Do not mix the earlier scraped capture into this eval.
  Tradeoff: the demo is representative rather than a replica of live Kamdar
  data, but every input and output becomes reconstructable.
- `economics — create:` cost is calculated only from declared planned hours,
  actual hours, and a documented MYR hourly basis. Missing inputs produce
  `source_gap`, not an estimate.
- `problem explanation — create:` store observed facts, likely cause,
  contributing factors, confidence, and confirmation needed. Hypotheses never
  become facts merely because a report needs prose.
- `chasing — targeted refresh:` stale/overdue Work gets one idempotent Notion
  comment in the namespaced demo before email/Telegram planning. Production
  remains proposal-only.
- `evidence UX — reuse:` render the complete generated Markdown in expandable
  panels and show the exact applied URL beside it. Use a screenshot only when
  the evidence is external UI state with no retrievable URL or local artifact.
- `visual design — reuse:` retain the accepted Farplane-inspired dark neutral
  system, square borders, centered `max-width: 768px`, and one page-level
  column; increase body and evidence text by roughly 1–2px.
- `subtraction:` no second runner, no second showcase, no cost service, no
  screenshot for every assertion, and no duplicate Project update rows.

## Lean receipt

```yaml
target: coherent intelligent Kamdar operated proof
current_need: mixed IDs, duplicate connector-shaped records, weak progress evidence, and hidden generated artifacts obscure whether the automation worked
rung: reuse_local
evidence:
  - templates already own Work Item, Daily evidence, and Weekly report contracts
  - the frozen snapshot already owns all deterministic input data
  - template-first-kamdar.mjs already owns generation, assertion scoring, and showcase rendering
  - live-kamdar-poc.mjs already owns namespaced Notion application and receipts
smallest_next_action: extend those owners and generate one new v4 namespace; add no parallel runtime or service
proof_preserved: deterministic reruns, receipt honesty, production proposal-only policy, exact URLs, and idempotency
review_route: review:implementation-plan + evidence-quality + visual-qa
```

## Change Plan

1. **Reconcile the interrupted WIP before implementation**
   - Files: current working diff, especially `workspace.hermes.md`, `templates/`,
     `automations/`, `evals/evals.json`, runner, live edge, UI, and tests.
   - Operation: compare every partial edit against this ticket; keep only edits
     that implement an accepted unit below. Do not run or write the v4 demo
     until this reconciliation passes.
   - Proof: focused diff inventory with no unplanned schema or provider action.
   - Failure boundary: preserve older generated v3 evidence; do not delete or
     migrate it as part of this ticket.

2. **Make progress economics and cause evidence first-class contracts**
   - Files: `workspace.hermes.md`, `templates/task.md`,
     `templates/daily-operating-evidence.md`, `templates/weekly-report.md`,
     `automations/daily-operating-update.md`,
     `automations/weekly-operating-review.md`, and FEAT-0001/0003/0005 docs.
   - Operation: add planned/actual hours, schedule variance, MYR estimate/
     actual, rate basis, observed problem, likely cause, confidence, and
     confirmation-needed semantics; bump changed template versions.
   - Proof: generated Daily and Project Weekly artifacts contain the declared
     calculations and preserve `unconfirmed` causes.
   - Failure boundary: missing rate or time inputs render a source gap and no
     monetary value.

3. **Use one coherent scenario and prove stale-comment-first behavior**
   - Files: `evals/filesystem/fixtures/template-first-kamdar/snapshot.json`,
     `evals/evals.json`, and `template-first-kamdar.mjs`.
   - Operation: keep one Project/Work/People ID system; calculate variance from
     declared fixture fields; add assertions for economics, cause honesty, and
     exactly one stale source comment before an off-platform chase.
   - Proof: the complete suite passes on first and idempotent second runs;
     healthy work receives no comment or chase.
   - Failure boundary: no assertion may pass from prose alone; each new row has
     an executable predicate and evidence.

4. **Create a clean namespaced Notion demo from the scored fixture**
   - Files: `evals/filesystem/scripts/live-kamdar-poc.mjs` and ignored v4 state
     under the Hermes profile.
   - Operation: create `Kamdar AI · Eval Demo` v4 with Projects, Work, People,
     Decisions, Resources, Reports, Skills, and Templates. Seed Projects/Work/
     People from the exact fixture. Apply Project memory/plan artifacts as
     linked child evidence, actual stale/documentation comments to demo Work
     pages, and cleanly titled rows to their canonical databases.
   - Proof: post-write reads confirm database membership, comment presence,
     clean titles, exact IDs, and idempotent reuse; receipts expose real URLs.
   - Failure boundary: writes are restricted to the new v4 root. Never mutate
     the real Kamdar sources or delete v3.

5. **Make the showcase readable and evidence-first**
   - Files: `evals/filesystem/scripts/template-first-kamdar.mjs` and
     `evals/filesystem/ui/index.html`.
   - Operation: retain the one-column 768px shell; increase core text and
     evidence text 1–2px; render every Daily/Weekly Markdown artifact in an
     expandable panel; show its template, content assertions, and exact Notion
     result link when applied.
   - Proof: browser audit checks computed width, font sizes, one page-level
     column, all artifact previews, database links, applied links, and zero old
     workspace/Drive leaks.
   - Failure boundary: large artifacts remain collapsed by default and scroll
     inside a bounded preview; screenshots supplement only linkless external UI
     evidence.

6. **Refresh proof, docs, and buyer handoff**
   - Files: tests, `evals/filesystem/README.md`, TASK-0005 QA artifacts, and the
     served `/showcase` output.
   - Operation: rerun Node/Python suites, frozen proof, v4 operated proof,
     browser/visual QA, and independent implementation/evidence review.
   - Proof: one receipt links the v4 root, eight databases, exact applied pages,
     comments, expandable artifacts, screenshots for any linkless external
     claim, and the final assertion count.
   - Failure boundary: Drive/email/Telegram remain visibly blocked unless real
     provider receipts exist; local assertion success never implies delivery.

## Done / Proof

- [x] The served proof is a centered one-column 768px page with visibly larger
      body, table, feature, and artifact-preview text.
- [x] The local fixture, generated artifacts, eval IDs, and v4 Notion baseline
      use one coherent Project/Work/People identity model.
- [x] No v4 database contains connector-shaped names such as `Update Project
      Plan · PROJ-REPLENISH`; Project deltas are linked beneath their canonical
      Project and comments live on their source Work Item.
- [x] Applicable Work Items show planned/actual hours, MYR estimated/actual
      cost, schedule variance, calculation basis, cause, confidence, and
      confirmation needed. Missing inputs create an explicit source gap.
- [x] Stale Work receives one idempotent source comment before a routed chase;
      healthy Work receives neither.
- [x] Daily and Weekly walkthroughs expand the complete generated Markdown and
      link the exact applied Notion result where one exists.
- [x] Frozen and operated runs pass all declared executable assertions and an
      unchanged rerun creates no duplicate files, records, comments, or sends.
- [x] Browser evidence and an independent review confirm the buyer-facing
      claims; blocked providers remain honestly blocked.

## QA Strategy

1. Validate JSON/template registries and reject unresolved placeholders.
2. Run the frozen scenario twice; inspect the Daily Work table, weekly
   plan-versus-actual table, problem explanation, action ordering, and zero
   second-run events.
3. Run all Node and Python repository suites.
4. Preflight the exact v4 parent and namespace, then operate Notion once.
5. Re-read all v4 databases, canonical Project/Work rows, applied comments,
   report/promoted rows, templates, and stored receipts.
6. Operate `/showcase` in the browser; capture the story, one expanded Daily
   artifact, one expanded Weekly artifact, a stale-comment result link, and
   computed typography/layout/link counts.
7. Run independent implementation, evidence-quality, and visual review. Do not
   mark approval-ready while any provider claim lacks its receipt or fallback
   capture.

## State

- `implementation:` complete against the accepted ASCII prototype; v4 is
  reachable only through the bounded eval edge.
- `external_writes:` the new isolated v4 demo received 18 receipt-backed
  Notion actions. No production Kamdar, v3, Drive, email, or Telegram record
  was written. The older v3 demo remains intact.
- `mechanical_validation:` `farplane validate ticket` is unavailable for this
  repository because KamdarAI does not contain `rules/validation.toml`; use
  repository checks plus independent plan review until that project substrate
  exists.
- `decision:` the operator approved the coherent-fixture model and scoped v4
  Notion creation. The accepted tradeoff is fidelity and traceability over
  mixing live scraped rows into the eval.
- `independent_review:` QA, implementation, evidence, visual, and demo lanes
  returned `TAS-A / pass`.
- `closeout:` final Goal drift review passed; no material recovery remains.

## Links

- `source_ticket:` `tickets/TASK-0004/ticket.md`
- `workspace_contract:` `workspace.hermes.md`
- `eval_contract:` `evals/evals.json`
- `frozen_fixture:` `evals/filesystem/fixtures/template-first-kamdar/snapshot.json`
- `processor_and_showcase:` `evals/filesystem/scripts/template-first-kamdar.mjs`
- `notion_edge:` `evals/filesystem/scripts/live-kamdar-poc.mjs`
- `plan_review:` `tickets/TASK-0005/artifacts/review/plan-review.md`
- `ascii_prototype:` `tickets/TASK-0005/ascii-prototype.md`
- `final_qa:` `tickets/TASK-0005/artifacts/qa/final-independent-qa.md`
- `operated_reconciliation:` `tickets/TASK-0005/artifacts/qa/operated-v4-reconciliation.md`
- `visual_proof:` `tickets/TASK-0005/artifacts/qa/visual-proof.md`
- `final_evidence_review:` `tickets/TASK-0005/artifacts/review/final-evidence-review.md`
- `final_implementation_review:` `tickets/TASK-0005/artifacts/review/final-implementation-review.md`
- `final_goal_drift_review:` `tickets/TASK-0005/artifacts/review/final-goal-drift-review.md`
- `demo:` `tickets/TASK-0005/artifacts/demo/2026-08-21-operated-proof/final.mp4`
