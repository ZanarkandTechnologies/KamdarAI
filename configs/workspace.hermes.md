---
template_id: hermes-company-workspace
template_version: "0.2.0"
kind: hermes-project-context
company_name: "Kamdar AI"
company_description: "AI transformation workspace for Kamdar, a Malaysian fabrics, furnishings, home-decor, and ready-to-wear retailer established in 1972."
company_timezone: "Asia/Kuala_Lumpur"
status: proposed-owner-review
---

# Kamdar AI Workspace

Kamdar AI is the AI transformation workspace for Kamdar, a Malaysian fabrics, furnishings, home-decor, and ready-to-wear retailer established in 1972. The company operates stores across Malaysia and serves consumers, businesses, and institutions.

## Work

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Notion | `notion` skill via `ntn` | [Projects](https://app.notion.com/p/b2e2f5f3d6b14d01961a2bef0696d744) · [Tasks](https://app.notion.com/p/638d85a858b04d038d8b97be1a879a1f) · [Kamdar AI](https://app.notion.com/p/Kamdar-AI-3b7d43a2394280e6ae73fcadf3c5c748) | Projects contain objectives, context, collaborators, linked tasks, resources, and status. Tasks contain name, project relation, status, People relation, dates, and description. Documentation policy: proposal-only. **Record type/template mapping: blocked**—Tasks has no `Type` property and no approved Kamdar Task/Issue/Meeting template. |

## People

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Notion | `notion` skill via `ntn` | [People](https://app.notion.com/p/d2bf0d7776594a4982909e618aad8d98) | Existing personal CRM with name, email, tags, project relation, and task/appointment relation. It is a discovery source only; it is not yet an approved Kamdar internal directory. Use named owner/collaborator relations on work records where present. |

## Knowledge

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Google Drive | profile-scoped `google-workspace` skill | [Kamdar AI folder](https://drive.google.com/drive/folders/1QQ-bEjBeMwhB9AHEEJtiOOTYZPceJxBV) | Canonical root for Kamdar files. Keep retrieval and new company files inside this folder unless explicitly approved otherwise. |
| Notion | `notion` skill via `ntn` | [Kamdar AI project](https://app.notion.com/p/Kamdar-AI-3b7d43a2394280e6ae73fcadf3c5c748) | Project narrative, business pain points, AI initiatives, linked tasks, and linked resources. |

## Communications

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Gmail | profile-scoped `google-workspace` skill | `kenji@znrknd.com` | Search company communication by participant, Kamdar, project, or initiative. This is the only currently authorized send identity. |

## Decisions

| Platform | Use via | Pages or sources | How it is structured |
| --- | --- | --- | --- |
| Notion | `notion` skill via `ntn` | [Kamdar AI project](https://app.notion.com/p/Kamdar-AI-3b7d43a2394280e6ae73fcadf3c5c748) and approved related records | Use the project narrative and linked work as the current decision context. A dedicated Kamdar decision-record data source and template are not yet approved. |

## Notion mention and comment policy

- A Notion API mention requires a Notion `user_id`; an email address alone cannot be resolved or mentioned through the API.
- A guest can be mentioned only after they are already a guest of the connected workspace and their Notion user ID is known.
- Do not invite guests, create Notion users, or post comments automatically.
- Internal comments are **proposal-only**. The daily documentation check must return `unmapped_template` until the owner maps applicable Kamdar record types to approved Notion templates.

## Operating guidance

- Use `Asia/Kuala_Lumpur` for time-bounded Kamdar automations.
- Treat the Kamdar AI Drive folder as the canonical root for company files.
- Treat `kenji@znrknd.com` as the only currently authorized Gmail read/send identity.
- Keep Google OAuth profile-scoped under `$HERMES_HOME`; do not rely on machine-global `gws` credentials.
- Links prove reachability, not authority. Ask before extending source scope or write authority.

## Boundaries

- Never store credentials, tokens, passwords, private keys, or transient connection health in the live context.
- Confirm before email, calendar, Drive, or Notion writes, including comments, task/project changes, sharing, deletion, and record creation.
- Do not treat the general Notion People CRM as the Kamdar internal directory without approval.
- Do not infer employee abilities, work email addresses, departments, or guest/mention mappings from names alone.
- Automations are maintained as Markdown in `automations/`; proposal-only is the current maximum authority.
