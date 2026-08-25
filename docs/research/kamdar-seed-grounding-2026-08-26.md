---
artifact: source-synthesis-report
method: research:source-synthesis
date: 2026-08-26
status: reviewed-local-and-public-sources
decision: rebuild-seed-scenarios
---

# Kamdar seed grounding

## Decision

The current seed is not sufficiently grounded in Kamdar. Keep the eval feature
coverage, but rebuild the scenario layer around captured Project names and
Departments and around textile-retail operating work. Do not patch the Festive
report in isolation: its Project, Tasks, Draft, Weekly golden, and rollups all
share the same invented premise.

## Local baseline

The 21 August Notion browser capture contains 39 non-empty Project names:

| Department | Captured Projects |
| --- | ---: |
| Marketing | 15 |
| Merchandising | 11 |
| CMT (Cut Make Trim) | 6 |
| Ecommerce | 5 |
| DTC Brands | 1 |
| Property Management | 1 |

Representative captured Projects include `Deepavali Marketing`, `Weekly Meta
Ads Updates`, `Kain Wholesale Ads`, `Ecom Fixes`, `Listing Pipeline`,
`Branchwide LiveHost`, `India Sourcing`, `Tech pack`, `CMT Pipeline`, `Kamdar
Ladies`, `Kamdar Gents`, and `kalrah launch`.

The capture is a Project catalogue, not a complete historical Work export. It
supports Project names and Departments, but it does not support claims about
specific tasks, performance, blockers, owners, or outcomes. Those must remain
clearly labelled synthetic eval scenario facts.

## Public business grounding

Kamdar describes itself as a Malaysian retailer of fabrics, fashion, and home
furnishings. Its product range includes clothing fabrics, ready-to-wear apparel,
curtains, upholstery, bedding, batik, and songket. Its annual report describes
operating flows across design and merchandising, supplier sourcing and samples,
warehouse and inventory management, marketing campaigns and promotions, store
operations, and e-commerce content, orders, enquiries, product samples, and
photoshoots.

That evidence supports scenarios involving product selection, supplier quotes,
MOQ and lead times, samples and tech packs, fabric or garment quality checks,
inventory allocation, product listings and photography, campaign assets,
promotion performance, store activation, and customer enquiries. It does not
support software-release terminology such as generic release controls,
acceptance evidence, rollout owners, or QA reviewers.

## How the incorrect Festive report was produced

1. The older comparison fixture introduced `Online Merchandising` and a task
   called `Publish festive landing-page QA evidence`.
2. The compact seed renamed that premise to `Festive E-commerce Launch`,
   `Complete festive launch QA evidence`, and `Check festive release checklist`.
3. The Weekly context and golden report then promoted those synthetic fields
   verbatim into release controls, reviewer authority, and SOP disposition.
4. The v3 migration improved storage shape only. It faithfully copied this bad
   scenario into a complete template body, so the output became better formatted
   but no more realistic.

## Replacement seven-Project roster

| Captured Project | Department | Synthetic eval scenario | Main feature proof |
| --- | --- | --- | --- |
| CMT Pipeline | CMT (Cut Make Trim) | Sample approvals, tech-pack completeness, production-slot blockers | Project memory and weekly carry-forward |
| India Sourcing | Merchandising | Supplier samples, MOQ, landed cost, lead time, and quality findings | Stale target chase |
| Deepavali Marketing | Marketing | Campaign calendar, product themes, bazaar/branch activation, asset handoff | Meeting knowledge extraction and weekly report |
| Weekly Meta Ads Updates | Marketing | Spend, attributed revenue, creative, audience, and comparison window | Precise documentation questions |
| Ecom Fixes | Ecommerce | Product-page, search, checkout, order, and customer-enquiry fixes | Problem extraction and project report |
| Listing Pipeline | Ecommerce | Sample receipt, photography, copy, dimensions, fabric attributes, and publish readiness | SOP candidate and progress control |
| kalrah launch | DTC Brands | Product assortment, samples, shoot, listing, campaign, and launch inventory | Cross-functional rollup |

## Feature case shape

| Feature | Concrete grounded case |
| --- | --- |
| FEAT-0001 | Update `CMT Pipeline` after completed sample checks, carry forward the missing approved tech pack, and record the production-slot blocker. |
| FEAT-0002 | A Done `Weekly Meta Ads Updates` task reports campaign performance but omits spend, attribution window, attributed revenue, and source report; request those exact facts. |
| FEAT-0003 | `India Sourcing` has weekly sample/quote targets but no supplier update; chase the accountable owner for sample ETA, MOQ, landed cost, and revised commitment. |
| FEAT-0004 | A completed `Deepavali Marketing` review contains decisions on featured product groups and activation dates, a repeated asset-handoff method, and a late-photography problem; extract each with sources. |
| FEAT-0005 | Finalize reports for `CMT Pipeline`, `Deepavali Marketing`, and `Ecom Fixes`, then roll up CMT, Marketing, and Ecommerce. |
| FEAT-0006 | Promote only an approved, repeated listing handoff SOP; keep single-occurrence campaign and sourcing problems in the Project report. |
| FEAT-0007 | Replace `CMT Pipeline` weekly attention with unresolved tech-pack approval, sample correction, and production-slot actions. |

## Provenance rule

Every seeded fact must declare one of two origins:

- `captured`: Project name and Department copied from the 21 August scrape.
- `synthetic_eval`: invented Work, People, dates, measurements, blockers, and
  outcomes designed to prove a feature without claiming they happened at
  Kamdar.

No synthetic fact should be written as a real company observation.

## Sources

- Local Notion browser capture, saved 2026-08-21, SHA-256
  `26ec0188a4dbf1a527e70de11dbc07e18d554c909684e7969861de7df7e5535d`.
- Kamdar official About Us page.
- Kamdar Group (M) Berhad Annual Report 2024, pp. 21–24.
- Kamdar official Deepavali product collection.

## Next owner

Seed and eval ownership must update the source seed, Daily/Weekly contexts,
goldens, receipts, read-backs, and feature assertions as one versioned v4
deployment. The existing v3 Notion environment should remain frozen as failure
evidence rather than being edited in place.
