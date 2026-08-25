---
template_id: company-os-skill
template_version: "0.4.0"
name: "{{SKILL_NAME}}"
skill_id: "{{SKILL_ID}}"
project: "{{PROJECT}}"
department: "{{DEPARTMENT}}"
owner: "{{OWNER}}"
status: "{{STATUS}}"
source_path: "{{SOURCE_PATH}}"
latest_eval: "{{LATEST_EVAL}}"
last_reviewed: "{{LAST_REVIEWED}}"
---

# {{SKILL_NAME}}

<!-- This is a registry card. The executable source of truth is the Farplane
SKILL.md linked in source_path; do not copy its workflow nodes here. -->

## Capability

<!-- Trigger, bounded input, and inspectable output in three concise lines.

GOLDEN EXAMPLE — replace every fact below; it demonstrates useful detail.
**Trigger:** A fully read Work record has actionable documentation gaps.
**Input → output:** Work record + mapped template → one reviewable request file.
**Value:** An owner gets precise questions instead of a generic update chase.
END GOLDEN EXAMPLE -->

{{CAPABILITY}}

## Proven use

<!-- One representative result and the latest linked eval or operated receipt. -->

{{PROVEN_USE}}

## Boundaries and dependencies

<!-- What this skill deliberately does not do, required sources, and its
downstream handoff. -->

{{BOUNDARIES_AND_DEPENDENCIES}}

## Source and proof

{{SOURCE_AND_PROOF}}
