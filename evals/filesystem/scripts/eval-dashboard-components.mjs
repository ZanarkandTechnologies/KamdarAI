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
  return `<header class="topbar">
    <h1>${escapeHtml(model.title)}</h1>
    <div class="metrics" aria-label="Run summary">
      ${renderMetricPill(`${model.totals.statuses.PASSED}/${model.totals.cases} passed`, "mint")}
      ${renderMetricPill(`${model.totals.features} features`, "lavender")}
      ${renderMetricPill(`${model.totals.checks} checks`, "peach")}
      <time class="run-date">${escapeHtml(model.evidence_window.local_day)}</time>
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
  return `<section class="feature-group" data-feature="${escapeHtml(feature.feature_id)}" data-tone="${tone}">
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

export function renderCheckRow(check) {
  const tone = check.met ? "mint" : "pink";
  return `<li class="${check.met ? "check-pass" : "check-fail"}">${renderPastelSquare(tone, "check-square")}<span>${escapeHtml(check.assertion)}<small>${escapeHtml(check.evidence.join(" · "))}</small></span></li>`;
}

export function renderInspector(row, feature, featureIndex) {
  const expected = [...row.expected.feature_assertions, ...row.expected.case_assertions];
  const featureTone = toneFor(featureIndex);
  return `<div class="inspector-head">
    <div class="inspector-heading">
      <p class="kicker">${escapeHtml(feature.title)}</p>
      <div class="inspector-title-row">${renderPastelSquare(featureTone, "title-square")}<h2>${escapeHtml(row.title)}</h2></div>
    </div>
    <button class="close" type="button" aria-label="Close details">×</button>
  </div>
  <div class="inspector-meta">
    ${renderStatusPill(row.status)}
    ${feature.category ? `<span class="meta-pill">${renderPastelSquare(featureTone, "meta-square")}${escapeHtml(feature.category)}</span>` : ""}
    <span class="meta-pill">tier ${escapeHtml(row.technical.tier)}</span>
  </div>
  <p class="prompt">${escapeHtml(row.prompt)}</p>
  <section><h3>Why we test this</h3><p>${escapeHtml(feature.purpose)}</p>${feature.example ? `<p class="example">${escapeHtml(feature.example)}</p>` : ""}</section>
  <section><h3>Starting data</h3>${row.starting_entities.map((entity, index) => renderEntityCard(entity, index, { labels: row.entity_labels, relatedEntities: row.starting_entities })).join("")}</section>
  <section><h3>Expected result</h3><p>${escapeHtml(row.expected.claim)}</p><ul>${expected.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>${row.expected.falsifier ? `<p class="falsifier"><b>Failure signal</b>${escapeHtml(row.expected.falsifier)}</p>` : ""}</section>
  <section><h3>Actual result</h3>${renderJsonBlock(row.actual)}</section>
  <section><h3>Checks</h3><ul class="check-list">${row.checks.map(renderCheckRow).join("")}</ul></section>
  <details class="technical"><summary>Technical evidence</summary><dl><dt>Tier</dt><dd>${escapeHtml(row.technical.tier)}</dd><dt>Result path</dt><dd>${escapeHtml(row.technical.result_path)}</dd><dt>Review result</dt><dd>${escapeHtml(row.technical.review_result_path)}</dd><dt>Judge</dt><dd>${escapeHtml(row.technical.judge_path)}</dd><dt>Receipt</dt><dd>${escapeHtml(row.technical.receipt_path)}</dd></dl>${row.technical.urls.length ? `<div class="evidence-links">${row.technical.urls.map((url) => `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">Open evidence ↗</a>`).join("")}</div>` : ""}${renderJsonBlock(row.technical.receipt_rows, "Receipt JSON")}</details>`;
}
