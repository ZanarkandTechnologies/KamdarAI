---
title: Initial Kamdar workspace setup skill audit
owner: skills/setup-kamdar-workspace
status: accepted
kind: skill-audit
updated_at: 2026-08-21
---

# Initial audit

- Scope: install reviewed Kamdar context, automations, and skills into an existing separate Hermes runtime.
- Boundary: no profile overlay, connector credentials, live-state sync, or deletion.
- Deterministic proof: seven setup tests pass, including approved apply, unapproved
  refusal, preview-only behavior, source-boundary rejection, symlink rejection,
  collision preflight, and the normal nested Hermes workspace layout.
- Eval query review: `check_eval_queries.py --root .` passes all three natural
  operator cases; no skill name, checklist, invocation path, or answer-key
  wording appears in their prompts.
- Integration proof: the live preview returns `changes_pending`, performs zero
  deletions, and Hermes reports the separate runtime workspace as
  `terminal.cwd`.
- Residual proof: the live install is intentionally not applied while
  `configs/workspace.hermes.md` remains `proposed-owner-review`.
