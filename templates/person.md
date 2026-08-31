---
template_id: company-os-person
template_version: "0.3.0"
name: "{{PERSON_NAME}}"
person_id: "{{PERSON_ID}}"
department: "{{DEPARTMENT}}"
role: "{{ROLE}}"
status: "{{STATUS}}"
manager: "{{MANAGER}}"
preferred_contact_channel: "{{PREFERRED_CONTACT_CHANNEL}}"
approved_contact_channels: "{{APPROVED_CONTACT_CHANNELS}}"
contact_endpoint: "{{APPROVED_ROUTE_ALIAS}}"
contact_instructions: "{{CONTACT_INSTRUCTIONS}}"
timezone: "{{TIMEZONE}}"
expertise: "{{EXPERTISE}}"
---

# {{PERSON_NAME}}

<!-- This is a machine-readable directory record. Keep routing and expertise in
frontmatter so an agent can filter People rows before it reads page notes.
`contact_endpoint` stores a safe approved route alias resolved by workspace
configuration; it is not a guessed or seed-embedded email address, username, or
phone number. A route alias grants no send authority by itself. -->

## Operating notes

<!-- Add only durable context that does not fit the fields: known handoff
boundaries, collaboration constraints, or a clarification of the expertise.

GOLDEN EXAMPLE — replace every fact below; it demonstrates useful detail.
**Preferred contact channel:** Email
**Approved contact channels:** Email; Notion comment
**Contact endpoint:** email.eval-ops-lead
**Contact instructions:** Use email for owner follow-ups; do not use messaging
for urgent escalation. **Timezone:** Asia/Kuala_Lumpur
**Expertise:** replenishment variance; store-count controls; operational
decision briefs

Best for diagnosing replenishment variance and turning store-count evidence into
an operations decision. Escalate cross-department decisions to the Operations
Lead.
END GOLDEN EXAMPLE -->

{{OPERATING_NOTES}}
