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
   templates, skills, and source-owned plugins without deleting runtime files.
   Then open a fresh Hermes session from that profile.

3. Set up Notion as a separate test root first. The current config is
   evaluation-only and production writes are proposal-only. Use
   [`templates/`](templates/README.md) for the database shape, then approve
   real database routes and write authority before using production records.

4. Optional: activate the Notion comment bridge on the Linux Hermes VPS.

   ```bash
   export KAMDAR_NOTION_ONBOARD="$KAMDAR_PROFILE_HOME/skills/notion-webhook-onboarding/scripts/notion_webhook_onboard.py"
   python3 "$KAMDAR_NOTION_ONBOARD" preflight
   ```

   Follow the JSON receipt's `next_action` through each phase. Login, sharing,
   subscription creation, and webhook verification remain human gates:

   ```bash
   export NOTION_ROOT_URL="https://www.notion.so/<root-page-id>"

   python3 "$KAMDAR_NOTION_ONBOARD" configure \
     --root-page-url "$NOTION_ROOT_URL" \
     --mention @vishanai
   python3 "$KAMDAR_NOTION_ONBOARD" verification
   # Paste the one-time token into Notion and verify the subscription.
   python3 "$KAMDAR_NOTION_ONBOARD" discover
   # Leave one harmless comment beginning with @vishanai.
   python3 "$KAMDAR_NOTION_ONBOARD" finalize
   python3 "$KAMDAR_NOTION_ONBOARD" status
   ```

   Before `discover`, share the root page and every database that may receive
   an agent comment with the same Notion connection used by `NOTION_TOKEN`.
   Sharing a sibling page or a similarly named database is not sufficient:
   Hermes authorizes the exact parent data-source ID of the commented page.
   Rerun `discover` after granting a new database access so the active
   `NOTION_ALLOWED_DATA_SOURCES` catalog is refreshed.

   Setup is complete only when `status` reports all of these conditions:

   - `hermes_health=true` and `ngrok_online=true`
   - `verification_token_captured=true`
   - `data_sources_configured=true`
   - `workspace_locked=true`
   - `reply_observed=true`

   Poll `verification` after requesting a token and poll `finalize` after the
   test comment until each phase advances. Do not treat the first
   `human_required` receipt as an error.

## Notion comment bridge troubleshooting

The onboarding script is the current Notion-specific doctor. Run its `status`
phase first; transport health alone does not prove that a page is authorized or
that Hermes posted a reply.

| Symptom | Likely boundary | Next action |
| --- | --- | --- |
| No webhook request arrives | Paused subscription or stale public URL | Confirm the Notion subscription is active and uses the current ngrok `/notion/webhook` endpoint. Free ngrok URLs can change after a tunnel restart. |
| Verification returns HTTP 401 | Stale verification token or signature state | Run `hermes -p "$KAMDAR_PROFILE" notion-webhook reset-token`, use Notion's **Resend token**, and complete `verification` again. Never paste credentials into chat or logs. |
| Webhook returns 200 but no reply appears | The event was accepted but failed during enrichment or reply generation | Check the gateway log and the connector state instead of recreating the subscription immediately. |
| Log says the page is outside the configured data-source scope | The exact database is not shared or its data source is absent from the allowlist | Share the database containing the commented page with the token's Notion connection, then rerun `discover` and leave a new test comment. |
| Notion adapter is unavailable after a restart | The gateway started without the Doppler-scoped `NOTION_TOKEN` | Restart the managed, Doppler-backed Hermes service; do not replace it with a bare `hermes gateway restart`. |

The generic Hermes doctor does not currently validate Notion subscription URL
drift or per-page data-source access. Until a unified `kamdar notion doctor
--page <url>` command exists, use `status`, the exact test page, and one observed
reply as the acceptance path.

## Layout

```text
workspace.hermes.md  Reviewable, nonsecret workspace context
automations/   Daily and weekly operating contracts
docs/          Feature specs and the Kamdar Company OS system map
templates/     Kamdar record and report configuration contracts
skills/        Kamdar skill source and workspace setup
plugins/       Source-owned Hermes platform plugins installed into the profile
seed/          Synthetic projects, people, tasks, meetings, reports, and scenarios
evals/         Daily/Weekly acceptance contracts and deterministic proof tooling
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
`templates/`, project-owned `skills/`, and project-owned `plugins/`, and never
deletes target files.

Daily and Weekly acceptance is defined in `evals/daily/` and `evals/weekly/`.
Each package contains its suite and expected artifacts. Every assertion is owned by one
[documented feature](docs/features/README.md), and local evaluation makes no
provider call:

```bash
cd evals/filesystem
npm test
```

## Private capture seed

The supplied Notion browser capture is private profile state, never a tracked
fixture. Compile it explicitly into a mode-`0600` private seed. The tracked,
synthetic scenario seed is split into tables under `seed/`.

```bash
node scripts/compile_private_kamdar_seed.mjs \
  --input /absolute/path/to/private-capture.json \
  --output "$HERMES_HOME/state/kamdar-eval/private-seed.json" \
  --manifest "$HERMES_HOME/state/kamdar-eval/private-seed-manifest.json"

# Current Daily/Weekly acceptance is owned by the unified validators:
node --test evals/filesystem/tests/unified-daily-review-eval.test.mjs \
  evals/filesystem/tests/weekly-review-evals.test.mjs
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
