---
automation_id: kamdar-daily-operating-update
automation_version: "0.1.0"
kind: company-os-automation
cadence: daily
company_timezone: Asia/Kuala_Lumpur
status: proposal-only
owner: Kamdar AI
---

# Daily operating update

> **Outcome**
>
> Produce one bounded, evidence-linked operating summary for Kamdar without modifying Notion, Drive, Gmail, or a report record.

> **Why**
>
> Make progress, blockers, candidate decisions, reusable knowledge, and missing documentation visible before any automation is allowed to write.

## Inputs

- [Kamdar AI Notion project](https://app.notion.com/p/Kamdar-AI-3b7d43a2394280e6ae73fcadf3c5c748)
- [Notion Projects](https://app.notion.com/p/b2e2f5f3d6b14d01961a2bef0696d744)
- [Notion Tasks](https://app.notion.com/p/638d85a858b04d038d8b97be1a879a1f)
- [Kamdar AI Drive folder](https://drive.google.com/drive/folders/1QQ-bEjBeMwhB9AHEEJtiOOTYZPceJxBV)
- Gmail search results constrained to Kamdar participants, project names, or explicit queries.

## Process lanes

| Lane | Read | Output in proposal | Never does in this mode |
| --- | --- | --- | --- |
| Progress | changed project/task records | progress and blocker observations | updates task/project state |
| Problem | repeated blockers with evidence | issue candidate | creates an Issue |
| Decision | choices with rationale and authority evidence | decision candidate | creates a Decision |
| Resource | reusable Drive/Notion material | resource candidate | copies or publishes material |
| Documentation | current-day edited Tasks | template-mapping gap or comment proposal | posts a Notion comment |
| Chase planning | named stale commitment with evidence | draft recipient/question/timing | sends email or chat |

## Procedure

1. Calculate the Asia/Kuala_Lumpur local-day window.
2. Run bounded reads through configured Notion, Gmail, and Drive routes.
3. Link every retained finding to a native source URL.
4. Return `No finding` when a lane ran without evidence and `Source gap` when the source cannot be read.
5. Route documentation review to `daily-notion-documentation-check.md`.
6. Save a local ignored receipt and a Markdown proposal; do not write to external systems.

## Write boundary

All external writes are disabled. The automation neither posts comments nor modifies project/task records, creates Drive files, sends Gmail, or schedules Calendar events.

## Activation gate

Before a live Daily run, approve the target report/draft location, a Kamdar internal directory or owner mapping, applicable Notion templates, comment policy, scheduling method, and each category of external write.
