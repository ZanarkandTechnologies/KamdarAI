---
title: Kamdar reference test-seed contract
status: proposed
owner: KamdarAI
created_at: 2026-08-25
system_id: SYS-0001
feature_refs:
  - FEAT-0001
  - FEAT-0002
  - FEAT-0003
  - FEAT-0004
  - FEAT-0005
  - FEAT-0006
  - FEAT-0007
refs:
  - manifest.json
  - ../seed/schemas.py
---

# Kamdar reference test seed

## Evidence boundary

This is a client-grounded reference fixture used to prove generic Company OS
behavior. It is not a default company profile and must not be presented as
generic product truth. Captured identifiers remain because provenance is part
of the proof; setup replaces company identity and integrations for each
deployment.

## Purpose

[`manifest.json`](manifest.json) and its declared table files
form the single reviewed input for frozen and isolated-Notion evaluations. Their
seven Project names and Departments come from the approved private scrape; all
other operating facts are explicitly synthetic evaluation scenarios. It stores
the exact Notion-facing shape: template name, frontmatter-owned
`properties`, one complete Markdown `body`, and eval-only metadata. The loader
validates that shape against the templates and derives the normalized evaluator
input.

```text
private capture fingerprint + seven captured Project identities
                       │
                       ▼
           template validator + seed loader
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
       frozen eval input    isolated Notion plan
```

## Stored versus derived

| Stored in the seed | Derived by the loader |
| --- | --- |
| Capture fingerprint and seven Departments | Template IDs, versions, properties, and headings |
| Seven purposeful scenario Projects using captured names and Departments | Template IDs and versions |
| Complete template-shaped `properties` and Markdown `body` for every entity | Frozen snapshot and compatibility projections |
| Six fictional People: two email test-sink aliases plus four Telegram eval-sink routes | Counts and validation evidence |
| Ten Tasks, three Meetings, four Reports | Report week and Project relation fields |
| Seven feature cases with plain `shows` checks | Reset procedure and provider safety checks |
| One reset marker per environment | — |

The capture reported ten source gaps. Only the one behaviorally material gap is
stored: the Content row has no Project name. The aggregate count remains part
of capture verification.

## Environment boundary

- `frozen` replaces only its ignored, marker-owned run directory.
- `notion_eval` may replace only records bearing the matching test marker.
- Provider writes still require operated authority, a provider receipt, and
  read-back where the provider supports it.
- Every fictional Person uses the safe route alias `telegram`. Workspace
  configuration resolves that alias to the operator-owned test sink; the
  generated message must begin with the intended Person's name and role.
- No real employee email, username, phone number, credential, Notion ID, or
  private capture row enters this tracked file.

## Scenario graph

```text
Daily:  active Projects + linked open/changed Work + Done Work not yet AI-processed
          ├─ update Project memory
          ├─ request missing evidence
          ├─ prepare stale-work outreach
          └─ update current Weekly Draft

Weekly: current Project Drafts
          ├─ finalize and roll up reports
          ├─ promote approved reusable knowledge
          └─ replace next-week Project checklist
```

The seed deliberately contains controls: a fully documented Meta update that
must not receive a comment, a current India Sourcing comparison that must not be
chased, proposed knowledge that lacks reuse proof, and a prior Final CMT report
that must not change.

## Validation

The loader rejects unknown fields, broken relations, invalid dates, private
endpoints, missing feature cases, template/body drift, and checklist or report
citations pointing to another Project.

```bash
python3 -m unittest tests.unit.schemas.test_seed_bundle -v
```

The operating events, People, metrics, dates, blockers, and evidence identifiers
are fictional evaluation data. Only the seven instantiated Project names and
Departments come from the approved private scrape. Their scenarios are grounded
in Kamdar-relevant work: garment sampling and tech packs, fabric sourcing,
Deepavali campaign delivery, Meta reporting, online-order defects, product
listings, and a DTC collection launch. Other captured Projects remain private
instead of becoming empty or distracting Notion pages.
