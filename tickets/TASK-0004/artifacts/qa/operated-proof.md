---
kind: operated-proof-receipt
ticket_id: TASK-0004
status: partial-pass
run_mode: operated-showcase
verified_at: 2026-08-21T15:38:25Z
---

# TASK-0004 operated proof

## Verdict

- Scenario: `39/39` assertions pass across `9/9` features.
- Files: 19 template-backed artifacts; unchanged rerun creates zero events.
- ASCII composition: pass; TASK-0001 owns the full story and TASK-0002 replaces
  only Section 5.
- Notion: 7 databases, 9 baseline rows, 17 applied feature actions, all below
  one non-trashed namespaced root.
- Provider gaps: 2 Drive actions and 1 Gmail action are blocked by expired
  Google authentication; 2 Telegram actions are blocked because the Hermes
  profile has no configured target.
- Independent visual review: `TAS-A / pass`.
- Independent implementation review: `TAS-B / revise` for completion because
  the five external actions have no successful provider receipts.

## Live links

- [Showcase root](https://app.notion.com/p/SHOWCASE-Kamdar-Manager-Eval-2026-08-21-3c3d43a23942813b977bce8b8a6108b0)
- [Proof index](https://app.notion.com/p/SHOWCASE-Kamdar-Manager-Eval-2026-08-21-Proof-index-3c3d43a23942817b9428e93a4e9eb088)
- [Projects](https://app.notion.com/p/47e4f2816a2a409ebfb446cc689dff07)
- [Work Items](https://app.notion.com/p/12b25e9334a645489ec9c6695ab91054)
- [People / Directory](https://app.notion.com/p/d5a2bae462d74ca1987a21bd426647e5)
- [Decisions](https://app.notion.com/p/0c15449834814468afb5142965cc49e3)
- [Resources](https://app.notion.com/p/54b10a204c3147ca8e6560b473caea02)
- [Reports](https://app.notion.com/p/871db3817eac47e890a82aebf6d683cb)
- [Skills / Wiki](https://app.notion.com/p/accad8fb198c4144b449ca15d2358f4c)

## Verification

```text
node --test evals/filesystem/tests/*.test.mjs
  tests 9 · pass 9 · fail 0

python3 -m unittest discover -s tests -p 'test_*.py' -v
  Ran 12 tests · OK

browser /showcase
  full story present · Notion workspace link present · 39/39 present
  FEAT-0008 drilldown: BLOCKED + configured-target reason visible
```

The generated result is ignored runtime evidence at
`evals/filesystem/runs/kamdar-template-first-latest/result.json`. The private
idempotency checkpoint remains outside the repository under the Hermes profile.
