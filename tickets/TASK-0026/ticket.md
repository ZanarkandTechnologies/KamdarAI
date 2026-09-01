---
template_id: ticket-template
template_version: "0.3.2"
ticket_id: TASK-0026
title: Complete the one-click setup proof pipeline
status: qa
created_at: 2026-09-01T06:30:00+08:00
updated_at: 2026-09-01T13:23:00+08:00
depends_on: [TASK-0025]
ui_scope: false
feature_refs: []
---

# TASK-0026: Complete the one-click setup proof pipeline

## Summary

Make `setup.cmd` and `setup.py launch` deliver the complete customer journey:
reviewed workspace configuration, fail-closed provider connections, optional
profile-owned Notion webhook verification, real read-only source readiness,
one shared operated PM Daily/Weekly eval, a judged receipt, and an opened local
evidence dossier. Every post-install stage must have a stable rerun command.

## Decision

```text
Windows launcher
  -> host prerequisites + selected-profile gateway + ngrok lifecycle
  -> interactive Python stage owner
       -> workspace
       -> connection configuration and certification
       -> optional webhook human gate and live reply proof
       -> doctor preflight (real selected sources, read-only)
       -> doctor eval (one shared PM Daily/Weekly run, no provider writes)
       -> dossier build and localhost open
```

`setup.cmd` owns host process orchestration. Python owns prompts, bounded source
reads, receipts, judgments, and routing. Hermes and its profile remain on the
Windows host; Docker remains Hermes' terminal backend and ngrok's runtime.

## Scope

- Require selected Notion and Composio MCPs to connect and test before setup
  advances; an explicit maintenance rerun remains available.
- Keep Telegram native to Hermes and require an exact tested recipient before
  automatic delivery can be installed.
- Prevent another Hermes profile's gateway from satisfying the selected
  profile readiness check.
- Add a read-only preflight that fetches each selected source, distinguishes
  inaccessible, empty, and structurally insufficient data, and writes a
  redacted receipt with actionable failures.
- Add `setup.py doctor preflight` as the stable preflight rerun surface.
- Add a shared PM Daily/Weekly eval run that invokes each automation once,
  judges every owned eval, writes `eval-receipt.json`, builds the private
  dossier, and supports `setup.py doctor eval` and `setup.py doctor open`.
- Route the first install through preflight and eval only after required
  connection and optional webhook gates pass.
- Preserve analysis-only behavior: no provider mutation, messaging, artifact
  sync, or production delivery during preflight or eval.
- Update customer, operator, and autonomous-testing documentation.

## Non-goals

- No new provider abstraction, semantic extraction schema, delivery runtime,
  public dashboard, or containerized Hermes profile.
- No secrets, provider content, OAuth material, or unsanitized eval artifacts
  in Git.
- No claim that macOS proves the operated clean Windows journey.

## Done / Proof

- [x] `setup.cmd` cannot accept another profile's gateway as `kamdar-ai`.
- [x] Notion and Composio configuration failures stop the first-install flow.
- [x] Automatic Telegram delivery requires a passed exact-route test.
- [ ] Optional webhook verification captures the Notion token and proves one
      exact threaded reply through the selected profile.
- [x] `setup.py doctor preflight` checks every configured source read-only and
      returns nonzero for inaccessible, empty, or structurally insufficient
      required data with a redacted receipt.
- [ ] Preflight can pass against the canonical seed-backed isolated environment
      without mutating source records.
- [x] `setup.py doctor eval` runs PM Daily and PM Weekly once each, judges all
      current eval cases, emits a valid receipt, builds the dossier, and returns
      nonzero for failed or missing judgments.
- [x] `setup.py doctor open` opens only the latest valid private dossier.
- [x] First install orders connections, optional webhook, preflight, eval, and
      dossier without reporting READY when a required stage failed.
- [x] Maintenance exposes independent integration, preflight, eval, health,
      and dossier reruns.
- [x] Focused setup/eval tests, full deterministic tests, context validation,
      Docker-backend proof, and `git diff --check` pass.
- [x] The operated live-provider/Windows lanes are either captured or named as
      explicit remaining human/environment gates.

## QA Strategy

1. Unit-test parser/routing, preflight status classification, receipt
   redaction, shared-run invocation count, judge completeness, dossier build,
   selected-profile gateway detection, and failure exit codes.
2. Run the focused installer, Doctor, Notion webhook, and eval-viewer suites
   with Hermes' bundled Python.
3. Run the full network-free repository suite and context validator.
4. Run Hermes' real no-network Docker-backend receipt probe.
5. Operate the selected local profile only for explicitly authorized provider
   reads; do not send, publish, or mutate production data.
6. Preserve the Windows clean-machine journey as residual risk until actually
   operated on Windows.

## Agent Contract

- **Open:** `setup.cmd` on Windows; `setup.py doctor preflight|eval|open` for
  stage-specific reruns.
- **Test hook:** canonical seed fixtures, temporary profiles, stubbed Hermes
  command boundaries, and the named live profile for authorized read-only QA.
- **Inspect:** redacted receipts, exit status, selected profile path, provider
  inventory, source counts/field findings, automation invocation counts,
  eval-result completeness, dossier model, and Docker receipt. Isolated eval
  runs live under the private installed workspace mount so Docker file tools and
  the host-side dossier validator observe the same files.
- **Failure states:** missing credential, incomplete OAuth, wrong gateway
  profile, unreachable ingress, absent verification request, empty source,
  missing minimum fields, failed cadence, incomplete judge, stale dossier.
- **Safety:** selected-source reads only; no provider mutations, messaging,
  publishing, or installation from Doctor stages.

## Lean Receipt

```yaml
target: complete setup proof pipeline
rung: reuse_local
evidence:
  - provider catalog and connection evals already own selected integrations
  - native Hermes chat already owns analysis-only Daily and Weekly execution
  - PM skill eval catalogs already own expected cases and assertions
  - eval viewer already owns receipt-to-dossier projection
smallest_next_action: connect these existing owners with explicit preflight and eval commands; add no new semantic framework
proof_preserved: real reads and live model remain operated boundaries; deterministic code only gates structure, completeness, safety, receipts, and routing
review_route: QA plus independent implementation review
```

## Links

- `apps/installer/docs/customer-setup.md`
- `apps/installer/provider_catalog.py`
- `apps/installer/connection_evals.py`
- `apps/doctor/`
- `apps/eval_viewer/`
- `skills/pm-daily/evals/evals.json`
- `skills/pm-weekly/evals/evals.json`
- `docs/autonomous-testing.md`
- `tickets/TASK-0026/artifacts/qa/20260901T130800-one-click-setup/report.md` — QA verdict: revise pending external acceptance gates
- `tickets/TASK-0026/artifacts/qa/20260901T130800-one-click-setup/result.json`
- `tickets/TASK-0026/artifacts/qa/20260901T130800-one-click-setup/evidence.json` — strongest local and operated proof
- `tickets/TASK-0026/artifacts/docker-backend-final.json` — real host-persistence proof after container teardown
- `tickets/TASK-0026/artifacts/qa/20260901T133500-live-provider/report.md` — live Drive/Gmail pass and Telegram/sync configuration blockers
- `tickets/TASK-0026/artifacts/qa/20260901T133500-live-provider/result.json` — QA verdict: revise
