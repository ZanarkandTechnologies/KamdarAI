---
title: Company OS setup model
status: active
owner: Company OS
updated_at: 2026-08-31
refs:
  - customer-setup.md
  - ../../../docs/prd.md
  - ../../../docs/operator-guide.md
  - ../../../workspace.hermes.template.md
---

# Company OS setup model

This directory documents what Company OS setup configures and supports. The operated installation procedure remains in [Install the Company OS on Hermes for Windows](customer-setup.md). The [PRD](../../../docs/prd.md) owns product boundaries and architecture; the [operator guide](../../../docs/operator-guide.md) owns day-to-day use.

Setup’s job is narrower: bind company roles to exact provider locations, establish permitted destinations, install the reviewed workspace and automation contracts, and prove the configured connections without inventing authority.

## Configuration model

```text
Company identity + timezone
          |
          v
SOURCES — exact places Hermes may read
          |
          v
Daily/Weekly analysis + private local memory
          |
          v
SINKS — exact places approved effects may go
```

| Configuration | Question it answers | Canonical owner |
| --- | --- | --- |
| Company | Whose context and timezone govern the run? | Workspace frontmatter |
| Sources | Which provider location fulfills Projects, Work, People, or Knowledge? | Managed Data sources table |
| Local state | Where do Project Memory, reports, and long-term memory live? | Private Hermes workspace structure |
| Artifact sync | Where may a completed local artifact be copied? | Managed Artifact sync table |
| Communications | Which message, app, named recipient, and behavior are enabled? | Managed Communications table |
| Credentials | Can this profile use the configured model/provider? | Private Hermes profile; never workspace Markdown |

Read [Sources](sources.md) for readable roles, supported providers, required feature content, and certification. Read [Sinks](sinks.md) for canonical local artifacts, provider copies, Work comments, messaging, authority, and receipts.

## What setup installs

After the operator reviews the plan, setup installs the allowlisted distribution into one private Hermes profile, applies the approved workspace context, enables required plugins, and reconciles two native jobs:

| Automation | Default schedule | Contract |
| --- | --- | --- |
| Company OS Daily Operating Update | `0 8 * * 1-5` | `automations/daily-operating-update.md` |
| Company OS Weekly Operating Review | `0 18 * * 5` | `automations/weekly-operating-review.md` |

The job prompt tells Hermes to read the installed workspace and the complete automation contract. Missing jobs are created, drifted jobs are updated, paused matching jobs are resumed, and exact jobs remain unchanged. Duplicate accepted job names stop reconciliation.

## Connection, binding, and authority are separate

```text
Provider connection: "this profile can call Notion"
Role binding:        "this exact URL is Projects"
Action authority:    "this exact operation may read/comment/publish"
```

One Notion MCP connection may serve several role bindings. A successful OAuth connection does not choose company scope. A readable Projects or Work binding does not authorize comments or publication. A configured sink does not become usable until the provider connection, exact destination, automation authority, and relevant quality gates also pass.

## Setup and verification flow

```text
create/review workspace configuration
  -> resolve every selected role through provider catalog
  -> show planned profile, connections, messages, webhook, and schedules
  -> authorize model and unique provider connections
  -> install workspace, plugins, and jobs
  -> certify configured integrations
  -> report READY / PARTIAL / BLOCKED
```

Certification is binding-specific. Read-only tests inspect the configured source. Reversible tests require confirmation, create one isolated test object, read it back, and clean it up. Irreversible tests require confirmation and leave only their declared effect, such as one self-addressed email. Deferring certification keeps the installation but produces `PARTIAL` rather than a false pass.

## Doctor’s role

Doctor runs after setup as a thin analysis-only native Hermes invocation. It
reads the selected Daily or Weekly contract and configured workspace while
explicitly disabling provider mutations, messaging, and artifact sync. Missing
source data is reported by the automation itself rather than by a second
feature-readiness engine.

## Ownership boundaries

- Source repository: shipped workspace template, automation contracts, schemas, catalog, and setup code.
- Reviewed workspace configuration: nonsecret company choices, role bindings, sinks, and authority policy.
- Private Hermes profile: credentials, OAuth, installed contracts, schedules, receipts, and generated operational state.
- Provider: account permissions and the records reachable at each exact binding.

Setup copies only distribution-owned files and preserves unknown profile files. It never treats repository files and generated runtime state as co-equal sources.

## Current support boundary

- Windows installation is documented and operated through [customer setup](customer-setup.md); this directory does not duplicate that runbook.
- Projects, Work, People, Knowledge, and operator email are selectable source roles in the current wizard.
- Local artifacts are always supported. Artifact-sync and communication contracts support additional sinks described in [Sinks](sinks.md).
- The current wizard exposes owner report/alert messaging, but does not expose employee follow-up or interactive artifact-sync row creation.
- A provider used only as an artifact sink does not yet cause setup to provision that provider connection automatically.
- Doctor is analysis-only. Scheduled Daily and Weekly jobs apply authorized effects directly through native skills and MCPs.
