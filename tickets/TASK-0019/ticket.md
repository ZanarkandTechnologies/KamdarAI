---
template_id: ticket-template
template_version: "0.2.5"
ticket_id: TASK-0019
thread_id: "01a04c05-95d7-75c3-85ad-b6e94144d919"
title: Make private weekly reports the template-first workflow contract
status: in_progress
claimed_by: null
created_at: 2026-08-28T08:20:25Z
updated_at: 2026-08-29T00:00:00Z
depends_on: []
ui_scope: false
feature_refs: [FEAT-0011, FEAT-0005]
---

# TASK-0019: Make private weekly reports the template-first workflow contract

## Summary

Prove one template-first Daily-to-Weekly loop in which private Project reports
accumulate during the week, Weekly finalizes them and rolls them into Department
and Company reports, and only explicitly mapped outbound artifacts may leave the
Hermes workspace. A maintainer edits a versioned report template, and one
compiler/validator produces or checks the compatible structured schema, prompt
contract, realistic example, field-to-artifact mapping, and QA assertions.

## Scope

- **In:** one representative Project-to-Company report path; week-first private
  workspace layout; `reports` and `outbound` as the only end-user artifact
  classes; accumulating/final report state; minimal machine-readable annotations
  where semantics cannot be inferred; Zod/JSON schema compatibility; explicit
  field-to-artifact mapping; destination URL bindings; prompt binding; realistic
  example; drift validation; migration error messages; docs for the tuning loop;
  evidence-bound employee actions at Project, Area, and Company visibility; and
  an explicit confirmation before synthetic preview generation.
- **Out:** automatically understanding arbitrary Markdown semantics, converting
  every template in one pass, a visual template editor, Notion database schema
  mutation, a publish queue, user-facing draft/follow-up/receipt directories,
  Hermes-owned destination permissions, adopting Composio without a named
  provider gap, storing credentials in the repository or generated workspace,
  and changing report quality requirements without review.
- **Split trigger:** output-contract compilation is independently reusable and
  has a separate proof surface from installation.

## Delta

> **Before:** Daily outputs patch Project memory and a broad Weekly Draft in
> Notion; templates, Zod `.describe()` prompts, result schemas, destination
> writes, expected JSON, and quality assertions can be tuned separately and
> drift.
>
> **After:** Daily produces one validated structured result, a deterministic
> mapper accumulates private weekly Project reports and prepares outbound
> artifacts, and Weekly finalizes and rolls up the report hierarchy. One
> versioned template contract binds the output shape, structured fields,
> field-to-artifact mapping, complete example, and QA.
>
> **Example:** Daily evidence for the Penang Project updates
> `weeks/2026-W35/reports/project--penang.md`; Weekly finalizes that file, rolls
> it into Department and Company reports, and maps an approved employee chase to
> `weeks/2026-W35/outbound/employee--<stable-key>.md`. Notion receives only the
> fields mapped to a configured destination URL.

## Map

```text
Notion / Drive / approved sources
              |
              v
Stage 1: one validated Zod result
              |
              v
Stage 2: deterministic field mapping
              |
              v
weeks/YYYY-Www/
  |-- reports/  Project -> Department -> Company
  `-- outbound/ employee requests + executive delivery
              |
              v
configured destination URL -> optional provider write
```

The week-first layout is deliberate: Daily and Weekly both operate on one
reporting window, Weekly must enumerate every Project report in that window,
and retention can archive one complete week. Project history remains available
through stable frontmatter IDs and workspace search rather than a second
project-first hierarchy.

The validated Zod result is platform-neutral. The Stage 2 mapper owns which
fields become report frontmatter, report sections, outbound content, or provider
properties. `workspace.hermes.md` supplies only authorized destination URLs and
routes. Notion owns permissions for those destinations; Hermes neither mirrors
nor infers the permission model.

## Existing Reuse And Gap

This ticket does not introduce a new two-stage automation. The current system
already has both stages:

- Stage 1 is `DailyReviewResultSchema`, which validates one result containing
  Project updates, documentation reviews, progress chases, and knowledge updates.
- Stage 2 is Daily automation step 4, “Apply each JSON section and verify its
  effects.” Its current mappings are provider-first and need to become
  local-artifact-first.
- `scripts/current_weekly_draft.mjs` already provides atomic mode-0600 writes,
  week validation, source-key idempotency, and conflict protection for a private
  Markdown draft.
- `ReportResultSchema` already represents Project, Area, and Company reports.

The gap is therefore narrow: reshape the shared weekly draft into per-Project
weekly reports, route the existing validated result into `reports` and
`outbound`, make Weekly consume those reports, and move provider publication
behind an explicit destination boundary.

## Tool Auth And Configuration Boundary

| Data | Owner | Storage rule |
| --- | --- | --- |
| Static provider keys, webhook secrets, optional Composio API key | Hermes profile `.env` | Install through the secure profile writer; never render values into source or artifacts. |
| MCP server definitions, tool filters, non-secret integration IDs | Hermes profile `config.yaml` | Install with `hermes config`; keep environment-specific values out of reusable templates. |
| Native MCP OAuth token/client/server metadata | Hermes profile `mcp-tokens/` | Let Hermes' OAuth storage own lifecycle and refresh. |
| Provider OAuth under an optional Composio adapter | Composio connected accounts | Keep provider tokens in Composio; persist no raw token or session header locally. |
| Semantic destination routes and document URLs | `workspace.hermes.md` | Store only non-secret bindings that tell Stage 2 where approved output may go. |
| Dedupe keys, connection health, delivery IDs | hidden runtime state | Do not expose them as report, draft, follow-up, or receipt directories. |

Direct vendor MCPs remain the default. Composio is a separate integration
decision, not part of this ticket's critical path, because it introduces an
external auth/control plane and its MCP route does not preserve Composio SDK
execution modifiers or gating.

## Change Plan

1. **Lock the auth boundary without adding a provider abstraction.** Update
   `scripts/setup_runtime.py`, `tests/test_setup_runtime.py`, and the workspace
   setup documentation only as needed to make the ownership table above
   executable and testable. Assert that Kamdar commands use the exact profile,
   secret values are written only through the secure writer, MCP configuration
   is profile-local, and logs/previews redact values. Do not add Composio code;
   record its adoption trigger as a later adapter decision.
2. **Retarget the existing Stage 1 contract.** Update
   `schemas/automations/daily-review-result.zod.mjs` and its fixtures so Project
   evidence describes report section inputs and outbound candidates without
   embedding Notion operations. Bump the schema/template version and fail old
   provider-coupled fixtures explicitly; do not add compatibility aliases.
3. **Generalize the existing private writer.** Adapt
   `scripts/current_weekly_draft.mjs` (rename only if the module contract becomes
   misleading) to resolve
   `weeks/YYYY-Www/reports/project--<stable-id>.md`. Preserve atomic mode-0600
   writes, week validation, source-key idempotency, and conflict detection. Add
   stable report frontmatter: template ID/version, subject ID, week, level,
   accumulating/final state, visibility, sources, and update time.
4. **Change Daily Stage 2 from provider-first to artifact-first.** Update
   `automations/daily-operating-update.md` and the reference automation so each
   validated field has one deterministic destination: Project report section,
   `outbound` artifact, hidden runtime metadata, or ignored-with-reason. Create
   the local artifact before any optional provider effect. A prepare/dry run
   must perform zero provider writes.
5. **Make Weekly consume the private Project report set.** Update
   `automations/weekly-operating-review.md`, the weekly schema fixtures, and
   `evals/filesystem/scripts/run-task0007-reference-automation.mjs` to enumerate
   `weeks/<week>/reports/project--*.md`, finalize eligible Project reports, and
   derive Department and Company reports in the same week tree without
   rescanning raw Daily sources. Produce executive delivery content in
   `outbound`; keep technical finalization metadata hidden.
6. **Bind optional publication to explicit configuration.** Resolve destination
   URLs and semantic routes from `workspace.hermes.md`; resolve tools and auth
   from the active Hermes profile. Missing route/auth must leave the local
   artifact intact and return a truthful blocked delivery state. Notion/Drive
   continues to own access permissions. No publish queue is introduced.
7. **Bind the template contract after the pipeline seam is stable.** The local
   `npm run report:sync` authoring command scans report templates, uses source
   hashes to find changes, asks AI for a constrained interpretation, shows the
   proposed contract diff, and writes inspectable Zod modules. Preview creation
   is a separate confirmation step; `--check` is model-free and read-only.
   Project, Area, and Company templates share an evidence-bound employee-action
   section, with higher levels rolling up only actions needing management
   visibility. Reuse Zod and current eval conventions rather than adding
   Pydantic or a second schema language. An incompatible edit must fail before
   runtime with an actionable diff.
8. **Migrate proof at the same seams.** Update
   `evals/filesystem/tests/current-weekly-draft.test.mjs`,
   `evals/filesystem/tests/run-task0007-reference-automation.test.mjs`, Daily and
   Weekly schema tests/fixtures, and setup-runtime tests. Cover two Daily updates
   to one Project, two Projects in one week, an exact rerun, a conflicting
   source key, Weekly finalization/rollup, missing destination, missing auth,
   dry-run zero writes, and one authorized outbound delivery.

## Done / Proof

```yaml
metric: template contract drift pass/fail
done:
  - The private workspace exposes only week-scoped reports and outbound artifacts to operators.
  - Daily accumulates one private Project report per Project and week without publishing intermediary management state to Notion.
  - Weekly finalizes all eligible Project reports and rolls them into Department and Company reports without rescanning raw Daily sources.
  - Stage 1 validates one platform-neutral Zod result before Stage 2 maps fields to workspace artifacts or configured provider destinations.
  - Notion and Drive destinations are URL bindings; Hermes does not own their permission model.
  - Static secrets and OAuth state remain profile-local; no credential or session header appears in source, reports, outbound artifacts, previews, or logs.
  - Existing Stage 1 extraction, Stage 2 application, private-draft writer, and Weekly report hierarchy are reused rather than duplicated.
  - One report template is the accepted primary tuning surface and its schema contract realistic example mapping and QA resolve the same template ID/version.
  - Project Area and Company templates extract evidence-backed employee actions without inferring ratings intent or personality.
  - Preview generation happens only after an explicit interactive confirmation or the explicit `--preview` flag.
  - Drift-only checking performs no model call and writes no files.
  - A compatible template edit updates or validates every derived surface.
  - An incompatible edit fails before runtime with an actionable diff.
rubric_families: [spec-contract, implementation-plan, evidence-quality, integration-readiness]
required_tas_gates: [design-review, implementation, eval, review]
hard_gates: [no lossy schema inference, no unversioned derivation, no implicit destination, no public intermediary state]
checks:
  - python3 -m unittest tests.test_setup_runtime -v
  - node --test evals/filesystem/tests/current-weekly-draft.test.mjs
  - node --test evals/filesystem/tests/run-task0007-reference-automation.test.mjs
  - node --test evals/filesystem/tests/*.test.mjs
  - python3 scripts/validate_company_context.py --context workspace.hermes.md
  - template compiler/validator unit tests
  - daily accumulation and weekly finalization fixtures
  - field-to-artifact and destination-mapping fixtures
  - compatible and incompatible edit fixtures
evidence:
  - tickets/TASK-0019/progress.md
  - tickets/TASK-0019/artifacts/research/tool-auth-and-automation-gap.md
  - tickets/TASK-0019/artifacts/template-drift-cases/
```

## Agent Contract

- **Open:** one local command against the Project-to-Company report path.
- **Test hook:** fixed template edit fixtures and generated/validated contract
  snapshots.
- **Stabilize:** versioned exemplar and deterministic formatting.
- **Inspect:** source template, annotations, week-scoped artifacts, schema diff,
  field mapping, destination URL binding, prompt binding, realistic example,
  and QA result.
- **Key states:** current/pass, compatible change/pass, missing annotation/fail,
  schema drift/fail, example drift/fail.
- **QA cookbook:** none yet.
- **Expected artifacts:** week-scoped report/outbound examples, contract
  snapshots, mapping snapshots, and drift reports.
- **Delegate with:** TASK-0019 and this file; write progress/evidence here.

## Run Hints

```yaml
likely_size: medium
goal_recommended: true
compute_hint: local deterministic tests
proof_weight: deterministic
batchable: false
no_batch_reason: first exemplar decides the reusable contract
human_gates: [accept template annotation design]
```

## State

- **Current:** implementation-ready plan; the accepted product model is
  week-first private reports plus outbound artifacts. The Markdown-to-Zod
  authoring sync and employee-action contracts are implemented. Stage 1,
  Stage 2, the private weekly-draft writer, and Weekly report hierarchy already
  exist, but the mapper and active automation contracts remain
  provider-first/shared-draft.
- **Next:** implement change units 1-6 around the existing Stage 1/Stage 2 seam,
  preserving idempotency and atomic-write behavior before changing Weekly.
- **Blockers:** none for the prototype; production destination URLs and write
  authority remain environment bindings.

## Links

- `templates/company-operating-rollup.md`
- `templates/weekly-report.md`
- `schemas/automations/weekly-review-result.zod.mjs`
- `schemas/automations/daily-review-result.zod.mjs`
- `evals/weekly/expected/result.json`
- `docs/systems/kamdar-company-os.md`
- `tickets/TASK-0019/artifacts/research/tool-auth-and-automation-gap.md`
