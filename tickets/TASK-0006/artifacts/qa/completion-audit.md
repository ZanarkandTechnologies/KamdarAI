---
ticket_id: TASK-0006
kind: completion-audit
status: partial-local-proof
audited_at: 2026-08-21T23:55:00+08:00
scope: source, frozen proof, read-only profile preflight
---

# TASK-0006 completion audit

This audit separates source-level proof from the deliberately gated operated
phase. A passing frozen result is not treated as a provider receipt.

| Ticket requirement | Current evidence | Verdict |
| --- | --- | --- |
| Buyer story and four Daily + four Weekly outcomes | `/showcase` is a 768px buyer path with record/file/behavior/application drill-downs; fresh frozen run is 54/54 | Local pass |
| Type-specific templates and in-place Project memory | Project, Task, Issue, Meeting, Decision, Resource, Skill/SOP, request, and follow-up templates are versioned; runner produces no `daily/projects/` or `weekly/planning/projects/` artifact | Local pass |
| Feature docs own flow/proof and assertions resolve by `feature_id` | Nine docs contain the required sections and the eval registry resolves each assertion to one doc | Local pass |
| Private capture and realistic overlay | The private capture compiler generated a mode-0600 seed; its hash/counts are verified by the frozen runner; the result exposes only hash + verification boolean | Local pass |
| Detailed comments, reports, promotions, and owner payload | Frozen scenario verifies exact comment fields, 12 Project → 7 Department → 1 Company hierarchy, and artifact/template content | Frozen pass only |
| True v4 relations and filtered linked views | Source contract and templates require them, but v4 schema/pages were not mutated or re-read in this pass | Awaiting separately authorized Notion provisioning |
| Real mentions, Drive upload, Email, and Telegram receipt | Preflight is default-deny; actual profile currently blocks Google expiry, missing allowlist, and missing Telegram channel directory | Blocked pending setup and `operated-send` approval |
| v4-only buyer links, tests, browser and independent review | Buyer HTML contains only the nine v4 Notion URLs; 17 Node tests, 12 repository tests, seven setup tests, 12 webhook tests, browser check, and TAS-A implementation review pass | Local pass |
| v2/v3 cleanup | Read-only manifest names targets; no archive operation occurred | Intentionally deferred |

## Read-only v4 baseline observation

The profile-local v4 runtime ledger confirms one isolated root with eight
database references and 23 historical receipts (18 `applied`, five `blocked`).
It records the earlier two-Project proof and 14 installed template pages, not
the TASK-0006 39-Project seed or the new Issue/Meeting templates. The ledger
stores database IDs/URLs but no schema or linked-view snapshot. It therefore
supports v4 identity and historical receipt count only; it is not proof of the
new relational data model, current template install, or a fresh provider send.

## Required evidence for the operated phase

```text
operated_send_approval(
  provider, route_key, payload_hash, idempotency_key
) -> bounded v4 write/send
   -> redacted provider receipt
   -> payload-hash comparison
   -> second-run skipped action
```

The approval must be recorded in `progress.md` before any external mutation.
It must name the provider and private route key but never place the route value,
recipient, chat ID, token, cookie, or authorization in Git.

## Current safe commands

```bash
node --test evals/filesystem/tests/*.test.mjs
KAMDAR_PRIVATE_SEED_PATH="$HERMES_HOME/state/kamdar-eval/private-seed-2026-08-21.json" \
  node evals/filesystem/scripts/template-first-kamdar.mjs
node evals/filesystem/scripts/live-kamdar-poc.mjs --preflight
```

## Grounding

- Local ticket, templates, feature docs, eval registry, compiler, runner, and
  private aggregate manifest were inspected.
- Notion relation and linked-view requirements remain aligned with the official
  [relation property](https://developers.notion.com/reference/property-object),
  [relation value](https://developers.notion.com/reference/page-property-values),
  and [views](https://developers.notion.com/guides/data-apis/working-with-views)
  documentation. No unverified API write is implied by this audit.
