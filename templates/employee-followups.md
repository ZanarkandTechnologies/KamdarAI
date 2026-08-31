---
template_id: kamdar-employee-followups
template_version: "1.0.0"
---

# Employee progress follow-up

<!-- Pydantic binding: WeeklyProgressChase.message_text

Write one short progress question about a threatened weekly Project target.
By default it will be posted on each exact linked Work item; an explicitly
configured employee-follow-up channel may deliver the same text directly.

Writing rules:
- Begin with the Project target and due date, not a vague "checking in".
- State the observed progress and why the target appears at risk.
- Ask what changed, the current blocker, the recovery plan, and the date the
  owner can now commit to.
- Address the owner by name when it is known from the bounded source context.
- Do not ask documentation-quality questions already handled on the ticket.
- Do not exaggerate unknown causes, progress, or dates.

Render only the message below. Do not include template frontmatter,
instructions, route metadata, or a delivery receipt. -->

{{OWNER}}, the Project target "{{TARGET}}" is due {{DUE_DATE}}.

Current evidence: {{PROGRESS_AND_RISK_BASIS}}.

Please reply with:
1. What changed since the last update?
2. What is blocking the remaining work?
3. What is the recovery plan and revised commitment date?

Update the linked Work item here: {{SOURCE_REFERENCE}}.

<!-- GOLDEN EXAMPLE — replace every fact below.
Jun, the Project target "Complete all three supplier comparisons" is due Friday.

Current evidence: only one comparison is complete, and the remaining two have
not changed since 21 August. The supplier normalisation rule is still unresolved.

Please reply with:
1. What changed since the last update?
2. What is blocking the remaining comparisons?
3. What is the recovery plan and revised commitment date?

Update the linked Work items here: TASK-103 and TASK-104.
END GOLDEN EXAMPLE -->
