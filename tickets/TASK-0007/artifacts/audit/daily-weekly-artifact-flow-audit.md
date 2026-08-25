---
kind: architecture-audit
ticket_id: TASK-0007
scope: focused-daily-weekly-artifact-flow
status: corrected-source-contract
date: 2026-08-25
provider_effects: none
---

# TASK-0007 Daily to Weekly artifact-flow audit

## Verdict

Corrected. The current Weekly Draft is now the only weekly accumulation record.
Knowledge Capture directly updates Decisions/SOPs; Project Control directly
updates PM attention, Risks and blockers, and Cost impact. Weekly finalization
reads that one file and never writes it.

The correction deliberately avoids a transient Weekly Draft diff: this target
is local Markdown, is not human-reviewed between stages, and has no provider
boundary. The direct updater provides the necessary typed shape, source keys,
atomicity, conflict behavior, and rerun checks.

## Original fault

    Daily contribution -> current Draft, Decisions/SOPs
    Weekly synthesis -> current Draft, Decisions/SOPs plus control anchors
    Project control -> no current-Draft update

This gave two writers ownership of Decisions/SOPs, excluded control from the
weekly accumulation model, and allowed the fixture to claim only a projection.

## Corrected file graph

    daily/context/daily-context-diff-YYYY-MM-DD.json
      |
      +-- daily/project-memory/project-diff-plan-YYYY-MM-DD.json
      +-- daily/documentation-quality/employee-message-plan-YYYY-MM-DD.md
      +-- daily/project-control/project-control-plan-YYYY-MM-DD.json
      |
      +-- weekly/current/weekly-report-draft-YYYY-Www.md
      |     Decisions / SOPs                 <- Knowledge Capture
      |     PM attention / Risks / Cost      <- Project Control
      |
      +-- daily/receipt-YYYY-MM-DD.json

    weekly/current/weekly-report-draft-YYYY-Www.md
      |
      +-- weekly/finalization/weekly-finalization-plan-YYYY-Www.md
      +-- weekly/reports/projects/<project>-YYYY-Www.md
      +-- weekly/reports/departments/<department>-YYYY-Www.md
      +-- weekly/reports/company/YYYY-Www.md
      +-- weekly/receipt-YYYY-Www.json

## Ownership and safety result

| Prior finding | Resolution | Proof surface |
| --- | --- | --- |
| Two writers owned Decisions/SOPs | Only Knowledge Capture owns those anchors. | daily-knowledge-capture contract and direct-Draft fixture |
| Project Control skipped Weekly accumulation | It owns PM/Risk/Cost anchors directly. | daily-project-control contract and fixture Draft |
| Two diffs/integrations obscured the local target | Both are retired; direct updater validates target/week/anchor/key. | scripts/current_weekly_draft.mjs |
| Weekly re-synthesized and rewrote Draft content | Finalization reads the Draft only. | weekly-report-finalization contract and fixture outputs |
| Fixture was a handwritten template-first projection | It runs direct updater operations, reads the resulting Draft, and finalizes reports. | run-task0007-fixture-automation.mjs |
| Isolated provider proof implied Draft application | The operator applies guarded Project-memory patches and finalized reports only. | operate-task0007-notion-seed.mjs |

## Deterministic checks

The fixture requires the Draft to have a matching week, Draft state, and all
five markers. Each entry has a fixed kind-to-anchor mapping and a source-keyed
identifier. Duplicate content performs no write; a material key conflict leaves
the whole update batch unchanged. The fixture applies both Daily writers, runs
them again, verifies duplicate states and an unchanged Draft hash, then
finalizes the actual file.

## Remaining proof gap

The static packages have normal/hard/boundary eval definitions, but their
profile-backed model calibrations are draft_unrun. That is a quality gate, not
a reason to reintroduce an intermediate artifact. Production writes, runtime
installation, and schedule activation remain outside this source correction.
