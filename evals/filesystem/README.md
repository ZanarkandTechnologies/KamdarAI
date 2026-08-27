# Filesystem evaluation harness

This directory contains executable evaluation code, not seed records or product
fixtures.

- `scripts/`: Daily/Weekly validators, proof preparation, and provider-edge test
  tooling.
- `tests/`: deterministic Node tests for those contracts.
- `runs/`: ignored generated evidence.

Canonical inputs live outside this directory:

- Seed tables: `../../seed/`
- Daily suite and expected artifacts: `../daily/`
- Weekly suite and expected artifacts: `../weekly/`
- Automation schemas: `../../schemas/automations/`
- Product templates: `../../templates/`

```bash
npm test
```
