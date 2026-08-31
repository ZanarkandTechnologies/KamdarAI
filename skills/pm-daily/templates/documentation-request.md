---
template_id: kamdar-documentation-request
template_version: "1.0.0"
---

# Documentation request

<!-- PM Daily output: documentation request body

Write one concise comment for a completed Work item that is missing important
context. The comment must show what is already understood, identify exactly what
is missing, explain why it matters, and name where the owner should add it.

Writing rules:
- Ask only questions that affect understanding, reuse, accountability, or proof.
- Do not ask for cosmetic labels or generic "more detail".
- Do not repeat facts already present in the ticket.
- Ask in a direct, helpful tone.
- Refer to the exact ticket section to update.

Render only the comment below. Do not include template frontmatter, instructions,
an application receipt, or a separate private artifact. -->

I understand that {{KNOWN_OUTCOME_OR_DECISION}}.

What is still missing: {{IMPORTANT_MISSING_CONTEXT}}.

Please add this under {{EXACT_SECTION}}:
1. {{PRECISE_QUESTION}}

Why this matters: {{OPERATIONAL_REASON}}.

<!-- GOLDEN EXAMPLE — replace every fact below.
I understand that the reconciliation sheet became the release gate.

What is still missing: the ticket does not explain why this option was chosen.

Please add this under Notes > Decision:
1. Why was the reconciliation sheet selected over the other options considered?

Why this matters: we cannot safely reuse the release rule without its rationale.
END GOLDEN EXAMPLE -->
