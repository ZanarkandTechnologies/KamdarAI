---
ticket_id: TASK-0004
artifact: operated-link-routing
verified_at: 2026-08-21T16:51:41+08:00
mode: operated-showcase
verdict: pass
---

# Operated showcase link routing

> **Before:** the showcase used a full-width two-column page grid, feature
> sources still opened the operator's original Kamdar/Drive locations, and the
> Company OS cards did not expose the generated Decisions or Reports databases.
>
> **After:** the page is one centered 768px column. All operated feature sources
> resolve inside the v3 demo workspace, every Company OS database is directly
> linked, and applied file assertions expose their exact Notion result pages.
>
> **Example:** `Reports ↗` opens the generated Reports database, while an applied
> weekly-report assertion expands to `Open in Notion ↗` for the exact report row.

## Browser assertions

- Wrapper width: `768px`
- Top-level grid: one column (`768px` computed track)
- Generated database links: `7`
- Applied artifact links: `14`
- Original Kamdar / main Drive link leaks: `0`
- Decisions database: <https://app.notion.com/p/b62801b2aad34d8d8f789056615c1faa>
- Reports database: <https://app.notion.com/p/54dc056d8c3d432ab04f12b2d160f740>
- Installed templates: <https://app.notion.com/p/Templates-3c3d43a23942813893c8d0f2171e8660>

## Verification

- `node --test evals/filesystem/tests/*.test.mjs` — 9/9 pass
- repository Python suites — 31/31 pass
- operated proof — 39/39 assertions, 17 applied Notion actions
- `git diff --check` — pass
