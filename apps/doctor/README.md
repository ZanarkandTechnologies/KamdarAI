# Company OS Doctor

This operator-facing app asks native Hermes to run an analysis-only Daily or
Weekly automation using configured skills and MCP tools. It does not implement
a second fetch, preparation, or delivery engine.

- `run.py`: thin native-Hermes analysis launcher.
- `tests/`: proves the launcher delegates to Hermes and exposes no hidden
  preparation, delivery, binding, or sync engine.

Daily and Weekly descriptions remain in their owning `SKILL.md`; Doctor does
not compile them into a second runtime registry or pre-decide whether Hermes
may analyze them.
