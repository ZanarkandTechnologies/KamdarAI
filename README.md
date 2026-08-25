# KamdarAI

KamdarAI is the source-controlled configuration and evaluation harness for the
Kamdar Hermes manager. The live agent runs from a separate Hermes workspace;
this repository owns the reviewed inputs used to configure and test it.

## Quick setup

1. Install Hermes, create a separate profile, and configure that profile.

   ```bash
   hermes profile create kamdarai
   hermes -p kamdarai setup
   ```

2. Clone KamdarAI, preview the install, then apply it.

   ```bash
   git clone <KamdarAI-repository-url>
   cd KamdarAI

   export KAMDAR_PROFILE=kamdarai
   export KAMDAR_PROFILE_HOME="${HOME}/.hermes/profiles/${KAMDAR_PROFILE}"
   export KAMDAR_WORKSPACE="${KAMDAR_PROFILE_HOME}/workspace"
   mkdir -p "$KAMDAR_WORKSPACE"

   python3 scripts/validate_company_context.py --context workspace.hermes.md
   python3 skills/setup-kamdar-workspace/scripts/setup_workspace.py \
     --workspace "$KAMDAR_WORKSPACE" \
     --profile-home "$KAMDAR_PROFILE_HOME"
   python3 skills/setup-kamdar-workspace/scripts/setup_workspace.py \
     --workspace "$KAMDAR_WORKSPACE" \
     --profile-home "$KAMDAR_PROFILE_HOME" \
     --apply
   hermes -p "$KAMDAR_PROFILE" config set terminal.cwd "$KAMDAR_WORKSPACE"
   hermes -p "$KAMDAR_PROFILE" config get terminal.cwd
   ```

   The preview is safe; `--apply` copies the approved context, automations,
   templates, and skills without deleting runtime files. Then open a fresh
   Hermes session from that profile.

3. Set up Notion as a separate test root first. The current config is
   evaluation-only and production writes are proposal-only. Use
   [`templates/`](templates/README.md) for the database shape, then approve
   real database routes and write authority before using production records.

4. Optional: add the Notion comment bridge on the Linux Hermes VPS.

   ```bash
   export KAMDAR_NOTION_ONBOARD="$KAMDAR_PROFILE_HOME/skills/notion-webhook-onboarding/scripts/notion_webhook_onboard.py"
   python3 "$KAMDAR_NOTION_ONBOARD" preflight
   ```

   Follow the preflight output for Doppler, ngrok, credentials, and the Notion
   subscription. It is not a one-command setup because login and webhook
   verification need human input.

## Layout

```text
workspace.hermes.md  Reviewable, nonsecret workspace context
automations/   Daily and weekly operating contracts
docs/          Feature specs and the Kamdar Company OS system map
templates/     Kamdar record and report configuration contracts
skills/        Kamdar skill source and workspace setup
evals/         Template-first assertions and retained legacy proof baseline
scripts/       Deterministic helpers
tests/         Repository contract tests
```

A live workspace follows the layout
`~/.hermes/profiles/<profile>/workspace`; private profile state is one level
above it. Neither is committed or symlinked into this repo. Reusable,
company-agnostic improvements belong in HermesCorp after Kamdar data has been
removed.

## Develop and verify

Edit and test here first:

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 -m unittest discover -s skills/setup-kamdar-workspace/tests -v
python3 -m unittest discover -s skills/notion-webhook-onboarding/tests -v
node --test evals/filesystem/tests/*.test.mjs
python3 scripts/validate_company_context.py --context workspace.hermes.md
```

Preview the explicit source-to-runtime install:

```bash
python3 skills/setup-kamdar-workspace/scripts/setup_workspace.py \
  --workspace /Users/kenjipcx/.hermes/profiles/vishan-kamdar-ai/workspace \
  --profile-home /Users/kenjipcx/.hermes/profiles/vishan-kamdar-ai
```

The command is preview-only unless `--apply` is supplied, refuses an
unapproved workspace context, manages only `.hermes.md`, `automations/`,
`templates/`, and project-owned `skills/`, and never deletes target files.

`evals/evals.json` is the frozen comparison assertion contract rendered by
the filesystem UI. The current TASK-0007 direct-Draft proof is separate: it
updates one local Weekly Draft through its two Daily owners, verifies a
zero-write rerun, then finalizes that same file. Every assertion is owned by
one [documented feature](docs/features/README.md); neither lane makes provider
calls:

```bash
cd evals/filesystem
npm test
npm run ui
```

## Private capture seed

The supplied Notion browser capture is private profile state, never a tracked
fixture. Compile it explicitly into a mode-`0600` private seed; the repository
only tracks its aggregate fingerprint (49 rows, 39 Projects, 10 source gaps,
seven departments). The canonical scenario seed stores the 39 Project
name/Department pairs but retains only the seven active scenarios and the one
source gap that changes automation behavior.

```bash
node scripts/compile_private_kamdar_seed.mjs \
  --input /absolute/path/to/private-capture.json \
  --output "$HERMES_HOME/state/kamdar-eval/private-seed.json" \
  --manifest "$HERMES_HOME/state/kamdar-eval/private-seed-manifest.json"

KAMDAR_PRIVATE_SEED_PATH="$HERMES_HOME/state/kamdar-eval/private-seed.json" \
  node evals/filesystem/scripts/template-first-kamdar.mjs
```

The runner records only the source hash and `private_seed_verified` boolean in
its result. It never renders raw capture names or contacts. Private compilation
does not authorize a Notion mutation or provider delivery.

## Private Company OS application seed

To prepare the full private seed used by an isolated Notion setup, combine the
reviewed scenario config with the capture-derived Project catalog. The generated
file uses the scrape's Project names and Departments, keeps all other scenario
facts fictional, and is written mode 0600 outside this repository.

~~~bash
node scripts/compile_private_kamdar_company_os_seed.mjs \
  --capture-seed "$HERMES_HOME/state/kamdar-eval/private-seed.json" \
  --output "$HERMES_HOME/state/kamdar-eval/company-os-seed-2026-w34.json"
~~~
