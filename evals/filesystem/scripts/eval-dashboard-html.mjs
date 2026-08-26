import {
  escapeHtml,
  renderFeatureGroup,
  renderInspector,
  renderTopBar
} from "./eval-dashboard-components.mjs";
import { dashboardClientScript } from "./eval-dashboard-client.mjs";
import { dashboardStyles } from "./eval-dashboard-theme.mjs";

/** Render a self-contained dashboard from normalized eval data. */
export function renderEvalDashboardHtml(model) {
  const rows = model.groups.flatMap((feature, featureIndex) =>
    feature.cases.map((row) => ({ row, feature, featureIndex }))
  );
  if (!rows.length) throw new Error("Dashboard model has no case rows");

  const selectedRowId = rows[0].row.row_id;
  const groups = model.groups
    .map((feature, featureIndex) => renderFeatureGroup(feature, { selectedRowId, featureIndex }))
    .join("");
  const templates = rows
    .map(({ row, feature, featureIndex }) => `<template id="panel-${escapeHtml(row.row_id)}">${renderInspector(row, feature, featureIndex)}</template>`)
    .join("");
  const escapedModel = JSON.stringify(model).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(model.title)}</title>
  <style>${dashboardStyles}</style>
</head>
<body>
  <main class="shell">
    ${renderTopBar(model)}
    <div class="workspace">
      <section class="list-panel">
        <div class="list-head"><span>scenarios · grouped by workflow</span><span>result</span></div>
        ${groups}
      </section>
      <aside class="inspector" aria-live="polite">${renderInspector(rows[0].row, rows[0].feature, rows[0].featureIndex)}</aside>
      <div class="empty">Select a test case</div>
    </div>
  </main>
  ${templates}
  <script type="application/json" id="dashboard-model">${escapedModel}</script>
  <script>${dashboardClientScript}</script>
</body>
</html>`;
}
