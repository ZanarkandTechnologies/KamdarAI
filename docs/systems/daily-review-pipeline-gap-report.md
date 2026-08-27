---
title: Daily Review schema sanity check and lifecycle hardening
status: implemented_with_followups
owner: KamdarAI
created_at: 2026-08-25
updated_at: 2026-08-27
system_id: SYS-0001
feature_refs:
  - FEAT-0001
  - FEAT-0002
  - FEAT-0003
  - FEAT-0004
  - FEAT-0005
  - FEAT-0006
  - FEAT-0007
refs:
  - ../../automations/daily-operating-update.md
  - ../../automations/weekly-operating-review.md
  - ../../schemas/automations/daily-context-diff.zod.mjs
  - ../../schemas/automations/daily-review-result.zod.mjs
  - ../../schemas/automations/daily-integration-receipt.zod.mjs
  - ../../schemas/automations/weekly-review-result.zod.mjs
  - ../../evals/rubrics/end-user-artifact-quality.md
  - kamdar-company-os-operator-manual.md
---

# Daily Review schema sanity check and lifecycle hardening

## Verdict

The lifecycle flaw found in the sanity check is fixed in the source contracts.
Daily now reads active Projects, linked open or changed Work for progress, and
Done Work whose `AI review` is not `Processed`. Posting a documentation question
leaves the item Done with `AI review = Needs information`; only a sufficient
verdict plus settled required effects sets `AI review = Processed`.

The workflow is still not ready for unattended production. Structured weekly
targets, route policy, chase cooldowns, and event-driven Notion re-review remain
follow-up work.

| Required role | Verdict | What works now | What is missing |
| --- | --- | --- | --- |
| Daily PM | Partial | Reconciles Project sections, checks weekly attention, detects threatened targets, and drafts an owner chase. | Weekly targets and progress are free-form Markdown. There is no structured target-to-Work relation, planned quantity, actual quantity, forecast, risk reason, or chase cooldown. |
| Documentation reviewer | Partial | Emits one `task-completion@1.0.0` verdict for every selected Done item and asks precise questions for missing evidence. | The rubric ID is versioned, but its detailed requirement catalog, conversation state, and event-driven re-review are not yet modeled. |
| Weekly report drafter | Mostly capable | Problems have measurable baselines; Decisions have preservation gates; SOP observations have detailed workflow fields; Weekly dispositions every candidate. | The rules are spread across schemas, automation prose, templates, and prompts. Daily Decisions and Weekly SOP promotions do not both have structured proof objects equivalent to the strong Problem proof. |
| Daily Project-memory updater | Capable with a guarded terminal condition | Project memory updates are conflict-checked. Receipts require documentation sufficiency and settled effects before AI processing. | An incomplete item waits for the next Daily run; event-driven re-review remains future work. |
| Downstream router | Human-readable only | Comments at the top of the Daily schema and automation step 4 explain where each array goes. | The route map is not a versioned machine-checked policy. Result rows do not name a stable `route_key`, policy version, or downstream owner. |

## What the current contracts already define well

### Project progress

The Daily context includes active Projects, fully read current Work, owners,
dates, blockers, evidence, last meaningful update, and current Project
sections. `project_updates` can replace `Overview`, `Project knowledge`, and
`This week's attention` through conflict-safe writes. `weekly_progress_chases`
asks the accountable owner for the change, blocker, recovery plan, and revised
date.

This is useful inference, but not a reliable forecast. The model reads prose
and produces prose. It cannot prove a target is 60% complete, calculate the
remaining work rate, or distinguish “slow for a valid reason” from “slow with
no stated reason” unless those facts are explicitly present.

### Documentation quality

The Task, Feature, Issue, and Meeting templates provide type-specific expected
content. The Daily result emits one `documentation_reviews[]` row for every
selected Done item. A `needs_information` verdict must name failed requirement
IDs, a stable question key, and a precise comment; a `sufficient` verdict cannot
carry a question.

The rubric at `evals/rubrics/end-user-artifact-quality.md` has a different job:
it reviews whether the agent's generated comment, report, or record is clear,
grounded, useful, and template-complete. It is not the source-document rubric.
That distinction should remain explicit.

### Problems, Decisions, and SOPs

The current minimums are already visible, although they are distributed:

| Candidate | Minimum worth staging in the Weekly Draft | Minimum worth canonical promotion | Current owner |
| --- | --- | --- | --- |
| Problem | Observed condition, affected workflow step, impact, evidence, confidence, and explicit measurement gaps. | Dated Before baseline, recurrence or material consequence, measurement owner, intervention/test, destination relation, and dedupe proof. | Daily and Weekly schemas, `templates/issue.md`, Weekly automation. |
| Decision | Concrete choice, reason, authority, and review trigger. | A reusable precedent or material/costly-to-reverse choice, two or three real options, selected option, rationale, authority, accepted tradeoff, consequences, and review trigger. | Weekly schema, `templates/decision.md`, Weekly automation. |
| SOP | Observed trigger, actors, ordered steps, systems, handoffs, output, frequency/volume, timing, exceptions, confidence, and gaps. | Approved workflow with an owner, reuse proof, baseline, exceptions/controls, Project relation, provenance, dedupe proof, and a complete SOP record. | Daily schema, `templates/sop.md`, Weekly automation. |

Daily should continue to stage observations without promoting them. Weekly
should continue to be the only promotion boundary.

## Unsafe path removed in v1.1

```text
Done Work item has poor documentation
                |
                v
Daily writes a precise Notion question
                |
                v
comment effect = applied
                |
                v
all required effects appear settled
                |
                v
Work may become Processed  <-- old unsafe behavior
```

The v1.1 receipt rejects that transition. A posted question now produces
`Status = Done`, `AI review = Needs information`, and no review version. Failed
required effects produce `AI review = Blocked`. Only `sufficient` plus settled
effects produces `AI review = Processed` with `daily-review-v2`.

## Recommended follow-up boundary

Add one versioned policy owner and make documentation review a first-class
state machine. Keep provider addresses and Notion database IDs out of model
output; the deterministic applier resolves them from the active environment.

```text
daily-review-policy.yaml
  |-- documentation rubrics by Work type
  |-- progress inference thresholds and chase cooldown
  |-- knowledge admission and promotion minimums
  `-- route_key -> downstream owner + allowed operation
                         |
                         v
Daily context -> structured extraction -> deterministic policy validation
                         |
              +----------+----------+
              |                     |
          sufficient             insufficient
              |                     |
   apply memory/knowledge      apply grounded memory only
   and eligible effects        open or update one question thread
              |                     |
          Processed         Awaiting documentation
                                    |
                         Notion reply or page edit
                                    |
                               re-review
```

The policy file should use plain English labels and stable IDs. A human should
be able to change a threshold or rubric without editing a model prompt, while a
validator can still reject unknown IDs.

### Possible future result additions

```yaml
policy_version: company-os-daily-review-policy@1.1.0

project_assessments:
  - project_id: PROJECT-001
    target_id: TARGET-003
    linked_work_item_ids: [TASK-103, TASK-104]
    planned_result: "3 supplier comparisons"
    observed_result: "1 comparison complete"
    due_at: 2026-08-28
    forecast: at_risk
    risk_reason: "Two comparisons remain and the normalization rule is unresolved."
    unexplained_delay: false
    chase_eligible: true
    route_key: owner_progress_chase

documentation_reviews:
  - work_item_id: TASK-103
    rubric_id: task-completion@1.0.0
    verdict: insufficient
    passed_requirements: [outcome]
    failed_requirements: [decision_rationale, evidence]
    questions:
      - question_id: TASK-103:decision-rationale
        update_location: "Notes > Decision"
        question: "Why was this option selected over the alternatives?"
    conversation_state: awaiting_owner
    thread_ref: notion-comment-thread-or-null
    route_key: work_documentation_thread

knowledge_candidates:
  - candidate_id: decision:TASK-103
    admission: blocked_by_documentation
    missing_requirement_ids: [decision_rationale]
    route_key: weekly_draft_decisions
```

The exact property names may change during implementation. The required
invariants should not:

1. Every Project target has a stable ID and explicit linked Work.
2. Every progress judgment names observed evidence, forecast, reason, and
   whether the delay is actually unexplained.
3. Every completed Work item gets one versioned documentation verdict.
4. Every missing-information question has a stable ID and conversation state.
5. Every output has a `route_key`; the policy maps it to one downstream owner.
6. The model never chooses a provider address, database URL, or fallback route.

### Implemented processing states

Use a review state separate from the Work item's business status:

| Review state | Meaning | Eligible for Daily fetch? | May become `Processed`? |
| --- | --- | --- | --- |
| `Pending` | Done and not yet reviewed. | Yes | No |
| `Needs information` | One or more required questions are unresolved. | Yes | No |
| `Blocked` | A required effect could not settle safely. | Yes | No |
| `Processed` | Documentation is sufficient and every required effect settled. | No, unless later change detection resets review state. | Yes |

### Recommended sad path

```text
1. Daily reads a Done Work item.
2. The reviewer records `needs_information` and asks one grouped set of questions.
3. Daily may update Project memory with grounded facts already present.
4. Daily may stage a partial Problem/SOP observation with explicit gaps.
5. Daily must not promote canonical knowledge or mark the Work `Processed`.
6. The Work remains Done and `AI review` becomes `Needs information`.
7. The owner edits the page or replies in the same Notion comment thread.
8. A mention can request re-review; otherwise the next Daily run fetches it again.
9. The review re-runs the same rubric version and reports any remaining gap.
10. Only a sufficient verdict plus settled effects changes the item to
    `Processed`.
```

This gives the human a conversational recovery path without losing useful
partial Project memory. It also prevents daily nagging: an unchanged item keeps
one open thread and is not re-asked until the reminder policy permits it.

## Downstream ownership map

The route map belongs in policy, not in generated JSON prose. A recommended
initial map is:

| Result section | `route_key` | Downstream owner | Operation |
| --- | --- | --- | --- |
| Project section replacement | `project_memory` | Projects database | Conflict-safe section replacement. |
| Documentation review/question | `work_documentation_thread` | Source Work item | Create or update one Notion comment thread. |
| Progress chase | `owner_progress_chase` | People route resolved from the Work owner | Send one deduplicated approved-channel message. |
| Problem candidate | `weekly_draft_problems` | Current Project Report Draft | Source-keyed upsert. |
| Decision candidate | `weekly_draft_decisions` | Current Project Report Draft | Source-keyed upsert. |
| SOP observation | `weekly_draft_sops` | Current Project Report Draft | Source-keyed upsert. |
| Canonical Problem | `canonical_issue` | Work/Issues database | Weekly-only promotion. |
| Canonical Decision | `canonical_decision` | Decisions database | Weekly-only promotion. |
| Canonical SOP | `canonical_sop` | SOPs database | Weekly-only promotion. |
| Audit and processing outcome | `automation_receipt` | Automation artifacts database and local receipt | Append immutable receipt; update review state only after read-back. |

## Before, after, and example

**Before:** `TASK-103` is Done but explains only the outcome. Daily posts a
question. The comment write settles, so the current receipt can mark the item
`Processed` even though the rationale is still absent.

**After:** Daily records `task-completion@1.0.0 = needs_information`, updates grounded
Project memory, opens one question thread, and sets
`AI review = Needs information`. The owner's edit plus a mention, or the next
Daily run, triggers the same rubric. The item
becomes `Processed` only after the rationale and evidence pass and all required
effects are read back.

**Example:** If the owner answers the rationale but still omits the evidence
link, the agent replies in the same thread with only the remaining evidence
question. It does not create a second comment, resend the full questionnaire,
or mark the item `Processed`.

## Acceptance checks for implementation

- A healthy Project target produces no chase.
- A threatened target with a documented cause produces a recovery request but
  is not labeled “slow for no reason.”
- An unexplained threatened target sets `unexplained_delay = true` with the
  exact missing fact.
- A complete Done item reaches `Processed` after all required read-backs.
- An incomplete Done item remains `Needs information` after the question
  comment is successfully written.
- A page edit or same-thread reply causes re-review; an unchanged item does not
  create a duplicate question.
- Partial grounded Project memory may apply while speculative knowledge stays
  blocked.
- Every result row resolves through one known `route_key`; unknown keys fail
  before provider writes.
- Weekly dispositions every candidate and never promotes a Decision or SOP
  without its type-specific proof.

## Recommended implementation order

1. Add the policy file and machine-check its route/rubric IDs.
2. Add structured Project targets and target-to-Work relations to the context.
3. Add `documentation_reviews` and conversation state to the Daily result.
4. Tighten the receipt so only documentation-sufficient items can be processed.
5. Add event correlation for Notion page edits and comment replies.
6. Add structured Daily Decision proof and Weekly SOP promotion proof.
7. Extend the eval suite with the sad path, partial-memory path, reply path, and
   duplicate-question suppression.

Grounding: current local automation contracts, Zod schemas, templates, feature
specs, workspace authority, receipts, and evaluation rubric. No external source
was needed for this repository-internal decision.
