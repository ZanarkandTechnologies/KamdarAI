Ticket / Proof Policy: tickets/TASK-0026/ticket.md / Done + QA Strategy + Agent Contract
Verdict: revise

# TASK-0026 QA report

## Tested path

The installed `kamdar-ai` profile was configured with Hermes' Docker backend,
the selected workspace bind-mounted at `/workspace`, and the updated
distribution. The real `setup.py doctor eval` command generated Daily and
Weekly artifacts inside Docker, persisted them to the host workspace, exported
file-only traces, ran the model-only judge plus one schema repair, validated all
8 cases, and built the private checksum-bound dossier. The live readiness command then failed
closed because the selected profile's Notion hosted MCP has no cached browser
authorization.

## Obligation map

| Obligation | Result | Evidence |
| --- | --- | --- |
| Selected-profile gateway detection | PASS | launcher/runtime regression tests in the 188-test suite |
| Required connection failure blocks first install | PASS | lifecycle and MCP marker tests; live Notion preflight failed closed |
| Exact Telegram route before automatic delivery | PASS | messaging configuration tests; live send intentionally skipped |
| Optional webhook token and exact threaded reply | NOT PROVABLE HERE | requires customer Notion subscription and one live comment |
| Read-only source preflight and redacted receipt | PASS mechanism / BLOCKED journey | readiness tests pass; live Projects and Tasks stop at missing Notion OAuth |
| Canonical seed-backed preflight | NOT OPERATED | readiness fixture coverage exists; clean seed journey remains a test gate |
| Daily/Weekly eval, strict judge, receipt, dossier | PASS | operated run `20260901T051032Z-1f5f8c0b`, 8/8 cases, zero provider mutations |
| Latest dossier validation | PASS | complete artifact manifest, symlink rejection, and tamper tests |
| Proof-gated schedule activation | PASS | stale readiness/live-health rejection and rollback tests; installed jobs remain paused while live proof is blocked |
| First-install and maintenance ordering | PASS | CLI and launcher regression tests |
| Windows clean-machine journey | NOT OPERATED | current host is macOS; customer Windows execution remains required |

## Failure risk exercised

- A stale Docker container without the workspace mount caused generated files
  to disappear; the installer now enables and verifies the native mount, and
  eval refuses model spend without it.
- Hermes MCP commands can exit zero while printing a failure marker; connection
  gates now require the explicit connected marker.
- The live judge returned prose despite a JSON-only instruction; one
  model-only normalization retry produced a strict receipt, while missing
  cases, assertions, or evidence still fail.
- The live readiness probe proves missing Notion authorization remains a real
  blocking result instead of a false pass.

## Verdict rationale

The implementation and Docker-backed eval are test-ready, and independent
implementation re-review returned `pass / TAS-A` with no P0/P1 blockers. Release acceptance
still needs the customer-operated Windows journey, Notion hosted-MCP login,
seed-backed readiness pass, and optional webhook comment/reply proof. These are
environment gates, not hidden implementation passes.

## Learning

`ticket_only`: Hermes mounts the selected profile workspace at `/workspace`;
deeper `--in` paths do not change the bind root, so all persisted Docker paths
must be translated relative to that workspace.
