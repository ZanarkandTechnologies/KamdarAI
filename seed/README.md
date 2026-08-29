# Kamdar seed

This directory is the canonical source-controlled seed for local and isolated
operated evaluation.

- `manifest.json` owns shared metadata, clock, environment markers, and table
  routing.
- `projects.json`, `people.json`, `tasks.json`, `meetings.json`, and
  `reports.json` contain entity rows.
- `scenarios.json` binds FEAT-0001–0007 to representative entity IDs.
- [`contract.md`](contract.md) defines the tracked seed boundary, provenance,
  and validation.
- [`caseboards.md`](caseboards.md) provides human-readable views of the seven
  feature cases.
- [`reviews/grounding-2026-08-26.md`](reviews/grounding-2026-08-26.md) records
  why the scenario layer was rebuilt around client-grounded project identities
  and synthetic operating facts.
- `reviews/realism.json` is the independent realism approval bound to the
  deterministic digest of the manifest and every declared table.

Private company captures and compiled private seeds remain outside Git. The
loader accepts only table paths contained within this directory and rejects
duplicate IDs or broken relations.
