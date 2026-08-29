---
kind: agent-qa-cases
ticket_id: TASK-0001
created_at: 2026-08-21T11:19:00+08:00
status: preregistered
---

# Adversarial workflow QA

Claim: the Proof surface makes one comprehensive Kamdar manager workflow
understandable and inspectable, distinguishes frozen planning from live POC
receipts, and proves the requested reports and delivery calls without exposing
runtime contacts or credentials.

Would fail if the UI mislabels live evidence, hides failed assertions or tool
arguments, implies the UI itself sends externally, cannot show area/project
report content, leaks private data, breaks at mobile width, or cannot reject an
implicit live send.

## Cases

### Happy path

- `user_goal:` understand what the live automation selected, created, and sent.
- `expected_workflow:` open Results; observe Live POC, 37/37, provider
  readiness, tool trace, output files, and showcase.
- `likely_confusion_or_wrong_path:` mistaking the frozen projection for proof
  that the processor itself made network calls.
- `required_proof_artifacts:` wide screenshots, live `result.json`, console log,
  and one inspected area/company report.
- `falsifier:` missing live label/receipts or a non-passing reference point.
- `reviewer_attack_questions:` does the screenshot prove live mode and verdict;
  does the trace distinguish observed receipts from planned calls?
- `instrumentation_request:` mode and evidence-source badges.

### Confused user

- `user_goal:` determine how to author the test and what will happen before Run.
- `expected_workflow:` Test shows natural-language reference points, expected
  calls/file changes, and collapsed sanitized fixtures; Run explains Frozen vs
  Live without an implicit external-send control.
- `likely_confusion_or_wrong_path:` searching for the former JSON editor or
  assuming `Run live` will contact people.
- `required_proof_artifacts:` Test and Run screenshots plus visible disclosure.
- `falsifier:` raw fixture JSON dominates or a control implies unconfirmed send.
- `reviewer_attack_questions:` can a fresh operator predict the assertions and
  side-effect boundary without reading source code?
- `instrumentation_request:` explicit live receipt-ingestion copy.

### Edge / error

- `user_goal:` try live scoring without an explicit receipt array.
- `expected_workflow:` API refuses the request with a clear 4xx error and makes
  no provider call.
- `likely_confusion_or_wrong_path:` treating an empty/implicit live request as
  permission to send.
- `required_proof_artifacts:` HTTP status/body and unchanged provider state.
- `falsifier:` 200 response, implicit send, or broad run-directory reset.
- `reviewer_attack_questions:` is refusal enforced server-side and is the run
  root scoped?
- `instrumentation_request:` route regression test.

### Responsive regression

- `user_goal:` inspect the same proof on a phone-width screen.
- `expected_workflow:` tabs, mode, primary action, reference points, trace, and
  result remain readable with no horizontal viewport overflow.
- `likely_confusion_or_wrong_path:` hidden tabs or clipped evidence table.
- `required_proof_artifacts:` 390x844 screenshot and geometry/overflow checks.
- `falsifier:` clipped primary controls, overlay, or horizontal scroll trap.
- `reviewer_attack_questions:` is the core proof still usable, not merely
  technically rendered?
- `instrumentation_request:` DOM bounding-box and scroll-width observations.
