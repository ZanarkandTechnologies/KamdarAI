---
ticket_id: TASK-0002
title: Make the Kamdar proof feature-first
status: complete
created_at: 2026-08-21T14:20:00+08:00
updated_at: 2026-08-21T14:42:00+08:00
owner: Codex
source_ticket: TASK-0001
---

# TASK-0002: Make the Kamdar proof feature-first

## Summary

Document each accepted Daily and Weekly pipeline as a stable Kamdar feature,
show how the features compose into one Company OS, tag every existing eval
assertion with its owning feature, and replace the global assertion-list UI
concept with a feature-first ASCII prototype.

## Scope

- `In:` Farplane-shaped feature pages, one Kamdar Company OS system page,
  automation feature maps, `feature_id` tags in `evals/evals.json`, contract
  tests, and a feature-first ASCII UI draft with expandable file/content checks.
- `Out:` implementing the new browser UI, adding unimplemented promotion
  artifacts, live Notion/Drive/email/Telegram writes, or provider provisioning.

## Done / Proof

- [x] Every proposed pipeline has one discoverable `FEAT-*` owner.
- [x] The system page shows Daily staging, Weekly promotion, destinations, and
      write gates in one diagram.
- [x] Every current file and behavior assertion has exactly one `feature_id`.
- [x] The ASCII prototype shows feature navigation and expandable file-content
      assertions without buyer-facing ASCII-comparison noise.
- [x] Repository contract tests and JSON validation pass.

## Links

- `prior_contract:` `tickets/TASK-0001/ascii-prototype.md`
- `ascii_v2:` `tickets/TASK-0002/ascii-prototype.md`
- `feature_index:` `docs/features/README.md`
- `system_spec:` `docs/systems/kamdar-company-os.md`
- `review:` `tickets/TASK-0002/artifacts/review/documentation-review.md`
