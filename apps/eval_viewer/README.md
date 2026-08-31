# Evaluation viewer

This first-class package turns an analysis-only automation eval run into a
private, inspectable dossier.

```text
apps/eval_viewer/
├── build.py       # static HTML and model writer
├── model.py       # eval evidence-to-view-model projection
├── serve.py       # localhost-only development server
├── tests/         # viewer behavior and safety tests
└── dist/          # ignored generated output
```

Evaluation cases, expected outputs, and assertions live beside PM Daily and PM
Weekly under `skills/pm-*/`. The viewer consumes operated evidence from those
packages but does not own or score their contracts.

```bash
python3 -m apps.eval_viewer.build --out apps/eval_viewer/dist \
  --eval-run /absolute/private/path/to/eval-run
python3 -m apps.eval_viewer.serve
python3 -m unittest apps.eval_viewer.tests.test_viewer -v
```

Generated files are private, owner-only artifacts. The model rejects runs that
record provider mutations.
