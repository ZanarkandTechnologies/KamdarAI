---
kind: agent-qa-plan
ticket_id: TASK-0001
mode: app-regression
created_at: 2026-08-21T13:39:00+08:00
---

# Template-first frozen proof — adversarial QA plan

## Claim under test

The local proof UI and runner faithfully execute the approved frozen Kamdar
Daily-to-Weekly workflow from the root template-first contract, expose the
result in a usable proof surface, and make no provider request or external
write.

**Would fail if:** the API/UI reports a green score while a required generated
file, template marker, lifecycle event, known source gap, no-write receipt, or
ASCII-comparison result is absent or contradicted; or if the visible UI cannot
show those facts.

The tester lane cannot self-approve proof. The independent evidence-review lane
must attack the tester artifacts after capture.

## Human-like cases

### 1. Owner happy path — run and inspect

- **User goal:** “Show me what the manager did today and what the weekly rollup
  says, without touching my real workspace.”
- **Expected workflow:** open `/`; run the frozen proof; see 23/23; inspect
  Replenishment W34 as `modified`, Festive W34 as `created`, the Company rollup,
  and the no-write receipt.
- **Likely confusion / wrong path:** mistaking an old 37-check baseline or a
  static mock for the current root `evals/evals.json` proof.
- **Required proof:** API result, rendered UI screenshot, generated file
  inspection, template marker, tool trace, and result JSON.
- **Falsifier:** an assertion count other than 23/23; missing report chain;
  `network_calls_by_processor` or `external_writes_by_processor` non-zero.
- **Reviewer attack:** Is the displayed verdict the operated run, and do the
  file paths/template versions match the root contract?
- **Instrumentation:** API endpoints and generated `result.json` are already
  sufficient.

### 2. Source-gap trust path — do not invent data

- **User goal:** “Tell me what needs human input rather than pretending the
  Drive evidence exists.”
- **Expected workflow:** observe `TASK-102` as the one Drive-source gap;
  inspect a targeted request for only its missing Evidence field.
- **Likely confusion / wrong path:** treating a passing proof as a claim that
  all underlying operational data are complete.
- **Required proof:** Daily Project evidence, employee follow-up archive,
  result `observed_source_gaps`, and trace ordering around directory routing.
- **Falsifier:** invented Drive content, a broad/generic information request,
  or an actual email/Notion write.
- **Reviewer attack:** Does the output preserve the gap visibly while limiting
  the request to the mapped missing field?
- **Instrumentation:** frozen fixture and tool trace are sufficient.

### 3. Safety/regression path — rejected live mode and idempotent repeat

- **User goal:** “Make sure repeating this cannot duplicate messages or quietly
  activate a real connector.”
- **Expected workflow:** post `mode: live` and receive a 400 frozen-only error;
  repeat the unchanged mock run and observe zero file events and zero duplicate
  actions.
- **Likely confusion / wrong path:** treating connector-shaped planned calls as
  actual provider delivery.
- **Required proof:** live-mode response, idempotency result, connector trace,
  and UI/mock safety wording.
- **Falsifier:** live mode accepted; non-zero second-run file events; any
  provider call or external write.
- **Reviewer attack:** Are calls explicitly planned/local and is rejection
  enforced at the server boundary, not merely described in text?
- **Instrumentation:** server route plus `result.json` are sufficient.

## Tester and evidence-review split

- **Tester lane:** capture the operated paths and artifacts under this folder;
  record confusion, errors, and scope limits without assigning final proof
  approval.
- **Evidence-review lane:** inspect those artifacts independently, attack
  missing screenshots, stale results, API/UI mismatch, scope inflation, and
  any unproven claim. Return `pass`, `fail`, or `blocked` with rerun/fix
  instructions.
