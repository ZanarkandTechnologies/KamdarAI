---
artifact: visual-qa
ticket_id: TASK-0008
date: 2026-08-26
state: compact-seed-card-repair
---

# Compact-seed entity-card repair

Expected baseline: `tickets/TASK-0006/design.md` — `Starting-data entity cards`

Best image: current in-app browser capture of `http://127.0.0.1:4173/`

Verdict: pass

## Expected UI spec

Starting records show typed operational content first. Raw JSON is closed,
optional evidence at the bottom of a populated card.

## Observed snapshot report

The supplied before screenshot showed Project shells with no operational body,
making `View raw JSON` the only useful action. After rebuilding, the live CMT
Project card shows status, Department, resolved owner, update date, objective,
progress, weekly completion, blocker, checklist, and knowledge disclosure.

## Diff report and verdict

- Screen: `DESKTOP-EVAL-LIST` / Starting data
- Evidence: supplied screenshot
  `/var/folders/98/ht394qw529jbzxvzl7ldp1040000gn/T/codex-clipboard-281e4992-4336-4803-8cfe-b8c2fa716a50.png`;
  live in-app capture; generated `evals/filesystem/.vercel-static/dashboard.json`
- Verdict: PASS
- Visual diff: empty Project shells are replaced by full-width operational cards.
- Behavior diff: card expansion reveals the typed summary; raw JSON remains closed.
- Geometry: 62/38 desktop layout retained; inspector and card remain within the
  right panel without horizontal overflow.

## Fix plan

Completed in `eval-dashboard-model.mjs`: normalize compact template-owned
`properties` and Markdown `body` into typed Project, Work, Person, Meeting, and
Report view models. Regression coverage lives in `eval-dashboard.test.mjs`.
