import {
  escapeHtml,
  renderJsonBlock,
  renderPastelSquare,
  statusClass,
  toneFor
} from "./eval-dashboard-primitives.mjs";

function present(value) {
  return value !== undefined && value !== null && value !== "";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function resolveLabel(value, labels = {}) {
  return labels[value] || value;
}

function displayText(value) {
  return String(value || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*|`/g, "");
}

function renderState(value) {
  return present(value) ? `<span class="entity-state state-${statusClass(value)}">${escapeHtml(value)}</span>` : "";
}

function renderMeta(items) {
  const visible = items.filter(([, value]) => present(value));
  if (!visible.length) return "";
  return `<div class="entity-meta">${visible.map(([label, value]) => `<span><b>${escapeHtml(label)}</b>${escapeHtml(value)}</span>`).join("")}</div>`;
}

function renderFacts(items) {
  const visible = items.filter(([, value]) => present(value));
  if (!visible.length) return "";
  return `<dl class="entity-facts">${visible.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`;
}

function renderList(items, className = "entity-list") {
  const visible = asArray(items).filter(present);
  return visible.length ? `<ul class="${className}">${visible.map((item) => `<li>${escapeHtml(displayText(typeof item === "string" ? item : item.action || item.summary || item.id))}</li>`).join("")}</ul>` : "";
}

function renderChecklist(items) {
  const visible = asArray(items).filter(present);
  if (!visible.length) return "";
  return `<ul class="entity-checklist">${visible.map((item) => {
    const checked = /^\[x\]/i.test(item);
    const text = item.replace(/^\[[x ]\]\s*/i, "");
    return `<li class="${checked ? "complete" : "open"}"><span aria-hidden="true">${checked ? "✓" : ""}</span><span>${escapeHtml(displayText(text))}</span></li>`;
  }).join("")}</ul>`;
}

function renderProgress(targets, summary) {
  const visible = asArray(targets);
  if (!visible.length && !present(summary)) return "";
  const complete = visible.filter((item) => /^\[x\]/i.test(item)).length;
  const percentage = visible.length ? Math.round((complete / visible.length) * 100) : null;
  return `<div class="entity-progress">
    ${present(summary) ? `<p>${escapeHtml(summary)}</p>` : ""}
    ${percentage === null ? "" : `<div class="progress-track" aria-label="${complete} of ${visible.length} targets complete"><span style="width:${percentage}%"></span></div><small>${complete} of ${visible.length} weekly targets complete</small>`}
  </div>`;
}

function renderSubsection(title, content, { accent = false } = {}) {
  return content ? `<section class="entity-section${accent ? " entity-section-accent" : ""}"><h4>${escapeHtml(title)}</h4>${content}</section>` : "";
}

function renderRawDisclosure(entity) {
  return `<details class="raw-entity-data"><summary>Technical source data</summary>${renderJsonBlock(entity, `${entity.entity_type || "entity"} JSON`)}</details>`;
}

function renderShell(entity, index, { meta = "", body = "" } = {}) {
  const tone = toneFor(index);
  return `<details class="entity entity-card entity-${escapeHtml(entity.entity_type || "unknown")}">
    <summary>
      ${renderPastelSquare(tone, "entity-square")}
      <span class="entity-identity"><b>${escapeHtml(entity.id)}</b><span>${escapeHtml(entity.name || entity.entity_type)}</span></span>
      ${renderState(entity.status)}
    </summary>
    <div class="entity-card-body">${meta}${body}${renderRawDisclosure(entity)}</div>
  </details>`;
}

export function renderProjectCard(entity, index, labels) {
  const overview = entity.overview || {};
  const knowledge = entity.knowledge || {};
  const attention = entity.attention || {};
  const blocker = overview.main_blocker || knowledge.main_blocker || asArray(knowledge.blockers)[0];
  const knowledgeContent = [
    renderFacts([["Health", knowledge.health], ["Context", knowledge.current_context]]),
    renderSubsection("Research", renderList(knowledge.research)),
    renderSubsection("Decisions", renderList(knowledge.decisions))
  ].join("");
  const body = [
    renderSubsection("Objective", present(overview.objective) ? `<p>${escapeHtml(overview.objective)}</p>` : ""),
    renderSubsection("Progress", renderProgress(attention.targets, entity.progress || overview.current_position)),
    renderSubsection("Blocker", present(blocker) ? `<p>${escapeHtml(blocker)}</p>` : "", { accent: true }),
    renderSubsection("This week", renderChecklist(attention.targets)),
    knowledgeContent ? `<details class="entity-secondary"><summary>Knowledge and decisions</summary>${knowledgeContent}</details>` : ""
  ].join("");
  return renderShell(entity, index, {
    meta: renderMeta([["Department", entity.department], ["Owner", resolveLabel(entity.owner, labels)], ["Updated", attention.last_meaningful_update]]),
    body
  });
}

export function renderWorkItemCard(entity, index, labels) {
  const notes = entity.notes || {};
  const body = [
    renderSubsection("Progress", present(entity.progress) ? `<p>${escapeHtml(entity.progress)}</p>` : ""),
    renderSubsection("Completion", present(notes.completion_summary) ? `<p>${escapeHtml(notes.completion_summary)}</p>` : ""),
    renderSubsection("Blocker", present(notes.blocker) ? `<p>${escapeHtml(notes.blocker)}</p>` : "", { accent: true }),
    renderSubsection("Next action", present(notes.next_action) ? `<p>${escapeHtml(notes.next_action)}</p>` : ""),
    renderSubsection("Missing information", renderList(notes.missing)),
    renderFacts([["Completed", entity.completed_at], ["Processed", typeof entity.processed === "boolean" ? (entity.processed ? "Yes" : "No") : null]])
  ].join("");
  return renderShell(entity, index, {
    meta: renderMeta([["Priority", entity.priority], ["Due", entity.due], ["Owner", resolveLabel(entity.owner, labels)], ["Project", resolveLabel(entity.project, labels)]]),
    body
  });
}

export function renderPersonCard(entity, index, labels, relatedEntities = []) {
  const activeProjects = relatedEntities.filter((row) => row.entity_type === "projects" && row.owner === entity.id);
  const activeWork = relatedEntities.filter((row) => row.entity_type === "work_items" && row.owner === entity.id);
  const body = [
    renderSubsection("Active projects", renderList(activeProjects.map((row) => `${row.name}${row.status ? ` · ${row.status}` : ""}`))),
    renderSubsection("Active work", renderList(activeWork.map((row) => `${row.id} · ${row.name}`)))
  ].join("");
  return renderShell(entity, index, {
    meta: renderMeta([["Role", entity.role], ["Department", entity.department]]),
    body
  });
}

export function renderMeetingCard(entity, index, labels) {
  const decision = entity.decision || {};
  const problem = entity.problem || {};
  const followUp = entity.follow_up || {};
  const commitments = asArray(entity.commitments).map((item) => `${resolveLabel(item.person_id, labels)} — ${item.action}${item.due_date ? ` · due ${item.due_date}` : ""}`);
  const normalized = { ...entity, status: entity.completed_at ? "Complete" : entity.status };
  const body = [
    renderSubsection("Purpose", present(entity.purpose) ? `<p>${escapeHtml(entity.purpose)}</p>` : ""),
    renderSubsection("Problem", present(problem.cause) ? `<p>${escapeHtml(problem.cause)}</p>` : "", { accent: true }),
    renderSubsection("Decision", present(decision.summary) ? `<p>${escapeHtml(decision.summary)}</p>` : ""),
    renderSubsection("Commitments", renderList(commitments)),
    renderSubsection("Follow-up", present(followUp.next_action) ? `<p>${escapeHtml(followUp.next_action)}</p>` : "")
  ].join("");
  return renderShell(normalized, index, {
    meta: renderMeta([["Date", entity.date], ["Facilitator", entity.facilitator], ["Attendees", asArray(entity.attendees).join(", ")], ["Project", resolveLabel(entity.project, labels)]]),
    body
  });
}

function reportSectionCount(section) {
  if (!section) return 0;
  if (Array.isArray(section)) return section.length;
  if (Array.isArray(section.items)) return section.items.length;
  return present(section.text) ? 1 : 0;
}

function renderReportSections(sections) {
  return Object.entries(sections || {}).filter(([name]) => name !== "Automation receipt").map(([name, section], index) => {
    const content = section?.text ? `<p>${escapeHtml(section.text)}</p>` : renderList(section?.items || section);
    return content ? `<details class="report-section"${index === 0 ? " open" : ""}><summary><span>${escapeHtml(name)}</span><small>${reportSectionCount(section)}</small></summary>${content}</details>` : "";
  }).join("");
}

export function renderReportCard(entity, index, labels) {
  const sections = entity.sections || {};
  const attention = sections["PM attention"] || sections["Outcomes and open attention"];
  const body = [
    renderSubsection("PM attention", attention?.text ? `<p>${escapeHtml(attention.text)}</p>` : renderList(attention?.items), { accent: true }),
    `<div class="report-counts">
      <span>${reportSectionCount(sections["Problems and inefficiencies"])} Problems</span>
      <span>${reportSectionCount(sections.Decisions)} Decisions</span>
      <span>${reportSectionCount(sections.SOPs)} SOPs</span>
      <span>${reportSectionCount(sections["Next-week priorities"])} Next-week</span>
    </div>`,
    renderReportSections(sections)
  ].join("");
  return renderShell(entity, index, {
    meta: renderMeta([["Week", entity.week_start], ["Version", entity.version], ["Project", resolveLabel(entity.project, labels)], ["Finalized", entity.finalized_at]]),
    body
  });
}

const ENTITY_RENDERERS = {
  projects: renderProjectCard,
  work_items: renderWorkItemCard,
  people: renderPersonCard,
  meetings: renderMeetingCard,
  reports: renderReportCard
};

export function renderEntityCard(entity, index, { labels = {}, relatedEntities = [] } = {}) {
  const renderer = ENTITY_RENDERERS[entity.entity_type];
  return renderer
    ? renderer(entity, index, labels, relatedEntities)
    : renderShell(entity, index, { body: renderFacts(Object.entries(entity).filter(([key]) => !["id", "name", "entity_type"].includes(key))) });
}
