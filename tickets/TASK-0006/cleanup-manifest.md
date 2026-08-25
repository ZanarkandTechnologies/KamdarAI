---
ticket_id: TASK-0006
kind: notion-cleanup-manifest
status: read-only-candidates
observed_at: 2026-08-21T21:20:00+08:00
parent_page_id: 3b7d43a2-3942-80e6-ae73-fcadf3c5c748
archive_allowed: false
---

# Notion demo cleanup manifest

This manifest identifies the generated demo roots exactly. It authorizes no
archive operation. Names are explanatory; page IDs are the only valid future
operation targets.

| Decision | Root | Page ID | Created UTC | Observed databases | Why |
| --- | --- | --- | --- | --- | --- |
| Archive candidate | [`[SHOWCASE] Kamdar Manager Eval 2026-08-21`](https://app.notion.com/p/SHOWCASE-Kamdar-Manager-Eval-2026-08-21-3c3d43a23942813b977bce8b8a6108b0) | `3c3d43a2-3942-813b-977b-ce8b8a6108b0` | 2026-08-21 07:34 | Projects, Work, People, Decisions, Resources, Reports, Skills | v2; superseded by v3 and v4; no current source route |
| Archive candidate | [`Kamdar AI · Demo`](https://app.notion.com/p/Kamdar-AI-Demo-3c3d43a239428131ae5dd2a4df542b91) | `3c3d43a2-3942-8131-ae5d-d2a4df542b91` | 2026-08-21 08:01 | Projects, Work, People, Decisions, Resources, Reports, Skills | v3; lacks Templates database; superseded by v4; no current source route |
| Keep | [`Kamdar AI · Eval Demo`](https://app.notion.com/p/Kamdar-AI-Eval-Demo-3c3d43a239428112b2e1e0a3628b9587) | `3c3d43a2-3942-8112-b2e1-e0a3628b9587` | 2026-08-21 09:27 | Projects, Work, People, Decisions, Resources, Reports, Skills, Templates | v4; newest, complete, and referenced by `workspace.hermes.md` |

All three were read from the child pages of parent
`3b7d43a2-3942-80e6-ae73-fcadf3c5c748`; all had `in_trash: false` at
observation time.

## Future archive gate

Before a separately authorized cleanup:

1. Re-read all three exact page IDs and the common parent.
2. Confirm v4 is reachable and its current proof, eight databases, and provider
   receipts resolve.
3. Confirm no current source/config/result points to the v2 or v3 page IDs.
4. Record explicit operator approval naming the v2 and v3 IDs.
5. Set `in_trash: true` only for those two IDs; do not delete permanently.
6. Re-read all three roots and save a receipt showing v2/v3 trashed and v4 live.

Until those checks pass, `archive_allowed` remains `false`.
