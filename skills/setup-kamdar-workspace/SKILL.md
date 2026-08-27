---
name: setup-kamdar-workspace
description: "Install reviewed Kamdar configs, automations, and skills into an existing separate Hermes workspace and profile, with a safe preview and verification receipt."
tier: 3
group: operations
source: local
eval: evals/evals.json
qa_checklist: qa_checklist.md
---

# Set up the Kamdar workspace

## Context

Use this skill when creating or reconciling the Kamdar Hermes runtime from this
repository. The repository is the authoritative source and eval harness; it is
not the live workspace. Runtime reports, memory, sessions, credentials, and
caches stay under the Hermes profile and workspace.

The deterministic helper manages only the reviewed workspace context,
`automations/`, automation schemas, the shared artifact-quality rubric,
`templates/`, project-owned `skills/`, and project-owned `plugins/`. It previews
by default and never deletes target files. Credentials remain a separate setup
step. Do not create a profile overlay or link the runtime back to this repo.

## Skill Signature

```text
setup_kamdar_workspace(workspace, profile_home, apply = false)
  -> setup_receipt + native_cwd_check
reads: workspace.hermes.md, automations/, schemas/automations/,
       evals/rubrics/, templates/, skills/, plugins/, target state
does: validates separation, previews or copies allowlisted source files
writes: workspace/.hermes.md, workspace/automations/,
        workspace/schemas/automations/, workspace/evals/rubrics/,
        workspace/templates/, profile_home/skills/, profile_home/plugins/
returns: JSON state, changed or pending paths, deletion count, next gate
```

<!-- BEGIN FARPLANE_IMPORTANT_CHECKLIST -->
## Todo List

- [ ] 1. Read `qa_checklist.md`. Resolve the source root, existing runtime
      workspace, and existing Hermes profile home. Refuse either target when it
      is inside the source project or symlinked to it. The normal Hermes
      `<profile-home>/workspace` layout is valid; the profile home may not be
      placed inside the workspace.
- [ ] 2. Validate `workspace.hermes.md` with
      `python3 scripts/validate_company_context.py --context workspace.hermes.md`.
      Inspect the context for credentials and require frontmatter status
      `approved` or `active` before applying it.
- [ ] 3. Run
      `python3 skills/setup-kamdar-workspace/scripts/setup_workspace.py --workspace <path> --profile-home <path>`.
      Review the JSON `pending` list. Do not infer approval from a running
      gateway or a previous copy.
- [ ] 4. After the context gate is satisfied, rerun with `--apply`. Then use the
      Hermes native command `hermes -p <profile> config set terminal.cwd <workspace>`;
      do not store or sync a profile YAML overlay.
- [ ] 5. Run the deterministic tests, check the native `terminal.cwd`, and open
      a fresh Hermes session for representative automation and skill discovery.
      Report file installation and live-session proof separately.
<!-- END FARPLANE_IMPORTANT_CHECKLIST -->

## Gotchas

- Gitignore is not a security or ownership boundary for live agent state.
- Preview may report unmanaged legacy files; this installer does not remove
  them. Archive or delete them only through a separately approved cleanup.
- An installed skill copy may drift. Repair it by rerunning this explicit
  source-to-runtime setup, never by editing both copies.

## Output

```yaml
kamdar_workspace_setup:
  state: in_sync | changes_pending | configured | blocked
  context_status:
  pending_or_changed:
  deletion_count: 0
  native_terminal_cwd:
  live_session_proof: passed | not_run | failed
  next_action:
```
