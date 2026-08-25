---
template_id: kamdar-automation-receipt
template_version: "0.2.0"
---

# Kamdar {{CADENCE}} receipt — {{RUN_AT}}

- `evidence_window:` {{START_TIMESTAMP}}..{{END_TIMESTAMP}}
- `sources_checked:` {{SOURCES}}
- `template_map:` {{TEMPLATE_IDS_AND_VERSIONS}}
- `selected_records:` {{STABLE_RECORD_IDS}}
- `source_gaps:` {{GAPS_OR_NONE}}
- `generated_files:` {{PATHS_AND_TEMPLATE_IDS}}
- `planned_actions:` {{ACTIONS_OR_NONE}}
- `write_mode:` {{proposal-only | mock | sent}}
- `idempotency_key:` {{STABLE_INPUT_FINGERPRINT}}
