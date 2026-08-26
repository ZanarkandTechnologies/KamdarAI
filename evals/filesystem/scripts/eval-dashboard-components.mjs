import { renderEntityCard } from "./eval-dashboard-entity-components.mjs";
import {
  escapeHtml,
  renderJsonBlock,
  renderMetricPill,
  renderPastelSquare,
  renderStatusPill,
  toneFor
} from "./eval-dashboard-primitives.mjs";

export {
  escapeHtml,
  highlightJson,
  pretty,
  renderJsonBlock,
  renderMetricPill,
  renderPastelSquare,
  renderStatusPill,
  statusClass,
  toneFor
} from "./eval-dashboard-primitives.mjs";

export function renderTopBar(model) {
  const secondary = model.presentation
    ? `${renderMetricPill(`${model.totals.cases} scenarios`, "lavender")}`
    : `${renderMetricPill(`${model.totals.features} features`, "lavender")}${renderMetricPill(`${model.totals.checks} checks`, "peach")}`;
  return `<header class="topbar">
    <h1>${escapeHtml(model.title)}</h1>
    <div class="metrics" aria-label="Run summary">
      ${renderMetricPill(`${model.totals.statuses.PASSED}/${model.totals.cases} passed`, "mint")}
      ${secondary}
      <time class="run-date">${escapeHtml(model.presentation ? model.validated_label : model.evidence_window.local_day)}</time>
    </div>
  </header>`;
}

export function renderCaseRow(row, { selected, tone }) {
  return `<button class="case-row${selected ? " selected" : ""}" type="button" data-row="${escapeHtml(row.row_id)}">
    <span class="rail"></span>
    ${renderPastelSquare(tone, "case-square")}
    <span class="case-copy"><b>${escapeHtml(row.title)}</b><small>${escapeHtml(row.summary)}</small></span>
    ${renderStatusPill(row.status)}
  </button>`;
}

export function renderFeatureGroup(feature, { selectedRowId, featureIndex }) {
  const passed = feature.cases.filter((row) => row.status === "PASSED").length;
  const tone = toneFor(featureIndex);
  return `<section class="feature-group" data-feature="${escapeHtml(feature.suite_id)}" data-tone="${tone}">
    <button class="feature-toggle" type="button" aria-expanded="true">
      <span class="feature-label"><span class="toggle-glyph" aria-hidden="true">▼</span>${renderPastelSquare(tone, "feature-square")}<span>${escapeHtml(feature.title)}</span></span>
      <span class="group-pill">${passed}/${feature.cases.length} passed</span>
    </button>
    <div class="case-rows">${feature.cases.map((row) => renderCaseRow(row, { selected: selectedRowId === row.row_id, tone })).join("")}</div>
  </section>`;
}

export function renderEntityDisclosure(entity, index) {
  return renderEntityCard(entity, index);
}

export function renderCheckRow(check, showEvidence = false) {
  const tone = check.met ? "mint" : "pink";
  const evidence = showEvidence && check.evidence?.length
    ? `<small><b>Evidence</b>${escapeHtml(check.evidence.join(" · "))}</small>`
    : `<small><b>Evidence</b>${check.met ? "No supporting excerpt was returned." : "The agent output did not satisfy this criterion."}</small>`;
  return `<li class="${check.met ? "check-pass" : "check-fail"}">${renderPastelSquare(tone, "check-square")}<div class="check-content"><div class="check-heading"><span>${escapeHtml(check.assertion)}</span><strong>${check.met ? "MET" : "MISSED"}</strong></div>${showEvidence ? evidence : ""}</div></li>`;
}

export function renderQualityGrades(metrics, presentation = false) {
  return `<div class="quality-grade-block"><h4>${presentation ? "Answer quality" : "Quality grades"}</h4><div class="quality-grid">${metrics.map((metric) => {
    const isCompleteness = metric.key === "completeness";
    const grade = isCompleteness && metric.score !== null ? `${metric.score}%` : metric.grade || "—";
    const gradeClass = metric.grade ? `grade-${metric.grade.toLowerCase()}` : "grade-unscored";
    const detail = isCompleteness && metric.score !== null
      ? `<small>${metric.matched}/${metric.total} expected criteria found</small>`
      : metric.grade ? "" : "<small>Not evaluated</small>";
    return `<div class="quality-card ${gradeClass}"><strong>${escapeHtml(grade)}</strong><span>${escapeHtml(metric.label)}</span>${detail}</div>`;
  }).join("")}</div></div>`;
}

export function renderProjectUpdate(output, rowId, presentation = false) {
  const combined = output.sections.map((section) => `## ${section.section}\n\n${section.replacement_text || "No update supplied."}`).join("\n\n");
  return `<div class="rendered-output">
    <div class="output-summary">
      <div><span>Target</span><b>${escapeHtml(output.target_label)}</b>${output.target_id ? `<small>${escapeHtml(output.target_id)}</small>` : ""}</div>
      <div><span>Delivery</span><b>${escapeHtml(output.delivery_state)}</b></div>
      <div><span>Read-back</span><b>${escapeHtml(output.read_back_state)}</b></div>
    </div>
    ${output.change_summary ? `<p class="change-summary">${escapeHtml(output.change_summary)}</p>` : ""}
    <article class="replacement-card combined-agent-output"><h5>Agent output</h5><pre>${escapeHtml(combined)}</pre></article>
  </div>`;
}

function renderInlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function markdownCells(line) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function renderBusinessMarkdown(value) {
  const lines = String(value).replaceAll("\r\n", "\n").split("\n");
  if (lines[0]?.trim() === "---") {
    const end = lines.slice(1).findIndex((line) => line.trim() === "---");
    if (end >= 0) lines.splice(0, end + 2);
  }
  const blocks = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      const level = Math.min(6, heading[1].length + 3);
      blocks.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }
    if (line.includes("|") && /^\|?\s*:?-+/.test(lines[index + 1]?.trim() || "")) {
      const headers = markdownCells(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].trim().includes("|")) rows.push(markdownCells(lines[index++]));
      blocks.push(`<div class="business-table"><table><thead><tr>${headers.map((cell) => `<th>${renderInlineMarkdown(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${renderInlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^-\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^-\s+/.test(lines[index].trim())) items.push(lines[index++].trim().replace(/^-\s+/, ""));
      blocks.push(`<ul>${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }
    const paragraph = [];
    while (index < lines.length) {
      const candidate = lines[index].trim();
      if (!candidate || /^(#{1,6})\s+/.test(candidate) || /^-\s+/.test(candidate)
        || (candidate.includes("|") && /^\|?\s*:?-+/.test(lines[index + 1]?.trim() || ""))) break;
      paragraph.push(candidate);
      index += 1;
    }
    blocks.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
  }
  return `<div class="business-document">${blocks.join("")}</div>`;
}

function renderTextOutput(output, presentation = false) {
  const body = output.body ? (presentation ? renderBusinessMarkdown(output.body) : `<pre>${escapeHtml(output.body)}</pre>`) : "";
  const entries = output.entries?.map((entry) => `<section><h5>${escapeHtml(entry.label)}</h5>${presentation ? renderBusinessMarkdown(entry.body) : `<pre>${escapeHtml(entry.body)}</pre>`}</section>`).join("") || "";
  return `<article class="typed-output ${escapeHtml(output.kind)}"><header><div><span>${escapeHtml(output.heading)}</span><b>${escapeHtml(output.target_label)}</b></div><strong>${escapeHtml(output.state)}</strong></header>${output.meta?.length ? `<div class="output-meta">${output.meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}${output.summary ? `<p>${escapeHtml(output.summary)}</p>` : ""}${body}${entries}${output.note ? `<p>${escapeHtml(output.note)}</p>` : ""}${output.gaps?.length ? `<ul>${output.gaps.map((gap) => `<li>${escapeHtml(gap)}</li>`).join("")}</ul>` : ""}</article>`;
}

export function renderTypedOutput(output, rowId, index = 0, presentation = false) {
  return output.kind === "project-section-replacements"
    ? renderProjectUpdate(output, `${rowId}-${index}`, presentation)
    : renderTextOutput(output, presentation);
}

function renderObservedFacts(facts) {
  return facts.length ? `<ul class="observed-list">${facts.map((fact) => `<li><b>${escapeHtml(fact.label)}</b><span>${escapeHtml(fact.state)}</span>${fact.reason ? `<small>${escapeHtml(fact.reason)}</small>` : ""}</li>`).join("")}</ul>` : "";
}

export function renderInspector(row, feature, featureIndex) {
  const featureTone = toneFor(featureIndex);
  const requiredChecks = [...row.result.required_checks].sort((left, right) => Number(left.met) - Number(right.met));
  const completion = row.result.required_summary;
  const technical = row.presentation ? "" : `<details class="technical"><summary>Technical proof</summary><dl><dt>Features</dt><dd>${escapeHtml(row.technical.feature_ids.join(", "))}</dd><dt>Gates</dt><dd>${escapeHtml(row.technical.integration_gate_ids.join(", ") || "None")}</dd><dt>Result paths</dt><dd>${escapeHtml(row.technical.result_paths.join(", "))}</dd><dt>Output file</dt><dd>${escapeHtml(row.technical.review_result_path)}</dd><dt>Judges</dt><dd>${escapeHtml(row.technical.judge_paths.join(", "))}</dd><dt>Quality review</dt><dd>${escapeHtml(row.technical.quality_review_path || "Not available")}</dd><dt>Receipt</dt><dd>${escapeHtml(row.technical.receipt_path)}</dd><dt>Integration checks</dt><dd>${escapeHtml(row.technical.integration_path)}</dd></dl>${row.technical.urls.length ? `<div class="evidence-links">${row.technical.urls.map((url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Open evidence ↗</a>`).join("")}</div>` : ""}${renderJsonBlock(row.result.checks, "All check evidence")}${renderJsonBlock(row.observed.result_slices, "Result slices")}${renderJsonBlock(row.technical.receipt_rows, "Receipt JSON")}</details>`;
  const outputViews = row.observed.output_views || (row.observed.output_view ? [row.observed.output_view] : []);
  const renderedOutput = outputViews.length
    ? outputViews.map((output, index) => renderTypedOutput(output, row.row_id, index, row.presentation)).join("")
    : renderObservedFacts(row.observed.facts);
  return `<div class="inspector-head">
    <div class="inspector-heading">
      <p class="kicker">${escapeHtml(feature.title)}</p>
      <div class="inspector-title-row">${renderPastelSquare(featureTone, "title-square")}<h2>${escapeHtml(row.title)}</h2></div>
    </div>
    <button class="close" type="button" aria-label="Close details">×</button>
  </div>
  <div class="inspector-meta">
    ${renderStatusPill(row.status)}
    ${row.tags.map((tag) => `<span class="meta-pill">${renderPastelSquare(featureTone, "meta-square")}${escapeHtml(tag)}</span>`).join("")}
  </div>
  <section><h3>Task</h3><p>${escapeHtml(row.when)}</p></section>
  <section><h3>Source input</h3><p>${escapeHtml(row.given)}</p>${row.starting_entities.map((entity, index) => renderEntityCard(entity, index, { labels: row.entity_labels, relatedEntities: row.starting_entities })).join("")}</section>
  <section class="evaluation-section"><h3>Assertion review</h3><div class="evaluation-workbench">
    <div class="evaluation-output"><header><b>Actual agent output</b><span>The generated file content being judged</span></header>${renderedOutput}</div>
    <div class="evaluation-criteria"><header><b>Expected criteria</b><span>${completion.passed}/${completion.total} found in the agent output</span></header><p class="expected-summary">${escapeHtml(row.expected.summary)}</p><ul class="check-list">${requiredChecks.map((check) => renderCheckRow(check, row.presentation)).join("")}</ul></div>
  </div></section>
  <section class="quality-section"><h3>Quality gates</h3><div class="result-summary">${renderStatusPill(row.result.status)}<div><b>${completion.total ? Math.round((completion.passed / completion.total) * 100) : 0}% complete · ${completion.passed} of ${completion.total} expected criteria found</b><p>${escapeHtml(row.result.reason)}</p></div></div>${renderQualityGrades(row.result.quality_metrics, row.presentation)}${row.result.artifact_quality?.findings?.length ? `<div class="quality-findings"><h4>${row.presentation ? "File review" : "Artifact review"}</h4><ul>${row.result.artifact_quality.findings.map((finding) => `<li>${escapeHtml(finding)}</li>`).join("")}</ul></div>` : ""}</section>
  ${technical}`;
}
