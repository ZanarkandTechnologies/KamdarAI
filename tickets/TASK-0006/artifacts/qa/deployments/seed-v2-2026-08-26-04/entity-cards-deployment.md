---
artifact: deployment-proof
deployment: seed-v2-2026-08-26-04
date: 2026-08-26
status: deployed
---

# Typed entity-card deployment

- Production: https://kamdar-company-os-evidence.vercel.app/
- Deployment: `dpl_Brw8qZrZDYvs9zRF36rnWMvh3qyt`
- Immutable URL: https://kamdar-company-os-evidence-56m24r5bw-kenjipcxs-projects.vercel.app/
- Previous deployments: retained in Vercel history.

## Change

Starting data now routes `projects`, `work_items`, `people`, `meetings`, and
`reports` into dedicated operational cards. Seed-backed IDs resolve to readable
names. Empty sections disappear, while raw JSON remains available in a closed
technical disclosure.

## Proof

- Filesystem suite: 81/81 passed.
- Production read-back: 13 case rows, 69 generated entity-card instances in
  case templates, zero raw JSON disclosures open by default, and no horizontal
  page overflow.
- Visual QA: [entity-card report](../../2026-08-26-entity-cards/visual-qa.md)
- Best desktop capture: [Project card](../../2026-08-26-entity-cards/screens/desktop-project-card.png)
- Mobile capture: [Project card](../../2026-08-26-entity-cards/screens/mobile-project-card.png)
