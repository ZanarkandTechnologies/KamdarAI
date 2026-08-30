---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0020
title: Add a safe doctor command and two-stage eval delivery boundary
status: in_progress
claimed_by: null
created_at: 2026-08-28T08:20:25Z
updated_at: 2026-08-31T00:00:00Z
depends_on: [TASK-0022]
ui_scope: true
feature_refs: [FEAT-0011, FEAT-0001, FEAT-0002, FEAT-0003, FEAT-0004, FEAT-0005, FEAT-0006, FEAT-0007, FEAT-0010]
---

# TASK-0020: Add a safe doctor command and two-stage eval delivery boundary

## Summary

Ship one source-owned doctor command that proves the useful read-only path end
to end: fetch the configured company data, run the AI, validate and render the
candidate outputs, judge their quality, and save an inspectable preview without
invoking downstream integrations. The operated acceptance lane uses the real
authenticated workspace, selected integration tools, and live model. No mock,
fixture, synthetic provider, or frozen-candidate lane is part of this test. It
also renders a provenance-backed
`workspace.hermes.md` proposal from the selected integration bindings and
observed read-only metadata, without installing that proposal automatically.
Split Daily, Weekly, and Meeting Intake
execution into an
immutable `prepare` handoff and a separate explicit `deliver` step so the same
generated files can be reviewed and later applied without regeneration.

## Scope

- **In:** one cross-platform doctor entry point; static setup health; read-only
  fetches from the exact configured sources; real model inference; Daily,
  Weekly, and Meeting preview runs; isolated local run roots; exact artifact
  inventory; end-user artifact
  quality checks; immutable handoff manifests with hashes; separate explicit
  delivery entry points; delivery enablement owned by schedule/config; redacted
  JSON and human receipts; a candidate workspace contract plus field-level
  provenance and unresolved gaps; exit codes; installed-distribution packaging.
- **Out:** provider or production writes from doctor; assuming a skipped write
  passed; automatic credential repair; destructive fixes; retesting every CLI
  wrapper; full development harness distribution; replacing Hermes generic
  doctor; proving provider-write correctness in the default lane; registering
  mutation, messaging, destination, publishing, or delivery tools or
  downstream platform skills during preview; treating model spend as zero-cost.
  The exact selected source-integration read tools remain available.
- **Out:** any mocked provider, fixture source, frozen candidate, fake command
  adapter, or synthetic record in the Doctor path; scanning every object visible to an OAuth identity to guess company
  scope; silently replacing the source-owned or installed `workspace.hermes.md`;
  and exposing private source payloads in repository or CI artifacts.
- **Split trigger:** `prepare` is real-data content proof; `deliver` is an
  externally authorized side effect with separate receipts and operated QA.

## Delta

> **Before:** Daily and Weekly contracts generate validated output and then
> continue into provider writes, while repository health and eval commands are
> scattered. A doctor cannot exercise realistic generation without risking the
> downstream integration steps.
>
> **After:** One doctor command fetches real configured inputs through an exact
> read-operation allowlist, renders a proposed workspace contract with
> field-level provenance, runs the AI with only the selected source-integration
> read tools,
> validates/renders every candidate, and stops at a hash-bound local handoff.
> A separate `deliver` command consumes that exact handoff only when delivery
> is explicitly enabled and authorized.
>
> **Example:** The Daily doctor lane creates context, result, rendered report,
> quality review, and handoff files; reports `delivery: not_requested`; records
> real read calls but zero provider mutations or downstream calls; and still
> fails if the large report is malformed.

## Map

```text
selected bindings + connected-account metadata
                    |
                    +--read only--> workspace proposal + provenance/gaps
                    |
configured source --selected real read tools--> source snapshot
                                   |
                                   v
                               AI generation
                   (schema + template + selected source reads)
                                   |
                                   v
                 close source session -> validate -> render -> judge files
                                   |
                                   v
                         local preview + handoff
                                   |
                    doctor stops: delivery not run
                                   |
                  explicit, separately authorized command
                                   v
               verify hash -> deliver -> read back -> receipt
```

## Operator Contract

The accepted non-technical result hierarchy, literal status copy, feature
outcome contract, and lean eval-authoring model live in `design.md`. The core
action is “check whether each automation produced a trustworthy preview”; raw
test names and schema internals remain secondary evidence.

The primary product command is:

```bash
python3 setup.py doctor --profile-home /absolute/profile/path
```

It runs the same six understandable lanes for each selected cadence:

1. **Setup** — required profile, workspace, source bindings, model access, and
   schedules exist. This lane checks configuration and presence, not secrets.
2. **Fetch and generate with the selected integrations** — start a fresh Hermes
   run whose registry contains only the reviewed read operations for the
   selected Notion, Drive, Gmail, or other configured source roles and exact
   target roots. The agent may call those real integration tools to inspect the
   company data, build the private source snapshot, and generate the candidate.
   Mutation operations, messaging/send tools, destination adapters, and
   downstream publishing skills are absent from the registry before the first
   turn. Preserve the redacted real tool-call inventory and hashes, never the
   fetched payloads, in the receipt.
3. **Bind workspace** — combine the selected provider roles, existing approved
   URLs/IDs, connected-account metadata, and observed source schemas into
   `workspace-proposal.md` plus `workspace-binding-review.json`. Every managed
   value cites its source and is marked `confirmed`, `inferred`, or
   `unresolved`. Never enumerate unrelated accessible roots, invent a company
   boundary, or overwrite `workspace.hermes.md`; an unresolved exact root
   remains a setup gap.
4. **Generate locally from real reads** — during that same restricted Hermes
   run, give the model the schema and output template and allow additional calls
   only to the selected read tools when evidence is missing. It writes the
   snapshot and candidate under the private run root; it has no filesystem path
   to a provider destination and no registered mutation or delivery operation.
5. **Check intermediary files only** — close only the run-scoped source tool
   handles without disabling or revoking the configured integrations,
   then validate structure, source closure, artifact completeness, and end-user
   quality from the immutable snapshot/candidate files. The semantic judge uses
   a separate direct model call with no provider tools and cannot fetch, edit,
   regenerate, publish, or deliver anything.
6. **Save preview** — write the snapshot, candidate JSON, rendered Markdown,
   quality review, handoff manifest, and doctor receipt below profile-owned
   private state with owner-only permissions. End with
   `Delivery: NOT RUN (doctor is read-only)`.

`doctor` may perform provider reads and paid model inference, so the receipt
states both explicitly. It never writes to Notion, sends messages, marks Work
processed, updates Reports, or changes schedules. Only
`input_mode: configured_sources` plus `model_mode: live`, with a redacted real
provider-call inventory, is a Doctor run. There is no fixture or provider
substitute. Static schema tests remain separate repository checks and make no
end-to-end claim.
Doctor defaults to all three cadences. Exit `0` means every required preview
lane passed, `1` means required company information is missing, and `2` means
fetch, generation, validation, quality, privacy, or isolation failed. An
optional setup issue is a warning under `WORKING` when it cannot affect the
selected previews; otherwise it is `FAILED`. `not_run_by_design` delivery never
downgrades an otherwise passing doctor run.

TASK-0022 supplies the validated provider catalog, selected bindings, and
Hermes-owned authentication lifecycle. Doctor owns its own readiness proof: it
must successfully execute each exact configured read through its restricted
registry and bind that inventory to the current workspace hash. A TASK-0022
prompt-certification receipt, especially a side-effecting case, is neither a
prerequisite nor accepted as Doctor evidence.

Production automation remains two explicit invocations:

```bash
python3 scripts/run_automation.py prepare --cadence daily
python3 scripts/run_automation.py deliver --handoff /absolute/run/handoff.json
```

`--cadence` accepts `daily`, `weekly`, or `meeting-intake`. Meeting `prepare`
fetches the completed Meeting, generates and renders Task candidates, and
blocks incomplete commitments without creating Work. Meeting `deliver` alone
queries idempotency keys, creates accepted Tasks, reads them back, and proves
the unchanged-rerun behavior.

The schedule always runs `prepare`. It invokes `deliver` only when the
installed `.hermes.md` frontmatter owns an exact per-cadence switch:

```yaml
automation_delivery:
  daily: disabled
  weekly: disabled
  meeting-intake: disabled
```

Allowed values are `disabled|enabled`, with `disabled` as the template and
doctor/test-profile default. This switch permits the separate step to start;
it never overrides destination, environment, or write authority elsewhere in
`.hermes.md`. The handoff and receipt record the resolved field, source path,
and workspace-context hash as `delivery_policy_source`. Disabled delivery
records `not_requested` and exits successfully without pretending delivery passed.
`deliver` rejects a changed candidate, non-A quality review, missing authority,
wrong environment, or already-applied idempotency key.

The private run is intentionally small and inspectable, and never lives in the
repository or installed workspace:

```text
<profile-home>/state/kamdar-doctor/<run-id>/
  doctor-receipt.json      # aggregate lanes; downstream_calls must equal 0
  workspace-proposal.md    # candidate workspace.hermes.md; never auto-installed
  workspace-binding-review.json # field provenance, confidence, and gaps
  daily/
  weekly/
  meeting-intake/
    source-snapshot.json   # fetched read-only input; private
    candidate.json         # exact structured AI output
    preview.md             # human-readable output to inspect
    quality-review.json    # structural and semantic verdicts
    handoff.json           # hashes + authority-neutral delivery plan
```

These real-data files remain under the profile-owned private run root with
mode `0600` and are never copied into Git or CI artifacts. Repository evidence
may contain only redacted receipts, hashes, and privacy-scanned copies of real
handoffs.

The user-facing command names have one meaning each:

| Command | Fetch configured data | Run AI | Write downstream | Meaning of green |
| --- | --- | --- | --- | --- |
| `setup.py verify` | No | No | No | installation and packaged frozen contracts are present |
| `setup.py verify --live` | Connectivity probes only | No | No workflow writes | configured services are reachable; not an AI eval |
| `setup.py doctor` | Yes, read-only | Yes | No | real preview was generated and passed checks |
| `run_automation.py prepare` | Yes, read-only | Yes | No | a deliverable handoff is ready |
| `run_automation.py deliver` | No regeneration | No | Yes, if enabled and authorized | exact handoff was applied and read back |

## Comprehension Risks

- **“Eval” currently means two different things.** The Daily suite includes
  output-quality cases and cases named `applies-and-verifies-prepared-changes`,
  while the eval README says active evals never authorize provider calls. Move
  apply/read-back/idempotency cases to a separately named delivery-contract
  suite so `eval` consistently means preview and judgment.
- **The current commands mainly run validators.** `python3 -m unittest discover -s tests -p 'test_*.py' -v` proves the harness
  and expected artifacts, but it does not tell an operator whether configured
  data was fetched or the AI ran. Doctor must show `Fetch` and `Generate` as
  first-class lanes with timestamps, duration, and evidence paths.
- **Installed `feature_evals` currently sounds live when it is offline.** Keep
  that runner under `verify` and label it `frozen contract checks`; only doctor
  may claim that configured data was fetched and the AI ran.
- **Internal artifact names obscure the story.** Terms such as `context diff`,
  `base`, `judged`, `integration gate`, and `receipt` are useful internally but
  weak primary labels. The human surface uses `source snapshot`, `AI candidate`,
  `preview`, `quality check`, and `delivery not run`; exact schema names remain
  in JSON evidence.
- **A skipped write can look like an untested feature.** Doctor reports preview
  quality as pass/fail and delivery as `not_run_by_design`, never as skipped or
  passed. A separate delivery-contract result owns write/read-back confidence.
- **Static checks can be mistaken for operated proof.** Doctor has only
  `input_mode: configured_sources` and `model_mode: live`; repository schema
  checks are reported separately and cannot turn Doctor green.
- **“No writes” can be weakened by agent freedom.** The agent may use selected
  integration read tools, so safety is enforced by registry construction: no
  mutation, messaging, destination, publishing, or delivery operation exists.
  Safety does not depend on a prompt asking a write-capable agent to behave.
- **A connected credential may still have write scope.** Doctor does not rely
  on OAuth scope alone: it builds a provider registry containing only exact
  reviewed read operations and asserts no mutation handler or downstream
  platform skill is reachable. The selected source integrations stay enabled
  for evidence acquisition; their OAuth connection is never revoked or
  disabled by Doctor.
- **Workspace discovery can become an accidental broad scan.** The proposal
  compiler starts from selected roles and exact configured roots. It may inspect
  their schemas and linked records read-only, but it cannot search unrelated
  accessible spaces to infer company scope. Unknown routing remains explicit.
- **A quality check can become self-approval.** Deterministic schema,
  provenance, source-closure, and artifact-inventory gates run first. Semantic
  quality is a second, stateless live inference call through the same direct
  no-tools adapter, with an immutable candidate. Its receipt binds judge
  provider/model, prompt version and hash, rubric version and hash, candidate
  and source hashes, verdict, and failures; it cannot edit or regenerate the
  candidate it judges.

## Change Plan

1. Define the doctor lane/receipt schema and a shared handoff manifest that
   binds cadence, input/model modes, source snapshot, validated result,
   rendered output inventory, quality verdicts, hashes, downstream-call count,
   workspace proposal/review hashes, registered provider operations, source and
   installed workspace pre/post hashes, generation request-key inventory,
   judge identity/contract hashes, and
   `delivery_state: not_requested|ready|blocked`.
2. Refactor Daily, Weekly, and Meeting Intake automation contracts/runners into
   `prepare` and `deliver`. `prepare` owns all file production and
   semantic/deterministic evaluation. `deliver` accepts only a passing,
   unchanged handoff plus explicit authority; it owns provider calls,
   read-back, idempotency, and receipts.
3. Add `setup.py doctor` backed by one Python orchestrator. It runs static
   health, host-owned exact-allowlist source fetch, a provenance-backed
   workspace proposal, a restricted Hermes run with selected real read tools, and
   Daily/Weekly/Meeting validation/rendering in private run roots. It asserts
   the registered provider surface contains only the exact selected read
   operations and no mutation, messaging, destination, or delivery surface.
   Capture duration, verdict, real tool-call inventory, and evidence paths;
   never import a delivery adapter. Reuse existing unittest and Node validators
   for file validation rather than creating a second eval framework.
4. Split the mixed eval definitions for all three cadences: preview suites own
   fetch/generate/check; delivery-contract suites own apply/read-back/failure/
   idempotency. Add the `.hermes.md` `automation_delivery` map and make schedules
   resolve it before invoking delivery; absence or disablement yields
   `not_requested`, never `pass`.
5. Add one shared `FeatureOutcomeSchema` used by Daily, Weekly, and Meeting
   results. Every selected feature resolves exactly once to `produced`,
   `no_change_needed`, or `insufficient_information`; the runner alone adds
   `failed` for fetch, model, schema, rendering, or quality failures. Replace
   showcase-only non-empty assertions with outcome-aware invariants and the
   three canonical feature scenarios in `design.md`.
6. Prove zero downstream effects from operated real runs by capturing the exact
   registry and provider trace, hashing selected source records before/after
   when the provider exposes stable versions, and verifying no mutation,
   message, destination, or delivery call occurred. Exercise failure boundaries
   by interrupting or misconfiguring a disposable real run, not with mocks.
   Package the same doctor after
   TASK-0017 supplies the installed lifecycle entry point.
7. Hash the source-owned and installed `workspace.hermes.md` immediately before
   and after the operated run and fail on any change. Keep real snapshots,
   proposals, candidates, reviews, and handoffs profile-private; export only a
   redacted receipt plus hashes. Bind the separate live semantic judge to its
   exact model, prompt/rubric versions and hashes, immutable input hashes, and
   verdict.

## Done / Proof

```yaml
metric: all prepare lanes pass with zero downstream calls
done:
  - One doctor command fetches configured data read-only and runs the AI for every selected preview eval.
  - Every Doctor run uses the real authenticated workspace selected integration tools and live model with no fixture fake provider or frozen candidate mode.
  - Doctor renders a candidate workspace contract whose managed values are confirmed inferred or unresolved with exact provenance and never installs it automatically.
  - Doctor produces inspectable intermediate files and never calls downstream integrations.
  - Selected source integration reads remain enabled during acquisition and generation while provider mutation handlers messaging tools destinations and platform delivery skills are absent.
  - Semantic judging begins only after source sessions close and reads immutable intermediary files through a direct no-tools model call.
  - The semantic judge receipt binds its provider model prompt rubric immutable input hashes verdict and failures and the judge cannot edit the candidate.
  - Source-owned and installed workspace.hermes.md pre/post hashes are unchanged after every Doctor run.
  - Every selected feature reports valuable output no change needed I don't know not enough information or failed in plain language.
  - An empty output cannot pass unless complete checked evidence proves no change was needed.
  - Missing required evidence produces structured information gaps and a non-green doctor result.
  - A complete real source snapshot fails when extraction incorrectly claims insufficient information.
  - Existing output fails when it is ungrounded incomplete unreadable or not useful.
  - Feature-specific observable assertions survive as scenario reference points rather than being replaced by generic quality labels.
  - Doctor emits an unchanged hash-bound handoff that delivery could consume only in a separate explicitly authorized invocation not exercised by this test.
  - Disabled or absent delivery is reported as not_requested rather than passed.
  - Provider receipts and idempotency live in a clearly separate delivery-contract suite.
  - JSON and human doctor receipts pass secret and private-content redaction tests.
rubric_families: [implementation-plan, eval-quality, integration-readiness, evidence-quality]
required_tas_gates: [implementation-plan, eval-quality, integration-readiness, evidence-quality]
hard_gates: [doctor cannot reach delivery code, no mock fixture or fake provider path, no mutation handler registered, no downstream platform skill mounted, no broad workspace scan, no false green, no secret output, no production mutation]
checks:
  - doctor lane receipt and exit-code tests
  - configured-source live Daily Weekly and Meeting preview evals
  - real-provider operated receipt with exact read-operation inventory and zero registered mutation operations
  - generation registry equals the selected integration read allowlist and the separate semantic judge request contains no tools
  - semantic judge identity prompt rubric input-hash and verdict binding tests
  - source-owned and installed workspace pre/post no-change assertions
  - workspace proposal provenance unresolved-gap and no-auto-install tests
  - enough-information no-change and insufficient-information scenario per feature
  - valuable-output quality and unsupported-output rejection cases
  - operated trace assertion that no mutation messaging destination publishing or delivery call occurred
  - handoff hash and quality-gate rejection tests
evidence:
  - tickets/TASK-0020/progress.md
  - tickets/TASK-0020/artifacts/doctor-receipts/ (redacted metadata and hashes only)
  - tickets/TASK-0020/artifacts/sanitized-handoffs/ (privacy-scanned copies of real handoffs only)
  - tickets/TASK-0020/artifacts/review/plan-review.md
```

## Agent Contract

- **Open:** `setup.py doctor` uses configured real sources plus live model
  generation; delivery is a different explicit command/invocation.
- **Test hook:** real selected integrations, disposable Docker/profile state,
  exact registry/trace capture, and provider/source pre/post observations. No
  fake runner, mock provider, fixture source, or frozen candidate path exists.
- **Stabilize:** exact configured roots, bounded time window, immutable private
  snapshots, exact artifact inventory, and hash-bound handoff manifests.
- **Inspect:** per-lane command, duration, verdict, evidence paths, workspace
  proposal/review hashes, source/installed workspace pre/post hashes, registered
  read-operation inventory, zero mutation surface, generation/judge request-key
  inventories, judge contract hashes, handoff hashes, resolved delivery-policy
  source, downstream-call count, aggregate exit code, and redaction scan.
- **Key states:** fetch blocked, generation blocked, preview passed, quality
  failed, delivery not run by design, stale handoff, delivery blocked, delivery
  applied, idempotent delivery rerun.
- **QA cookbook:** none yet.
- **Expected artifacts:** profile-private real-data snapshots, proposals,
  candidates, reviews, and prepare handoffs; repository-safe redacted receipts,
  hashes, and privacy-scanned copies of real handoffs only; isolated delivery receipts remain
  a separate boundary. Preserve copy-complete non-technical summary assertions
  from `design.md`.
- **Delegate with:** TASK-0020 and this file; write progress/evidence here.

## Run Hints

```yaml
likely_size: medium
goal_recommended: true
compute_hint: real read-only provider/model run plus static file validators
proof_weight: operated real-data proof with deterministic file validation
batchable: false
no_batch_reason: the prepare/deliver boundary is the safety contract
human_gates: [one-time OAuth and exact configured source roots, later installed-distribution packaging]
```

## Lean Receipt

```yaml
target: read-only end-to-end doctor and prepare/deliver split
current_need: prove configured data fetch and AI output without downstream commitment
rung: reuse_local
evidence:
  - setup.py and scripts/setup_runtime.py already own setup verification and receipts
  - unified Daily and Weekly validators already own schema and artifact checks
  - automation result schemas already separate candidate claims from provider receipts
smallest_next_action: add one doctor orchestration path and split the existing suite/automation stages; do not add a new eval framework or provider abstraction
proof_preserved: real selected integration reads and live model inference are the sole Doctor lane; static validators remain non-E2E checks; delivery read-back and idempotency remain separate operated proof
review_route: review:implementation-plan
```

## Review Receipt

- **Verdict:** TAS-A / pass after independent re-review.
- **Rubrics:** implementation-plan TAS-A; eval-quality TAS-A;
  integration-readiness TAS-A; evidence-quality TAS-A.
- **Confirmed boundary:** real selected integrations remain enabled for exact
  read operations during acquisition and generation; only mutation, messaging,
  destination, publishing, delivery tools, and downstream skills are absent.
  Judging then evaluates immutable intermediary files with no provider tools.

## State

- **Current:** the source-owned Doctor/prepare path and typed Stage 2 plan,
  review/apply command, per-cadence policy, exact-target gates, multi-provider
  execution boundary, redacted receipts, and idempotency are implemented. The
  full offline suite passes.
- **Next:** operate one explicitly authorized isolated-eval handoff across the
  exact reviewed providers and reconcile the real read-back receipts.
- **Blockers:** external delivery QA still requires isolated-eval provider
  authority. Production remains unauthorized.

## Links

- `evals/`
- `automations/daily-operating-update.md`
- `automations/weekly-operating-review.md`
- `scripts/validate_eval_run.py`
- `scripts/run_installed_evals.py`
- `scripts/setup_runtime.py`
- `schemas/automations/`
- `docs/features/README.md`
- `tickets/TASK-0020/design.md`
- `tickets/TASK-0020/progress.md`
- `tickets/TASK-0020/artifacts/qa/20260831-stage-two/result.json`
