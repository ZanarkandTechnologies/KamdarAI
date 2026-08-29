---
title: Keep Project pages current
status: active
execution_modes: [source-contract]
production_mode: proposal-only
owner: Company OS
created_at: 2026-08-21
updated_at: 2026-08-29
tags: [company-os, feature, daily, memory]
feature_id: FEAT-0001
feature_key: daily.project-memory
system_id: SYS-0001
category: memory
public: true
surfaces:
  - automations/daily-operating-update.md
  - templates/project.md
source_refs:
  - workspace.hermes.md
  - tickets/archive/TASK-0007/ticket.md
evidence_refs:
known_limits: "No Project adapter is shipped. Production Project updates remain proposal-only."
---

# Keep Project pages current

The Company OS turns one collector snapshot into minimal, source-linked Project changes.
Project-specific facts remain in `Project knowledge`; current-week operational
work remains in `This week's attention`. It does not create a copied task list,
child memory page, generic Docs record, or Project summary from memory.

## Why it exists

Project owners need concise durable facts and a live weekly attention checklist
in the Project they already use—not a second Daily page that drifts from it.

## Trigger and inputs

The Daily collector provides a bounded `daily-context-diff-YYYY-MM-DD.json`
with complete selected Work/Meeting evidence, embedded Project snapshots, source
IDs, time window, and source gaps. The automation makes no compensating fetch
when a Project snapshot is absent.

## Pipeline signature

```text
daily Project update rows + exact Project preflight
  -> applied receipt | duplicate | conflict | blocked | no_finding
```

The [Daily automation](../../automations/daily-operating-update.md) owns the
semantic judgment and guarded application. It validates identity, expected
current value, source IDs, and idempotency before applying a replacement.

## Flow

```text
collector context diff → classify evidence
                           │             │
                           ▼             ▼
                 Project knowledge   This week's attention
                           \             /
                            ▼           ▼
                       project-diffs.json
                              │
                              ▼
               guarded Project integration → receipt / conflict
```

## State changes and artifacts

- Creates a `kamdar-project-diff-plan` JSON proposal (a temporary compatibility
  identifier) with source IDs, explicit
  gaps, expected current value, and append/replace intent.
- May target only `Project knowledge` and `This week's attention`.
- Creates zero `daily/projects/*.md` files and zero Project-memory child pages.
- A knowledge item captures a decision-changing proprietary fact, impact,
  evidence, and review condition; an attention item is one actionable,
  accountable, dated/statused checklist entry.
- Default `prepare` mode performs no Project or Work mutation. Explicit `apply`
  can claim only the child integration's observed receipt.

## Downstream application

The nested integration rejects a target mismatch as `conflict` and preserves
the provider's current text. It applies only one named Project section with an
observed adapter response. Weekly reporting reads the resulting current draft
surfaces; it does not receive a second Project-memory file.

## Failure modes

Missing embedded Project evidence, unread Work/Meeting material, duplicate
source IDs, a contradiction, or an unconfirmed cause is a named gap or
`no_finding`. No provider read, inferred Project identity, or “better” rewrite
repairs that gap.

## Proof contract

The local evals cover source-linked knowledge plus weekly reset, uncertain or
duplicate evidence, and a missing Project snapshot. Readiness also requires a
candidate-versus-baseline run and judge verdict against the shared collector
golden; the old v4 filesystem showcase is not proof of this split pipeline.

## Example

A Meeting says rollout needs a normalised comparison and names the next review.
The plan appends that constraint—with its impact and evidence—to `Project
knowledge`, then adds a scoped checklist action for the comparison owner. It
does not rewrite the Project goal or copy the meeting transcript.
