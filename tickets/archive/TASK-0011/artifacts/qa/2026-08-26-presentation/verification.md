---
ticket_id: TASK-0011
kind: verification-receipt
status: pass
verified_at: 2026-08-26T07:22:00Z
---

# TASK-0011 verification

## Judged deployment

- Deployment: `evals/filesystem/runs/deployments/task0011-presentation-2026-08-26-05`
- Eligibility manifest SHA-256: `7e8d42c330478a906945fa387a26ce55be4090e6591f0478b3111ac1003d4d11`
- Daily: reconciled pass; four feature tiers A; artifact quality A/pass; four integration gates pass.
- Weekly: reconciled pass; three feature tiers A; artifact quality A/pass; integration checks pass.
- Scenario total: 11 passed, 0 failed, 0 blocked, 0 not run; 340 checks.

## Presentation build

- Public model SHA-256: `55de8181cc822d06384cf4888f6483bca7f14c289c1dcddbae47278831c5555d`
- Build receipt SHA-256: `e3494ae2294d4734abee1cba6fce9d76c6261cbfce47f8c92e2ff00bf64e4db8`
- Leak scan: no local path, judge path, JSON pointer, gate identifier,
  `dashboard.json`, or Technical proof in the stripped customer artifact.

## Full regression proof

| Command | Result |
| --- | --- |
| `node --test evals/filesystem/tests/*.test.mjs` | 125 tests; 115 pass; 10 intentional skips; 0 fail |
| `python3 -m unittest discover -s tests -p 'test_*.py' -v` | 28 pass |
| `python3 -m unittest discover -s skills/setup-kamdar-workspace/tests -v` | 7 pass |
| `python3 -m unittest discover -s skills/notion-webhook-onboarding/tests -v` | 12 pass |
| `farplane lint evals` | 82 manifests pass |
| `git diff --check` | pass |

No live provider, Hermes runtime, or deployment write was performed.
