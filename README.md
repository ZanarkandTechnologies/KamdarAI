# Company OS for Hermes

This repository is the current proving ground for a self-service Company OS on
Hermes. It contains reusable configuration, automations, templates, setup, and
tests. A setup run supplies the company identity and integrations; the product
docs do not assume a specific client.

The repository is still named `KamdarAI`, and some implementation identifiers
retain that name while the generic product is proven here. Those names are
source compatibility details, not product requirements. The live Hermes
profile is stored separately and is never committed.

For now, the distribution name, profile name, Compose resources, and legacy
environment variables are the rendered Kamdar client-pack identity. Renaming
those deployment identifiers belongs to the later HermesCorp migration; the
setup workflow and product-facing contracts remain company-neutral here.

## Install on Windows

You need Windows, Docker Desktop, and the WSL2 backend. The client runtime does
not require a host Python installation; Hermes supplies Python/Pydantic inside Docker.

1. Clone or download this repository.
2. Start Docker Desktop.
3. Double-click `setup.cmd`.

Before continuing, check that:

- the downloaded folder contains `setup.cmd` and `compose.yaml`;
- Docker Desktop reports that its engine is running;
- double-clicking `setup.cmd` opens the setup window.

The window should move through these stages:

```text
Checking Docker Desktop and WSL2
Interactive setup wizard
  +--new or incomplete: install/resume
  `--existing: workspace, update, health, repair, or dashboard
Selected action
Focused or full verification
```

The setup wizard creates the Hermes profile, connects the services you choose,
installs the automations, and runs health and skill-package checks. When it
finishes, open the local dashboard at <http://127.0.0.1:9119>.

The complete [Windows setup guide](apps/installer/docs/customer-setup.md) shows what each
screen means and what you should see before moving to the next step. It also
covers the one-time ngrok steps for optional real-time Notion comments.

Run `setup.cmd` again after an update or an interrupted installation. An
incomplete profile offers Resume; an existing profile opens a maintenance menu.
Opening the menu alone makes no changes.

## What the wizard configures

- Company details and data sources
- Hermes model authorization
- Notion through its hosted MCP, when selected
- Daily and Weekly schedules
- Optional real-time Notion comments through an assigned stable ngrok HTTPS domain
- Installation receipts, health checks, and PM skill-package checks

Secrets are stored in the persistent Hermes profile. You do not need to edit an
`.env` file.

Temporary `*.trycloudflare.com` Quick Tunnels are not supported because their
URL changes across restarts. The supported path uses the stable HTTPS
development domain assigned to an ngrok account; the included container runs
the ngrok agent afterward.

The data-source picker uses the arrow keys and Space. Press Enter to continue or
Escape to skip the step.

## Install on another Docker host

Use the same Compose stack on Linux or a VPS:

```bash
docker compose --profile setup run --rm setup python /distribution/setup.py launch
docker compose up -d gateway dashboard
docker compose --profile webhook up -d ngrok  # only when enabled
docker compose --profile setup run --rm setup python /distribution/setup.py verify --live
```

## Repository guide

| Path | Purpose |
| --- | --- |
| `setup.py` | Stable dependency bootstrap and public setup command entry point |
| `skills/pm-daily/` | Daily extraction instructions, eval cases, and frozen evidence |
| `skills/pm-weekly/` | Weekly reporting and memory instructions, eval cases, and frozen evidence |
| `apps/doctor/` | Thin analysis-only launcher for the installed automations |
| `apps/installer/` | Guided setup, maintenance, certification, verification, documentation, and installer tests |
| `workspace.hermes.md` | Reviewed company configuration |
| `automations/` | Daily and Weekly automation contracts |
| `templates/` | Flat shared entity shapes; cadence-owned templates live with each PM skill |
| `plugins/` | Hermes connectors installed into the profile |
| `tests/` | Repository-wide architecture and distribution checks only |

The repository owns reviewed configuration. The Hermes profile owns secrets,
OAuth sessions, logs, generated reports, and other runtime state. Do not copy
private runtime data into Git.

## Develop and verify

Edit the owning skill and Markdown templates directly, then run:

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 apps/installer/validate_context.py --context workspace.hermes.md
```

Local evals use packaged fixtures and make no provider calls. Private Notion
captures and generated private seeds must remain outside the repository.

`setup.py doctor` asks native Hermes to execute the selected cadence contract
in analysis-only mode, with provider mutations and messaging disabled. Normal
scheduled runs review their skill-produced files, update canonical local state,
and call configured skills or MCPs directly for explicitly authorized provider
effects. There is no separate handoff or delivery runtime. A missing artifact
or message binding means local-only, and provider edits never flow back into
memory. Notion and Drive permissions remain the operator's privacy boundary; a
configured URL alone does not prove that a destination is private.
The [autonomous testing runbook](docs/autonomous-testing.md) defines the safe
default loop, targeted setup checks, live-test gates, and required evidence.
The global Python discovery includes the real Telegram test as a skipped-by-
default case; use the runbook's explicit profile and side-effect gate to run it.

For setup steps and recovery paths, see
[`apps/installer/docs/customer-setup.md`](apps/installer/docs/customer-setup.md).
