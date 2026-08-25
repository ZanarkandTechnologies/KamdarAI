---
kind: setup-receipt
ticket_id: TASK-0001
generated_at: 2026-08-21T11:14:00+08:00
execution_mode: operate
status: configured
redacted: true
---

# Kamdar live POC setup receipt

## Setup status

| Service | Status | Evidence |
| --- | --- | --- |
| Notion | configured | Auth/read probe passed; namespaced root, three temporary databases, three task rows, two directory rows, three report rows, two comments, and the proof report were observed after writes. |
| Google Drive | configured | Profile OAuth refreshed; canonical Kamdar root read; namespaced POC folder contains five files. |
| Gmail | configured | Profile OAuth sent exactly two allowlisted POC messages; sent-mail search returned both subjects. |
| Telegram | configured | Profile home target was resolved; missing `python-telegram-bot[webhooks]==22.8` was installed into Hermes' existing venv; send returned a message receipt. |

## Grounding

- Notion: inspected [Create a page](https://developers.notion.com/reference/post-page)
  and [Create a comment](https://developers.notion.com/reference/create-a-comment).
- Google Drive: inspected [Create and manage files](https://developers.google.com/workspace/drive/api/guides/create-file)
  and [Create folders](https://developers.google.com/workspace/drive/api/guides/folder).
- Gmail: inspected [users.messages.send](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send).
- Telegram: inspected the [Bot API](https://core.telegram.org/bots/api).

## Current -> target

| Surface | Current state | POC target |
| --- | --- | --- |
| Project memory | Tasks and Resources headings exist; explicit Project Memory, Decisions, and Reports headings are missing | Prove the target hierarchy inside one isolated POC and report the production gap |
| Reports | No approved production report data source | Temporary Reports database with one report per area plus company rollup |
| Directory | General People source is discovery-only | Temporary two-row POC directory used only for allowlisted routing |
| Delivery | Telegram configured; Google wrapper dependency path incomplete | Verified Drive, Gmail, and Telegram consumer-visible deliveries |

## Agent preparation

1. Verified Notion CLI auth and the exact project/data-source parents.
2. Created a profile-local Google Python venv because the system interpreter is
   externally managed; refreshed the existing profile OAuth token.
3. Installed the locked Hermes Telegram dependency into the existing Hermes
   venv after the direct-send preflight exposed it as missing.
4. Created/reused only `[POC] Kamdar Manager Eval 2026-08-21` resources and
   checkpointed private IDs under the Hermes profile runtime directory.
5. Ran post-change Notion, Drive, sent-mail, Telegram-receipt, API, and eval
   probes.

## Human gates

None for this operated POC. Production scheduling, public sharing, guest
invites, cleanup, and production write-policy activation remain outside scope.

## Value map

| Source value | Classification | Destination |
| --- | --- | --- |
| Notion integration credential | secret/login | existing Notion CLI keyring/config only |
| Google OAuth credential and refresh token | secret/login | existing private Hermes profile files only |
| Telegram bot credential and home chat | secret/private runtime | existing private Hermes profile config only |
| Two operator-supplied recipients | private runtime input | process environment and temporary Notion POC directory rows; absent from tracked files and sanitized receipts |
| Live provider IDs | private runtime state | profile `runtime-poc` checkpoint only |

Local env policy: not selected. No tracked or ignored project `.env` file was
created.

## Verification / rollback

- Pre: provider auth/read probes and exact parent verification.
- Post: Notion rows/comments, five Drive files, two sent Gmail subjects, one
  Telegram message receipt, and a 37/37 `live-poc` eval result.
- Recovery: stop further writes and leave the exact namespaced POC intact. No
  deletion was authorized; later cleanup must explicitly archive/trash those
  POC resources rather than touching broader workspace state.
