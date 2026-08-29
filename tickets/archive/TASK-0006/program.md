---
kind: goal-program
ticket_id: TASK-0006
status: active
created_at: 2026-08-21T22:15:00+08:00
compiled_from_ticket_updated_at: 2026-08-21T22:15:00+08:00
generated_prompt: tickets/TASK-0006/artifacts/native-goal-prompt.md
approval: operator-approved-implementation-and-operated-v4-eval-2026-08-22
---

# TASK-0006 Goal Program

## Goal mode

- `mode:` `active_goal`
- `trigger:` explicit operator request to implement TASK-0006 and compare the UI with its accepted ASCII
- `budget:` no numerical budget supplied; continue only while an unresolved Done condition has a bounded safe proof path

## Metric provider

- `provider:` hybrid — deterministic frozen evaluation, read-only provider preflight, browser-visible ASCII comparison, and independent QA/review
- `guards:` v4 only; no production Kamdar mutation; no private route in Git; no fake receipt/link; no v2/v3 archive; operated providers only through the 2026-08-22 operator-authorized v4 routes
- `anti_metrics:` a green assertion count, fixture size, or visual polish that does not prove buyer comprehension, record fidelity, or receipt truth

## Decision backbone

`observe -> choose_next(objective, evidence, eligible_moves, remaining_budget) -> execute | diagnose | report_now | request_feedback | stop -> act -> verify -> write_back`

Use the existing template-first runner, live edge, server, and UI. Prefer the
first unresolved ticket condition that has a local, read-only, or explicitly
authorized proof path. Re-run this packet if its ticket, ASCII, seed contract,
or proof policy changes.

## Proof policy

1. Validate templates, feature docs, eval schema, compiled seed privacy, and source routing.
2. Run frozen Daily → Weekly twice; inspect record diffs, artefacts, content checks, relations, comment detail, report hierarchy, and idempotency.
3. Compare `/showcase` with the accepted ASCII at desktop and narrow widths; capture the default buyer path and expanded record/file evidence.
4. Run Google/Telegram/mention preflight without mutation. Create exact payload/route/idempotency records before execution.
5. Under the 2026-08-22 operated-v4 authority only: mutate v4 and deliver through allowlisted operator routes, re-read receipts, hash-match payloads, and rerun for skips.
6. Require independent implementation, integration/evidence, visual, drift, and completion review; create a narrated demo before completion.

## Context and logging

Initial load is full `ticket.md`, full `program.md`, and the latest 80 lines of
`progress.md`; target 300 lines and block above 400. Load the ASCII, seed, gap,
or code surface only for a named evidence need. Append `observation`,
`evidence`, `learning`, `decision`, `remaining_budget`, and `next_action` after
each material phase.

## Stop conditions

- `complete_when:` all ticket Done conditions and independent proof gates pass.
- `stop_now:` target mismatch, private-data leakage, fake success, recipient outside the allowlist, v4 overwrite risk, or scope beyond the ticket.
- `blocked_when:` the same non-inferable external requirement prevents progress for three Goal turns; record it as blocked rather than simulating success.
- `check_in_program:` not applicable — immediate implementation work.

## Final checkpoint

Run ordered sanity checks, QA/evidence/visual review, demo capture, drift and
completion review. Write the final evidence and approved response to the ticket
before completion. Grounding must name the current official Notion API evidence
used for relations/views and the local source surfaces changed.
