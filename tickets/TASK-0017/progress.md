---
ticket_id: TASK-0017
updated_at: 2026-08-29T00:00:00Z
state: in_progress
---

# Progress

## Implemented

- `setup.cmd` is the Windows customer entry point and uses Docker Desktop's
  WSL2-backed Compose runtime without requiring a WSL shell or developer CLI.
- `setup.py` is the stable 54-line customer bootstrap. Responsibility-owned
  modules under `scripts/setup_cli/` handle install, update, interactive
  configuration, approval, and verification without creating another customer
  command surface.
- The Compose stack persists one Hermes profile volume, exposes only the local
  dashboard, keeps the webhook private, pins the Hermes image digest, and uses
  a token-file-backed Cloudflare Tunnel for optional public ingress.
- Hermes owns model credentials, official Notion MCP OAuth/config, connector
  secrets, schedules, and setup receipts. The repository owns desired config.
- Verification reports named required and optional lanes and runs installed
  Daily, Weekly, and Meeting frozen contract evals.
- The runtime distribution no longer ships ngrok or the legacy webhook
  onboarding skill.
- `setup.py launch` now detects new, incomplete, and existing profiles. New
  profiles install, incomplete profiles offer an idempotent resume, and
  existing profiles receive one maintenance menu.
- Workspace-only configuration edits the persistent profile source, applies it
  to the live workspace, and requests static verification without model OAuth,
  Notion OAuth, image pulls, webhook verification, or a live comment test.
- `setup.cmd` no longer performs an unconditional pull/install. It maps the
  wizard's bounded action result to runtime start, static verification, live
  verification, or dashboard opening while keeping the Docker socket outside
  the Hermes container.
- Prerequisite failures can retry in the same window, long Notion waits show
  bounded progress, Ctrl+C stops safely, and support receipts are shown
  relative to the private profile rather than as container-only paths.
- Required text and secret prompts now normalize blank input and reprompt
  without writing empty values. End-of-input exits safely, and early runtime
  failures use a stable exception boundary instead of dereferencing setup state
  that may not have initialized yet.
- Refactored the 1,452-line setup entry point into a 54-line dependency
  bootstrap plus `scripts/setup_cli/` modules for UI, workspace, connections,
  lifecycle, webhook, and verification. Public commands and launcher exit codes
  remain unchanged; deterministic backend owners remain separate.
- Fixed the refactored certification recovery callback so a failed integration
  test displays Retry/Defer instead of shadowing the UI selector and raising a
  `TypeError`; the real callback boundary now has a regression assertion.

## Accepted ingress contract

- Cloudflare dashboard owns one named tunnel, stable hostname, and published
  route to `http://gateway:8645`.
- Setup installs no customer Cloudflare CLI and receives no account-wide API
  token. It stores the tunnel token in the private Hermes profile volume.
- Quick Tunnel URLs are invalid. Setup owns endpoint validation, connector
  startup, guided Notion verification, public reachability, and redacted proof.
- The customer journey and clean-machine acceptance matrix are canonical in
  `docs/customer-setup.md`.

## Local proof

- 107 repository unit tests pass, including architecture boundaries and exact regressions for blank input,
  early setup failure, and end-of-input cancellation.
- The filesystem/eval suite currently has 105 passes, 2 intentional
  private-fixture skips, and 1 failure in the separate in-progress report
  template contract: the new `EMPLOYEE_ACTION_ROWS` placeholder has no matching
  interpreted field. The setup refactor does not touch that contract.
- Compose configuration, Python compilation, distribution contract evals,
  company-context validation, and `git diff --check` pass.
- A disposable non-interactive profile install completed with a redacted
  partial receipt, as expected without a running gateway.
- 85 focused setup, launch, workspace, provider, webhook, and distribution tests pass
  after the state-aware UX change. The maintenance-menu health, dashboard,
  exit-without-mutation, and incomplete-profile decline states are exercised
  through disposable profiles.

## Review

- Documentation quality: `TAS-A` for the in-progress contract. The reader,
  human gates, value destinations, stable/temporary tunnel distinction,
  provider sources, and exact acceptance test are explicit.
- Code quality: `TAS-A` for local readiness. The change reuses the Hermes image,
  bundled Python UI dependencies, and existing reconciliation helpers; adds no
  customer CLI; keeps secrets profile-local; and has focused negative-path
  tests.
- Error-actionability: `TAS-A` for the reported failure. Adversarial checks
  cover a blank required answer, exhausted stdin, and a runtime error before
  provider-catalog initialization; none emits a traceback or mutates installed
  state.
- Refactor review: `TAS-A` for code quality, integration readiness, and evidence
  quality within the setup boundary. The stable command/help surface is
  exercised, the distribution includes the entire package, interactive input
  has one owner, deterministic backends cannot import the CLI flows, and the
  focused and full Python suites pass.
- Integration readiness: `TAS-B` until the clean Windows/provider run proves
  the real Docker, OAuth, DNS, webhook, restart, and idempotent-rerun path.
- Overall: ready for operated customer-equivalent testing, not ready for a
  completed Windows support claim.

## Remaining operated proof

Run on a clean customer-equivalent Windows machine: double-click install,
OAuth, Notion subscription verification, valid/invalid signatures, one exact
threaded reply, duplicate-delivery suppression, container restart persistence,
and the unchanged rerun. The current host has no running Docker daemon and
cannot supply this acceptance evidence.
