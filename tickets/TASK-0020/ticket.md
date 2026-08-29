---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0020
title: Add a safe doctor command and two-stage eval delivery boundary
status: todo
claimed_by: null
created_at: 2026-08-28T08:20:25Z
updated_at: 2026-08-28T08:20:25Z
depends_on: [TASK-0022]
ui_scope: true
feature_refs: [FEAT-0011, FEAT-0001, FEAT-0002, FEAT-0003, FEAT-0004, FEAT-0005, FEAT-0006, FEAT-0007, FEAT-0010]
---

# TASK-0020: Add a safe doctor command and two-stage eval delivery boundary

## Summary

Ship one source-owned doctor command that proves the useful read-only path end
to end: fetch the configured company data, run the AI, validate and render the
candidate outputs, judge their quality, and save an inspectable preview without
invoking downstream integrations. Split Daily, Weekly, and Meeting Intake
execution into an
immutable `prepare` handoff and a separate explicit `deliver` step so the same
generated files can be reviewed and later applied without regeneration.

## Scope

- **In:** one cross-platform doctor entry point; static setup health; read-only
  fetches from the exact configured sources; real model inference; Daily,
  Weekly, and Meeting preview runs; isolated local run roots; frozen fixture
  mode for deterministic CI; exact artifact inventory; end-user artifact
  quality checks; immutable handoff manifests with hashes; separate explicit
  delivery entry points; delivery enablement owned by schedule/config; redacted
  JSON and human receipts; exit codes; installed-distribution packaging.
- **Out:** provider or production writes from doctor; assuming a skipped write
  passed; automatic credential repair; destructive fixes; retesting every CLI
  wrapper; full development harness distribution; replacing Hermes generic
  doctor; proving provider-write correctness in the default lane; giving the
  AI integration tools during preview; treating model spend as zero-cost.
- **Split trigger:** `prepare` is deterministic content proof; `deliver` is an
  externally authorized side effect with separate receipts and operated QA.

## Delta

> **Before:** Daily and Weekly contracts generate validated output and then
> continue into provider writes, while repository health and eval commands are
> scattered. A doctor cannot exercise realistic generation without risking the
> downstream integration steps.
>
> **After:** One doctor command fetches real configured inputs read-only, runs
> the AI without integration tools, validates/renders every candidate, and
> stops at a hash-bound local handoff. A separate `deliver` command consumes
> that exact handoff only when delivery is explicitly enabled and authorized.
>
> **Example:** The Daily doctor lane creates context, result, rendered report,
> quality review, and handoff files; reports `delivery: not_requested`; records
> zero provider calls; and still fails if the large report is malformed.

## Map

```text
configured source --read only--> source snapshot
                                   |
                                   v
                               AI generation
                         (schema + template; no tools)
                                   |
                                   v
                         validate -> render -> judge
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

It runs the same five understandable lanes for each selected cadence:

1. **Setup** — required profile, workspace, source bindings, model access, and
   schedules exist. This lane checks configuration and presence, not secrets.
2. **Fetch** — read the exact configured Projects, Work, Meetings, and Report
   sources into a private local snapshot through an explicit read-operation
   allowlist. Provider mutation methods are not available to this lane, and the
   receipt retains the redacted provider-call trace.
3. **Generate** — pass the snapshot, schema, and output template to the model.
   The model receives no provider, messaging, or delivery tools.
4. **Check** — validate structure, source closure, artifact completeness, and
   end-user quality; render the actual preview a recipient would eventually see.
5. **Save preview** — write the snapshot, candidate JSON, rendered Markdown,
   quality review, handoff manifest, and doctor receipt below profile-owned
   private state with owner-only permissions. End with
   `Delivery: NOT RUN (doctor is read-only)`.

`doctor` may perform provider reads and paid model inference, so the receipt
states both explicitly. It never writes to Notion, sends messages, marks Work
processed, updates Reports, or changes schedules. Deterministic CI calls the
same orchestration with `--fixtures`; that option replaces source fetch and
model inference with frozen inputs but preserves validation and rendering.
Doctor defaults to all three cadences. Exit `0` means every required preview
lane passed, `1` means required company information is missing, and `2` means
fetch, generation, validation, quality, privacy, or isolation failed. An
optional setup issue is a warning under `WORKING` when it cannot affect the
selected previews; otherwise it is `FAILED`. `not_run_by_design` delivery never
downgrades an otherwise passing doctor run.

Doctor starts only after TASK-0022 reports every required configured source as
certified for the current binding hash. Connection certification may perform
explicitly approved isolated provider writes; Doctor remains read-only and
must never absorb those tests.

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
  daily/
  weekly/
  meeting-intake/
    source-snapshot.json   # fetched read-only input; private
    candidate.json         # exact structured AI output
    preview.md             # human-readable output to inspect
    quality-review.json    # structural and semantic verdicts
    handoff.json           # hashes + authority-neutral delivery plan
```

The user-facing command names have one meaning each:

| Command | Fetch configured data | Run AI | Write downstream | Meaning of green |
| --- | --- | --- | --- | --- |
| `setup.py verify` | No | No | No | installation and packaged frozen contracts are present |
| `setup.py verify --live` | Connectivity probes only | No | No workflow writes | configured services are reachable; not an AI eval |
| `setup.py doctor` | Yes, read-only | Yes | No | real preview was generated and passed checks |
| `setup.py doctor --fixtures` | No | Frozen candidate | No | deterministic preview contract passed |
| `run_automation.py prepare` | Yes, read-only | Yes | No | a deliverable handoff is ready |
| `run_automation.py deliver` | No regeneration | No | Yes, if enabled and authorized | exact handoff was applied and read back |

## Comprehension Risks

- **“Eval” currently means two different things.** The Daily suite includes
  output-quality cases and cases named `applies-and-verifies-prepared-changes`,
  while the eval README says active evals never authorize provider calls. Move
  apply/read-back/idempotency cases to a separately named delivery-contract
  suite so `eval` consistently means preview and judgment.
- **The current commands mainly run validators.** `npm test` proves the harness
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
- **Fixture proof and live read-only proof can be mistaken for each other.** The
  receipt names `input_mode: configured_sources|fixtures` and
  `model_mode: live|frozen`, and the human summary prints these near the top.
- **“No writes” can be weakened by agent freedom.** Fetching is host-owned and
  read-only; generation receives a snapshot and no tools. Safety therefore does
  not depend on the prompt telling an otherwise write-capable agent to behave.

## Change Plan

1. Define the doctor lane/receipt schema and a shared handoff manifest that
   binds cadence, input/model modes, source snapshot, validated result,
   rendered output inventory, quality verdicts, hashes, downstream-call count,
   and `delivery_state: not_requested|ready|blocked`.
2. Refactor Daily, Weekly, and Meeting Intake automation contracts/runners into
   `prepare` and `deliver`. `prepare` owns all file production and
   semantic/deterministic evaluation. `deliver` accepts only a passing,
   unchanged handoff plus explicit authority; it owns provider calls,
   read-back, idempotency, and receipts.
3. Add `setup.py doctor` backed by one Python orchestrator. It runs static
   health, host-owned read-only source fetch, tool-free structured model calls,
   and Daily/Weekly/Meeting validation/rendering in private run roots. It
   captures duration, verdict, and evidence paths and never imports a delivery
   adapter. Reuse existing unittest and Node validators rather than creating a
   second eval framework.
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
6. Prove zero downstream effects with a fail-if-called adapter, malformed and
   stale handoffs, disabled delivery, explicit authorized delivery, and
   unchanged rerun. Package the same doctor after TASK-0017 supplies the
   installed lifecycle entry point.

## Done / Proof

```yaml
metric: all prepare lanes pass with zero downstream calls
done:
  - One doctor command fetches configured data read-only and runs the AI for every selected preview eval.
  - Fixture mode proves the same validation and rendering path deterministically.
  - Doctor produces inspectable intermediate files and never calls downstream integrations.
  - Every selected feature reports valuable output no change needed I don't know not enough information or failed in plain language.
  - An empty output cannot pass unless complete checked evidence proves no change was needed.
  - Missing required evidence produces structured information gaps and a non-green doctor result.
  - A complete source fixture fails when extraction incorrectly claims insufficient information.
  - Existing output fails when it is ungrounded incomplete unreadable or not useful.
  - Feature-specific observable assertions survive as scenario reference points rather than being replaced by generic quality labels.
  - Daily Weekly and Meeting delivery consume an unchanged passing handoff in a separate invocation.
  - Disabled or absent delivery is reported as not_requested rather than passed.
  - Provider receipts and idempotency live in a clearly separate delivery-contract suite.
  - JSON and human doctor receipts pass secret and private-content redaction tests.
rubric_families: [implementation-plan, eval-quality, integration-readiness, evidence-quality]
required_tas_gates: [implementation-plan, eval-quality, integration-readiness, evidence-quality]
hard_gates: [doctor cannot reach delivery code, no false green, no secret output, no production mutation]
checks:
  - doctor lane receipt and exit-code tests
  - configured-source and frozen Daily Weekly and Meeting preview evals
  - enough-information no-change and insufficient-information scenario per feature
  - valuable-output quality and unsupported-output rejection cases
  - fail-if-called downstream adapter assertion
  - handoff hash and quality-gate rejection tests
  - explicit delivery and idempotent rerun tests against an isolated eval sink
evidence:
  - tickets/TASK-0020/progress.md
  - tickets/TASK-0020/artifacts/doctor-receipts/
  - tickets/TASK-0020/artifacts/handoffs/
  - tickets/TASK-0020/artifacts/review/plan-review.md
```

## Agent Contract

- **Open:** `setup.py doctor` defaults to configured read-only sources plus live
  model generation; `--fixtures` is deterministic; delivery is a different
  explicit command/invocation.
- **Test hook:** fake lane runner, disposable output roots, and a downstream
  adapter that throws if doctor reaches it.
- **Stabilize:** isolated configured sources or fixed fixtures, frozen clock,
  exact artifact inventory, and hash-bound handoff manifests.
- **Inspect:** per-lane command, duration, verdict, evidence paths, handoff
  hashes, resolved delivery-policy source, downstream-call count, aggregate
  exit code, and redaction scan.
- **Key states:** fetch blocked, generation blocked, preview passed, quality
  failed, delivery not run by design, stale handoff, delivery blocked, delivery
  applied, idempotent delivery rerun.
- **QA cookbook:** none yet.
- **Expected artifacts:** doctor receipts, prepare handoffs, and isolated
  delivery receipts for every boundary state; copy-complete non-technical
  summary assertions from `design.md`.
- **Delegate with:** TASK-0020 and this file; write progress/evidence here.

## Run Hints

```yaml
likely_size: medium
goal_recommended: true
compute_hint: read-only provider/model run, deterministic suite, isolated delivery QA
proof_weight: deterministic with isolated operated boundary proof
batchable: false
no_batch_reason: the prepare/deliver boundary is the safety contract
human_gates: [delivery authorization, later installed-distribution packaging]
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
proof_preserved: deterministic fixtures remain for CI; live read-only fetch and model inference become explicit lanes; delivery read-back and idempotency remain separate operated proof
review_route: review:implementation-plan
```

## State

- **Current:** todo; existing validators distinguish structured results from
  integration receipts, but the suite language mixes preview quality with
  apply/read-back behavior and the documented command does not visibly prove a
  configured-source fetch plus model run.
- **Next:** implement `setup.py doctor`, then split Daily/Weekly/Meeting preview
  cases from delivery-contract cases without weakening either proof surface.
- **Blockers:** none for the source-first slice. External delivery QA still
  requires an isolated authorized eval sink.

## Links

- `evals/`
- `automations/daily-operating-update.md`
- `automations/weekly-operating-review.md`
- `evals/filesystem/scripts/unified-daily-review-eval.mjs`
- `evals/filesystem/scripts/unified-weekly-review-eval.mjs`
- `scripts/setup_runtime.py`
- `schemas/automations/`
- `docs/features/README.md`
- `tickets/TASK-0020/design.md`
