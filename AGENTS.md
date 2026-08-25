# KamdarAI source and runtime contract

KamdarAI is the source-controlled development and evaluation harness for the
Kamdar Hermes manager. It is not the live Hermes workspace. Keep authored
inputs here; install reviewed inputs into the separate runtime explicitly.

## Accessible locations and ownership

| Location | Owner | Purpose |
| --- | --- | --- |
| `/Users/kenjipcx/Zanarkand Technologies/projects/KamdarAI` | KamdarAI | Authoritative Kamdar workspace context, automation contracts, skills, evals, scripts, and tests. |
| `/Users/kenjipcx/.hermes/profiles/vishan-kamdar-ai/workspace` | Hermes runtime | Live reports, memory, proposals, receipts, and other agent-created company artifacts. |
| `/Users/kenjipcx/.hermes/profiles/vishan-kamdar-ai` | Hermes profile | Private credentials, installed skill copies, sessions, logs, caches, gateway state, and local databases. |
| `/Users/kenjipcx/Zanarkand Technologies/projects/HermesCorp` | HermesCorp | Company-agnostic template and upstream home for reusable improvements. Never copy Kamdar data or private runtime state into it. |

## Repository layout

- `workspace.hermes.md`: the reviewed, nonsecret workspace context installed as
  `.hermes.md` in the live runtime.
- `automations/`: readable automation contracts; scheduling and generated runs
  remain runtime concerns.
- `docs/features/` and `docs/systems/`: stable capability contracts and the
  Company OS composition map. Eval rows reference feature IDs; features do not
  create separate runtime scans.
- `templates/`: Kamdar-owned record/report contracts installed into the runtime
  workspace. Canonical imports retain an upstream template ID and version.
- `skills/`: Kamdar-owned skill source, including the explicit workspace setup
  path. Installed profile copies are derived artifacts.
- `evals/`: behavioral cases, filesystem assertions, local authoring UI, and
  run tooling. Generated eval runs are ignored.
- `scripts/` and `tests/`: deterministic helpers and repository checks.

There is intentionally no tracked `profile/`, `context/`, `deploy/`, or nested
distribution tree. Do not add a profile overlay or mirror the live workspace
here.

## Development flow

1. Edit the workspace context, automations, templates, skills, and eval cases in this repository first.
2. Run the narrow deterministic tests and filesystem eval tests locally.
3. Preview source-to-runtime changes with
   `skills/setup-kamdar-workspace/scripts/setup_workspace.py`.
4. Apply only after `workspace.hermes.md` has owner-approved status.
   The setup command copies an allowlist and never deletes runtime files.
5. Set `terminal.cwd` with Hermes' native config command, then verify behavior
   from a fresh Hermes session. Do not use symlinks as synchronization.
6. Generalize a capability in HermesCorp only after it is proven here and has
   been scrubbed of Kamdar-specific data.

The source repository is authoritative for intended behavior. The live
workspace is authoritative for generated operational state. Never edit both
copies and treat them as co-equal sources.

## Safety

- Never commit credentials, OAuth material, sessions, logs, databases, caches,
  generated reports, project memory, or unsanitized company data.
- `.gitignore` is cleanup protection, not the runtime isolation boundary.
- External Notion, Drive, Gmail, messaging, scheduling, and webhook writes
  require their own bounded integration checks and the authority stated in the
  automation or skill contract.
- Preserve unknown live-workspace files. Archive or delete them only through a
  separately approved cleanup.

## Verification

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 -m unittest discover -s skills/setup-kamdar-workspace/tests -v
python3 -m unittest discover -s skills/notion-webhook-onboarding/tests -v
node --test evals/filesystem/tests/*.test.mjs
python3 scripts/validate_company_context.py --context workspace.hermes.md
kamdar config get terminal.cwd
```
