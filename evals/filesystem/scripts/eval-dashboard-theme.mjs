export const dashboardStyles = String.raw`
:root {
  --bg: #060606;
  --panel: #0d0d0d;
  --row: #111111;
  --row-alt: #0b0b0b;
  --line: #272727;
  --line-strong: #3a3a3a;
  --ink: #d0d0ca;
  --muted: #777772;
  --pastel-peach: #f2ceb0;
  --pastel-lavender: #cec7ed;
  --pastel-mint: #b9ddcb;
  --pastel-pink: #e8b7c5;
  --pastel-yellow: #ead99d;
  --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

* { box-sizing: border-box; scrollbar-color: #343434 #090909; scrollbar-width: thin; }
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-track { background: #090909; }
*::-webkit-scrollbar-thumb { border: 2px solid #090909; background: #343434; }
*::-webkit-scrollbar-thumb:hover { background: #484848; }
html, body { height: 100%; }
body { margin: 0; overflow: hidden; background: var(--bg); color: var(--ink); font: 12px/1.45 var(--mono); }
button { font: inherit; color: inherit; }
button:focus-visible, summary:focus-visible, a:focus-visible { outline: 1px solid var(--pastel-lavender); outline-offset: 2px; }

.shell { height: 100%; padding: 18px 22px; display: grid; grid-template-rows: 48px minmax(0, 1fr); gap: 10px; }
.topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 12px; border: 1px solid var(--line); background: var(--panel); }
.topbar h1 { margin: 0; flex: 0 1 auto; font-size: 12px; font-weight: 500; letter-spacing: .04em; text-transform: lowercase; }
.metrics { display: flex; align-items: center; justify-content: flex-end; gap: 6px; color: var(--muted); font-size: 9px; }
.metric-pill, .meta-pill, .group-pill { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
.metric-pill { padding: 4px 7px; border: 1px solid var(--line); border-radius: 999px; background: #111; color: #aaa9a3; }
.meta-pill { min-height: 22px; padding: 3px 7px; border: 1px solid var(--line); border-radius: 999px; color: #a7a7a1; }
.group-pill { padding: 3px 6px; border: 1px solid var(--line); border-radius: 999px; color: var(--muted); font-size: 8px; font-weight: 500; }
.run-date { margin-left: 2px; color: var(--muted); white-space: nowrap; }

.pastel-square { display: inline-block; width: 12px; height: 12px; flex: 0 0 12px; border: 1px solid rgba(255, 255, 255, .16); }
.tone-peach { background: var(--pastel-peach); }
.tone-lavender { background: var(--pastel-lavender); }
.tone-mint { background: var(--pastel-mint); }
.tone-pink { background: var(--pastel-pink); }
.tone-yellow { background: var(--pastel-yellow); }
.metric-square, .meta-square { width: 8px; height: 8px; flex-basis: 8px; border: 0; }
.feature-square, .title-square { width: 14px; height: 14px; flex-basis: 14px; }
.case-square { width: 11px; height: 11px; flex-basis: 11px; opacity: .8; }
.entity-square, .check-square { width: 10px; height: 10px; flex-basis: 10px; }

.workspace { min-height: 0; display: grid; grid-template-columns: minmax(0, 62fr) minmax(340px, 38fr); gap: 10px; }
.list-panel, .inspector { min-height: 0; border: 1px solid var(--line); background: var(--panel); }
.list-panel { overflow: auto; }
.list-head { position: sticky; top: 0; z-index: 4; display: grid; grid-template-columns: 1fr 90px; padding: 8px 11px; border-bottom: 1px solid var(--line); background: #0a0a0a; color: var(--muted); font-size: 9px; text-transform: lowercase; }
.feature-group { border-bottom: 1px solid var(--line); }
.feature-toggle { position: sticky; top: 31px; z-index: 3; width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 11px; border: 0; border-bottom: 1px solid var(--line); background: #0b0b0b; text-align: left; cursor: pointer; }
.feature-toggle:hover { background: #101010; }
.feature-label { min-width: 0; display: flex; align-items: center; gap: 8px; font-weight: 700; }
.feature-label > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.toggle-glyph { width: 8px; color: var(--muted); font-size: 8px; }

.case-row { position: relative; width: 100%; min-height: 66px; display: grid; grid-template-columns: 3px 11px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 9px 11px 9px 0; border: 0; border-bottom: 1px solid #1c1c1c; background: var(--row); text-align: left; cursor: pointer; }
.case-row:nth-child(even) { background: var(--row-alt); }
.case-row:hover, .case-row.selected { outline: 1px solid var(--line-strong); outline-offset: -1px; background: #151515; }
.rail { align-self: stretch; background: transparent; }
.case-row.selected .rail { background: currentColor; }
.feature-group[data-tone="peach"] .case-row.selected { color: var(--pastel-peach); }
.feature-group[data-tone="lavender"] .case-row.selected { color: var(--pastel-lavender); }
.feature-group[data-tone="mint"] .case-row.selected { color: var(--pastel-mint); }
.feature-group[data-tone="pink"] .case-row.selected { color: var(--pastel-pink); }
.feature-group[data-tone="yellow"] .case-row.selected { color: var(--pastel-yellow); }
.case-copy { min-width: 0; color: var(--ink); }
.case-copy b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; }
.case-copy small { display: block; margin-top: 5px; overflow: hidden; color: var(--muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.status-pill { min-width: 54px; padding: 3px 6px; border-radius: 2px; color: #171714; font-size: 8px; font-weight: 800; letter-spacing: .06em; text-align: center; }
.status-pill.passed { background: var(--pastel-mint); }
.status-pill.failed { background: var(--pastel-pink); }
.status-pill.blocked { background: var(--pastel-yellow); }
.status-pill.not-run { background: var(--pastel-lavender); }

.inspector { overflow: auto; }
.inspector-head { position: sticky; top: 0; z-index: 3; display: flex; justify-content: space-between; gap: 12px; padding: 12px; border-bottom: 1px solid var(--line); background: #0a0a0a; }
.inspector-heading { min-width: 0; }
.inspector .kicker { margin: 0 0 5px; overflow: hidden; color: var(--muted); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.inspector-title-row { display: flex; align-items: center; gap: 8px; }
.inspector h2 { min-width: 0; margin: 0; overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.close { border: 0; background: transparent; color: var(--muted); font-size: 18px; cursor: pointer; }
.inspector-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; margin: 11px 12px 0; }
.inspector > .prompt { margin: 9px 12px 12px; color: #a4a4a0; }
.inspector section { margin: 0; padding: 12px; border-top: 1px solid var(--line); }
.inspector h3 { margin: 0 0 8px; color: #92928e; font-size: 9px; letter-spacing: .08em; text-transform: uppercase; }
.inspector p { margin: 7px 0; }
.example, .falsifier { padding: 8px; border-left: 2px solid var(--line-strong); color: #a6a6a2; }
.falsifier b { display: block; margin-bottom: 3px; color: var(--pastel-yellow); font-size: 9px; text-transform: uppercase; }
.inspector ul { margin: 7px 0; padding-left: 17px; }
.inspector li { margin: 6px 0; }
.json-block { margin: 7px 0 0; overflow: hidden; border: 1px solid var(--line); background: #080808; }
.json-block-head { min-height: 25px; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 5px 8px; border-bottom: 1px solid var(--line); background: #0c0c0c; color: var(--pastel-lavender); font-size: 8px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.json-block-head span:last-child { color: var(--muted); font-weight: 500; letter-spacing: .03em; text-transform: lowercase; }
.json-block pre { max-height: 320px; margin: 0; padding: 9px; overflow: auto; color: #b7b7b2; font: 9px/1.55 var(--mono); font-variant-ligatures: none; overflow-wrap: anywhere; white-space: pre-wrap; }
.json-key { color: var(--pastel-lavender); }
.json-string { color: var(--pastel-mint); }
.json-number { color: var(--pastel-yellow); }
.json-boolean { color: var(--pastel-pink); }
.json-null { color: var(--muted); font-style: italic; }
.entity { margin-top: 7px; border: 1px solid var(--line); background: #0a0a0a; }
.entity summary, .technical summary { padding: 7px 8px; cursor: pointer; }
.entity-card > summary { min-height: 42px; display: grid; grid-template-columns: 10px minmax(0, 1fr) auto; gap: 9px; align-items: center; background: #101010; }
.entity-card[open] > summary { border-bottom: 1px solid var(--line); }
.entity-card > summary:hover { background: #141414; }
.entity-identity { min-width: 0; display: flex; align-items: baseline; gap: 8px; }
.entity-identity b, .entity-identity span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.entity-identity b { color: #deded8; font-size: 10px; }
.entity-identity span { color: #aaa9a4; }
.entity-state { padding: 3px 6px; border: 1px solid var(--line-strong); color: #b7b7b1; font-size: 8px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; }
.state-at-risk, .state-blocked { border-color: #766d47; color: var(--pastel-yellow); }
.state-done, .state-final, .state-complete, .state-on-track { border-color: #426152; color: var(--pastel-mint); }
.entity-card-body { min-width: 0; }
.entity-meta { display: flex; flex-wrap: wrap; gap: 0; border-bottom: 1px solid var(--line); color: #aaa9a4; }
.entity-meta span { padding: 6px 9px; border-right: 1px solid var(--line); }
.entity-meta b { margin-right: 5px; color: var(--muted); font-size: 8px; font-weight: 600; text-transform: uppercase; }
.entity-card .entity-section { margin: 0; padding: 8px 10px; border: 0; border-bottom: 1px solid #202020; }
.entity-card .entity-section h4 { margin: 0 0 4px; color: var(--muted); font-size: 8px; letter-spacing: .08em; text-transform: uppercase; }
.entity-card .entity-section p { margin: 0; color: #c0c0ba; }
.entity-card .entity-section-accent { border-left: 2px solid var(--pastel-yellow); background: #0d0d0b; }
.entity-progress p { margin-bottom: 7px !important; }
.progress-track { height: 4px; overflow: hidden; background: #292925; }
.progress-track span { display: block; height: 100%; background: var(--pastel-peach); }
.entity-progress small { display: block; margin-top: 4px; color: var(--muted); font-size: 8px; }
.entity-list, .entity-checklist { margin: 0 !important; padding: 0 !important; list-style: none; }
.entity-list li { margin: 0 !important; padding: 4px 0; border-bottom: 1px solid #1f1f1f; }
.entity-list li:last-child { border-bottom: 0; }
.entity-checklist li { display: grid; grid-template-columns: 16px minmax(0, 1fr); gap: 7px; margin: 0 !important; padding: 5px 0; border-bottom: 1px solid #1f1f1f; }
.entity-checklist li:last-child { border-bottom: 0; }
.entity-checklist li > span:first-child { width: 14px; height: 14px; border: 1px solid #55554f; color: #111; font-size: 9px; line-height: 12px; text-align: center; }
.entity-checklist li.complete > span:first-child { border-color: var(--pastel-mint); background: var(--pastel-mint); }
.entity-checklist li.complete > span:last-child { color: var(--muted); text-decoration: line-through; }
.entity-facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; margin: 0; background: var(--line); }
.entity-facts div { padding: 7px 9px; background: #0b0b0b; }
.entity-facts dt { color: var(--muted); font-size: 8px; text-transform: uppercase; }
.entity-facts dd { margin: 3px 0 0; overflow-wrap: anywhere; }
.entity-secondary, .report-section, .raw-entity-data { border-top: 1px solid var(--line); }
.entity-secondary > summary, .report-section > summary, .raw-entity-data > summary { padding: 7px 9px; color: #a9a9a3; font-size: 9px; }
.entity-secondary > summary, .raw-entity-data > summary { color: var(--pastel-lavender); }
.report-counts { display: flex; flex-wrap: wrap; gap: 5px; padding: 8px 9px; border-bottom: 1px solid var(--line); }
.report-counts span { padding: 3px 6px; border: 1px solid var(--line); color: #aaa9a4; font-size: 8px; }
.report-section > summary { display: flex; justify-content: space-between; gap: 10px; }
.report-section > summary small { color: var(--muted); }
.report-section > p, .report-section > .entity-list { margin: 0 !important; padding: 8px 10px !important; border-top: 1px solid #1f1f1f; }
.raw-entity-data > .json-block { margin: 0; border: 0; border-top: 1px solid var(--line); }
.check-list { padding: 0 !important; list-style: none; }
.check-list li { display: grid; grid-template-columns: 10px 1fr; gap: 8px; align-items: start; }
.check-list small { display: block; margin-top: 3px; color: var(--muted); font-size: 8px; }
.technical { margin: 0; border-top: 1px solid var(--line); background: #090909; }
.technical dl { display: grid; grid-template-columns: 86px 1fr; gap: 5px; margin: 0; padding: 9px; border-top: 1px solid var(--line); font-size: 9px; }
.technical dt { color: var(--muted); }
.technical dd { margin: 0; overflow-wrap: anywhere; }
.technical > .json-block { margin: 0 9px 9px; }
.evidence-links { display: flex; flex-wrap: wrap; gap: 5px; padding: 0 9px 8px; }
.evidence-links a { padding: 4px 6px; border: 1px solid var(--line); color: #b8b8b2; font-size: 9px; text-decoration: none; }
.hidden { display: none !important; }
.empty { display: none; place-items: center; color: var(--muted); }

@media (max-width: 900px) {
  body { overflow: auto; }
  body.inspector-open { overflow: hidden; }
  .shell { height: auto; min-height: 100%; padding: 10px; grid-template-rows: auto minmax(calc(100vh - 92px), auto); }
  .topbar { min-width: 0; min-height: 54px; padding: 8px 10px; overflow: hidden; }
  .metrics { flex-wrap: wrap; }
  .metric-pill { padding: 3px 6px; }
  .run-date { width: 100%; text-align: right; }
  .workspace { display: block; min-width: 0; max-width: 100%; }
  .list-panel { width: 100%; min-width: 0; max-width: 100%; min-height: calc(100vh - 92px); overflow-x: hidden; }
  body.inspector-open .list-panel { overflow: hidden; }
  .feature-group, .case-rows, .feature-toggle, .case-row { min-width: 0; max-width: 100%; }
  .inspector { position: fixed; inset: 0; z-index: 20; display: none; border: 0; }
  .inspector.open { display: block; }
  .close { position: sticky; display: block; }
  .feature-toggle { top: 31px; }
}

@media (max-width: 560px) {
  .topbar { align-items: flex-start; flex-direction: column; gap: 7px; }
  .metrics { justify-content: flex-start; }
  .run-date { width: auto; text-align: left; }
  .case-row { grid-template-columns: 3px 11px minmax(0, 1fr) 54px; gap: 8px; }
  .feature-label > span:last-child { max-width: calc(100vw - 145px); }
}

@media (min-width: 901px) {
  .close { display: none; }
  .empty.visible { display: grid; }
  .inspector.closed { display: none; }
  .workspace:has(.inspector.closed) { grid-template-columns: 1fr 0; }
  .workspace:has(.inspector.closed) .empty { display: grid; }
}
`;
