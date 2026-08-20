# Kamdar evaluation surfaces

Kamdar keeps two complementary proof layers:

- `kamdar-company-os.json` contains connector-routing and safety sanity cases.
- `filesystem/` is the executable behavior harness for manager workflows. Its
  local editor authors synthetic starting files plus created/modified/deleted
  and added/removed/present/absent assertions.

```bash
cd evals/filesystem
npm test
HERMES_EVAL_PROFILE=vishan-kamdar-ai npm run ui
```

Preparing a case is fully local. Running a case is explicit, uses a fresh
workspace under ignored `runs/`, and gives Hermes only the `file,skills`
toolsets. Live Notion, Gmail, Drive, messaging, and schedules remain separate
operator-approved integration tests.
