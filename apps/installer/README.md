# Company OS installer

This first-class package owns customer installation, configuration,
certification, maintenance, and setup verification. Product automations,
templates, evaluation cases, and the evaluation viewer remain outside it.

```text
apps/installer/
├── cli/                # guided commands and interactive flows
├── runtime.py          # deterministic profile operations and health checks
├── profile.py          # Hermes plugin and schedule reconciliation
├── workspace.py        # reviewed source-to-runtime installer
├── e2e.py              # isolated Docker installer proof
├── compose.e2e.yaml    # isolated E2E override
├── docs/               # customer and configuration documentation
└── tests/              # installer-owned proof
```

The repository-root `setup.py` and `setup.cmd` are stable customer entry
points. They contain no installer workflow logic. `compose.yaml` remains at
the root because Docker Compose and the Windows launcher discover it there.

```bash
python3 setup.py --help
python3 -m unittest apps.installer.tests.test_architecture apps.installer.tests.test_init -v
```
