---
skill: dispatch-employee-messages
date: 2026-08-26
status: implemented
mode: hardening
feature_ref: FEAT-0003
---

# Progress-chase eval-sink hardening

## Behavior delta

Expected: an isolated Daily eval may prove the rendered owner chase through the
operator-owned Telegram sink while preserving the fictional intended Person and
never claiming employee delivery.

Observed: the Daily automation described that boundary, but the dispatcher had
only `prepare|send`; the golden integration receipt called the chase a duplicate
and linked its provider response to Notion. The eval therefore allowed the
progress-chasing feature to disappear behind a misleading receipt.

## Owner-local repair

- Added `isolated-eval` as an explicit dispatcher mode, distinct from employee
  channel fallback.
- Added the `delivered_to_eval_sink` receipt state with intended Person, sink
  scope, payload hash, Telegram provider message ID, and read-back.
- Added a normal eval case for Aisha and kept unavailable email/WhatsApp cases
  blocked without fallback.
- Added deterministic unified-Daily rejection when chase delivery proof is
  absent or mislabeled.

## Proof

The focused Daily integration and unified-Daily tests exercise the positive
receipt and a negative duplicate-without-delivery case. The tracked receipt is
source-safe expected evidence using `example.test`; a real operated receipt must
come from the private runtime and is not committed.
