---
artifact: hardening-proposal
target: weekly-executive-report-quality
status: implemented
date: 2026-08-26
---

# Weekly executive-report hardening proposal

## Implementation receipt

Implemented on 2026-08-26. The Weekly Zod result now carries structured Company
context and requires every context field to appear in the rendered report. A
promoted Decision also requires a reusable/material preservation reason, two or
three real options, selected option, rationale, authority, accepted tradeoff,
consequences, and review trigger. The isolated Notion adapter rejects missing,
stale, incomplete, or non-Tier-A artifact reviews before its first provider
call. The Weekly automation keeps Telegram delivery downstream of the same
reviewed result and Notion read-back.

Proof: `node --test evals/filesystem/tests/*.test.mjs` passed 88 tests with 10
explicit skips; the focused workflow suite passed 38/38; the relevant Python
contract suite passed 28/28.

## Outcome

An executive should understand each material problem, decision, and promoted or
deferred SOP from the Company report itself. Opening a source report should add
proof, not supply the missing meaning.

```text
Final Project reports
        │
        ▼
structured Company section entries
        │
        ▼
rendered executive paragraphs
        │
        ▼
independent seven-check review ── B/C/D ──> regenerate
        │ Tier A + matching result hash
        ▼
Notion write → read-back → Telegram delivery
```

## Before: what failed

The Company report collapsed several source facts into unexplained directives:

> Critical handoffs do not always resolve to one complete source.

> Protect the CMT line only through the approval deadline.

> Promote the approved Ecommerce listing handoff.

These lines name a theme or action but omit enough context that an executive
must open the source reports to learn the workflow, evidence, consequence,
owner, timing, and decision boundary.

## After: realistic Company-report content

### Problems and inefficiencies

#### Fragmented handoffs are consuming approval time across three workflows

CMT construction instructions are split between the signed first-sample sheet,
an unapproved consolidated tech pack, and an outstanding collar correction;
the production slot is held only through 27 August. Marketing received
photography, offer copy, channel dimensions, and branch variants separately,
which forced corrections across three Deepavali asset batches and reduced
branch preparation time by two days. Ecommerce has the same control weakness in
a different form: the order-confirmation fix is marked complete without a
recorded root cause, affected-order count, or end-to-end verification. The
cross-company problem is therefore not merely “missing files”; approval and
closure can occur before one accountable source package contains the evidence
needed by the next receiver.

No defensible monetary cost is available because handling time, affected-order
volume, and rework hours were not recorded consistently. Confidence is high
that the handoff failure occurred in all three Areas, but low on financial
impact. Maya should measure correction time for the next Marketing batch,
Darren should record affected orders and verification time for Ecommerce, and
Aisha should record approval wait time before the CMT line decision. Trial one
named source package per workflow next week; success means each receiving owner
can make the approval or closure decision from that package without searching
another thread. Evidence: CMT, Marketing, and Ecommerce W34 Department reports.

### Decisions

#### Hold the CMT production slot only until the approval deadline

Aisha retains the reserved CMT capacity through 27 August because the signed
first sample passed construction checks, but production is not yet releasable:
the consolidated tech pack and collar correction remain open. This protects a
near-term slot without treating an approved sample as approval of the complete
handoff. The tradeoff is that capacity may be released if both gates remain
open at the deadline. Reconsider immediately if the collar correction changes
an approved measurement or the pack cannot become the single construction
source. Evidence: CMT W34 Department report and the approved sample-baseline
Decision.

#### Keep the Deepavali theme selection and finish channel-ready asset folders

Maya keeps the approved family-apparel, festive-fabric, and home-furnishing
themes because the selection and activation calendar were approved on 21
August. The decision does not approve incomplete assets: each remaining batch
must contain product IDs, photography, offer copy, channel dimensions, and
branch variants in one folder before scheduling. The tradeoff is a narrower
release pace in exchange for avoiding another partial handoff. Review sales and
campaign response after seven live days and reopen the theme mix only if a
theme materially underperforms. Evidence: Marketing W34 Department report and
TASK-201.

#### Reopen the Ecommerce order-confirmation fix until closure evidence exists

Darren should not treat the completed status as operational closure because the
canonical Work record does not state the root cause, affected-order impact, or
end-to-end verification result. Product-attribute and checkout fixes remain
closed because named storefront cases were verified; only order confirmation
is reopened. This separates a specific evidence gap from a blanket rollback of
working changes. Close it again when representative guest orders complete from
checkout through confirmation and the affected-order count and cause are
recorded; monitor related customer enquiries until then. Evidence: Ecommerce
W34 Department report and TASK-102.

### SOPs

#### Adopt the Ecommerce listing handoff

The Ecommerce listing procedure is approved because it was used across two
product batches and defines the receiver-ready output: approved sample details,
photography, copy, dimensions, fabric attributes, mobile checks, and final
acknowledgement remain together. Darren owns the workflow. Use it for the next
listing batch and reopen the SOP if the receiving team still needs to recover a
missing input outside the handoff. Canonical SOP:
`SOP-ECOM-LISTING-HANDOFF-01`.

#### Adopt the Deepavali campaign asset handoff with a bounded scope

The Marketing folder procedure is approved for campaign asset preparation
because three batches reused the same trigger, completeness check, and output.
Maya owns it. Its current proof is within one campaign, so the Company report
must not describe it as a company-wide standard yet. Apply it to the remaining
Deepavali batches, then review whether the same method works unchanged in the
next campaign before broadening its scope. Canonical SOP:
`SOP-MKT-CAMPAIGN-ASSET-HANDOFF-01`.

#### Keep the CMT handoff at Project level

Do not promote the CMT handoff as an SOP this week. The signed sample baseline
is an approved Decision, but the full sequence—corrected sample, approved tech
pack, production booking, and first-batch confirmation—has not yet been proven
end to end. Aisha should retain these steps in the CMT Project report and
reconsider promotion after the first production batch completes with one
traceable handoff package.

## Enforcement changes

### 1. Extraction contract

**Before**

```js
report_markdown: z.string().min(1)
```

Any non-empty prose can pass structural validation.

**After**

Keep rendering Markdown, but generate it from small structured entries:

```js
problem: {
  title,
  context_and_operating_impact,
  measurement_and_confidence,
  intervention_and_test,
  evidence_ids
}

decision: {
  title,
  context_rationale_and_tradeoff,
  authority_and_timing,
  consequence_and_review_trigger,
  evidence_ids
}

sop: {
  title,
  workflow_and_output,
  proof_scope_and_owner,
  disposition,
  destination_id,
  evidence_ids
}
```

These are text fields, not dozens of atomic metadata fields. They give the
renderer and reviewer stable semantic units without forcing executive readers
to consume JSON.

### 2. Reviewer contract

**Before**

The rubric defines seven checks, but the Zod schema requires only five.

**After**

Require all seven checks for every report and section entry:

- referential clarity;
- end-user value;
- readability;
- template fidelity;
- groundedness;
- workflow reconstructability;
- baseline integrity.

The review must cite the exact result pointer for every check. Missing coverage
is invalid, not implicitly passing.

### 3. Integration gate

**Before**

Recovery execution can write or deliver without a matching review artifact.

**After**

Notion and Telegram adapters require:

```text
review.independent = true
review.tier = A
review.verdict = pass
review.result_sha256 = sha256(exact weekly result bytes)
review covers every report + problem + decision + SOP
```

No review, stale hash, incomplete coverage, or B/C/D verdict means zero provider
writes. Recovery mode is not exempt.

### 4. Adversarial evals

Add deterministic cases that must fail:

1. the current one-line Company report;
2. a problem with no workflow step or measurement owner;
3. a decision with no rationale, authority, tradeoff, or review trigger;
4. an SOP line that states only “promote” or “reuse”;
5. a Tier-A review whose hash belongs to different result bytes;
6. a review using only five of the seven rubric checks;
7. a detailed Project report compressed into a context-free Company sentence.

The positive golden should use the realistic paragraphs above and prove that
each executive claim resolves to a Final Department report.

## Residual risk

Quality remains judgment-based: structured fields prevent omissions but cannot
guarantee good prose. The independent reviewer therefore remains necessary.
The safe boundary is deterministic completeness plus a hash-bound qualitative
review, followed by provider read-back.
