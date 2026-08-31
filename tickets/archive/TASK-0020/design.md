---
artifact_type: functional-ui
ticket_id: TASK-0020
status: accepted
updated_at: 2026-08-28
surface: setup.py doctor
---

# Doctor result and feature-check design

## Users and stories

The primary user is a non-technical operator checking a newly installed or
updated Kamdar manager. Their questions, in order, are:

1. Is the manager working?
2. Did it find the right company information?
3. Did it produce something I would consider useful?
4. If not, is the problem missing company information or a broken system?
5. What is the one thing I should inspect or fix next?

The maintainer needs the same summary plus expandable evidence: exact feature,
source coverage, output path, failed invariant, and technical artifact.

## Current diagnosis

- Current installed `feature_evals` are frozen contract validators. A green
  result does not mean configured data was fetched or AI generation ran.
- Daily and Weekly showcase validators require every feature result slice to be
  populated. A truthful empty result therefore cannot pass even when the source
  contains no eligible change or lacks enough evidence.
- Daily uses empty arrays plus free-form `run_notes` for missing information;
  Weekly has `configuration_gaps`; Meeting has `blocked_commitments`. The same
  user condition has three different representations.
- Eval definitions repeat claim, prompt, expected output, assertions,
  falsifier, metadata, result path, and integration gates. This is powerful but
  difficult to author and scan.
- Output existence is not value proof. A syntactically valid large report can
  still be ungrounded, incomplete, unreadable, or useless.

## Comparable evidence receipt

| Source | Operated job and observed states | Decision |
| --- | --- | --- |
| https://github.com/vercel/next.js/actions | Opened workflow list, then a successful run summary. The list exposes success, running, and skipped before detail. The run leads with overall status and duration, then jobs, warnings, and produced artifacts. Public logs required sign-in. | Adapt the progressive disclosure: overall verdict, feature rows, then evidence. Reject technical workflow names as primary labels. |
| https://www.githubstatus.com/ | Opened current status. It leads with one plain-language aggregate, then independently named components with their own operational states and optional detail. | Adopt the component-health scan pattern, but make “output value” and honest uncertainty explicit rather than treating connectivity as sufficient. |

Access limit: both public summaries were operable without login; GitHub job logs
were login-gated and were not used as workflow evidence.

## Recommendation

Use one two-level result:

1. A plain-language overall verdict with one sentence and one next action.
2. One row per user-recognizable feature, each with an outcome, evidence count,
   and preview link. Technical pipeline stages appear only after expansion.

The overall statuses are deliberately limited to three:

| Overall status | Meaning | Exit |
| --- | --- | --- |
| `WORKING` | Every selected feature produced valuable output or proved that no change was needed. | 0 |
| `I DON'T KNOW — NOT ENOUGH INFORMATION` | The system ran, but at least one feature cannot know the answer or produce safely from the available company information. Nothing is ready for delivery. | 1 |
| `FAILED` | Fetch, AI generation, schema validation, rendering, quality, privacy, or isolation failed. | 2 |

`Delivery: NOT RUN — doctor is read-only` is always shown separately. It does
not affect the doctor status.

## Steve Jobs Focus and Simplicity Pass

- **Customer benefit:** know in under ten seconds whether the manager works and
  whether its output is worth trusting.
- **Core action:** inspect the first non-green feature or open a passing preview.
- **Remove or defer:** raw test IDs, Pydantic names, hashes, tier letters, integration
  gates, artifact inventories, and provider traces from the first screen.
- **Deliberate no:** no single green “all tests passed” when outputs are empty or
  low-value; no numeric health score that hides why a feature failed.

## Literal summary states

### Working

```text
KAMDAR CHECK: WORKING

The manager read your company data and produced trustworthy previews.

Feature                         Result
Project updates                 Valuable output       Open preview
Documentation review            No change needed      6 items checked
Progress follow-up              Valuable output       Open preview
Knowledge capture               Valuable output       Open preview
Weekly operating report         Valuable output       Open preview
Knowledge promotion             No change needed      5 candidates checked
Next-week planning              Valuable output       Open preview
Meeting commitments             No change needed      1 meeting checked

Delivery: NOT RUN — doctor is read-only
```

### I don't know — not enough information

```text
KAMDAR CHECK: I DON'T KNOW — NOT ENOUGH INFORMATION

The manager is running, but the available company information is not enough to
know the answer or safely produce every preview.

Feature                         Result
Project updates                 Valuable output       Open preview
Weekly operating report         I don't know — not enough information
  Missing: current Content project report for 2026-W34
  Why it matters: the Company report would omit part of the business
  Next: add or link the Content report, then run doctor again
Meeting commitments             I don't know — not enough information
  Missing: owner and due date for “standardise asset names”
  Next: add those fields to the Meeting commitment

Nothing is ready for delivery until these information gaps are resolved.
Delivery: NOT RUN — doctor is read-only
```

### Failed

```text
KAMDAR CHECK: FAILED

The manager could not complete a trustworthy preview.

Failed at: Weekly operating report > Check output
Problem: the AI output did not match the report contract
No downstream systems were changed.

Next: open technical details or rerun after repairing the report contract.
Delivery: NOT RUN — doctor is read-only
```

## Feature outcome contract

The model may return three semantic outcomes. `insufficient_information` is
rendered to the user as `I don't know — not enough information`; it is an
honest uncertainty outcome, not a request-state label. `failed` is never
model-authored; the runner derives it from an observed technical or quality
failure.

```text
produced
  checked_source_ids: 1+
  output_refs: 1+
  information_gaps: []

no_change_needed
  checked_source_ids: 1+
  output_refs: []
  explanation: required

insufficient_information
  checked_source_ids: 1+
  output_refs: []
  information_gaps: 1+
```

The shared schema should be a strict discriminated union:

```js
FeatureOutcomeSchema = z.discriminatedUnion("outcome", [
  z.strictObject({
    feature_id: FeatureId,
    label: z.string().min(1),
    outcome: z.literal("produced"),
    checked_source_ids: z.array(StableId).min(1),
    output_refs: z.array(RelativeJsonPointer).min(1),
    summary: z.string().min(1),
    information_gaps: z.tuple([]),
  }),
  z.strictObject({
    feature_id: FeatureId,
    label: z.string().min(1),
    outcome: z.literal("no_change_needed"),
    checked_source_ids: z.array(StableId).min(1),
    output_refs: z.tuple([]),
    explanation: z.string().min(1),
    information_gaps: z.tuple([]),
  }),
  z.strictObject({
    feature_id: FeatureId,
    label: z.string().min(1),
    outcome: z.literal("insufficient_information"),
    checked_source_ids: z.array(StableId).min(1),
    output_refs: z.tuple([]),
    information_gaps: z.array(InformationGapSchema).min(1),
  }),
]);
```

The doctor receipt wraps those model-authored semantic outcomes with an
observed runner status. This is the only place `failed` exists:

```js
DoctorFeatureStatusSchema = z.discriminatedUnion("outcome", [
  ProducedFeatureOutcomeSchema,
  NoChangeFeatureOutcomeSchema,
  InsufficientInformationFeatureOutcomeSchema,
  z.strictObject({
    feature_id: FeatureId,
    label: z.string().min(1),
    outcome: z.literal("failed"),
    stage: z.enum(["setup", "fetch", "generate", "check", "save_preview"]),
    problem: z.string().min(1),
    evidence_refs: z.array(z.string().min(1)).min(1),
  }),
]);
```

The runner derives this row from observed errors and failed quality checks. It
must not convert a model-authored explanation into `failed` without evidence.

Each information gap contains:

```text
code                stable machine-readable reason
needed_field        exact missing fact
source_ids_checked  records inspected before declaring the gap
why_needed          why useful output would be unsafe without it
where_to_add        source record and section/property
question            one precise question for the responsible person
```

Each cadence result contains `feature_outcomes`, exactly once per selected
feature. Pydantic `superRefine` cross-checks output references and domain arrays:

- `produced` must point to existing non-empty output rows.
- `no_change_needed` must have complete source coverage and no output row.
- `insufficient_information` must have a blocking gap and no output row.
- An empty domain output without either non-output outcome is invalid.
- One output row cannot be claimed by two feature outcomes.

## Empty-data classification

| Observation | Correct outcome |
| --- | --- |
| Query succeeded and there were no eligible changed/completed records | `no_change_needed` |
| Eligible record exists but owner, date, evidence, relation, or required report is missing | `insufficient_information` |
| Required source is unconfigured, unreachable, forbidden, or returned malformed data | runner-derived `failed` |
| AI returned an empty array without coverage or gaps | runner-derived `failed` |
| AI produced content that fails the value gate | runner-derived `failed` |

This prevents “not enough information” from becoming an easy escape hatch for
the model.

## Value gate

`produced` is only green when the rendered preview passes all five existing
quality concerns. The user sees one `Valuable output` verdict; technical detail
retains the individual checks:

1. Grounded — every material statement traces to checked source data.
2. Complete — the feature/template contract is satisfied.
3. Useful — the output changes a decision, action, memory, or understanding.
4. Clear — a normal recipient can understand it without evaluator jargon.
5. Safe — it does not invent facts, targets, authority, or delivery claims.

Any failed value check makes the feature `failed`; merely producing a file is
not success.

## Lean eval-authoring contract

Replace duplicated prose fields with one compact feature definition. Prompts
and extraction instructions remain owned by the Pydantic schema; integration proof
remains in the separate delivery-contract suite.

```yaml
feature_id: FEAT-0005
label: Weekly operating report
output_path: report_results
value_checks: [grounded, complete, useful, clear, safe]
scenarios:
  - static_validator_sample: enough-information.json
    expected_outcome: produced
    reference_points:
      - Every Company claim resolves through the expected Area and Project source chain.
      - A blocking Area gap prevents Company Final status.
  - static_validator_sample: no-change.json
    expected_outcome: no_change_needed
    reference_points:
      - Every eligible current report was checked.
  - static_validator_sample: missing-information.json
    expected_outcome: insufficient_information
    expected_gap_codes: [missing-current-area-report]
    reference_points:
      - The missing Area and affected Company finalization are named exactly.
```

These samples test static validators only and make no end-to-end claim; Doctor
acceptance always uses real configured sources and a live model.

`reference_points` are sample-owned observable assertions, not generic rubric
labels. Existing feature claims, assertions, and falsifiers migrate into the
smallest relevant scenario reference points or shared runner invariants; they
must not be deleted during compaction. For example, Daily preserves specific
product-detail evidence such as collar and tech-pack observations, while Weekly
preserves source-chain and finalization constraints. The generic value gate
judges output quality only after these feature-specific facts pass.

Every feature must have the same three semantic scenarios:

- **Enough information:** useful output is produced and passes the value gate.
- **No change needed:** complete checked evidence proves no output is required.
- **Missing information:** required evidence is absent and the exact gap is
  reported. The eval also runs the inverse assertion: sufficient input may not
  be labeled insufficient.

Runner failure cases remain shared rather than repeated per feature: fetch
failure, model failure, invalid schema, bad output reference, failed value gate,
privacy leak, and downstream-call attempt.

## Interaction rules

- Lead with the aggregate, one explanation, and the first next action.
- Sort feature rows: failed, I don't know—not enough information, valuable output, no change.
- Use feature names people recognize, not FEAT IDs or result paths.
- Show counts as evidence: `6 items checked`, `3 outputs produced`.
- `No change needed` is green only with recorded coverage.
- `I don't know — not enough information` is amber/non-green and blocks the handoff.
- `Failed` is red and names the failing stage: Setup, Fetch, Generate, Check, or
  Save preview.
- Preview links appear only for `produced` outcomes.
- Technical detail is available but never required to understand the result.
- A rerun must retain the previous receipt and create a new run directory.

## Low-fi wireflow

```text
Run doctor
    |
    v
[Checking setup -> Fetching -> Generating -> Checking value]
    |
    +-------------------+----------------------+------------------+
    |                   |                      |                  |
    v                   v                      v                  v
 WORKING       I DON'T KNOW                 FAILED        user interrupts
               NOT ENOUGH INFORMATION
    |                   |                      |                  |
open preview      show exact gaps       show failed stage   save partial receipt
    |                   |                      |
    `-------------------+----------------------'
                        |
                  rerun creates new receipt

Delivery remains outside this flow.
```

## Accepted Stage 2 run UX

The run choice applies to the complete configured downstream plan, not only
Telegram. Telegram is one adapter beside Notion, Drive, messaging, and the
private workspace.

```text
Run Company OS evaluation

● Prepare and evaluate only
  Generate and check outputs; change no downstream system

○ Prepare, evaluate, and apply Stage 2
  Review every configured downstream action before applying it
```

```text
Review downstream actions

Private workspace   3 updates
Notion              2 updates
Google Drive        1 publication
Telegram            1 owner report

Environment: Isolated evaluation
Production systems: Not authorized

[Back]                              [Apply 7 actions]
```

The apply action consumes the exact hash-bound prepare handoff without
regeneration. Disabled policy, a changed handoff, missing destination,
non-passing quality result, or production target blocks before any provider
call. Results list every provider separately and link to redacted receipts.

## Implementation handoff

- Add shared feature-outcome and information-gap schemas under
  `schemas/automations/`; import them into Daily, Weekly, and Meeting results.
- Add the runner-owned `DoctorFeatureStatusSchema` to the doctor receipt so a
  visible failed row always has stage, problem, and evidence references.
- Add cadence-specific `superRefine` mappings from each feature to its domain
  output paths.
- Make doctor derive the overall status from feature outcomes plus runner
  failures; do not ask the model for the aggregate.
- Replace showcase `slice must be populated` checks with outcome-aware checks.
- Reduce each feature suite to the compact definition plus the three canonical
  semantic scenarios while migrating every material existing assertion into a
  scenario reference point or shared invariant; move provider effects to
  delivery-contract suites.
- Render and snapshot-test the literal summaries above for working,
  needs-information, and failed states.

## Options appendix

1. **Pipeline checklist only** — simplest implementation, but it can say every
   stage passed while the output is empty or useless. Rejected.
2. **Feature cards only** — answers whether outputs are valuable, but hides
   whether the failure was fetch, AI, or validation. Rejected.
3. **Overall verdict + feature rows + expandable stages** — fastest for a
   non-technical user while retaining technical diagnosis. Recommended.
