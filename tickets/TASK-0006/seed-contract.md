---
ticket_id: TASK-0006
kind: operated-seed-contract
status: proposed
created_at: 2026-08-21
updated_at: 2026-08-21
source_capture_sha256: 26ec0188a4dbf1a527e70de11dbc07e18d554c909684e7969861de7df7e5535d
raw_capture_tracked: false
---

# Operated seed contract

## What the supplied capture contains

The capture is useful, but it is not a complete Company OS export.

| Captured fact | Count |
| --- | ---: |
| Rendered rows | 49 |
| Named Projects | 39 |
| Rows without a Project name | 10 |
| Observed department labels | 7 |
| Departments with named Projects | 6 |
| Rows with Status / Progress / Deadline | 2 |
| Rows with Owner | 1 |
| Rows with Assignee | 0 |
| Rows with a source URL | 0 |
| Individual page bodies fetched | 0 |

The 39 named Projects cover Marketing, Merchandising, CMT, Ecommerce, Property
Management, and DTC Brands. Content appears on one row without a Project name.
The other incomplete rows have no assigned department.

The capture can seed the Project catalog and department distribution. It cannot
truthfully supply Tasks, Meetings, employees, contact routes, page content,
owners, or progress history. Those records need an explicit scenario overlay.

## Seed layers

```text
private browser capture
  49 rows · original Project names and IDs
             │
             ▼
capture normalizer
  39 Projects · 10 source gaps · 7 observed departments
             │
             ├─────────────────────┐
             ▼                     ▼
scenario overlay              private route registry
  People · Work · Meetings      Email · Telegram · Notion user IDs
  status · cost · evidence      operator-owned destinations only
             │                     │
             └──────────┬──────────┘
                        ▼
private compiled seed
  exact input used by both the scorer and the isolated v4 workspace
```

The raw capture and compiled seed remain under the private Hermes profile with
mode `0600`. Git stores the compiler, schema, source hash, aggregate counts,
sanitized scenario cases, and assertions—never raw Project titles, private
contacts, Telegram chat IDs, or Notion user IDs.

## Target environment

| Record | Proposed seed | Why it exists |
| --- | ---: | --- |
| Projects | 39 capture-derived Projects | Make the workspace feel like the supplied operating portfolio |
| Source gaps | 10 captured incomplete rows | Prove the manager reports missing structure instead of inventing Projects |
| Departments | 7 observed labels | Produce one Weekly department view for every observed department |
| People | 8 | Seven department owners plus one Demo Owner / executive recipient |
| Work Items | 21 | Cover stale, incomplete, healthy, active-variance, and Meeting cases |
| Embedded Meetings | 3 | Produce commitments, Decisions, Resources, Problems, and SOP candidates |
| Active Project reports | 12 | Two active Projects in each department that has named Projects |
| Department reports | 7 | Six evidence-backed reports plus one honest Content source-gap report |
| Company reports | 1 | Aggregate all department outcomes and owner attention |

The 21 Work Items are a declared synthetic overlay because the capture contains
no Task records. The overlay should include:

- four stale or blocked items owned by two allowlisted test employees;
- four incomplete items that need precise template-field comments;
- six healthy items that must receive no comment or chase;
- four active items with plan/time/cost variance;
- three embedded Meeting items with commitments and promotion candidates.

## People and contact routing

The v4 People database may contain the operator's real contact methods because
the environment is private and the operator requested it. The repository must
not contain those values.

| Person role | Notion display | Private route behavior |
| --- | --- | --- |
| Demo Owner | operator name, work email, Telegram route label | receives the final Company report in Telegram |
| Test employee A | fictional employee plus redacted test-route label | grouped chase goes to the first operator-owned inbox |
| Test employee B | fictional employee plus redacted test-route label | grouped chase goes to the second operator-owned inbox |
| Other department owners | fictional names and roles | no external send unless separately allowlisted |

Multiple fictional employees must not silently share a live destination. The
two routed test employees are explicit sandbox identities. Every other employee
returns `route_not_approved` for external delivery.

## Notion comment and mention contract

An email address cannot create a Notion user mention. The private route registry
must bind an actionable employee to a verified `notion_user_id`.

```text
mention_preflight(notion_user_id)
  -> GET /v1/users/{id} succeeds | blocked(restricted_or_unknown_user)

comment(work_item, responsible_person)
  -> rich_text user mention
     + status and days stale
     + planned versus actual hours and cost
     + blocker and missing evidence
     + current questions and revised commitment request
     + source Work URL
```

The current Notion personal-access token cannot list workspace users (`403
restricted_resource`). Implementation must obtain the intended user ID from an
existing Person property or private operator configuration, then verify that
specific ID. Plain text such as `@Kenji` is not proof of a tag.

## Email proof

FEAT-0003 creates one artifact per routed test employee:

```text
daily/outreach/{person_key}-followup-{date}.md
```

Each email groups all stale or incomplete Work for that employee. The operated
test should send two emails—one to each operator-owned test inbox—and require a
Gmail message ID, sent time, recipient hash, payload hash, and idempotency key.

## Telegram proof

FEAT-0008 creates one owner message after all Weekly reports are final:

```text
weekly/distribution/telegram-summary-{week}.md
```

The message contains one section per observed department:

```text
Department
  outcome this week
  active / delayed / blocked counts
  time and MYR variance when sourced
  main blocker and responsible owner
  decision or attention needed
  next action
  department-report link
```

Content must appear as an explicit source-gap section rather than a fabricated
report because its captured row has no Project name. The Telegram test passes
only when the provider returns a matching message ID and payload hash for the
Demo Owner's private route.

## Proof boundary

- The scorer and v4 workspace consume the same compiled private seed.
- The showcase labels capture-derived and synthetic-overlay records separately.
- Assertions test counts, relations, states, artifacts, content, mentions,
  deliveries, and reruns; they do not expose private values.
- No provider send or Notion mutation occurs until the separate operated-send
  approval gate in TASK-0006 is satisfied.
