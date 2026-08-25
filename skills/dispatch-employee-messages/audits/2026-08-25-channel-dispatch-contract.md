---
skill: dispatch-employee-messages
date: 2026-08-25
status: draft_unrun
scope: source-contract
---

# Channel dispatch contract audit

The dispatcher accepts only prepared Daily message deltas, resolves each
recipient's approved preferred channel through the workspace alias registry,
and produces a redacted dispatch result. It is not a provider implementation.

Current routes: `telegram-message` is available only for Kenji; email and
WhatsApp/Baileys remain explicit configuration gaps. A profile-backed run must
prove that `prepare` makes no channel call and that `send` returns only the
selected channel skill's observed receipt.
