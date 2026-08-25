---
artifact: visual-qa
ticket_id: TASK-0006
date: 2026-08-26
state: entity-cards
---

# Entity-card visual QA

Expected baseline: `tickets/TASK-0006/design.md` — `Starting-data entity cards`

Best image: `screens/desktop-project-card.png`

Verdict: pass

## Expected UI spec

- Design language: dense, square, pastel-on-black operational evidence UI.
- Layout: existing 62/38 eval list and inspector; typed cards remain inside Starting data.
- Hierarchy: record identity and state, operational facts, then collapsed raw JSON.
- Responsiveness: cards fill the mobile inspector without horizontal overflow.

## Observed snapshot report

- Desktop at 1280×900 retained the list at 59.38% width and inspector at 36.40%; the open Project card occupied 33.51% of the viewport inside the inspector.
- Mobile at 390×844 rendered the Project card at 91.03% viewport width with no page overflow or identity overflow.
- Project owner `PERSON-AISHA` resolved to `Aisha Rahman`; progress rendered as 2/5 with checklist state.
- Report rendered `1 Problems`, `1 Decisions`, `1 SOPs`, and `3 Next-week` from its sections.
- Project, Work, Person, Meeting, and Report states were captured. Raw JSON remained closed in every state.

## Diff report and verdict

Screen: `DESKTOP-EVAL-LIST` / Starting-data entity states

Design intent: replace primary JSON with compact operational cards without changing the eval workflow.

Verdict: PASS

Top visual diffs: none material. Cards retain square borders, restrained pastel accents, compact metadata, and progressive disclosure.

Top behavior diffs: none. Native disclosures open independently; case selection and the mobile inspector continue working.

Severity: none

Geometry assertions:

- Desktop list x 1.72–61.10%, inspector x 61.88–98.28%; no horizontal overflow.
- Mobile card width 91.03%; no body or identity overflow.
- Raw JSON disclosures remained closed by default on desktop and mobile.

## Fix plan

No blocking fix. Preserve the typed renderer registry and keep raw payloads inside the existing collapsed technical treatment.

## Artifacts and coverage

| State | Evidence | Desktop | Mobile |
| --- | --- | --- | --- |
| Project | `screens/desktop-project-card.png`, `screens/mobile-project-card.png` | PASS | PASS |
| Work Item | `screens/desktop-work-card.png` | PASS | Covered by shared responsive shell |
| Person | `screens/desktop-person-card.png` | PASS | Covered by shared responsive shell |
| Meeting | `screens/desktop-meeting-card.png` | PASS | Covered by shared responsive shell |
| Report | `screens/desktop-report-card.png` | PASS | Covered by shared responsive shell |

Best evidence item: `screens/desktop-project-card.png`
