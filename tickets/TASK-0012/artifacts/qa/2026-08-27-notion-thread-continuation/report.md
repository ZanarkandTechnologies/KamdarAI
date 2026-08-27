Ticket / Proof Policy: tickets/TASK-0012/ticket.md / Done + QA Strategy + reviewer
Verdict: pass

# Notion thread continuation QA

## Tested path

1. A leading `@vishanai` comment activates its exact open discussion.
2. The connector retrieves the comment parent, paginates open comments, sorts
   them, and selects only the exact `discussion_id`.
3. A later untagged human comment continues only when an earlier comment in
   that discussion contains the trigger or was authored by Hermes.
4. Hermes receives the exact discussion as a shared discussion-scoped session.
5. A substantive response posts to that same discussion. The exact optional
   `[[NOTION_NO_REPLY]]` marker produces a successful suppressed receipt and no
   provider call.

## Obligation-to-evidence map

| Obligation | Result | Evidence |
| --- | --- | --- |
| Explicit activation and exact discussion isolation | PASS | 14 focused adapter/protocol tests |
| Untagged continuation and chronological full-thread context | PASS | Focused follow-up, ordering, unrelated-thread, and delayed-webhook tests |
| Selective silence and malformed-marker safety | PASS | Send-boundary API-spy tests |
| Bot-loop prevention and exact reply routing | PASS | Focused own-bot and discussion reply tests |
| Allowlisted non-deleting source installation | PASS | 7 setup tests and read-only live-profile preview with `deletion_count=0` |
| Repository regressions | PASS | 25 Python tests; 12 onboarding tests; 82 Node tests passed and 2 skipped |
| Source integrity | PASS | Pyright 0 diagnostics; connector/test `py_compile`; `context_valid=true`; `git diff --check` |

## Commands and results

- `python3 -m unittest tests.test_notion_comment_adapter tests.test_notion_webhook_protocol -v`: 14 passed.
- `python3 -m unittest discover -s tests -p 'test_*.py' -v`: 25 passed.
- `python3 -m unittest discover -s skills/setup-kamdar-workspace/tests -v`: 7 passed.
- `python3 -m unittest discover -s skills/notion-webhook-onboarding/tests -v`: 12 passed.
- `node --test evals/filesystem/tests/*.test.mjs`: 82 passed, 2 skipped, 0 failed.
- `python3 scripts/validate_company_context.py --context workspace.hermes.md`: `context_valid=true`.
- `npx --yes pyright --project pyrightconfig.task0012.json` against all modified
  Python connector, test, and setup files: 0 errors, 0 warnings, 0 information;
  the temporary scoped configuration was removed after the check.
- Read-only setup preview against the live profile: `state=changes_pending`,
  connector source listed under `profile:plugins/platforms/notion/`, no writes,
  and `deletion_count=0`.

## Verdict rationale

The deterministic mechanism, routing failures, isolation boundary, optional
silence boundary, source installation, and relevant regressions pass. The live
profile was deliberately not updated because the preview also contains
unrelated pending workspace changes.

## Residual risk

A controlled real-Notion smoke is still needed after an isolated or explicitly
approved install to prove current provider permissions, webhook delivery
timing, and VPS runtime behavior. This is outside the ticket's local-QA scope
and is not represented as completed provider proof.

## Learning

`ticket_only`: the existing Notion comment and Hermes thread contracts were
sufficient; no new service, database, or reusable QA cookbook is needed.
