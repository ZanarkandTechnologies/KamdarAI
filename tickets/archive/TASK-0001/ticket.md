---
ticket_id: TASK-0001
thread_id: "01a02055-b755-7213-af01-3fc188fab6d0"
title: Redesign the Kamdar Company OS proof from canonical templates
status: complete
created_at: 2026-08-21T10:53:08+08:00
updated_at: 2026-08-21T14:05:00+08:00
owner: Codex
supersedes_attempt: 2026-08-21-live-poc
prototype_gate: frozen-runner-ui-proof-passed
goal_packet: tickets/TASK-0001/implementation-program.md
goal_approval: approved-by-operator-2026-08-21
---

# TASK-0001: Redesign the Kamdar Company OS proof from canonical templates

## Summary

Replace the first proof's invented three-database model and reduced report
  fixtures with a Company OS model grounded in the canonical HermesCorp Project,
Work Item, Decision, Resource, and Weekly Report templates. The reviewed ASCII
now drives the source configuration: Kamdar-owned templates, workspace
installation routing, real-directory automation contracts, a declarative
template-first eval specification, and a local frozen runner/UI. Live
provisioning stays a separate subsequent slice.

## Scope

- `In:` Company OS configuration already approved; implement a frozen mock
  fixture, runner, and local proof UI that consume `evals/evals.json`, execute
  Daily before Weekly, compare generated files/content/verdicts to the ASCII,
  and repair mismatches until the declared contract passes.
- `Out:` live database creation, live email/Telegram delivery, production
  scheduling, applying the installer to the live workspace, and deletion of
  non-POC data.
- `Historical attempt:` keep existing source and evidence temporarily for
  comparison, but treat every 2026-08-21 live-POC result as superseded and not
  acceptance evidence for this redesigned ticket.

## Design reference

The prior proof had an invented three-database, area-first fixture. The current
contract is deliberately different: Projects remain durable memory; Tasks hold
issue-level and embedded Meeting evidence; project weekly reports aggregate to
Area then Company rollups. [The ASCII prototype](ascii-prototype.md) owns the
full database map, representative records, prompt wording, expected files,
expanded template checks, source gap, and UI states. `templates/` is the only
Kamdar template source; the runtime only receives its installed copy.

## Program

1. [complete] Import pinned canonical templates and define derived Area/Company
   rollups plus Daily artifact contracts in `templates/`.
2. [complete] Extend the installer, `.hermes.md`, and the `kamdar-company-os`
   operational skill so the real directory and workspace templates are routable.
3. [complete] Define file/template/content/behavior assertions in
   `evals/evals.json` and update the ASCII output surface.
4. [complete] Build one frozen mock fixture from the representative ASCII records and a
   template-aware runner that evaluates every row in `evals/evals.json`.
5. [complete] Build/revise the local proof UI to render the same template-first rows,
   expanded content expectations, Daily result, Weekly result, trace, gaps, and
   generated files.
6. [complete] Run Daily first, then Weekly project -> area -> company aggregation; compare
   artifacts to the ASCII and repair each observed mismatch.
7. [complete] Capture deterministic, browser, visual, agent/eval, demo, drift, and final
   review evidence. Keep any live schema/install/provider work separate.

## Prototype Note

- `Hypothesis:` agreeing on one realistic ASCII environment and output makes
  schema, prompt, template, and eval mistakes visible before code or live writes.
- `Scale risk:` rebuilding seven databases, two automations, providers, and a UI
  before the information architecture is stable.
- `Representative slice:` two areas, two projects, five Work Items including a
  Meeting, four People, one Decision candidate, one Resource candidate, one
  prior project report, and one missing-source edge case.
- `Manual move:` inspect the frozen proof UI against the ASCII rather than
  trusting a passing assertion count alone.
- `Promote criteria:` the frozen runner consumes `evals/evals.json`, renders
  template-first assertion rows, and proves the Daily-to-Weekly chain without
  provider writes.
- `Revise / stop criteria:` any database lacks a clear owner or use; a derived
  file duplicates canonical records; a template cannot be named; or the prompt
  needs hidden assumptions to explain expected behavior.
- `Next scale:` one frozen mock -> three adversarial variants -> bounded live POC.

## Agent Contract

- `Open:` read `tickets/TASK-0001/ascii-prototype.md`, `evals/evals.json`, and
  `templates/README.md`; use the real source routes in `workspace.hermes.md`.
- `Test hook:` validate that each file assertion names a template/version and
  that the frozen runner renders the same template-first rows.
- `Stabilize:` frozen week `2026-W34`, timezone `Asia/Kuala_Lumpur`, sanitized
  IDs and contacts, no provider calls.
- `Inspect:` database map, sample entries, prompts, source-selection trace,
  file tree, expandable assertion rows, and no-write receipt.
- `Key states:` Story, Company OS, Daily prompt/result, Weekly prompt/result,
  Expected Files, Edge Cases.
- `QA cookbook:` none yet; seed only after ASCII approval.
- `Taste refs:` Howie-style quiet light proof surface, but structure must follow
  the approved ASCII rather than the prior implementation.
- `Expected artifacts:` frozen fixture/run, generated file tree, rendered UI,
  comparison receipt, screenshots/demo, and ticket review receipt.
- `Delegate with:` `TASK-0001`, this file, `ascii-prototype.md`, and
  `evals/evals.json`; preserve all external-write gates.

## Done / Proof

### Done conditions

- [x] Seven-database target model, source-pinned templates, and report hierarchy
      are reflected in the design/configuration.
- [x] Daily/Weekly contracts route the real Kamdar directory and inspect hidden
      Meeting blocks in complete changed Task pages.
- [x] Every expected file names event, governing template/version, and expanded
      content contract in `evals/evals.json`.
- [x] Edge assertions cover source windows, missing data, promotion gates,
      routing order, healthy-work suppression, idempotency, and immutability.
- [x] Frozen runner/UI consume `evals/evals.json` and render the approved rows.
- [x] Mock Daily and Weekly runs prove all declared assertions without providers.
- [x] Generated files, contents, trace, expected source gap, and UI states are
      compared against the ASCII with mismatches repaired or explicitly blocked.

### Metrics and gates

- `mechanical metrics:` 7 database purposes mapped; 5 pinned canonical template
  refs; 5 Kamdar-derived artifact templates; 100% expected files name a
  template/version and content contract.
- `rubrics:` spec-contract, implementation-plan, prompt-quality, eval-quality,
  integration-readiness, evidence-quality.
- `required TAS:` source configuration review TAS-A passed; runner/UI needs a
  separate implementation and execution review.
- `hard gates:` no live schema provisioning, installation, delivery, scheduling,
  or provider writes; no template-less report assertion; no Task-as-Project
  substitution.

### Evidence

- `ASCII:` `tickets/TASK-0001/ascii-prototype.md`
- `Cleanup:` `tickets/TASK-0001/artifacts/cleanup/2026-08-21-poc-notion-cleanup.md`
- `Design review:` `tickets/TASK-0001/artifacts/review/ascii-contract-review.md`
- `Configuration review:` `tickets/TASK-0001/artifacts/review/template-routing-review.md`
- `Canonical templates:` HermesCorp `templates/{project,task,decision,resource,weekly-report}.md`
- `Kamdar template registry:` `templates/README.md`
- `Assertion source:` `evals/evals.json`
- `Implementation program:` `tickets/TASK-0001/implementation-program.md`
- `Implementation progress:` `tickets/TASK-0001/implementation-progress.md`
- `Native Goal prompt:` `tickets/TASK-0001/artifacts/implementation-goal-prompt.md`
- `Goal Packet review:` `tickets/TASK-0001/artifacts/review/implementation-goal-packet-review.md`
- `Frozen proof QA:` `tickets/TASK-0001/artifacts/qa/frozen-proof/result.json`
- `Frozen proof report:` `tickets/TASK-0001/artifacts/qa/frozen-proof/report.md`
- `Visual QA:` `tickets/TASK-0001/artifacts/qa/frozen-proof/visual-independent-review.md`
- `Agent evidence review:` `tickets/TASK-0001/artifacts/qa/frozen-proof/agent-evidence-review.md`
- `Implementation rereview:` `tickets/TASK-0001/artifacts/review/template-first-implementation-rereview.md`
- `Goal drift review:` `tickets/TASK-0001/artifacts/review/template-first-drift-review.md`
- `Best UI evidence:` `tickets/TASK-0001/artifacts/qa/frozen-proof/screens/ui-home-playwright.png`
- `Demo MP4:` `tickets/TASK-0001/artifacts/demo/frozen-proof-recap/final.mp4`
- `Demo result:` `tickets/TASK-0001/artifacts/demo/frozen-proof-recap/result.json`
- `Completion review:` `tickets/TASK-0001/artifacts/review/frozen-proof-completion-review.md`

## Run Hints

- `likely_size:` large; configuration foundation is complete, runner/UI is next.
- `Goal recommendation:` yes for runner/UI implementation.
- `proof_weight:` template conformance + deterministic fixture + browser QA.
- `batchability:` no; Daily must pass before Weekly and UI expansion.
- `human_gate:` separate approval for live schema creation, installation,
  scheduling, and provider writes.

## State

- `approval:` Goal-approved for local frozen implementation; runtime mutation
  remains unapproved
- `current:` local frozen runner/UI proof is complete: 23/23 declared
  assertions and 8/8 ASCII comparisons pass; implementation remains
  provider-free
- `blockers:` none for the local frozen proof; live database schema/install/
  provider writes remain a separately approved follow-on
- `live_cleanup:` old namespaced Notion POC subtree moved to Trash

## Links

- `ascii:` `tickets/TASK-0001/ascii-prototype.md`
- `prior_goal_program:` `tickets/TASK-0001/program.md` (`superseded`)
- `prior_progress:` `tickets/TASK-0001/progress.md` (`superseded`)
- `implementation_program:` `tickets/TASK-0001/implementation-program.md`
- `implementation_progress:` `tickets/TASK-0001/implementation-progress.md`
- `implementation_prompt:` `tickets/TASK-0001/artifacts/implementation-goal-prompt.md`
- `qa_result:` `tickets/TASK-0001/artifacts/qa/frozen-proof/result.json`
- `qa_report:` `tickets/TASK-0001/artifacts/qa/frozen-proof/report.md`
- `visual_qa:` `tickets/TASK-0001/artifacts/qa/frozen-proof/visual-independent-review.md`
- `agent_evidence_review:` `tickets/TASK-0001/artifacts/qa/frozen-proof/agent-evidence-review.md`
- `implementation_rereview:` `tickets/TASK-0001/artifacts/review/template-first-implementation-rereview.md`
- `drift_review:` `tickets/TASK-0001/artifacts/review/template-first-drift-review.md`
- `best_ui_evidence:` `tickets/TASK-0001/artifacts/qa/frozen-proof/screens/ui-home-playwright.png`
- `showcase_evidence:` `tickets/TASK-0001/artifacts/qa/frozen-proof/screens/showcase-playwright.png`
- `demo_mp4:` `tickets/TASK-0001/artifacts/demo/frozen-proof-recap/final.mp4`
- `demo_result:` `tickets/TASK-0001/artifacts/demo/frozen-proof-recap/result.json`
- `completion_review:` `tickets/TASK-0001/artifacts/review/frozen-proof-completion-review.md`
- `prior_artifacts:` `tickets/TASK-0001/artifacts/` (`superseded` except cleanup)

## Notes

- Do not delete the first attempt's source/evidence until the replacement is
  accepted; it remains useful as a negative example and comparison baseline.
- The Drive POC folder and sent messages were not part of this Notion database
  cleanup request and remain untouched.
