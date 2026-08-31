---
ticket_id: TASK-0017
updated_at: 2026-08-31T00:00:00Z
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
- Added a Pydantic workspace messaging contract with only four customer-owned
  fields: message job, app, named recipient, and drafts/automatic behavior.
  Runtime and recipient policies are derived; `connection test` is not a
  reusable message type, and employee follow-up is disabled until a People
  route exists.
- Added the copy-complete Messages, Owner messages, Hermes connection, explicit
  one-message test, recipient confirmation, and review states. The setup flow
  delegates credentials to `hermes gateway setup` and never treats a running
  gateway or empty target listing as delivery proof.
- Added an owner-only exact-target receipt bound to configuration, recipient,
  and target hashes. `messaging_configured` and `messaging_delivery` are
  separate from gateway health.
- Added `scripts/authorized_message.py` as the typed downstream send boundary.
  Draft-first never invokes Hermes. Automatic sending requires the exact target
  from a current recipient-confirmed receipt; stale or absent proof fails
  closed.
- Updated the canonical workspace, customer setup guide, UX baseline, and Daily
  and Weekly automation contracts. Drafts live under the existing private
  `weeks/<week>/outbound/` path, and normal automations may not call raw Hermes
  delivery directly.

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

- Live Telegram proof on the explicitly authorized `vishan-kamdar-ai` profile:
  one test message was accepted by Telegram as message `27`; the exact target
  remained redacted. The result stays `not_provable` until the named owner
  confirms receipt. Global Python discovery now includes the live test behind
  explicit profile and side-effect gates.

- 41 focused messaging, workspace, setup-init, launch, architecture, and
  distribution tests pass, including
  exact-target extraction, owner-only receipt permissions, stale-config
  invalidation, draft no-send, automatic exact-target routing, and independent
  messaging health.
- `python3 scripts/validate_company_context.py --context workspace.hermes.md`
  reports `context_valid=true`; Python compilation and `git diff --check` pass.
- The full Python suite currently reports 171 passes, 1 skip, 3 failures, and 9
  errors in the separate active Pydantic consolidation migration. Its Weekly golden
  context no longer has the `reports` and `draft_candidate_refs` shape expected
  by the current parity tests, and several strict-format assertions are mid-
  migration. Messaging files do not own those models, goldens, or parity tests.
- No provider-backed message was sent during offline QA. The first real route
  proof remains an explicit setup confirmation using an owner-controlled app.

- 107 repository unit tests pass, including architecture boundaries and exact regressions for blank input,
  early setup failure, and end-of-input cancellation.
- The filesystem/eval suite currently has 74 passes, 2 intentional skips, and
  43 failures cascading from the separate in-progress Person-template/seed
  migration (`PERSON-AISHA` headings no longer match `person.md`). The messaging
  implementation does not own the template or seed bundle.
- Compose configuration, Python compilation, distribution contract evals,
  company-context validation, and `git diff --check` pass.
- A disposable non-interactive profile install completed with a redacted
  partial receipt, as expected without a running gateway.
- 85 focused setup, launch, workspace, provider, webhook, and distribution tests pass
  after the state-aware UX change. The maintenance-menu health, dashboard,
  exit-without-mutation, and incomplete-profile decline states are exercised
  through disposable profiles.

## Review

- Initial messaging plan review returned `TAS-C` and identified four material
  gaps: display name was not an executable target, automatic send was not
  blocked after skipped proof, Pydantic was absent at the send boundary, and
  employee follow-up was a dead-end choice. The implementation now resolves an
  exact target from the test result, requires named-recipient confirmation,
  gates every normal send, and disables employee follow-up.
- Post-implementation review found three additional integration gaps. The
  installed guard now bootstraps the profile package and has a real
  cron-working-directory test; setup now shows the post-test result, offers
  retry or atomic draft-only downgrade, and asks before apply; draft-first now
  writes one idempotent action-keyed artifact and supports explicit approval of
  that exact file through the same typed guard.
- Final narrow review: `TAS-A — pass-ready` for TASK-0017 messaging. The exact
  installed approval command is consistent across the parser, customer guide,
  canonical workspace, and automation working directory.
- The `farplane ticket check` mechanical gate is unavailable in this project
  because `rules/validation.toml` is absent; focused tests, context validation,
  diff checks, and independent review are the substitute evidence.

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
