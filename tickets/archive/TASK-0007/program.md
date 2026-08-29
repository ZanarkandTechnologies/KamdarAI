---
ticket: TASK-0007
ticket_updated: 2026-08-27
packet_status: active
trigger: active_goal
approval: approved
generated_prompt: generated-goal-prompt.md
metric_provider: hybrid_fixture_eval_plus_isolated_provider_receipt_plus_independent_review
---

# TASK-0007 Goal Program

## Objective and authority

Complete the ticket's source-proof contract: validate the source-owned Daily
and Weekly automations, provision one fresh Notion-only seed root, run the
bounded workflow there, and retain concise evidence. The user's 2026-08-25
instruction approves that one new root and its receipt-backed writes.
Production Kamdar, existing eval roots, staff messaging, profile installation,
and HermesCorp synchronization remain out of scope.

## Metric and proof provider

The finish provider is hybrid: deterministic package/fixture assertions prove
contract shape and safety; a new isolated Notion root plus redacted receipts
prove the provider edge; an independent reviewer judges the completed evidence
bundle. No fabricated numeric quality threshold substitutes for those gates.

## Budget and stop conditions

No numeric budget was supplied. Bound work to one TASK-0007 ticket, one new
source-safe seed namespace, and the canonical automation/eval packages. Stop blocked if
source validation, isolated-root identity, required Notion capability, or an
artifact's deterministic contract cannot be repaired safely. Never retry a
write outside the new root; never remove an existing root to make a retry pass.

## Compiled Execution Path

```text
E1 source contracts + modular seed config
  -> C1 validate source/templates/Daily-Weekly eval suites
  -> D1 deterministic automation verdicts
  -> C2 provision a fresh marked Notion seed root
  -> D2 root identity + schema preflight receipt
  -> C3 run the bounded Daily then Weekly fixture workflow
  -> D3 redacted provider receipt + generated report artifacts
  -> C4 independent evidence review
  -> D4 TASK-0007 evidence report and completion decision

F1 invalid source or fixture -> repair source owner -> rerun smallest affected eval
F2 unknown/mismatched Notion root -> stop; create no write plan
F3 provider write/preflight failure -> retain diagnostic receipt; no fallback target
F4 review or closure failure -> repair named owner and rerun only its proof
```

## Reference Manifest

| Reference | Consumer | Why it is loaded |
| --- | --- | --- |
| `ticket.md` | all C/D nodes | scope, Done assertions, and safety boundary |
| `automations/daily-operating-update.md` | C3 | Daily collector/fan-out order |
| `automations/weekly-operating-review.md` | C3 | Weekly convergence/finalization order |
| `seed/manifest.json` | C1–C3 | modular source-safe seed content and table routing |
| `evals/filesystem/scripts/kamdar-seed-config.mjs` | C1/C2 | seed validation and projection |
| `evals/daily/suite.json` | C1/D1 | Daily cases, feature assertions, and proof bindings |
| `evals/weekly/suite.json` | C1/D1 | Weekly cases, feature assertions, and proof bindings |
| `evals/filesystem/scripts/unified-daily-review-eval.mjs` | C1/D1 | Daily deterministic and judged-run validation |
| `evals/filesystem/scripts/unified-weekly-review-eval.mjs` | C1/D1 | Weekly deterministic and judged-run validation |
| `evals/filesystem/scripts/run-task0007-reference-automation.mjs` | C3/D3 | source-safe four-Daily direct-Draft run plus Draft-read-only Weekly finalization |
| `evals/filesystem/scripts/operate-task0007-notion-seed.mjs` | C2–D3 | one-root provision, preflight, Notion-only application, and receipt |
| `artifacts/qa/direct-weekly-draft-operating-report.md` | D3/D4 | corrected direct-Draft operating evidence owner |

## Completion Closure

| Done assertion | Owning change | Evidence source | Status |
| --- | --- | --- | --- |
| One collector fans out to four Daily pipelines | eval runner and Daily proof | context manifest + four outputs | supported |
| Automations are independently evaluable and safe | Daily/Weekly validators | canonical cases, no-provider assertions, and guarded receipts | supported |
| Weekly convergence is deterministic | Weekly proof | direct current-Draft anchors, conflict/duplicate checks, and no-op rerun result | supported |
| Fresh Notion proof never touches production/current roots | isolated seed operator | root marker, state, preflight, redacted receipt | supported |
| Report explains actual feature behavior | corrected feature docs and direct-Draft fixture | feature contracts + current Weekly-Draft fixture report hierarchy | supported |
| Independent review validates corrected direct-Draft evidence | review lane | `artifacts/review/direct-weekly-draft-review.md` | conditionally supported; LSP diagnostic gate unavailable in this environment |

## Decision and drift loop

Before each turn, read the full ticket, this program, and at most the newest 80
lines of `progress.md`; target 300 total lines and block initial load above 400.
Apply `observe -> choose_next(objective, evidence, eligible_moves,
remaining_budget) -> execute | diagnose | report_now | request_feedback | stop
-> act -> verify -> write_back`. Append observation, evidence, learning,
decision, remaining budget, and next action. Run `goal-drift-reviewer` after
the isolated eval batch and before completion review; regenerate this packet if
the ticket, seed, suite, or proof contract changes.

`stop_complete` is withheld until every Completion Closure row is supported.
