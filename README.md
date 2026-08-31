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
installs the automations, and runs the health checks and feature evals. When it
finishes, open the local dashboard at <http://127.0.0.1:9119>.

The complete [Windows setup guide](docs/customer-setup.md) shows what each
screen means and what you should see before moving to the next step. It also
covers the one-time Cloudflare steps for optional real-time Notion comments.

Run `setup.cmd` again after an update or an interrupted installation. An
incomplete profile offers Resume; an existing profile opens a maintenance menu.
Opening the menu alone makes no changes.

## What the wizard configures

- Company details and data sources
- Hermes model authorization
- Notion through its hosted MCP, when selected
- Daily and Weekly schedules
- Optional real-time Notion comments through a stable named Cloudflare Tunnel
- Installation receipts, health checks, and packaged feature evals

Secrets are stored in the persistent Hermes profile. You do not need to edit an
`.env` file.

Temporary `*.trycloudflare.com` Quick Tunnels are not supported because their
URL changes across restarts. The supported path uses Cloudflare's web dashboard
once to create a named tunnel; the included container runs it afterward.

The data-source picker uses the arrow keys and Space. Press Enter to continue or
Escape to skip the step.

## Install on another Docker host

Use the same Compose stack on Linux or a VPS:

```bash
docker compose --profile setup run --rm setup python /distribution/setup.py launch
docker compose up -d gateway dashboard
docker compose --profile webhook up -d cloudflared  # only when enabled
docker compose --profile setup run --rm setup python /distribution/setup.py verify --live
```

## Repository guide

| Path | Purpose |
| --- | --- |
| `setup.py` | Stable dependency bootstrap and public setup command entry point |
| `scripts/setup_cli/` | Guided setup, maintenance, certification, and verification flows |
| `workspace.hermes.md` | Reviewed company configuration |
| `automations/` | Daily and Weekly automation contracts |
| `templates/` | Project and report templates |
| `plugins/` | Hermes connectors installed into the profile |
| `evals/` | Network-free feature tests and expected results |
| `scripts/` and `tests/` | Setup helpers and repository checks |

The repository owns reviewed configuration. The Hermes profile owns secrets,
OAuth sessions, logs, generated reports, and other runtime state. Do not copy
private runtime data into Git.

## Develop and verify

Report maintainers edit the Markdown files in `templates/`, then run:

```bash
python3 scripts/sync_report_templates.py
```

The maintainer command uses the installed Hermes CLI directly with profile
`vishan-kamdar-ai`; set `KAMDAR_HERMES_PROFILE` only when the maintained source
profile has a different ID. A separate `kamdar` alias is neither required nor
installed by customer setup. Customer setup continues to use the Hermes CLI
inside Docker, so customers do not install Hermes on Windows.

The command catalogs every changed Markdown template by content hash. It embeds
their exact bodies into the generated Pydantic template catalog, asks Hermes to
interpret only changed report shapes, shows the generated contract diff, and
updates the committed modules in `schemas/reports/`. It then asks before
creating each synthetic preview in the private, ignored `.reports-preview/`
directory. Use `python3 scripts/sync_report_templates.py --check` for a
model-free, non-writing drift check or `--preview` when an explicit
non-interactive run should generate previews.

Then run:

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/validate_company_context.py --context workspace.hermes.md
python3 scripts/run_installed_evals.py --root .
```

Local evals use packaged fixtures and make no provider calls. Private Notion
captures and generated private seeds must remain outside the repository.

The operated evaluation has two explicit stages. `setup.py doctor` reads the
configured sources, runs and judges the AI, writes one immutable handoff per
cadence, and stops without downstream changes. If setup enabled **Reviewed
Stage 2**, review and apply one exact handoff without regeneration:

```bash
python3 setup.py deliver --handoff /absolute/private/run/weekly/handoff.json
python3 setup.py deliver --handoff /absolute/private/run/weekly/handoff.json --apply
```

The first command is review-only. The second writes canonical short-term
memory, long-term memory, and versioned reports into the private Hermes
workspace first. It then makes only the optional one-way provider copies bound
in the `artifact-sync` table in `workspace.hermes.md`, applies approved Work
comments or messages, and writes a redacted per-action receipt. A missing
artifact binding means local-only; the distributed Kamdar workspace has no
artifact or owner-message bindings by default. Documentation and stale-work
questions use the exact linked Work item unless an employee route is explicitly
configured. Provider edits never flow back into memory.
Production remains unauthorized; disabled policy, failed quality, a changed
workspace or handoff, and incomplete configured destinations block before
provider calls. Notion and Drive permissions remain the operator's privacy
boundary; a configured URL alone does not prove that a destination is private.
The [autonomous testing runbook](docs/autonomous-testing.md) defines the safe
default loop, targeted setup checks, live-test gates, and required evidence.
The global Python discovery includes the real Telegram test as a skipped-by-
default case; use the runbook's explicit profile and side-effect gate to run it.

For setup steps and recovery paths, see
[`docs/customer-setup.md`](docs/customer-setup.md).
