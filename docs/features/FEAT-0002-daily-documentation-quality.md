---
title: Review Done Work for documentation sufficiency
status: active
execution_modes: [source-contract]
production_mode: proposal-only
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-29
tags: [company-os, feature, daily, documentation]
feature_id: FEAT-0002
feature_key: daily.document-quality
system_id: SYS-0001
category: quality
public: true
surfaces:
  - automations/daily-operating-update.md
  - templates/task.md
  - templates/feature.md
  - templates/issue.md
  - templates/meeting.md
source_refs:
  - workspace.hermes.md
  - tickets/archive/TASK-0007/ticket.md
evidence_refs:
known_limits: "The next Daily run guarantees re-review while AI review is not Processed; deterministic event-driven re-review from a Notion reply remains follow-up work."
---

# Review Done Work for documentation sufficiency

The Company OS gives every selected Done Work item one versioned documentation verdict.
It asks a precise question when required evidence is missing and marks AI review
Processed only after documentation is sufficient and required effects settle.

## Why it exists

Progress, cost, risk, and decisions cannot be operated from vague or incomplete
Work records. A named field and update location is answerable; “please add more
detail” is not.

## Trigger and inputs

The Daily automation collects active Projects, linked open or changed Work for
Project progress, and fully read Work where `Status = Done` and
`AI review != Processed`. The matching Task/Feature/Issue/Meeting template and
`task-completion@1.0.0` rubric ID bound the review.

## Pipeline signature

```text
Done Work + template + task-completion@1.0.0
  -> sufficient | needs_information
  -> Processed | Needs information | Blocked
```

The [Daily automation](../../automations/daily-operating-update.md) owns the
extraction and writes only through the Notion route authorized by
`workspace.hermes.md`. Missing write authority leaves the review blocked.

## Flow

```text
Done, AI review != Processed
          |
          v
documentation_reviews[]
       |                 |
  sufficient      needs_information
       |                 |
settle effects   post one deduplicated question
       |                 |
   Processed        Needs information
```

## State changes and artifacts

- Emits exactly one `documentation_reviews[]` row per selected Done Work item.
- A `needs_information` row names missing requirement IDs, a stable
  `question_key`, exact Work and owner IDs, source IDs, and the comment text.
- A `sufficient` row cannot carry a question or missing requirement.
- Business `Status` stays Done throughout the AI review lifecycle.

## Downstream application

The Daily automation posts a reviewed question to the exact Work item only when
the active environment authorizes it. A successful comment sets `AI review` to
`Needs information`, not `Processed`. The human edits the named page section
and can request re-review in the same Notion discussion; otherwise the next
Daily run re-fetches the item.

## Failure modes

An unread page, unknown record type, absent source ID, or missing AI review
property is a configuration gap. A blocked, conflicted, or failed required
effect sets `AI review = Blocked` and leaves the review version empty.

## Proof contract

The Daily eval proves that Done-unprocessed Work is selected, Processed Work is
rejected, every selected item receives a verdict, a posted question remains
Needs information, and only sufficient documentation plus settled effects can
write `daily-review-v2` and Processed.

## Example

A Done performance ticket reports ROAS but lacks the reporting window, spend,
revenue, attribution setting, comparison, and source export. Daily posts one
question naming those gaps and sets AI review to Needs information. After the
owner updates the page, the next review can return sufficient and process the
item after all required effects settle.
