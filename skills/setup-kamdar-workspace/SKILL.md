---
name: setup-kamdar-workspace
description: "Install reviewed Kamdar workspace inputs and reconcile native schedules after distribution install or from a separate developer checkout."
tier: 3
group: operations
source: local
template_uses:
  skill-template: "0.6.2"
eval: evals/evals.json
---

# Set up the Kamdar workspace

## Context

Use this skill after native profile installation to create or reconcile the
Kamdar Hermes workspace and its Daily/Weekly schedules. It also supports the
developer path from a source checkout into a separate profile. Runtime reports,
memory, sessions, credentials, and caches stay under the Hermes profile.

The deterministic helpers manage only the reviewed workspace context,
`automations/`, automation schemas, the shared artifact-quality rubric,
`templates/`, project-owned `skills/`, and project-owned `plugins/`. It previews
by default and never deletes target files. `setup_profile.py` also sets native
`terminal.cwd`, enables and validates the shipped Notion platform plugin, and
reconciles the two canonical cron jobs. Credentials and the Notion webhook
remain separate setup steps.

## Skill Signature

```text
setup_kamdar_workspace(profile_home, apply = false)
  -> workspace_receipt + cron_receipt + scheduler_state
reads: workspace.hermes.md, automations/, schemas/automations/,
       evals/rubrics/, templates/, skills/, plugins/, target state
does: validates ownership, previews or copies allowlisted files,
      enables the shipped Notion plugin, and reconciles native runtime config
writes: workspace/.hermes.md, workspace/automations/,
        workspace/schemas/automations/, workspace/evals/rubrics/,
        workspace/templates/, profile_home/skills/, profile_home/plugins/
returns: JSON state, changed or pending paths, cron actions, scheduler state, next gate
```

<!-- BEGIN FARPLANE_IMPORTANT_CHECKLIST -->
## Todo List

- [ ] **N1 — Resolve the source/runtime mode.**
  `profile + distribution metadata -> installed-distribution | developer-copy | blocked`

  Rule: An installed distribution may write only its own `<profile>/workspace`;
  a developer checkout may target only a separate, nonsymlinked profile.

  Assert:
  - The repository is never used as live workspace state.
  - Native distribution mode requires recorded `source` and `installed_at` metadata.

- [ ] **N2 — Preview the complete runtime delta.**
  `approved source + current profile -> file delta + cron delta`

  Rule: Run `python3 scripts/setup_profile.py --profile-home <profile-home>`
  before apply. Approval comes from `workspace.hermes.md`, never from gateway
  health or a prior installation.

  Assert:
  - Preview performs no copy, config, or cron mutation.
  - The receipt names pending files and create/update/in-sync job actions.

- [ ] **N3 — Install only reviewed Company OS inputs.**
  `approved preview -> workspace files + native terminal.cwd`

  Rule: Rerun `setup_profile.py` with `--apply`; never symlink the repository,
  copy credentials, or delete unknown client files.

  Assert:
  - `.hermes.md`, automations, schemas, templates, and the runtime rubric exist.
  - `terminal.cwd` equals the profile's workspace and deletion count is zero.

- [ ] **N4 — Reconcile canonical schedules without duplicates.**
  `current jobs + client workspace -> two exact native jobs | duplicate-name blocker`

  Rule: Match jobs by canonical name, update drifted schedules/prompts/workdirs,
  create missing jobs, and block ambiguous duplicates.

  Assert:
  - Daily is `0 8 * * 1-5`; Weekly is `0 18 * * 5`.
  - Both use the client-local workspace and a second apply is in sync.

- [ ] **N5 — Enable and validate the shipped Notion connector.**
  `profile plugin files + explicit no-override grant -> enabled connector | blocked`

  Rule: Enable the profile-owned plugin as `platforms/notion`, explicitly deny
  built-in tool replacement, and run the native plugin doctor before claiming
  readiness. The connector is shipped by the distribution; it is not fetched
  from the community plugin registry.

  Assert:
  - `hermes plugins list --user --json` reports `notion-platform` enabled.
  - `hermes plugins doctor platforms/notion` passes registration.

- [ ] **N6 — Verify readiness and hand off Notion.**
  `installed files + native config + jobs + gateway -> ready | partial | blocked`

  Rule: A configured workspace with a stopped gateway is `partial`, because the
  jobs will not fire. Run `notion-webhook-onboarding` separately only after core
  setup is ready.

  Assert:
  - The receipt distinguishes installed files, job state, and scheduler readiness.
  - No Notion or ngrok success is claimed by this skill.
<!-- END FARPLANE_IMPORTANT_CHECKLIST -->

## Gotchas

- Gitignore is not a security or ownership boundary for live agent state.
- `hermes profile install` creates the profile; this skill configures its
  Company OS workspace and schedules after `hermes setup`.
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
  notion_plugin: in_sync | enabled | blocked
  daily_job: in_sync | created | updated | blocked
  weekly_job: in_sync | created | updated | blocked
  scheduler_ready:
  next_action:
```
