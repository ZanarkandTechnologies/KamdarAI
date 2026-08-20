# Kamdar automation specifications

Every Kamdar automation is represented as a Markdown contract in this directory. Markdown is the editable source of truth: review and version the behavior here before scheduling or deploying any runner.

## Status

| Automation | File | Status | External writes |
| --- | --- | --- | --- |
| Daily Notion documentation check | `daily-notion-documentation-check.md` | Proposal-only | None |
| Daily operating update | `daily-operating-update.md` | Specification only | None |
| Weekly operating review | `weekly-operating-review.md` | Specification only | None |

Runtime receipts and generated proposals go to ignored directories (`receipts/`, `proposals/`, `runs/`). They are not the editable specification and must not be committed.
