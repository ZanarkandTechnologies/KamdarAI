const TONES = ["peach", "lavender", "mint", "pink", "yellow"];

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

export function pretty(value) {
  return JSON.stringify(value, null, 2);
}

export function highlightJson(value) {
  const json = pretty(value) ?? "null";
  const tokenPattern = /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|\b(true|false)\b|\b(null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g;
  let output = "";
  let cursor = 0;
  for (const match of json.matchAll(tokenPattern)) {
    output += escapeHtml(json.slice(cursor, match.index));
    const token = match[0];
    const tokenClass = match[1]
      ? "json-key"
      : match[2]
        ? "json-string"
        : match[3]
          ? "json-boolean"
          : match[4]
            ? "json-null"
            : "json-number";
    output += `<span class="${tokenClass}">${escapeHtml(token)}</span>`;
    cursor = match.index + token.length;
  }
  return output + escapeHtml(json.slice(cursor));
}

export function renderJsonBlock(value, label = "JSON") {
  return `<div class="json-block"><div class="json-block-head"><span>${escapeHtml(label)}</span><span>structured data</span></div><pre><code>${highlightJson(value)}</code></pre></div>`;
}

export function statusClass(status) {
  return String(status).toLowerCase().replaceAll(" ", "-");
}

export function toneFor(index) {
  return TONES[index % TONES.length];
}

export function renderPastelSquare(tone, className = "") {
  return `<span class="pastel-square tone-${escapeHtml(tone)}${className ? ` ${escapeHtml(className)}` : ""}" aria-hidden="true"></span>`;
}

export function renderStatusPill(status) {
  return `<span class="status-pill ${statusClass(status)}">${escapeHtml(status)}</span>`;
}

export function renderMetricPill(value, tone) {
  return `<span class="metric-pill">${renderPastelSquare(tone, "metric-square")}<span>${escapeHtml(value)}</span></span>`;
}
