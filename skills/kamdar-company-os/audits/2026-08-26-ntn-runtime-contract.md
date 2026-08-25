---
skill: kamdar-company-os
date: 2026-08-26
change: ntn-runtime-contract
evidence: Hermes session 20260826_001417_0583e1
---

# Notion CLI runtime repair

Expected: Hermes reads the installed automation and uses the configured `ntn`
integration against only the dated eval databases.

Observed: the skill pointed at `workspace/.hermes.md` even though the runtime
starts inside `workspace/`, and it did not name valid CLI primitives. Hermes
invented `ntn projects`, `ntn work-items`, and `ntn reports`, then stopped.

Repair: use current-workspace paths and make the supported resolve, query,
page-read, metadata-read, property-update, body-replacement, and comment-create
commands first-load guidance. Require read-back, payload hashes, idempotency
keys, and exact database routing before writes.

The Daily and Weekly automation entry points now require the skill to be read
completely and the four relevant `ntn ... --help` surfaces to be checked before
the first provider call. The global agent policy remains unchanged because CLI
syntax belongs to this integration owner, not every agent task.

Proof: `tests.test_daily_pipeline_skills` asserts every supported primitive.
A fresh Hermes read-only preflight loaded the installed contract, checked all
four help surfaces, resolved and queried the configured Projects and Work data
sources, fetched one page from each, attempted zero writes, and returned no
blocker. The operated Daily and Weekly receipts remain the write-path evidence;
no new fully autonomous write replay is claimed.
