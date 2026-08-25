---
automation_id: kamdar-daily-notion-documentation-check
automation_version: "0.2.0"
kind: retired-company-os-automation
cadence: none
status: retired
replacement: automations/daily-operating-update.md
feature_refs:
  - FEAT-0002
  - FEAT-0009
---

# Retired Daily Notion documentation check

This single-purpose schedule is retired. A separate source scan for
documentation quality would duplicate evidence collection and diverge from
Project control. The Daily operating update now collects one context diff and
fans it out to [`daily-documentation-quality`](../skills/daily-documentation-quality/SKILL.md).

## Migration

```text
before: schedule -> fetch changed Work -> one request per record
after:  Daily collector -> context-diff.json -> grouped employee message plan
```

The replacement resolves the same Task, Feature, Issue, and Meeting template
requirements from the collector snapshot. It carries missing mapping or Meeting
parse failures as a source/configuration gap and hands routed messages only to
the separate delivery integration.

## Write boundary

This retired file never runs and grants no provider authority. The replacement
is proposal-only in production: neither its artifact skill nor this legacy
specification may post a Notion comment, edit a record, schedule a run, or send
a message. A future adapter must satisfy the active Daily automation's explicit
identity, route, idempotency, and receipt guards.
