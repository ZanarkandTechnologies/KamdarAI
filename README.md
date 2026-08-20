# KamdarAI

KamdarAI is the source-controlled configuration and evaluation harness for the
Kamdar Hermes manager. The live agent runs from a separate Hermes workspace;
this repository owns the reviewed inputs used to configure and test it.

## Layout

```text
configs/       Reviewable, nonsecret workspace context
automations/   Daily and weekly operating contracts
skills/        Kamdar skill source and workspace setup
evals/         Behavioral suites and the authored-filesystem eval UI
scripts/       Deterministic helpers
tests/         Repository contract tests
```

The live workspace is
`/Users/kenjipcx/.hermes/profiles/vishan-kamdar-ai/workspace`; private profile
state is one level above it. Neither is committed or symlinked into this repo.
Reusable, company-agnostic improvements belong in
`/Users/kenjipcx/Zanarkand Technologies/projects/HermesCorp` after Kamdar data
has been removed.

## Develop and verify

Edit and test here first:

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 -m unittest discover -s skills/setup-kamdar-workspace/tests -v
python3 -m unittest discover -s skills/notion-webhook-onboarding/tests -v
node --test evals/filesystem/tests/*.test.mjs
python3 scripts/validate_company_context.py --context configs/workspace.hermes.md
```

Preview the explicit source-to-runtime install:

```bash
python3 skills/setup-kamdar-workspace/scripts/setup_workspace.py \
  --workspace /Users/kenjipcx/.hermes/profiles/vishan-kamdar-ai/workspace \
  --profile-home /Users/kenjipcx/.hermes/profiles/vishan-kamdar-ai
```

The command is preview-only unless `--apply` is supplied, refuses an
unapproved workspace context, manages only `.hermes.md`, `automations/`, and
project-owned `skills/`, and never deletes target files.

For the eval authoring UI:

```bash
cd evals/filesystem
npm test
npm run ui
```
