---
name: apply-project-diffs
description: "Apply a reviewed Project-diff plan through one guarded adapter call and return a receipt without making new Project-memory judgments."
tier: 3
group: operations
source: local
capability:
  kind: integration
  consumes: [kamdar-project-diff-plan]
  produces: [kamdar-project-diff-application-receipt]
template_uses:
  skill-template: "0.6.1"
allowed-tools: Read, Write, Grep, Glob
---

# Apply Project Diffs

## Context

Run after `daily-project-memory` produces a reviewed
`kamdar-project-diff-plan`. The artifact skill decides the content; this edge
checks the named Project, applies the unchanged patch through a supplied
adapter, and records the result.

No provider implementation ships here. A missing adapter or preflight means no
write. Never fetch Daily context, resolve another Project, rewrite a patch,
merge unrelated edits, or create a Weekly report.

## Skill Signature

```text
apply_project_diffs(project_diff_plan, project_preflight, project_adapter,
                    receipt_path, prior_receipts? = [])
  -> project_diff_application_receipt.md | duplicate | conflict | blocked | configuration_gap
reads: reviewed Project patches, exact preflight values, prior receipts, and an
       optional adapter response
does: checks source, identity, idempotency, and expected current value; then
      delegates the unchanged patch
writes: receipt_path; one named Project section only after guards pass
returns: per-patch result and safe provider reference only when observed
```

<!-- BEGIN FARPLANE_IMPORTANT_CHECKLIST -->
## Todo List

- [ ] **N1 — Bind the plan to its named Project patch.**
  `kamdar-project-diff-plan -> normalized patch list | configuration_gap`

  Rule: Read only plan entries containing Project ID, target section, operation,
  proposed value, source IDs, expected-current-value, and idempotency key. The
  allowed target sections are `Overview`, `This week's attention`, and
  `Project knowledge`;
  preserve the plan text unchanged.

  Assert:
  - Every result identifies a single Project ID and section.
  - Missing source, target, expected value, or key is `configuration_gap`.

- [ ] **N2 — Preflight the exact identity and expected current value.**
  `named patch + narrow Project preflight -> safe to apply | conflict | configuration_gap`

  Rule: Compare only the plan's Project ID, canonical record identity, target
  section, and expected-current-value with the supplied preflight snapshot.
  A missing target or value mismatch is `conflict`; do not broaden the read or
  reconcile it with inferred context.

  Assert:
  - A mismatch makes no adapter call and preserves the provider's current value.
  - The preflight cannot redirect a patch to another Project or section.

- [ ] **N3 — Enforce source and idempotency guards.**
  `source IDs + idempotency key + prior receipt -> apply | duplicate | conflict`

  Rule: Source IDs must be present in the reviewed plan. An identical prior
  successful key and proposed-value hash is `duplicate`; a reused key with a
  different target or value is `conflict`. Neither path writes.

  Assert:
  - The receipt preserves source IDs, key, and value hash.
  - This skill never turns an unverified gap into a source fact.

- [ ] **N4 — Delegate one unchanged Project patch.**
  `guarded patch + project adapter -> provider response | blocked`

  Rule: Call the supplied adapter only with the selected Project ID, target
  section, operation, and unchanged proposed value. A missing, failed, or
  receipt-free adapter is `blocked`; do not retry by modifying the diff.

  Assert:
  - `applied` requires an observed adapter response.
  - No Work, People, Decision, or Weekly record can be mutated from this skill.

- [ ] **N5 — Render an application receipt.**
  `per-patch result + receipt template -> project-diff-application-receipt.md`

  Rule: Render [the local receipt template](templates/project-diff-application-receipt.md).
  Include guard results and a safe provider reference, but redact provider
  payloads and preserve no raw prior Project content beyond the value hash.

  Assert:
  - A reviewer can distinguish applied, duplicate, conflict, blocked, and gap.
  - The receipt identifies the exact repair or retry condition.
<!-- END FARPLANE_IMPORTANT_CHECKLIST -->

## Templates

- Output contract: [Project-diff application receipt](templates/project-diff-application-receipt.md).
- Calibration golden: [one guarded Project-knowledge patch](examples/golden/project-knowledge-patch.md).

## Gotchas

- `Overview` is a complete section replacement, never permission to rewrite the
  Project title, properties, linked views, or another body section.
- `Project knowledge` is proprietary Project memory; it is not an excuse to
  replace raw Work or Meeting evidence without its source IDs.
- Expected-current-value mismatch is a conflict, even when the new text appears
  "better". Return the conflict; do not merge it.
- This integration owns only the four stated guards: source, identity,
  idempotency, and expected-current-value. Content judgment belongs upstream.
- Do not report `applied` from a local artifact or an adapter intention.

## Output

- One redacted `kamdar-project-diff-application-receipt` following the local
  template; or an explicit `duplicate`, `conflict`, `blocked`, or
  `configuration_gap` result with no unclaimed provider effect.
