---
template_id: kamdar-template-first-filesystem-proof
template_version: "0.4.0"
kind: company-os-eval
status: active-local-frozen
owner: KamdarAI
---

# Kamdar template-first proof

This is the current local proof for TASK-0006. It consumes the canonical root
contract at `../evals.json`, the repository-owned templates at `../../templates/`,
and a sanitized frozen fixture. It runs Daily before Weekly and writes only
ignored local output. Frozen comparison and receipt-backed operated proof have
separate run roots, so a UI comparison cannot overwrite the operated showcase.

```text
frozen Project portfolio + Work + hidden Meeting blocks + Drive-source gaps
  -> Daily: in-place Project context + quality requests + chases + candidates
  -> Weekly: Project -> Department -> Company reports + knowledge promotion
             + next-week planning + executive distribution
  -> feature-owned record, file, behavior, and application proof
```

The runner never calls Notion, Drive, email, Telegram, or Hermes. Its
connector-shaped trace records planned operations only; `network_calls` and
`external_writes` must remain zero.

## Share the buyer proof

Build the exact frozen buyer proof as one static HTML page, then deploy that
directory to the existing Vercel project. The generated deployment contains no
profile state, capture rows, credentials, API route, or provider capability.

```bash
node scripts/build-vercel-showcase.mjs
# First deploy only: creates ignored .vercel-static/.vercel/project.json.
vercel link --cwd .vercel-static --yes --scope kenjipcxs-projects --project kamdar-company-os-evidence
vercel deploy .vercel-static --yes --scope kenjipcxs-projects
vercel deploy .vercel-static --prod --yes --scope kenjipcxs-projects
```

Verify the production page shows `49/49 checks pass`, seven visible `Example
from the frozen seed` walkthroughs, and the frozen no-write boundary. The
destination is ignored and can be regenerated at any time.

## Run

```bash
node --test tests/*.test.mjs
node scripts/template-first-kamdar.mjs
node scripts/serve.mjs
```

Open the printed local URL, or run the same proof through the UI API:

```bash
curl -fsS -X POST http://127.0.0.1:4179/api/run \
  -H 'content-type: application/json' \
  -d '{"mode":"mock"}'
```

The acceptance verdict is 49/49: 11 record assertions, 12 aggregate
file/template assertions, and 26 behavior/safety assertions across all seven
features. A second unchanged run must record zero file events and no duplicate
outreach or proposals.

## Evidence layout

```text
runs/kamdar-template-first-frozen-latest/
  daily/                         Daily outputs
  weekly/                        Weekly outputs
  evidence/tool-trace.json       Planned local connector trace
  evidence/ascii-comparison.json Prototype comparison
  result.json                    Complete verdict and assertion expansion
  showcase/index.md|html          Shareable static proof view

runs/kamdar-template-first-latest/
  ...                             Receipt-backed operated proof only
```

## Retained baseline

`cases/kamdar-daily-company-showcase.json`,
`scripts/mock-kamdar-automation.mjs`, and `scripts/live-kamdar-poc.mjs` are
the earlier 37-check reduced-fixture baseline. They remain for regression
comparison only. They do not define the current contract and must not be used
for acceptance or to make provider calls.

## Output isolation

`node scripts/template-first-kamdar.mjs` and `POST /api/run` write only the
frozen comparison root. `live-kamdar-poc.mjs` is the bounded Notion edge and
accepts receipt validation only; it performs no provider write. `/showcase`
renders the frozen buyer proof until a separately approved, receipt-backed
operated run exists. This is deliberate: a reviewer can run a frozen test from
the UI without erasing a receipt-backed Notion story.

## TASK-0007 split-pipeline proof

The collector-first Daily contract has its own executable proof surface. It
does not reuse the fixed v4 root:

```text
27 package cases -> four safe-mode normal calibrations
  -> fresh marked Notion seed root -> read-only preflight
  -> fixture-backed Daily fan-out -> separate Weekly finalization
```

```bash
node scripts/run-task0007-skill-evals.mjs
node scripts/run-task0007-skill-evals.mjs --calibrate-pipelines --output <private-empty-directory>
node scripts/operate-task0007-notion-seed.mjs --provision
node scripts/operate-task0007-notion-seed.mjs --preflight
node scripts/operate-task0007-notion-seed.mjs --operate
```

The operator permits only one new root marked `kamdar-eval-seed-owned:v1` and
its child databases. Its `--operate` action writes seed records and report
artifacts only there; it never sends mail/chat, publishes Drive content, or
falls back to any existing Kamdar workspace. IDs and receipts stay profile
private.

## Private capture verification

`seed-manifest.json` stores only the private capture's hash and aggregate
shape. Set `KAMDAR_PRIVATE_SEED_PATH` to a profile-local seed created by
`scripts/compile_private_kamdar_seed.mjs` to make a frozen run verify its mode,
capture hash, manifest digest, and counts. No raw capture field is copied into
the run result or showcased HTML.
