---
title: Seamless Company OS deployment and tuning
status: proposed
owner: Company OS
created_at: 2026-08-28
updated_at: 2026-08-29
source_feedback: first external computer deployment
feature_refs: [FEAT-0011]
---

# PRD: Seamless Company OS deployment and tuning

## Problem / Context

The first installation on another person's computer did not deliver the product
promise. The nominal one-click distribution still required platform-specific
commands, separate workspace and automation setup, custom Notion adapter and CLI
knowledge, and manual interpretation of whether the system actually worked.
Windows and Docker ownership were unclear, chat could not reliably invoke the
Hermes commands needed for setup, and there was no one health-and-eval receipt.

The product boundary is therefore not “copy a client profile.” It is: install a
working, updateable Company OS; ask only for unavoidable credentials and access
consent; reconcile all declared runtime state; and prove the result.

## First-Principles Basis

- **Objective:** A new operator can install, configure, verify, and later update
  the Company OS through one discoverable entry point on every supported
  topology.
- **User or system need:** The installer needs a trustworthy working system,
  not a successful file copy.
- **Root cause:** The current flow splits desired state and proof across the git
  distribution, profile files, Company OS setup scripts, Hermes chat, custom
  Notion code, host services, and eval tooling without one lifecycle owner.
- **Key assumptions:** Hermes profiles can own client secrets, MCP connections,
  scheduler state, and user data while the repo owns versioned desired state;
  unavoidable OAuth and Notion sharing remain explicit human gates.
- **Constraints:** Preserve unknown client files and secrets; support Docker and
  at least one practical Windows topology; do not require chat for deterministic
  setup; do not claim that an MCP replaces inbound event delivery.
- **First viable slice:** Prove the topology and ownership model, then ship one
  resumable install/reconcile/verify command for a fresh profile with official
  Notion MCP access, native schedules, workspace contracts, and frozen feature
  evals.
- **Proof / falsification:** A clean-machine matrix either reaches a typed
  `ready | partial | blocked` receipt and passes the declared health/eval suite,
  or identifies exactly one next user action. Any hidden manual repair,
  platform-specific undocumented step, secret outside the profile, or false
  green health result falsifies the slice.
- **Tradeoff accepted:** “One click” means one entry command plus unavoidable
  browser OAuth, credential, and Notion permission gates. It does not mean
  bypassing external-service consent.
- **Ingress decision:** Real-time Notion comments use a remotely managed named
  Cloudflare Tunnel. The customer creates its hostname and route once in the
  Cloudflare dashboard; setup installs no Cloudflare CLI, stores only the
  tunnel token in the Hermes profile, runs the connector container, and rejects
  temporary Quick Tunnel URLs.
- **Non-goals:** Native support for every Windows shell, zero-click OAuth,
  replacing Notion webhooks with MCP, production writes by default, or a new
  general-purpose installer framework.

## Audience

- **Primary:** A non-developer client operator installing the Company OS on a
  personal computer or managed Docker host.
- **Secondary:** The Company OS maintainer publishing repo-owned configuration,
  output-template, and eval updates across installed profiles.

## JTBD

When I receive the Company OS distribution or an update, I want one guided
command to install or reconcile it and prove every required capability, so I
can start using the Company OS without understanding Hermes internals, adapters,
or eval plumbing.

## SLC Slice (Next Release)

Ship one supported path for macOS/Linux and one proven Windows path, plus a
persistent Docker topology. A single deterministic entry point installs or
updates the distribution, keeps secrets and OAuth tokens profile-local,
configures declared MCPs and native schedules, installs the workspace, runs
static and opted-in live health probes, and executes the frozen feature evals.
It emits a redacted machine-readable receipt and a short human result.

MCP is the default provider access route. Event-driven Notion comments remain a
separate public-webhook boundary until an operated proof establishes a simpler
supported ingress.

## Project Profile

- **Profile:** Distribution and onboarding infrastructure.
- **Component matrix:** Hermes owns profile lifecycle, secrets, MCP auth/config,
  tool access, scheduler, and doctor; the Company OS source owns desired
  distribution state, workspace/templates, Company OS automation contracts, product-specific
  reconciliation, health policy, and feature evals; the operator owns
  credentials, OAuth consent, Notion sharing, and deploy topology; the runtime
  owns generated state and receipts.
- **Advice axes explored:** chat-led vs deterministic setup; native host vs
  container; custom adapter vs hosted MCP; repo distribution vs profile export;
  handwritten schemas vs template-derived contracts.
- **Selected complete directions:** deterministic setup with optional chat
  wrapper; versioned distribution for updates rather than export snapshots;
  profile-local secrets and OAuth; MCP-first provider access; webhook retained
  only for inbound events; output templates as the primary tuning surface.
- **Pipeline handoff:** FEAT-0011 and TASK-0016 through TASK-0021.

## Prototype / PoC Gates

- **Highest-risk assumption:** One ownership model and entry point can behave
  consistently across Windows and a persistent Docker profile while preserving
  Hermes credential and scheduler semantics.
- **Prototype artifact:** TASK-0016 topology matrix with real install/update,
  process, persistence, chat-command, MCP-auth, and cron observations.
- **Pass signal:** At least one Windows path and one Docker path complete a
  clean install and idempotent rerun without an undocumented repair step.
- **Ticket before full production build:** yes.

## Goals

- Reduce the documented new-machine path to one entry command and only named
  human authorization gates.
- Make install, update, health, and eval results deterministic, resumable, and
  safe to share after redaction.
- Make the repo the source of desired configuration while preserving
  profile-owned secrets, auth, memories, sessions, and generated state.
- Let a maintainer tune report behavior through the output template and derive
  the corresponding structured contract, example, and QA checks together.

## Metric Candidates

- **Primary candidate:** Clean-install journey pass rate across the supported
  topology matrix.
- **Direction:** pass/fail.
- **Verification idea:** Disposable clean profile per topology must finish with
  `ready`, pass a second idempotent reconcile, and pass the required frozen eval.
- **Guard idea:** Tests fail if credentials enter repo-owned files, an update
  overwrites user-owned state, or a skipped live dependency is reported healthy.

## Non-Goals

- Shipping or modifying Hermes itself inside this repository.
- Treating `hermes profile export` as the update channel; it remains a snapshot
  handoff/backup while `profile install/update` owns versioned distribution.
- Supporting unmaintained local Notion MCP as the default.
- Making hosted Notion MCP a headless bearer-token service when it requires
  user OAuth.
- Automating external write authority, Notion workspace sharing, webhook
  verification, spend, or production deployment without a human gate.
- Rewriting every record template or every feature eval in the first slice.

## User Stories

### US-001: Install from one entry point

**Description:** As a client operator, I want one command that installs and
configures the supported topology so that I do not assemble Hermes manually.

**Acceptance Criteria:**

- [ ] The command works from a clean supported host/profile and resumes safely.
- [ ] It reports one exact user action for any credential, OAuth, sharing, or
      process gate instead of a stack trace or generic failure.
- [ ] An unchanged rerun performs no duplicate schedule, workspace, or MCP work.

### US-002: Update from repo-owned configuration

**Description:** As a maintainer, I want installed clients to reconcile a new
distribution version without editing live profile configuration by hand.

**Acceptance Criteria:**

- [ ] The installed source and version are inspectable.
- [ ] Update overwrites only declared distribution-owned desired state.
- [ ] Profile secrets, auth, memories, sessions, and generated workspace state
      remain intact.

### US-003: Use Notion without a local adapter stack

**Description:** As an operator, I want official MCP access where it is viable
so that I do not install a Notion CLI and custom read/write adapter.

**Acceptance Criteria:**

- [ ] The supported interactive mode uses the official hosted Notion MCP and a
      bounded tool set.
- [ ] The receipt distinguishes MCP read/write health from webhook event health.
- [ ] Headless Docker and event-trigger requirements have an explicit supported
      route or an honest blocked verdict.

### US-004: Tune behavior through output templates

**Description:** As a maintainer, I want the report template to be the primary
tuning surface so that prompt, schema, example, and QA cannot silently diverge.

**Acceptance Criteria:**

- [ ] One representative report template deterministically yields or validates
      its structured contract and realistic example.
- [ ] Schema and eval drift fails a local check with an actionable diff.

### US-005: Verify the whole installation

**Description:** As an operator, I want one health-and-eval command so that I
know what works before relying on automations.

**Acceptance Criteria:**

- [ ] Static health, opted-in live provider probes, scheduler readiness, and
      feature evals are separate named lanes.
- [ ] The final exit state is `ready`, `partial`, or `blocked` and never turns a
      skipped or unauthorized probe into a pass.
- [ ] The receipt contains no secret values or private record content.

### US-006: Learn and recover without tribal knowledge

**Description:** As a client operator, I want short task-based documentation so
that I can install, authorize, verify, update, and repair the system myself.

**Acceptance Criteria:**

- [ ] A new operator can follow the tested happy path without opening source
      code or legacy setup pages.
- [ ] Every command and expected receipt in the guide is exercised by docs QA.

## Functional Requirements

- **FR-1:** Define and test the supported native, Windows, and Docker topology
  matrix before locking the installer implementation.
- **FR-2:** Provide one cross-platform, non-chat-dependent entry point for
  install, reconcile, update, health, and eval subcommands or phases.
- **FR-3:** Store secrets and OAuth material only in Hermes-owned profile state;
  repo files may declare names, endpoints, tool allowlists, and desired state.
- **FR-4:** Use Hermes native profile install/update, MCP, cron, plugin, config,
  and doctor capabilities where they satisfy the contract.
- **FR-5:** Make every phase idempotent and write a redacted resumable receipt
  with observed state and `next_action`.
- **FR-6:** Default Notion read/write to the official hosted MCP; model webhook
  event ingress and unattended access as distinct capabilities.
- **FR-7:** Treat report templates as versioned source contracts and bind each
  tuned template to a compatible Zod/JSON schema, realistic example, and QA.
- **FR-8:** Package the health policy and frozen feature eval entry points in the
  installed distribution, not only in the development repository.
- **FR-9:** Consolidate installation, authorization, operation, update,
  verification, and troubleshooting documentation around the new lifecycle.

## Constraints

- **Security/privacy:** Never print or copy token values into receipts, logs,
  docs, git, or chat. Provider live probes are bounded and explicit.
- **Performance:** A repeat static health/reconcile should complete quickly and
  avoid network calls unless the operator selects live verification.
- **Platform:** No POSIX-shell-only contract. Windows support may be WSL2 or
  Docker if the PoC proves that topology and the docs name it honestly.
- **Budget/time:** Reuse Hermes primitives before adding product-specific code. First prove
  one Windows route and one container route rather than three partial routes.

## Autonomy Readiness

- **Human inputs/assets needed:** profile name, deploy topology, company
  timezone, report template, approved Notion workspace/root, and optional
  webhook public endpoint.
- **Credentials / external services:** model provider; official Notion MCP
  OAuth for interactive access; separate Notion connection/token and public
  HTTPS endpoint only when event webhooks are enabled.
- **Compute or runtime needs:** supported Hermes version, persistent profile and
  workspace storage, long-running scheduler/gateway for automations.
- **Tooling or testability gaps:** clean Windows and Docker runners; deterministic
  live MCP probe; packaged eval fixtures; secret-safe receipt validator.
- **Hard-to-QA surfaces:** browser OAuth callback from a container, host/container
  path translation, scheduler persistence, public webhook verification.
- **Human gates:**
  - **Plan approval:** accept this PRD/ticket split before implementation.
  - **QA approval:** review the real clean-machine evidence bundle.
  - **Deploy/publish:** explicit owner approval.
  - **Spend/billing:** explicit owner approval for hosted infrastructure.
  - **Destructive/migration actions:** never implicit; setup preserves unknown
    files and update follows the distribution allowlist.
- **Agent decision boundaries:** The setup command may inspect, reconcile
  declared repo-owned state, and run bounded tests. It may not grant Notion
  access, complete OAuth consent, enable production writes, expose a public
  endpoint, or delete user-owned state without the operator.

## Risks / Unknowns

- Hosted Notion MCP requires user OAuth and is not suitable by itself for a
  fully unattended headless container.
- MCP supplies read/write tools but not Notion's inbound webhook event stream;
  comment-triggered behavior still needs public ingress or an accepted polling
  design.
- Hermes chat tool permissions may intentionally prevent shell/CLI access; the
  deterministic setup path must not depend on changing that security boundary.
- Distribution update preserves `config.yaml` by default, so the desired-state
  contract must name which settings are repo-owned and which remain local.
- A free-form Markdown template cannot safely generate every semantic schema
  rule without explicit machine-readable annotations or a compatibility check.

## Backpressure / Evidence to Ship

- **Tests:** topology smoke tests, allowlist and secret-boundary tests,
  idempotent reconcile/update tests, template-contract drift tests, receipt
  schema tests, and existing repository suites.
- **QA:** real fresh install and rerun on the selected Windows topology and a
  persistent Docker topology, plus one official Notion MCP OAuth/read probe.
- **Perf checks:** record cold install and warm static verify duration; no hard
  target until the PoC establishes a representative baseline.

## Grounding

- **User evidence:** first external-computer deployment feedback in this task.
- **Local product evidence:** `distribution.yaml`, TASK-0015, current setup
  scripts, schemas, templates, evals, and installed Hermes CLI/help/docs.
- **Current provider evidence:** official Notion hosted MCP documentation states
  that it is OAuth-based and infrastructure-free for read/write, while official
  webhook documentation requires a separate public HTTPS endpoint for
  `comment.created` delivery.
