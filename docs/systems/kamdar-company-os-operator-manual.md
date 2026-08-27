---
title: Kamdar Company OS operator manual
status: active
owner: KamdarAI
created_at: 2026-08-27
updated_at: 2026-08-27
system_id: SYS-0001
refs:
  - kamdar-company-os.md
  - daily-review-pipeline-gap-report.md
  - ../../automations/daily-operating-update.md
  - ../../automations/weekly-operating-review.md
  - ../../templates/README.md
  - ../../workspace.hermes.md
---

# Kamdar Company OS operator manual

## Purpose

Use the Company OS to keep work, Project memory, management follow-up, weekly
reporting, Decisions, and SOPs connected to the same source evidence. People
work in Notion tickets and comments. The Daily agent reconciles current work.
The Weekly agent turns reviewed evidence into management reports and promotes
only knowledge that has earned a durable home.

The current repository is configured for frozen or isolated evaluation.
Production Notion writes and employee messages remain proposal-only until the
production routes and authority are approved.

## The databases

| Database | What it owns | What it does not own |
| --- | --- | --- |
| **Projects** | Canonical manager memory: goal, current position, durable Project knowledge, this week's attention, owner, Department, and links to related records. | Ticket-level work logs or full meeting transcripts. |
| **Work items** | Tasks, Features, Issues, and Meetings. This is where people record progress, evidence, blockers, decisions, completion notes, commitments, and discussion. | Cross-Project precedent or reusable procedures after promotion. |
| **People** | Identity, role, authority, preferred contact channel, approved channels, and route references. | Guessed contact details or inferred permissions. |
| **Reports** | Current Project weekly drafts, finalized Project reports, Department rollups, and the Company report. | Canonical source detail; reports summarize and link back. |
| **Decisions** | Provenance database for choices worth remembering: context, options, selected option, authority, rationale, accepted tradeoff, consequences, review trigger, and sources. | Routine next actions or every choice made during execution. |
| **SOPs** | Reusable employee operating procedures: trigger, owner, inputs, ordered workflow, handoffs, baseline, exceptions, controls, and verification. | Software-agent skills or a one-off personal trick with no reuse proof. |
| **Automation artifacts** | Immutable run inputs, validated results, write receipts, read-back proof, blocked effects, and processing decisions. | Project memory or human-facing reports. |

Problems do not need a separate database. A material problem becomes an
`Issue` in Work, linked to the affected workflow or SOP step. Its page preserves
the Before baseline, economics or measurement gaps, intervention, and later
After measurement.

```text
                         +----------------+
                         |     People     |
                         | route/authority|
                         +-------+--------+
                                 |
                                 v
+----------+       +-------------+-------------+       +-----------+
| Projects |<----->| Work: Task/Feature/Issue  |------>| Decisions |
| memory   |       | and embedded Meetings     |       | provenance|
+----+-----+       +-------------+-------------+       +-----------+
     |                           |
     |                           v
     |                     +-----+-----+
     |                     |   SOPs    |
     |                     | reusable  |
     |                     +-----+-----+
     |                           ^
     v                           |
+----+---------------------------+----+
| Reports: Project -> Department -> Company |
+-------------------+-----------------------+
                    |
                    v
          +---------+-----------+
          | Automation artifacts|
          | results and receipts|
          +---------------------+
```

## The normal operating loop

```text
Human logs Work in Notion
          |
          v
Daily agent reads active Projects + selected Work
          |
          +--> updates grounded Project memory
          +--> asks precise documentation questions
          +--> chases threatened weekly targets
          `--> stages Problem / Decision / SOP candidates in the Weekly Draft
                                      |
                                      v
Weekly agent finalizes Project reports
          |
          +--> rolls them into Department and Company reports
          +--> promotes qualified Decisions, Issues, and SOPs
          `--> carries accepted priorities into next week
```

## 1. Log your work in tickets

Use the correct Work type:

- **Task** for ordinary execution.
- **Feature** for a bounded value opportunity with explicit scope and
  acceptance.
- **Issue** for a problem that needs diagnosis, a baseline, an intervention,
  and verification.
- **Meeting** for discussion whose Decisions and commitments must be captured.

At minimum, keep these facts current:

1. Project, owner, status, due date, progress, and last meaningful update.
2. What changed today.
3. Evidence: a source link, result, document, screenshot, number, or Meeting.
4. Current blocker and who owns it, or an explicit statement that there is no
   blocker.
5. Next action and commitment date.
6. On completion: outcome, acceptance evidence, important decision and reason,
   handoff, and any reusable method or recurring problem observed.

Good completion note:

```text
Outcome: The reconciliation sheet is now the release gate for the three-store pilot.
Evidence: Linked signed pilot sheet and approval Meeting.
Decision: Use the signed sheet instead of supplier emails because it preserves
one comparable baseline. Accepted tradeoff: one manual normalization step remains.
Handoff: Nur owns the final two store comparisons by 28 August.
Reusable method: retain the original supplier file and attach the normalized output.
```

Weak completion note:

```text
Done. Sheet updated.
```

## 2. Chat with the agent through Notion ticket comments

Start a new discussion with the configured mention, such as `@vishanai`. After
Hermes joins that open discussion, follow-up comments in the same thread do not
need the tag. A separate discussion still requires the mention. Keep the
conversation on the source ticket so the page, question, answer, and evidence
stay together.

Useful requests:

```text
@vishanai review this ticket for completion quality. Tell me only what is
missing, why it matters, and which section I should update.
```

```text
I answered your decision-rationale question under Notes > Decision.
Re-review the page and tell me whether anything required is still missing.
```

```text
@vishanai summarize the current blocker and propose the next owner action. Do
not change the ticket.
```

Expected interaction:

```text
Human comment
     |
     v
Agent reads the complete authorized page and exact open discussion
     |
     +--> comment is for Hermes: replies or re-reviews
     |
     `--> human-to-human or acknowledgement: stays silent
                         |
                         v
                  Human edits page or replies
                         |
                         v
              Same discussion reaches Agent again
```

The Notion bridge proves that an authorized comment can reach Hermes and receive
a reply. The Daily contract now protects the processing state, but the bridge is
not yet a deterministic event-driven Daily runner. A mention can request an
immediate re-review; otherwise the next Daily run re-fetches the Done item while
its `AI review` is not `Processed`. Never treat a reply or posted question alone
as proof that the ticket is ready to be processed.

## 3. Ask the agent to create a ticket through comments

The safe interaction is proposal first. Put the request on the relevant Project
or source Work page and include the desired outcome, owner, timing, and evidence.

```text
@vishanai draft a Task for the remaining two store comparisons.
Project: Penang Replenishment.
Owner: Nur.
Due: 28 August 2026.
Done means: both comparisons are attached and variances are reviewed.
Source: this ticket and TASK-103.
Show me the proposed title, fields, body, and source links before any write.
```

```text
Comment request
      |
      v
Agent resolves Project, owner, type, template, and source
      |
      +--> missing or ambiguous fact: asks one bounded question
      |
      `--> complete request: returns a template-complete proposal
                                  |
                                  v
                         authorized create route
                                  |
                                  v
                         new Work URL + receipt
```

There is not yet a dedicated schema-backed “create Work from comment” contract
in this repository. Treat this as a chat-assisted drafting path until a create
route, dedupe key, authority check, and write receipt are implemented and
evaluated. The agent must never guess the Project, owner, database, or due date.

## 4. Chat with the agent over Telegram

Use Telegram for short manager interactions, not as the canonical work log.
Ask for a summary, a list of blockers, or a ticket proposal; then put durable
facts and evidence back on the relevant Notion record.

Useful requests:

```text
What active Project targets are at risk this week? For each, cite the Work item
and tell me whether the delay has a documented cause.
```

```text
Draft a Task from this note: supplier B still owes the normalized count file.
Ask me for any required field you cannot resolve. Do not create it yet.
```

```text
Show me today's documentation questions grouped by owner, with links to the
source Work items.
```

```text
Telegram request
       |
       v
Agent reads authorized canonical records
       |
       +--> answer or proposal in Telegram
       |
       `--> durable fact/change -> Notion source record + receipt
```

Do not paste credentials, personal contact details, or private files into
Telegram. A Telegram message is not evidence that an employee received or read
a request unless the provider route and receipt explicitly prove that claim.

## 5. Daily agent task

The Daily task should run one bounded local-day evidence window in
`Asia/Kuala_Lumpur`.

```text
ACTIVE PROJECTS
      +
linked open or changed Work + Done Work where AI review != Processed
      +
embedded Meetings + People route facts + current Weekly Draft
      |
      v
one immutable Daily context
      |
      v
one validated Daily result
      |
      v
independent artifact-quality review
      |
      v
guarded writes + provider receipts + per-Work processing decision
```

Daily responsibilities:

1. Reconcile current Work against each Project's weekly attention.
2. Update only Project sections whose source evidence changed.
3. Ask precise completion questions on Done Work that lacks important context.
4. Identify threatened weekly targets and prepare one factual owner chase.
5. Stage grounded Problem, Decision, and SOP observations in the current Weekly
   Draft.
6. Record every effect, conflict, blocked route, duplicate, and read-back.

Daily must not:

- Scan all historical Work because a relation is missing.
- Invent progress, causes, costs, owners, contact routes, or destinations.
- Promote a canonical Decision, Issue, or SOP.
- Mark an item `Processed` merely because a question was posted.

## 6. Weekly agent task

Weekly reads finalized Project Draft evidence; it does not rescan raw Work or
Meeting pages.

```text
Project Report Drafts
        |
        +--> finalize Project reports
        +--> disposition every Problem / Decision / SOP candidate
        +--> promote only qualified canonical records
        `--> prepare next-week Project attention
                          |
                          v
               Department reports
                          |
                          v
                 Company report
                          |
                          v
             approved executive delivery
```

Promotion rules:

- **Problem:** promote when recurrence or material consequence is grounded and
  the Issue can preserve a dated Before baseline, measurement gaps, owner, and
  next test.
- **Decision:** promote only a reusable precedent or materially consequential,
  recurring, or costly-to-reverse choice. Preserve real alternatives,
  rationale, authority, accepted tradeoff, consequences, and review trigger.
- **SOP:** promote only an approved workflow with an owner, ordered method,
  systems and handoffs, baseline or explicit gaps, exceptions, output, reuse
  proof, Project relation, and provenance.

Every candidate receives one disposition: `promoted`, `duplicate`,
`project_only`, `monitor`, `dismissed`, or `blocked`. A weak candidate stays in
report history with its reason; it is not silently lost or forced into a
canonical database.

## When documentation is poor

The recovery path is:

```text
Done ticket
    |
    v
documentation verdict = needs_information
    |
    +--> grounded Project memory may still update
    +--> partial observation may be staged with explicit gaps
    +--> one Notion question thread opens
    `--> AI review = Needs information
                         |
                  human edits or replies
                         |
           mention-triggered or next Daily re-review
                         |
          +--------------+--------------+
          |                             |
     still missing                  sufficient
          |                             |
same thread asks only          required effects settle
remaining question                     |
                                        v
                                    Processed
```

Do not skip the item and lose all value. Apply only facts already grounded,
keep speculative extraction blocked, and leave the item eligible for re-review.
Do not mark it `Processed` until documentation is sufficient.

## Operator checklist

### During the day

- Log meaningful progress on the source Work item.
- Link evidence instead of pasting unsupported conclusions.
- Keep owner, due date, blocker, and next action current.
- Reply to documentation questions on the same page or edit the named section.
- Ask the agent to re-review after the update.

### After the Daily run

- Inspect blocked or conflicted effects.
- Check that at-risk targets cite evidence and a real due date.
- Check that incomplete tickets remain open for review, not silently
  `Processed`.
- Check that no duplicate question or chase was sent.

### After the Weekly run

- Confirm every active Project has a Final Project report or a named gap.
- Confirm every candidate has a disposition and source links.
- Confirm promoted Decisions and SOPs meet their type-specific gates.
- Confirm next-week attention has an owner and date for each commitment.
- Treat a provider receipt as delivery proof only to the extent it actually
  records the destination and read-back.

Grounding: current local system, automation, schema, template, workspace, and
Notion onboarding contracts. No external source was needed for this operator
manual.
