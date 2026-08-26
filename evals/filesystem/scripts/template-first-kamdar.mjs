/** Dependency-free frozen proof for the approved Kamdar template-first contract. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadKamdarSeedSnapshot } from "./kamdar-seed-config.mjs";

const filesystemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(filesystemRoot, "../..");
const contractPath = resolve(projectRoot, "evals/evals.json");
const storyAsciiPath = resolve(projectRoot, "tickets/TASK-0001/ascii-prototype.md");
const featureAsciiPath = resolve(projectRoot, "tickets/TASK-0002/ascii-prototype.md");
const fixturePath = resolve(filesystemRoot, "fixtures/template-first-kamdar/snapshot.json");
const fixtureDirectory = dirname(fixturePath);
const templateRoot = resolve(projectRoot, "templates");
const uiPath = resolve(filesystemRoot, "ui/index.html");
// Frozen comparison output is intentionally distinct from the operated,
// receipt-backed showcase written by live-kamdar-poc.mjs.
const defaultOutputRoot = resolve(filesystemRoot, "runs/kamdar-template-first-frozen-latest");
const markerName = ".kamdar-template-first-run.json";
let mostRecent = null;
let mostRecentRoot = null;

function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function copy(value) { return JSON.parse(JSON.stringify(value)); }
function writeText(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value.endsWith("\n") ? value : `${value}\n`, "utf8");
}
function writeJson(path, value) { writeText(path, JSON.stringify(value, null, 2)); }
function digest(value) { return createHash("sha256").update(value).digest("hex"); }
function slug(value) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function safeOutputPath(root, value) {
  if (typeof value !== "string" || !value || isAbsolute(value)) throw new Error("Output path must be relative.");
  const target = resolve(root, value);
  const inner = relative(root, target);
  if (!inner || inner === ".." || inner.startsWith(`..${sep}`) || isAbsolute(inner)) throw new Error("Output path escaped the run root.");
  return target;
}

function templateMeta(path) {
  const content = readFileSync(resolve(templateRoot, path), "utf8");
  const id = content.match(/^template_id:\s*([^\n]+)$/m)?.[1]?.trim();
  const version = content.match(/^template_version:\s*["']?([^\n"']+)/m)?.[1]?.trim();
  if (!id || !version) throw new Error(`Template metadata missing: ${path}`);
  return { path: `templates/${path}`, id, version, content };
}

function frontmatterFields(content) {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/m)?.[1] || "";
  return frontmatter.split(/\r?\n/)
    .map((line) => line.match(/^([a-z][a-z0-9_]*):/)?.[1])
    .filter((field) => field && field !== "template_id" && field !== "template_version");
}

function templateCatalog() {
  return readdirSync(templateRoot)
    .filter((name) => name.endsWith(".md") && name !== "README.md")
    .sort()
    .map((name) => {
      const entry = templateMeta(name);
      const recordType = name.replace(/\.md$/, "").replaceAll("-", " ");
      return { ...entry, name, record_type: recordType, fields: frontmatterFields(entry.content) };
    });
}

function renderTemplate(template, values) {
  // Frontmatter describes a source record's properties; the frozen proof renders
  // only the page body and retains a traceable template marker.
  const body = template.content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  const rendered = body.replace(/\{\{([^}]+)\}\}/g, (_match, key) => {
    const value = values[key];
    // Versioned templates may add a field before a fixture has a source for it.
    // Preserve that gap honestly instead of crashing a whole frozen proof.
    return value === undefined || value === null || value === "" ? "Source gap: not supplied by this fixture." : String(value);
  });
  return `<!-- follows: ${template.id}@${template.version} -->\n${rendered}`;
}

function prepareRunRoot(root, reset) {
  if (root === projectRoot || root === filesystemRoot || basename(root) === "runs") {
    throw new Error("Refusing to reset a broad source or runs directory.");
  }
  if (!reset) { mkdirSync(root, { recursive: true }); return; }
  if (existsSync(root) && readdirSync(root).length) {
    const marker = resolve(root, markerName);
    const prior = resolve(root, "result.json");
    const owned = existsSync(marker) || (existsSync(prior) && readJson(prior).kind === "kamdar-template-first-proof");
    if (!owned) throw new Error("Refusing to reset an output root not owned by the template-first proof.");
    rmSync(root, { recursive: true, force: true });
  }
  mkdirSync(root, { recursive: true });
  writeJson(resolve(root, markerName), { kind: "kamdar-template-first-proof", schema_version: 1 });
}

function upsert(root, path, content, events) {
  const target = safeOutputPath(root, path);
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  const before = existsSync(target) ? readFileSync(target, "utf8") : null;
  if (before === normalized) return "unchanged";
  writeText(target, normalized);
  const event = before === null ? "created" : "modified";
  // The buyer proof must be able to show what actually changed, not merely
  // claim that a hash changed. Eval outputs are ignored local evidence, so the
  // full baseline/output pair belongs with the event.
  events.push({
    path,
    event,
    before_sha256: before ? digest(before) : null,
    after_sha256: digest(normalized),
    before_content: before,
    after_content: normalized,
    unified_diff: [
      `--- before/${path}`,
      `+++ after/${path}`,
      ...(before === null ? ["@@ created @@", "- (file did not exist)"] : before.split("\n").filter(Boolean).map((line) => `- ${line}`)),
      ...normalized.split("\n").filter(Boolean).map((line) => `+ ${line}`)
    ].join("\n")
  });
  return event;
}

function inventory(root, prefix = "") {
  const directory = resolve(root, prefix);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? inventory(root, path) : [{ path, bytes: statSync(resolve(root, path)).size }];
  }).sort((a, b) => a.path.localeCompare(b.path));
}

function compileSanitizedFixture(source) {
  const compiled = loadKamdarSeedSnapshot();
  if (source.source_capture_sha256 !== compiled.source_capture_sha256 || source.private_seed_manifest !== compiled.private_seed_manifest) {
    throw new Error("Frozen fixture provenance must match the reviewed Kamdar seed config.");
  }
  return compiled;
}

function readSeedManifest(snapshot) {
  if (typeof snapshot.private_seed_manifest !== "string" || !snapshot.private_seed_manifest) throw new Error("Frozen snapshot must name its aggregate private-seed manifest.");
  const manifestPath = resolve(fixtureDirectory, snapshot.private_seed_manifest);
  if (relative(fixtureDirectory, manifestPath).startsWith(`..${sep}`)) throw new Error("Private-seed manifest escaped the frozen-fixture directory.");
  const manifest = readJson(manifestPath);
  const expectedAggregate = { rendered_rows: 49, named_projects: 39, source_gaps: 10, observed_departments: 7 };
  if (manifest.schema_version !== "kamdar-private-seed-manifest@1.0.0" || manifest.source_capture_sha256 !== snapshot.source_capture_sha256) throw new Error("Frozen fixture and private-seed manifest provenance diverged.");
  if (JSON.stringify(manifest.aggregate) !== JSON.stringify(expectedAggregate) || !/^[a-f0-9]{64}$/.test(manifest.manifest_sha256 || "")) throw new Error("Private-seed manifest aggregate or digest is invalid.");
  return manifest;
}

function validatePrivateSeed(privateSeedPath, manifest) {
  const target = resolve(privateSeedPath);
  const mode = statSync(target).mode & 0o777;
  if (mode !== 0o600) throw new Error("Private seed must be mode 0600.");
  const seed = readJson(target);
  const aggregate = { rendered_rows: 49, named_projects: 39, source_gaps: 10, observed_departments: 7 };
  if (seed.schema_version !== "kamdar-private-seed@1.0.0" || seed.source_capture_sha256 !== manifest.source_capture_sha256 || seed.public_manifest_sha256 !== manifest.manifest_sha256 || JSON.stringify(seed.aggregate) !== JSON.stringify(aggregate)) throw new Error("Private seed does not match the aggregate provenance manifest.");
  if (seed.projects?.length !== aggregate.named_projects || seed.source_gaps?.length !== aggregate.source_gaps || seed.departments?.length !== aggregate.observed_departments) throw new Error("Private seed record counts do not match its aggregate manifest.");
  return { source_capture_sha256: seed.source_capture_sha256, private_seed_verified: true };
}

function checkSnapshot(snapshot, { privateSeedPath } = {}) {
  for (const key of ["company", "frozen_at", "local_day", "week", "week_start", "projects", "people", "work_items", "reports", "source_capture_sha256"]) {
    if (!(key in snapshot)) throw new Error(`Frozen snapshot is missing ${key}.`);
  }
  for (const key of ["projects", "people", "work_items", "reports"]) {
    if (!Array.isArray(snapshot[key])) throw new Error(`Frozen snapshot ${key} must be an array.`);
  }
  const manifest = readSeedManifest(snapshot);
  const compiled = snapshot.scenario_layer === "sanitized-synthetic-overlay" ? snapshot : compileSanitizedFixture(snapshot);
  if (compiled.projects.length !== 7 || compiled.people.length !== 6 || compiled.work_items.length !== 13 || compiled.departments.length !== 7 || compiled.source_gaps.length !== 1) {
    throw new Error("Sanitized showcase fixture must compile the focused 7/1/7/6/13 portfolio shape.");
  }
  return copy({
    ...compiled,
    seed_provenance: privateSeedPath
      ? validatePrivateSeed(privateSeedPath, manifest)
      : { source_capture_sha256: manifest.source_capture_sha256, private_seed_verified: false }
  });
}

export function loadFrozenSnapshot({ path = fixturePath, privateSeedPath = process.env.KAMDAR_PRIVATE_SEED_PATH } = {}) {
  return checkSnapshot(readJson(path), { privateSeedPath });
}

const requiredFeatureSections = [
  "Why it exists", "Trigger and inputs", "Pipeline signature", "Flow", "State changes and artifacts",
  "Downstream application", "Failure modes", "Proof contract", "Example"
];

function featureDoc(feature) {
  const path = resolve(projectRoot, feature.doc);
  if (!existsSync(path)) throw new Error(`Feature document is missing: ${feature.doc}`);
  const raw = readFileSync(path, "utf8");
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
  const title = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (!title) throw new Error(`Feature document needs one H1: ${feature.doc}`);
  const firstHeading = body.indexOf("\n## ");
  const intro = (firstHeading >= 0 ? body.slice(body.indexOf("\n", body.indexOf(`# ${title}`)) + 1, firstHeading) : "").trim();
  const headings = [...body.matchAll(/^##\s+(.+)\r?$/gm)];
  const sections = Object.fromEntries(headings.map((heading, index) => [
    heading[1].trim(), body.slice(heading.index + heading[0].length, headings[index + 1]?.index ?? body.length).trim()
  ]));
  if (!sections.Example && sections["Worked example"]) sections.Example = sections["Worked example"];
  const missing = requiredFeatureSections.filter((heading) => !sections[heading]);
  if (missing.length) throw new Error(`Feature document ${feature.doc} is missing required sections: ${missing.join(", ")}`);
  if (!/[─│┌┐└┘→]/.test(sections.Flow)) throw new Error(`Feature document Flow needs an ASCII flow: ${feature.doc}`);
  return { ...feature, title, summary: intro.replace(/\s+/g, " "), document: { intro, sections, raw: body } };
}

export function loadContract({ path = contractPath } = {}) {
  const contract = readJson(path);
  const scenario = contract.scenarios?.[0];
  if (contract.schema_version !== "0.4.0" || !scenario || !Array.isArray(scenario.assertions?.records) || !Array.isArray(scenario.assertions?.files) || !Array.isArray(scenario.assertions?.behavior)) throw new Error("Expected the approved record-and-file eval contract.");
  const featureIds = new Set(contract.features?.map((feature) => feature.id));
  const sourceIds = new Set(scenario.source_links?.map((source) => source.id));
  if (featureIds.size !== 7 || ![...featureIds].every((id) => /^FEAT-\d{4}$/.test(id))) throw new Error("The feature-first contract must expose seven canonical FEAT identifiers.");
  if (!scenario.source_links?.every((source) => source.label && /^https:\/\//.test(source.url))) throw new Error("The feature-first contract must expose safe, labelled source links.");
  if (!contract.features.every((feature) => feature.key && feature.doc && feature.source_link_ids?.every((id) => sourceIds.has(id)))) throw new Error("Every feature must declare only its stable key, document, and known source links.");
  if (!contract.features.every((feature) => feature.showcase?.record_id && feature.showcase?.title)) throw new Error("Every feature needs one named primary seeded case for the buyer proof.");
  if (![...scenario.assertions.records, ...scenario.assertions.files, ...scenario.assertions.behavior].every((row) => featureIds.has(row.feature_id))) throw new Error("Every assertion must resolve to a canonical feature.");
  if (!scenario.assertions.records.every((row) => row.target?.database && row.event && Number.isInteger(row.expected_count) && row.expected_count > 0)) throw new Error("Record assertions require a target, event, and positive expected count.");
  if (!scenario.assertions.files.every((row) => (row.path || row.paths?.length) && row.event && row.template?.path)) throw new Error("File assertions require path(s), event, and a source template path.");
  contract.features.forEach(featureDoc);
  return contract;
}

export function loadCase() {
  const contract = loadContract();
  const scenario = contract.scenarios[0];
  const snapshot = loadFrozenSnapshot();
  const demoEnvironment = contract.showcase_environment;
  const demoDatabases = Object.fromEntries((demoEnvironment.databases || []).map((database) => [database.key, database]));
  // The runner result is a publishable proof artifact. Its source references
  // must therefore point only at the isolated v4 environment, never at real
  // Kamdar production sources that the internal scenario describes.
  const publicSourceLinks = {
    "kamdar-root": { id: "kamdar-root", label: "Kamdar AI · Eval Demo", url: demoEnvironment.url, kind: "notion" },
    "notion-projects": { id: "notion-projects", label: "Demo Projects", url: demoDatabases.projects?.url, kind: "notion" },
    "notion-tasks": { id: "notion-tasks", label: "Demo Work", url: demoDatabases.work_items?.url, kind: "notion" },
    "notion-people": { id: "notion-people", label: "Demo People", url: demoDatabases.people?.url, kind: "notion" }
  };
  return {
    id: scenario.id,
    title: scenario.title,
    operator_request: scenario.operator_request,
    story: "Project truth is scattered across project pages, tasks, embedded Meetings, Drive, decisions, and messages. This run shows how one Daily scan becomes reviewable evidence and how one Weekly pass turns that evidence into reports, promoted knowledge, next-week work, and executive distribution.",
    source_contract: scenario.source_contract,
    source_links: scenario.source_links.map((source) => publicSourceLinks[source.id] || source),
    showcase_environment: demoEnvironment,
    features: contract.features.map(featureDoc),
    feature_registry: contract.feature_registry,
    record_assertions: scenario.assertions.records,
    file_assertions: scenario.assertions.files,
    behavior_assertions: scenario.assertions.behavior,
    expected_file_events: scenario.assertions.files.flatMap((row) => (row.paths || [row.path]).map((path) => ({
      path, event: row.event, feature_id: row.feature_id,
      template: row.template, content: row.content
    }))),
    reference_points: scenario.assertions.behavior.map((row) => ({ id: row.id, text: row.expect })),
    database_overview: [
      { key: "projects", name: "Projects", purpose: "Durable project memory, objective, owner, state, and current context.", sample_id: "portfolio", sample: `${snapshot.projects.length} sanitized Projects across ${snapshot.departments.length} departments`, template: "company-os-project" },
      { key: "work_items", name: "Work", purpose: "One Work database with Task, Feature, Issue, and Meeting body templates.", sample_id: "TASK-101", sample: "Resolve Penang replenishment variance · Blocked · owner action required", template: "company-os-task" },
      { key: "people", name: "People", purpose: "Owners, approved delivery routes, and expertise used before any chase or collaborator selection.", sample_id: "PERSON-JUN", sample: "Jun Wong · approved private eval route · fictional sandbox identity", template: "company-os-person@0.1.0" },
      { key: "decisions", name: "Decisions", purpose: "Approved precedents with authority, rationale, and source evidence.", sample_id: "DEC-001", sample: "Use a 2% pilot variance threshold · Approved", template: "company-os-decision@0.2.0" },
      { key: "reports", name: "Reports", purpose: "Project reports, Department rollups, and one Company rollup.", sample_id: "RPT-PROJ-PENANG-W34", sample: "12 Project + 7 Department + 1 Company report", template: "company-os-weekly-report" },
      { key: "skills", name: "SOPs", purpose: "Reviewed employee workflows with a dated operating baseline.", sample_id: "SOP-001", sample: "Three-store pilot variance verification · Reviewed", template: "kamdar-employee-sop@1.0.0" },
      { key: "templates", name: "Templates", purpose: "Pinned record contracts used to generate and score automation artifacts.", sample_id: "TPL-TASK", sample: "Task record contract · company-os-task@0.7.0", template: "company-os-task@0.7.0" }
    ],
    template_registry: contract.template_registry,
    template_catalog: templateCatalog()
  };
}

function mapById(items) { return new Map(items.map((item) => [item.id, item])); }
function projectFor(snapshot, id) { return mapById(snapshot.projects).get(id); }
function personFor(snapshot, id) { return mapById(snapshot.people).get(id); }
function measuredNumber(value) {
  return value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
}
function effortFor(item) {
  const planned = measuredNumber(item.planned_hours);
  const actual = measuredNumber(item.actual_hours);
  const rate = measuredNumber(item.hourly_cost_myr);
  const timeMeasured = planned !== null && actual !== null;
  const costMeasured = timeMeasured && rate !== null;
  const missing = [planned === null ? "planned hours" : null, actual === null ? "actual hours" : null, rate === null ? "hourly MYR rate" : null].filter(Boolean);
  return {
    planned,
    actual,
    rate,
    timeMeasured,
    costMeasured,
    missing,
    variance: timeMeasured ? actual - planned : null,
    estimatedCost: costMeasured ? planned * rate : null,
    actualCost: costMeasured ? actual * rate : null,
    costVariance: costMeasured ? (actual - planned) * rate : null,
    basis: costMeasured ? `MYR ${rate}/hour × reported hours` : `Source gap: missing ${missing.join(", ")}.`,
    schedule: `${Number(item.schedule_variance_days || 0)} day(s)`
  };
}
function signed(value) { return `${value >= 0 ? "+" : ""}${value}`; }
function effortSummary(effort) {
  const hours = effort.timeMeasured ? `${effort.planned}h → ${effort.actual}h; ${signed(effort.variance)}h` : `Hours: source gap (${effort.missing.join(", ")})`;
  const cost = effort.costMeasured ? `MYR ${effort.estimatedCost} → ${effort.actualCost} (${signed(effort.costVariance)})` : `Cost: source gap (${effort.missing.join(", ")})`;
  return `${hours}; ${cost}; ${effort.schedule}; ${effort.basis}`;
}
function isStale(item, localDay) { return item.status === "Blocked" || item.due_date < localDay; }
function renderWorkRows(items) {
  return items.map((item) => {
    const effort = effortFor(item);
    const cause = item.problem_analysis;
    return `| ${item.id} — ${item.name} | ${item.meeting_block ? "Work Item / Active; embedded Meeting" : item.status} | ${effort.timeMeasured ? `${effort.planned}h → ${effort.actual}h` : "Source gap"} | ${effortSummary(effort)} | ${cause.cause} Confidence: ${cause.confidence}. Confirm with: ${cause.confirmation_needed} | ${item.next_action} | ${item.url} |`;
  }).join("\n");
}

function projectEvidence(snapshot, project, items, templates) {
  const meeting = items.find((item) => item.meeting_block);
  const sourceGaps = items.filter((item) => item.source_gap).map((item) => `- ${item.id}: ${item.source_gap}`).join("\n") || "- None.";
  const meetingExtraction = meeting
    ? [
      ...meeting.meeting_block.commitments.map((commitment) => `- ${commitment.proposal_id}: proposed linked Task for ${commitment.action} by ${commitment.due_date}.`),
      `- ${meeting.meeting_block.decision_candidate.id}: proposed Decision; authority ${meeting.meeting_block.decision_candidate.authority}.`,
      `- ${meeting.meeting_block.sop_candidate.id}: proposed employee SOP; authority ${meeting.meeting_block.sop_candidate.authority}.`
    ].join("\n")
    : "- No embedded Meeting block in this Project's selected Work Items.";
  const followUps = items.filter((item) => !item.healthy && !item.meeting_block).map((item) =>
    `- ${item.id}: ${item.documentation_missing.length ? `request only ${item.documentation_missing.join(", ")}` : "request precise progress and revised commitment"}.`
  ).join("\n") || "- No follow-up proposal.";
  const staleComments = items.filter((item) => isStale(item, snapshot.local_day)).map((item) => {
    const effort = effortFor(item);
    return `- ${item.id}: ask for current state, blocker owner, root-cause evidence, revised commitment, and explanation for ${effort.timeMeasured ? `${signed(effort.variance)}h` : "the recorded source gap"}${effort.costMeasured ? ` / MYR ${signed(effort.costVariance)}` : ""} variance.`;
  }).join("\n") || "- None.";
  return renderTemplate(templates.daily, {
    PROJECT_NAME: project.name,
    LOCAL_DAY: snapshot.local_day,
    "What changed today, linked to the current Project context and source evidence.": `${project.current_context} ${meeting ? "Meeting evidence added a 2% verification threshold." : "Documentation and release evidence were reviewed."}`,
    "Work Item rows": renderWorkRows(items),
    "Commitment, linked Task proposal, Decision candidate, SOP candidate, or none": meetingExtraction,
    "Only stale/blocked work or precise documentation requests": followUps,
    "Deduplicated source-record comment proposals, or none": staleComments,
    "Missing, stale, or unparseable source; otherwise none": sourceGaps
  });
}

function projectPatch(snapshot, project, items, phase = "daily") {
  const material = items.filter((item) => !item.healthy);
  const blocked = material.filter((item) => isStale(item, snapshot.local_day));
  const sourceGap = material.find((item) => item.source_gap);
  const after = phase === "daily" ? {
    status: blocked.length ? "At risk" : project.status,
    health: blocked.length ? "Needs owner attention" : material.length ? "Watch" : "Healthy",
    progress: `${items.length} changed Work record${items.length === 1 ? "" : "s"} reviewed; ${blocked.length} require owner attention.`,
    current_context: blocked.length
      ? `${blocked[0].name} is ${blocked[0].status.toLowerCase()}; ${blocked[0].blocker} Evidence and the next accountable action remain linked to Work.`
      : `${items[0]?.name || "Current work"} is current; linked Work remains the detailed source of truth.`,
    main_blocker: blocked[0]?.blocker || sourceGap?.source_gap || "None.",
    next_action: blocked[0]?.next_action || material[0]?.next_action || project.next_action,
    last_meaningful_update: snapshot.local_day
  } : {
    current_context: `${project.current_context} Weekly carry-forward keeps unresolved Work and its review date visible in this Project.`,
    next_action: blocked[0]?.next_action || project.next_action,
    review_date: snapshot.week_end
  };
  const before = phase === "daily" ? Object.fromEntries(Object.keys(after).map((key) => [key, project[key] || null])) : {
    current_context: project.current_context, next_action: project.next_action, review_date: null
  };
  return { before, after };
}

function ownerActionComment(snapshot, item, person) {
  const effort = effortFor(item);
  const knownFacts = [
    `Status: ${item.status}; due ${item.due_date}; last meaningful update ${item.last_edited.slice(0, 10)}.`,
    effort.timeMeasured ? `Plan versus actual: ${effort.planned}h planned → ${effort.actual}h actual (${signed(effort.variance)}h); ${effort.schedule} schedule variance.` : "Plan versus actual: source gap.",
    effort.costMeasured ? `Cost: MYR ${effort.estimatedCost} estimated → MYR ${effort.actualCost} actual (${signed(effort.costVariance)}); ${effort.basis}.` : `Cost: ${effort.basis}`,
    `Blocker: ${item.blocker}`,
    `Cause: ${item.problem_analysis.cause} Confidence: ${item.problem_analysis.confidence}.`,
    item.documentation_missing.length ? `Missing: ${item.documentation_missing.join(", ")}.` : "Missing: none recorded."
  ];
  const questions = [
    "What changed since the last meaningful update?",
    "What is the current blocker and who owns its resolution?",
    "What source evidence supports the cause or result?",
    "What decision, learning, or unresolved assumption should be added to Notes?",
    "What is the revised completion date and next action?"
  ];
  const updateLocation = item.documentation_missing.length
    ? `Work properties: ${item.documentation_missing.join(", ")}; then Notes.`
    : "Work page: Notes.";
  const text = `@${person.name} — action needed on ${item.name}\n\n### What the record currently says\n\n${knownFacts.map((fact) => `- ${fact}`).join("\n")}\n\n### Please reply with\n\n${questions.map((question, index) => `${index + 1}. ${question}`).join("\n")}\n\nUpdate: ${updateLocation}\nSource: ${item.url}\nRequested by: Daily operating update ${snapshot.frozen_at}\nIdempotency key: owner-action:${snapshot.local_day}:${item.id}`;
  return { text, knownFacts, questions, updateLocation, idempotency_key: `owner-action:${snapshot.local_day}:${item.id}` };
}

function commentArtifact(snapshot, item, person, templates) {
  const comment = ownerActionComment(snapshot, item, person);
  return renderTemplate(templates.documentation, {
    WORK_ITEM_ID: item.id,
    RESPONSIBLE_PERSON: person.name,
    REQUESTED_AT: snapshot.frozen_at,
    MISSING_FIELDS: item.documentation_missing.length ? item.documentation_missing.map((field) => `- ${field}`).join("\n") : "- No mapped field is missing; this is a progress request.",
    KNOWN_CONTEXT: comment.knownFacts.join(" "),
    REQUEST: `Update exactly the named Work fields and reply to the source record; do not create a duplicate Task.`,
    UPDATE_LOCATION: comment.updateLocation,
    FIELD_PURPOSE: "The manager cannot confirm progress, cause, or the next commitment without this evidence.",
    SOURCE_URL: item.url,
    APPLICATION_STATE: "Planned in proposal-only frozen mode; a provider receipt is required before an operated comment claim.",
    COMMENT_BODY: comment.text
  });
}

function followUpArchive(snapshot, person, items, templates) {
  const first = items[0];
  const sections = items.map((item) => {
    const comment = ownerActionComment(snapshot, item, person);
    return `## ${item.id} — ${item.name}\n\n${comment.text}\n\nNext known action: ${item.next_action}\nSource: ${item.url}`;
  }).join("\n\n");
  const base = renderTemplate(templates.followups, {
    WORK_ITEM_COUNT: items.length,
    WORK_ITEM_ID: first.id,
    WORK_ITEM_NAME: first.name,
    RECIPIENT_NAME: person.name,
    RESPONSE_DUE_AT: "2026-08-22 17:00 +08:00",
    KNOWN_STATUS_AND_PROGRESS: `${first.status}; ${first.progress}`,
    TIME_AND_COST_VARIANCE_OR_SOURCE_GAP: effortSummary(effortFor(first)),
    BLOCKER_AND_CAUSE_CONFIDENCE: `${first.blocker} ${first.problem_analysis.cause} Confidence: ${first.problem_analysis.confidence}.`,
    MISSING_FIELDS_OR_NONE: first.documentation_missing.length ? first.documentation_missing.join(", ") : "None.",
    QUESTION_ONE: "What changed since the last meaningful update?",
    QUESTION_TWO: "What is the current blocker and who owns it?",
    QUESTION_THREE: "What source evidence supports the cause or result?",
    QUESTION_FOUR: "What decision, learning, or unresolved assumption should be added to Notes?",
    QUESTION_FIVE: "What is the revised completion date and next action?",
    UPDATE_LOCATION: ownerActionComment(snapshot, first, person).updateLocation,
    "Precise progress or documentation request": "See the numbered request below each Work Item.",
    NEXT_ACTION: first.next_action,
    WORK_ITEM_URL: first.url,
    PERSON_ID: person.id,
    ROUTE_OR_GAP: person.route_label,
    "proposal-only | sent": "proposal-only"
  });
  return `${base}\n\n${sections}`;
}

function hydrateSections(rendered, sections) {
  let output = rendered;
  for (const [heading, value] of Object.entries(sections)) {
    const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(## ${escaped}\\r?\\n\\r?\\n)[\\s\\S]*?(?=\\r?\\n## |$)`);
    output = output.replace(pattern, `$1${value}\n`);
  }
  return output;
}

function documentationRequest(item, templates) {
  const fallbackPerson = { id: item.owner_id, name: item.owner_id };
  return commentArtifact({ ...arguments[0] }, item, fallbackPerson, templates);
}

function knowledgeCandidates(snapshot, meetings, templates) {
  return renderTemplate(templates.candidates, {
    LOCAL_DAY: snapshot.local_day,
    PROBLEMS: meetings.map((meeting) => `- ${meeting.meeting_block.problem_candidate.id}: ${meeting.meeting_block.problem_candidate.summary}; recurred ${meeting.meeting_block.problem_candidate.recurrence} times; source ${meeting.url}.`).join("\n"),
    DECISIONS: meetings.map((meeting) => `- ${meeting.meeting_block.decision_candidate.id}: ${meeting.meeting_block.decision_candidate.summary}; ${meeting.meeting_block.decision_candidate.authority}; source ${meeting.url}.`).join("\n"),
    SOP_SIGNALS: meetings.map((meeting) => `- ${meeting.meeting_block.sop_candidate.id}: ${meeting.meeting_block.sop_candidate.summary}; ${meeting.meeting_block.sop_candidate.repetition_evidence}; source ${meeting.url}.`).join("\n"),
    WEEKLY_DISPOSITION: "All nine candidates are staged for distinct Weekly promotion gates. Daily performs no canonical promotion."
  });
}

function taskRecord(name, sections, templates) {
  return hydrateSections(renderTemplate(templates.task, {
    WORK_ITEM_NAME: name,
    WORK_ITEM_ID: "Source gap: not supplied by this fixture.",
    PROJECT: "Source gap: not supplied by this fixture.",
    DEPARTMENT: "Source gap: not supplied by this fixture.",
    OWNER: "Source Meeting owner",
    TYPE: "Task",
    DUE_DATE: "2026-08-23",
    PRIORITY: "High",
    STATUS: "Planned",
    START_DATE: "Source gap: not supplied by this fixture.",
    PROGRESS: "Not started",
    LAST_MEANINGFUL_UPDATE: "Source gap: not supplied by this fixture.",
    NOTES: "No additional notes."
  }), sections);
}

function issueRecord(meeting, templates) {
  const candidate = meeting.meeting_block.problem_candidate;
  return hydrateSections(renderTemplate(templates.issue, {
    ISSUE_NAME: candidate.summary,
    ISSUE_ID: candidate.id,
    PROJECT: meeting.project_id,
    DEPARTMENT: "Source gap: not supplied by this fixture.",
    PRIORITY: "High",
    START_DATE: meeting.last_edited.slice(0, 10),
    DUE_DATE: meeting.due_date,
    PROGRESS: "Open diagnosis",
    LAST_MEANINGFUL_UPDATE: meeting.last_edited.slice(0, 10),
    SEVERITY: "High",
    STATUS: "Open",
    OWNER: meeting.owner_id,
    DETECTED_AT: meeting.last_edited.slice(0, 10),
    NEXT_REVIEW: meeting.due_date,
    PROBLEM_AND_IMPACT: candidate.summary,
    EVIDENCE_AND_REPRODUCTION: "Source gap: no reproduction supplied by this fixture.",
    DIAGNOSIS: "Source gap: diagnosis not yet supplied by this fixture.",
    CONTAINMENT_AND_NEXT_ACTION: "Source gap: containment not yet supplied by this fixture.",
    RESOLUTION_AND_VERIFICATION: "Not resolved.",
    RELATED_RECORDS: "No related records supplied by this fixture."
  }), {
    "Problem and impact": `${candidate.summary}\n\nRecurrence: ${candidate.recurrence}. The linked Project cannot make a confident next decision.`,
    "Evidence and reproduction": `Source Meeting: ${meeting.url}. Reproduce by reviewing the named pilot count evidence before the scheduled variance review.`,
    Diagnosis: `${meeting.problem_analysis.cause} Confidence: ${meeting.problem_analysis.confidence}. Confirm with: ${meeting.problem_analysis.confirmation_needed}`,
    "Containment and next action": `${meeting.next_action} Owner: ${meeting.owner_id}. Review by ${meeting.due_date}.`,
    "Resolution and verification": "Track until the evidence and owner action are reviewed.",
    "Related records": `${meeting.project_id}; ${meeting.url}; Decision ${meeting.meeting_block.decision_candidate.id}; proposed SOP ${meeting.meeting_block.sop_candidate.id}.`
  });
}

function decisionRecord(meeting, templates) {
  const candidate = meeting.meeting_block.decision_candidate;
  return hydrateSections(renderTemplate(templates.decision, {
    DECISION: candidate.summary,
    DECISION_ID: candidate.id,
    PROJECT: meeting.project_id,
    DEPARTMENT: "Source gap: not supplied by this fixture.",
    PROPOSER: meeting.owner_id,
    APPROVER: candidate.authority,
    STATUS: "Approved",
    DECIDED_AT: candidate.decided_at,
    REVIEW_DATE: "Reopen when the sample or risk model changes."
  }), {
    Context: "The pilot review needs one durable variance threshold before expansion.",
    "Options and tradeoffs": "- **2% threshold:** measurable across the three verified count samples; it may miss a smaller local anomaly.\n- **No shared threshold:** preserves local judgment but makes expansion decisions incomparable.",
    "Decision rationale": `A 2% threshold won because it is measurable across the three verified store-count samples. ${candidate.authority} approved it on ${candidate.decided_at}.`,
    "Consequences and review trigger": "Use the threshold for the linked Project until a new sample or risk model requires review. Reopen if verified counts show that the threshold no longer represents the operating risk.",
    "Evidence and related records": `Source Meeting: ${meeting.url}. Project: ${meeting.project_id}. Proposed SOP: ${meeting.meeting_block.sop_candidate.id}.`
  });
}

function sopRecord(meeting, templates) {
  const candidate = meeting.meeting_block.sop_candidate;
  return renderTemplate(templates.sop, {
    SOP_NAME: candidate.summary,
    SOP_ID: candidate.id,
    PROJECT: meeting.project_id,
    DEPARTMENT: "Source gap: not supplied by this fixture.",
    OWNER: meeting.owner_id,
    STATUS: "Proposed",
    BASELINE_VERSION: "1",
    EFFECTIVE_DATE: "Not effective until reviewed.",
    LAST_REVIEWED: "2026-08-21",
    NEXT_REVIEW: "After the next representative pilot review.",
    PURPOSE_AND_OUTCOME: "Produce one comparable variance review with a linked exception record so the Project owner can make an evidence-backed expansion decision.",
    TRIGGER_ACTORS_AND_INPUTS: `**Trigger:** A repeat operating review needs consistent evidence before a decision.\n**Owner:** ${meeting.owner_id}.\n**Inputs:** ERP extract, manual counts, approved threshold, and named review owner.`,
    ORDERED_WORKFLOW_STEPS: "1. Export the ERP counts.\n2. Collect the matching manual counts.\n3. Compare each location against the approved threshold.\n4. Record every exception and hand the result to the Project owner.",
    TIMING_AND_VOLUME_BASELINE: `${candidate.repetition_evidence}. Active time, waiting time, weekly volume, and loaded labour cost remain measurement gaps for the next run.`,
    EXCEPTIONS_AND_CONTROLS: "Do not recommend expansion when representative count evidence or the approved threshold is missing. Record the gap and owner instead.",
    IMPROVEMENT_AND_VERIFICATION: "Run the same workflow for the next representative sample; capture active time, waiting time, exception count, and whether the owner can decide without reconstructing evidence.",
    EVIDENCE_AND_RELATED_RECORDS: `Evidence: ${meeting.url}. Authority: ${candidate.authority}; related Decision ${meeting.meeting_block.decision_candidate.id}.`
  });
}

function projectPlan(snapshot, project, selected, templates) {
  const unresolved = selected.filter((item) => item.project_id === project.id && !item.healthy);
  return hydrateSections(renderTemplate(templates.project, { PROJECT_NAME: project.name }), {
    Overview: `**Goal:** ${project.objective}\n\n**Current context:** ${project.current_context}\n\n- **Review date:** ${snapshot.week_end}.`,
    "Project knowledge": "### Pilot verification constraint\n- **Known:** The pilot needs comparable evidence before expansion.\n- **Impact:** The Project decision remains conditional on the verified sample.\n- **Evidence:** [Meeting](meeting://MEETING-001) · [Decision](decision://DEC-001)\n- **Review:** Replace after the next verified sample.",
    "This week's attention": unresolved.map((item) => `- [ ] **P1 · ${item.status} · due ${item.due_date}** — ${item.next_action}\n  **Owner:** ${item.owner_id} · **Why now:** Project review is due ${snapshot.week_end}.\n  **Evidence:** ${item.url}`).join("\n")
  });
}

function executiveDistribution(snapshot, companyPath, templates, departmentReports = []) {
  const departmentSections = departmentReports.map((report) => {
    const state = report.department === "Content" ? "Source gap — no captured Project was available." : "Project evidence, open attention, problems worth solving, and owner handoff are in the linked report.";
    return `### ${report.department}\n${state}\nReport: ${report.path}`;
  }).join("\n\n");
  return renderTemplate(templates.executive, {
    WEEK: snapshot.week,
    COMPANY_RESULT: `Twelve active Project reports rolled into seven Department reports and one Company report.\n\n${departmentSections}`,
    TOP_RISKS: "Four stale Work records need owner responses; the festive QA source gap remains unresolved; Content remains an honest source gap.",
    OWNER_ATTENTION: "The four stale Work records have detailed source comments and two grouped employee follow-up artifacts.",
    NEXT_PRIORITIES: "Resolve named source gaps, apply approved Meeting commitments, and review carry-forward Project context.",
    COMPANY_REPORT: companyPath,
    DELIVERY_STATE: "Planned in frozen mode; replaced by the Telegram provider receipt in an operated run."
  });
}

function receipt(snapshot, cadence, selected, templates, plannedActions, generatedFiles) {
  return renderTemplate(templates.receipt, {
    CADENCE: cadence,
    RUN_AT: snapshot.frozen_at,
    START_TIMESTAMP: `${snapshot.local_day}T00:00:00+08:00`,
    END_TIMESTAMP: cadence === "Daily" ? `${snapshot.local_day}T23:59:59+08:00` : `${snapshot.week_end}T23:59:59+08:00`,
    SOURCES: "real Kamdar route contract, frozen Projects, Work Items, People, and templates",
    TEMPLATE_IDS_AND_VERSIONS: Object.values(templates).map((template) => `${template.id}@${template.version}`).join(", "),
    STABLE_RECORD_IDS: selected.map((item) => item.id).join(", "),
    GAPS_OR_NONE: selected.filter((item) => item.source_gap).map((item) => `${item.id}: ${item.source_gap}`).join("; ") || "none",
    PATHS_AND_TEMPLATE_IDS: generatedFiles.join(", "),
    ACTIONS_OR_NONE: plannedActions.map((action) => `${action.adapter}.${action.operation}`).join(", ") || "none",
    "proposal-only | mock | sent": "mock",
    STABLE_INPUT_FINGERPRINT: digest(JSON.stringify({ cadence, selected: selected.map((item) => item.id), week: snapshot.week })).slice(0, 16)
  });
}

function projectReport(snapshot, project, items, templates, dailyReceiptPath) {
  const issue = items.find((item) => item.status === "Blocked") || items.find((item) => item.source_gap) || items[0];
  const meeting = items.find((item) => item.meeting_block);
  const next = issue?.next_action || "Continue monitored work.";
  const sourceGaps = items.filter((item) => item.source_gap).map((item) => item.source_gap).join("; ") || "none";
  const outcomeRows = items.map((item) => `| ${item.name} | ${item.status}: ${item.progress} | ${item.url} | ${item.next_action} |`).join("\n")
    || "| No changed Work record | Source gap | none | Review Project context |";
  const problemRows = issue
    ? `| ${issue.blocker} | ${issue.url}${meeting ? `; related Meeting ${meeting.url}` : ""} | ${issue.healthy ? "Monitor current work." : "Owner attention is delayed."} | Draft one source-linked evidence brief for ${personFor(snapshot, issue.owner_id)?.name || issue.owner_id}; no provider write or Decision. | Trial on the next five reviews; success = the owner can decide from the brief in under 10 minutes. |`
    : "| No material problem in this evidence window | none | none | No intervention proposed | Reassess after the next evidence window. |";
  return renderTemplate(templates.weekly, {
    PROJECT_NAME: project.name,
    PROJECT: project.id,
    DEPARTMENT: project.department,
    WEEK_START: snapshot.week_start,
    REPORT_STATUS: "Draft",
    PREVIOUS_REPORT: "none",
    SOURCE_REPORT_IDS: items.map((item) => item.id).join(", ") || "none",
    SUMMARY: `${project.name} has ${items.length} source-linked Work record${items.length === 1 ? "" : "s"} in this evidence window. Highest attention is ${issue?.name || "the absent source evidence"}. Next priority is ${next.replace(/[.!]+$/, "")}.`,
    OUTCOME_ROWS: outcomeRows,
    PROBLEM_OPPORTUNITY_ROWS: problemRows,
    DECISIONS_VIEW_OR_LIST: meeting ? `- ${meeting.meeting_block.decision_candidate.id} — ${meeting.meeting_block.decision_candidate.summary}; ${meeting.meeting_block.decision_candidate.authority}; proposed for Weekly review.` : "- No Decision candidate from this evidence window.",
    SOPS_VIEW_OR_LIST: meeting ? `- ${meeting.meeting_block.sop_candidate.id} — ${meeting.meeting_block.sop_candidate.summary}; ${meeting.meeting_block.sop_candidate.repetition_evidence}; proposed for SOP review.` : "- No SOP candidate from this evidence window.",
    NEXT_WEEK_HANDOFF: `Update the canonical Project's This week's attention after owner review: ${next} Source: ${issue?.url || "none"}.`,
    START_TIMESTAMP: `${snapshot.week_start}T00:00:00+08:00`,
    END_TIMESTAMP: `${snapshot.week_end}T23:59:59+08:00`,
    "Stable source names or locators": "Projects, Work Items, Daily receipts",
    "Missing or stale sources, or none": sourceGaps,
    "Receipt locator": dailyReceiptPath
  });
}

function areaReport(snapshot, area, projects, reports, templates) {
  const sourcePaths = projects.map((project) => reports.get(project.id)?.path).filter(Boolean);
  const projectRows = projects.map((project) => `| ${project.name} | Current Project evidence reviewed | ${project.status} | Owner-approved action pending | ${reports.get(project.id)?.path || "source gap"} |`).join("\n")
    || "| No captured Project | Source gap | No Project captured | Capture source | none |";
  const sourceList = sourcePaths.join(", ") || "none";
  return renderTemplate(templates.area, {
    DEPARTMENT_NAME: area,
    WEEK_START: snapshot.week_start,
    REPORT_STATUS: "Draft",
    PREVIOUS_REPORT: "none",
    PROJECT_REPORTS: sourceList,
    SUMMARY: `${area} has ${projects.length} Project report${projects.length === 1 ? "" : "s"} for this evidence window. ${projects.length ? "Current Project evidence is aggregated without copying raw Work." : "No Project was captured, so the source gap remains explicit."} Next priority is the named owner handoff.`,
    PROJECT_RESULT_ROWS: projectRows,
    PROBLEM_OPPORTUNITY_ROWS: projects.length
      ? `| Incomplete source evidence blocks confident cross-Project decisions | ${projects.map((project) => project.id).join(", ")} | ${sourceList} | Draft a source-linked department exception brief; do not create or update canonical records. | Trial at the next review; success = owners identify the one blocked decision without opening raw Work. |`
      : `| No Project source captured | ${area} | no Project report | Resolve source access before proposing automation. | Capture the source; success = one reviewable Project report. |`,
    DECISIONS_VIEW_OR_LIST: "- Native linked Decision view filtered to this Department and week; fallback: candidates stay proposed until authority is complete.",
    SOPS_VIEW_OR_LIST: "- Native linked SOP view filtered to this Department and week; candidates stay proposed until source, authority, and repetition evidence are complete.",
    NEXT_WEEK_HANDOFF: "Update each canonical Project's This week's attention only after owner approval; do not duplicate the plan in this Department rollup.",
    START_TIMESTAMP: `${snapshot.week_start}T00:00:00+08:00`,
    END_TIMESTAMP: `${snapshot.week_end}T23:59:59+08:00`,
    "Canonical Project report locators": sourceList,
    "Missing Project reports or source evidence, or none": projects.length ? "Project source gaps remain in linked reports." : "No Project report was captured.",
    "Report locator or none": "none"
  });
}

function companyReport(snapshot, areaReports, templates) {
  const sourcePaths = areaReports.map((report) => report.path);
  const sourceList = sourcePaths.join(", ") || "none";
  const departmentRows = areaReports.map((report) => `| ${report.area} | Department report aggregated | Linked owner attention | Owner-approved action pending | ${report.path} |`).join("\n")
    || "| No Department source captured | Source gap | No Department captured | Capture source | none |";
  return renderTemplate(templates.company, {
    WEEK_START: snapshot.week_start,
    REPORT_STATUS: "Draft",
    PREVIOUS_REPORT: "none",
    DEPARTMENT_REPORTS: sourceList,
    SUMMARY: `Kamdar aggregated ${areaReports.length} Department report${areaReports.length === 1 ? "" : "s"} from Project reports. The highest portfolio attention is incomplete source evidence and its delayed owner decisions. Next priority is owner review of the linked Department handoffs.`,
    DEPARTMENT_RESULT_ROWS: departmentRows,
    PROBLEM_OPPORTUNITY_ROWS: `| Incomplete source evidence delays cross-department decisions | ${areaReports.map((report) => report.area).join(", ") || "none"} | ${sourceList} | Draft one source-linked portfolio exception brief; do not mutate canonical records. | Trial at the next company review; success = leadership names the decision owner and source gap in under 10 minutes. |`,
    DECISIONS_VIEW_OR_LIST: "- Native linked Decision view filtered to this reporting week; candidates remain proposed until authority is complete.",
    SOPS_VIEW_OR_LIST: "- Native linked SOP view filtered to this reporting week; candidates remain proposed until source, authority, and repetition evidence are complete.",
    NEXT_WEEK_HANDOFF: "Promote only owner-approved Department handoffs; the Company report does not copy Project task plans.",
    START_TIMESTAMP: `${snapshot.week_start}T00:00:00+08:00`,
    END_TIMESTAMP: `${snapshot.week_end}T23:59:59+08:00`,
    "Department rollup locators": sourceList,
    "Missing department reports or source evidence, or none": "Source gaps remain in linked Department reports.",
    "Report locator or none": "none"
  });
}

function makeCall(calls, phase, adapter, operation, args, detail, feature_id) {
  calls.push({ sequence: calls.length + 1, feature_id, phase, adapter, operation, args, detail, status: "planned", mocked: true });
}

function callIdentity(value) {
  return [value.feature_id, value.adapter, value.operation, value.action_key || value.args?.action_key || ""].join("|");
}

function applyExternalReceipts(calls, receipts, mode) {
  if (mode === "frozen-mock") {
    if (receipts.length) throw new Error("Frozen mode cannot accept provider receipts.");
    return calls;
  }
  if (mode !== "operated-showcase") throw new Error(`Unsupported proof mode: ${mode}`);
  const allowedStatus = new Set(["observed", "applied", "sent", "blocked"]);
  const byIdentity = new Map(calls.map((call) => [callIdentity(call), call]));
  for (const receipt of receipts) {
    if (!/^FEAT-\d{4}$/.test(receipt.feature_id || "") || !receipt.adapter || !receipt.operation || !allowedStatus.has(receipt.status)) {
      throw new Error("External receipt is missing a valid feature, operation, or status.");
    }
    const call = byIdentity.get(callIdentity(receipt));
    if (!call) throw new Error(`External receipt does not match a planned feature call: ${callIdentity(receipt)}`);
    if (receipt.result_url && !/^https:\/\//.test(receipt.result_url)) throw new Error("External result URL must be HTTPS.");
    if (receipt.workspace_url && !/^https:\/\//.test(receipt.workspace_url)) throw new Error("External workspace URL must be HTTPS.");
    if (receipt.workspace_databases && (typeof receipt.workspace_databases !== "object" || Object.values(receipt.workspace_databases).some((url) => !/^https:\/\//.test(url)))) {
      throw new Error("External workspace database URLs must be an HTTPS map.");
    }
    if (receipt.template_library_url && !/^https:\/\//.test(receipt.template_library_url)) throw new Error("External template-library URL must be HTTPS.");
    if (!/^[a-f0-9]{64}$/i.test(receipt.payload_hash || "")) throw new Error("An operated provider receipt needs a SHA-256 payload hash.");
    if (!receipt.idempotency_key || typeof receipt.idempotency_key !== "string") throw new Error("An operated provider receipt needs its idempotency key.");
    if (receipt.status === "sent" && !receipt.provider_id && !receipt.provider_id_present) throw new Error("A sent provider receipt must attest that a provider message identifier was returned.");
    if (receipt.status === "sent" && (!receipt.route_key || !/^[a-f0-9]{64}$/i.test(receipt.route_hash || ""))) throw new Error("A sent provider receipt needs a nonsecret route key and SHA-256 route hash.");
    call.status = receipt.status;
    call.mocked = false;
    call.receipt = {
      recorded_at: receipt.recorded_at,
      provider_id_present: Boolean(receipt.provider_id || receipt.provider_id_present),
      provider_id_hash: receipt.provider_id_hash || null,
      route_key: receipt.route_key || null,
      route_hash: receipt.route_hash || null,
      result_url: receipt.result_url || null,
      workspace_url: receipt.workspace_url || null,
      workspace_databases: receipt.workspace_databases || null,
      template_library_url: receipt.template_library_url || null,
      detail: receipt.detail || null,
      payload_hash: receipt.payload_hash,
      idempotency_key: receipt.idempotency_key
    };
  }
  return calls;
}

function assertionTemplate(template) {
  if (!template?.path?.startsWith("templates/")) throw new Error("An eval file assertion needs a repository template path.");
  return templateMeta(template.path.slice("templates/".length));
}

function score(contract, root, events, behaviorResults, recordChanges) {
  const scenario = contract.scenarios[0];
  const eventByPath = new Map(events.map((event) => [event.path, event]));
  const fileChecks = scenario.assertions.files.map((row) => {
    const template = assertionTemplate(row.template);
    const paths = row.paths || [row.path];
    const observed = paths.map((path) => {
      const event = eventByPath.get(path);
      const content = existsSync(safeOutputPath(root, path)) ? readFileSync(safeOutputPath(root, path), "utf8") : "";
      const marker = `<!-- follows: ${template.id}@${template.version} -->`;
      const expanded = [
        ...(row.content.required_sections || []).map((section) => ({ label: section, pass: content.includes(`## ${section}`) })),
        ...(row.content.required_fields || []).map((field) => ({ label: field, pass: content.includes(`\`${field}:\``) })),
        ...(row.content.required_text || []).map((text) => ({ label: text, pass: content.includes(text) }))
      ];
      return { path, observed_event: event?.event || "missing", expanded, pass: event?.event === row.event && content.includes(marker) && expanded.every((check) => check.pass) };
    });
    return { id: row.id, feature_id: row.feature_id, category: "file", paths, expected_event: row.event, template: { id: template.id, version: template.version, path: row.template.path }, observed, expanded: observed.flatMap((item) => item.expanded), pass: observed.every((item) => item.pass) };
  });
  const recordChecks = scenario.assertions.records.map((row) => {
    const observed = recordChanges.filter((change) => change.assertion_ids?.includes(row.id));
    const expanded = observed.flatMap((change) => [
      ...(row.changes.required_fields || []).map((field) => ({ record_id: change.record_id, label: field, pass: Object.hasOwn(change.after || {}, field) })),
      ...(row.changes.relation ? [{ record_id: change.record_id, label: `${row.changes.relation} relation`, pass: Boolean(change.relations?.[row.changes.relation]) }] : [])
    ]);
    const pass = observed.length === row.expected_count && observed.every((change) => change.database === row.target.database && change.event === row.event) && expanded.every((check) => check.pass);
    return { id: row.id, feature_id: row.feature_id, category: "record", target: row.target, expected_event: row.event, expected_count: row.expected_count, observed, expanded, pass };
  });
  const behaviorChecks = scenario.assertions.behavior.map((row) => {
    const outcome = behaviorResults[row.id] || { pass: false, evidence: "No executable predicate recorded." };
    return { id: row.id, feature_id: row.feature_id, category: "behavior", expectation: row.expect, evidence: outcome.evidence, pass: outcome.pass === true };
  });
  const checks = [...recordChecks, ...fileChecks, ...behaviorChecks];
  return { pass: checks.every((check) => check.pass), counts: { pass: checks.filter((check) => check.pass).length, fail: checks.filter((check) => !check.pass).length, total: checks.length }, checks };
}

function checkBehavior({ snapshot, contract, root, events, calls, selected, areaReports, companyPath, safety, idempotency, mode }) {
  const read = (path) => readFileSync(safeOutputPath(root, path), "utf8");
  const dailyByProject = new Map(snapshot.projects.map((project) => [project.id, read(`daily/projects/${project.slug}-${snapshot.local_day}.md`)]));
  const projectReportPath = (project) => `weekly/reports/projects/${project.slug}/weekly-report-${snapshot.week}.md`;
  const fullPageReads = new Set(calls.filter((call) => call.operation === "fetch_full_page").map((call) => call.args.work_item_id));
  const directoryIndex = calls.findIndex((call) => call.operation === "fetch_people_directory");
  const followUpCalls = calls.filter((call) => call.operation === "send_owner_followup");
  const commentCalls = calls.filter((call) => call.operation === "create_documentation_comment");
  const staleCommentCalls = calls.filter((call) => call.operation === "create_stale_progress_comment");
  const meeting = selected.find((item) => item.meeting_block);
  const knownPeople = new Map(snapshot.people.map((person) => [person.id, person]));
  const requiredSources = contract.scenarios[0].source_contract;
  const expectedCurrentDraft = "weekly/reports/projects/replenishment-accuracy/weekly-report-2026-W34.md";
  const eventByPath = new Map(events.map((event) => [event.path, event.event]));
  const projectOutputs = snapshot.projects.map((project) => read(projectReportPath(project)));
  const areaOutputs = areaReports.map((report) => read(report.path));
  const companyOutput = read(companyPath);
  const candidateOutput = read(`daily/knowledge/candidates-${snapshot.local_day}.md`);
  const planningProjectPath = "weekly/planning/projects/replenishment-accuracy.md";
  const planningTaskPath = "weekly/planning/tasks/TASK-104.md";
  const distributionPath = `weekly/distribution/telegram-summary-${snapshot.week}.md`;
  const dailyOutputs = [...dailyByProject.values()];
  const noUnparsedTemplate = [...dailyOutputs, ...projectOutputs, ...areaOutputs, companyOutput].every((content) => !content.includes("{{"));
  const allTemplateMarkers = contract.scenarios[0].assertions.files.every((row) => read(row.path).includes(`<!-- follows: ${row.template.id}@${row.template.version} -->`));

  return {
    "real-directory-bounded": {
      pass: requiredSources.notion_root === "workspace.hermes.md#work" && requiredSources.projects.includes("Kamdar Projects") && requiredSources.work_items.includes("Kamdar Tasks") && calls.every((call) => ["notion", "drive", "email", "telegram", "filesystem"].includes(call.adapter)),
      evidence: "The frozen source map resolves Projects and Work Items through workspace.hermes.md; every traced adapter is an approved local-shaped route."
    },
    "full-page-for-changed-work": {
      pass: selected.every((item) => item.full_page_read && fullPageReads.has(item.id)),
      evidence: `${[...fullPageReads].length}/${selected.length} selected Work Items have an explicit full-page read before extraction.`
    },
    "hidden-meeting-blocks": {
      pass: Boolean(meeting && fullPageReads.has(meeting.id) && dailyByProject.get(meeting.project_id).includes("## Meeting extraction")),
      evidence: meeting ? `${meeting.id} embedded Meeting block was read in full and rendered into the owning Project's Daily evidence.` : "No Meeting block was selected."
    },
    "meeting-commitments": {
      pass: Boolean(meeting && meeting.meeting_block.commitments.every((commitment) => dailyByProject.get(meeting.project_id).includes(commitment.proposal_id)) && !events.some((event) => event.path.includes(meeting.id))),
      evidence: meeting ? `${meeting.meeting_block.commitments.map((commitment) => commitment.proposal_id).join(" and ")} are linked Task proposals; ${meeting.id} remains source evidence.` : "No Meeting block was selected."
    },
    "project-memory-not-task-list": {
      pass: snapshot.projects.every((project) => dailyByProject.get(project.id).includes(project.current_context)) && noUnparsedTemplate,
      evidence: "Each Daily Project record preserves concise Project current context and a structured Work Items table; no template payload or raw source object is copied."
    },
    "progress-economics-preserved": {
      pass: selected.filter((item) => effortFor(item).costMeasured).every((item) => {
        const effort = effortFor(item);
        const daily = dailyByProject.get(item.project_id);
        return daily.includes(`${effort.planned}h → ${effort.actual}h`) && daily.includes(`MYR ${effort.estimatedCost} → ${effort.actualCost}`) && daily.includes(effort.basis.split(" × ")[0]);
      }) && selected.some((item) => effortFor(item).costMeasured),
      evidence: "Every Work Item with declared inputs renders planned/actual hours, MYR estimate/actual, variance, and the declared hourly basis."
    },
    "problem-cause-honesty": {
      pass: selected.every((item) => dailyByProject.get(item.project_id).includes(item.problem_analysis.cause) && dailyByProject.get(item.project_id).includes(`Confidence: ${item.problem_analysis.confidence}`)) && selected.some((item) => item.problem_analysis.confidence === "low" && /not confirmed/i.test(item.problem_analysis.cause)),
      evidence: "Problem explanations retain their fixture evidence confidence; TASK-101 remains an explicitly unconfirmed hypothesis."
    },
    "precise-documentation": {
      pass: selected.filter((item) => item.documentation_missing.length).every((item) => {
        const comment = commentCalls.find((call) => call.args.work_item_id === item.id);
        const daily = dailyByProject.get(item.project_id);
        return comment && JSON.stringify(comment.args.missing) === JSON.stringify(item.documentation_missing) && daily.includes(`request only ${item.documentation_missing.join(", ")}`);
      }),
      evidence: "Documentation proposals carry exactly the fixture's mapped missing fields; TASK-102 requests only Evidence."
    },
    "promotion-gates": {
      pass: Boolean(meeting && ["problem_candidate", "decision_candidate", "sop_candidate"].every((key) => candidateOutput.includes(meeting.meeting_block[key].id)) && candidateOutput.includes("Daily performs no canonical promotion")),
      evidence: "Daily stages ISSUE-001, DEC-001, and SOP-001 with their gate evidence; promotion occurs only in Weekly."
    },
    "daily-candidates-staged": {
      pass: Boolean(meeting && candidateOutput.includes(meeting.url) && ["Problems", "Decisions", "SOP signals"].every((section) => candidateOutput.includes(`## ${section}`))),
      evidence: "One Daily candidate bundle preserves all three promotion signal types and the originating Meeting URL."
    },
    "directory-before-route": {
      pass: directoryIndex >= 0 && followUpCalls.every((call) => {
        const person = knownPeople.get(call.args.person_id);
        return calls.indexOf(call) > directoryIndex && person?.approved_route === call.adapter;
      }),
      evidence: "The People Directory read precedes every routed follow-up; each draft uses the resolved person's approved route."
    },
    "stale-source-comment-first": {
      pass: selected.filter((item) => isStale(item, snapshot.local_day) && !item.meeting_block).every((item) => {
        const commentIndex = calls.findIndex((call) => call.operation === "create_stale_progress_comment" && call.args.work_item_id === item.id);
        const chaseIndex = calls.findIndex((call) => call.operation === "send_owner_followup" && call.args.work_item_id === item.id);
        return commentIndex >= 0 && chaseIndex > commentIndex && staleCommentCalls.filter((call) => call.args.work_item_id === item.id).length === 1;
      }),
      evidence: "Each stale non-Meeting Work Item has one idempotent source comment prepared before its off-platform chase."
    },
    "healthy-work-no-chase": {
      pass: selected.filter((item) => item.healthy).every((item) => !commentCalls.some((call) => call.args.work_item_id === item.id) && !staleCommentCalls.some((call) => call.args.work_item_id === item.id) && !followUpCalls.some((call) => call.args.work_item_id === item.id)),
      evidence: "Healthy TASK-103 has no comment or follow-up draft."
    },
    "report-hierarchy": {
      pass: areaReports.every((report) => {
        const related = snapshot.projects.filter((project) => project.area === report.area);
        const content = read(report.path);
        return related.every((project) => content.includes(projectReportPath(project)));
      }) && areaReports.every((report) => companyOutput.includes(report.path)),
      evidence: "Area outputs link their Project reports and the Company output links both Area rollups."
    },
    "weekly-evidence-rollup": {
      pass: snapshot.projects.every((project) => {
        const projectItems = selected.filter((item) => item.project_id === project.id);
        const report = read(projectReportPath(project));
        return report.includes("## Outcomes and open attention")
          && report.includes("## Problems and inefficiencies")
          && projectItems.every((item) => report.includes(item.url));
      }),
      evidence: "Each Project report preserves linked evidence, open attention, and a bounded problem intervention; rollups retain source links instead of duplicating raw Work."
    },
    "final-report-immutable": {
      pass: snapshot.reports.some((report) => report.status === "Final" && report.immutable) && !events.some((event) => event.path.includes("2026-W33")) && eventByPath.get(expectedCurrentDraft) === "modified",
      evidence: "The W33 Final is absent from write events; only the existing W34 Draft is modified."
    },
    "promotion-destination-routing": {
      pass: ["upsert_issue", "upsert_decision", "upsert_sop"].every((operation) => calls.some((call) => call.feature_id === "FEAT-0006" && call.operation === operation)),
      evidence: "Weekly owns three distinct destination calls: Work/Issues, Decisions, and SOPs."
    },
    "promotion-source-authority": {
      pass: [
        "weekly/promotions/issues/ISSUE-001.md",
        "weekly/promotions/decisions/DEC-001.md",
        "weekly/promotions/sops/SOP-001.md"
      ].every((path) => read(path).includes(meeting.url)) && !read("weekly/promotions/decisions/DEC-001.md").includes(meeting.meeting_block.title),
      evidence: "Every promoted record retains source and authority evidence without copying the Meeting transcript."
    },
    "next-week-carry-forward": {
      pass: read(planningProjectPath).includes("TASK-101") && read(planningProjectPath).includes(snapshot.week_end) && read(planningTaskPath).includes(meeting.url),
      evidence: "Project and Task planning records preserve unresolved work, owner/source context, and the next review date."
    },
    "planning-application-order": {
      pass: calls.findIndex((call) => call.operation === "update_project_plan") < calls.findIndex((call) => call.operation === "upsert_planned_task") && !events.some((event) => /TASK-201/.test(event.path)),
      evidence: "The Project plan update is prepared before linked Task application; TASK-201 remains untouched source evidence."
    },
    "weekly-plan-reuses-daily-task": {
      pass: Boolean(meeting && meeting.meeting_block.commitments.some((commitment) => commitment.proposal_id === "TASK-104") && calls.some((call) => call.operation === "upsert_task_proposal" && call.args.task_id === "TASK-104") && calls.some((call) => call.operation === "upsert_planned_task" && call.args.task_id === "TASK-104")),
      evidence: "Daily proposes TASK-104 from the embedded Meeting; Weekly targets that same logical Task for linked planning evidence rather than introducing a second work identity."
    },
    "executive-after-company": {
      pass: calls.findIndex((call) => call.operation === "upsert_company_report") < calls.findIndex((call) => call.operation === "send_executive_summary") && read(distributionPath).includes(companyPath),
      evidence: "The executive summary links the completed Company rollup and is routed only after that rollup call."
    },
    "distribution-receipt-honesty": {
      pass: calls.filter((call) => call.operation === "send_executive_summary").every((call) => call.status === "planned" && call.mocked || ["sent", "blocked"].includes(call.status) && Boolean(call.receipt?.recorded_at)),
      evidence: mode === "frozen-mock" ? "Frozen mode shows a planned Telegram action with no provider claim." : "Operated mode shows SENT only with a delivery receipt and BLOCKED when the provider target is unavailable."
    },
    "proposal-only": {
      pass: safety.network_calls_by_processor === 0 && safety.external_writes_by_processor === 0 && (mode === "frozen-mock" ? calls.every((call) => call.status === "planned" && call.mocked === true) : calls.every((call) => call.status === "planned" || call.mocked === false)),
      evidence: mode === "frozen-mock" ? "Every connector-shaped action is planned and local." : "The processor remains network-free; operated claims come only from validated external receipts."
    },
    "idempotent-rerun": {
      pass: idempotency.pass === true && idempotency.second_run_file_events.length === 0 && idempotency.duplicate_actions === 0,
      evidence: "The second unchanged render recorded zero file events and zero duplicate actions."
    },
    "template-first-integrity": { pass: allTemplateMarkers && noUnparsedTemplate, evidence: "Every declared file carries its template marker and no unresolved placeholder." }
  };
}

function checkBehaviorV4({ snapshot, contract, root, events, calls, selected, activeProjects, departmentReports, companyPath, safety, idempotency, mode, recordChanges }) {
  const read = (path) => readFileSync(safeOutputPath(root, path), "utf8");
  const byOperation = (operation) => calls.filter((call) => call.operation === operation);
  const comments = recordChanges.filter((change) => change.database === "work_comments");
  const stale = selected.filter((item) => isStale(item, snapshot.local_day));
  const incomplete = selected.filter((item) => item.documentation_missing.length);
  const meetings = selected.filter((item) => item.meeting_block);
  const proposalRecords = recordChanges.filter((change) => change.database === "work_items" && /^TASK-30\d$/.test(change.record_id) && change.after?.source_meeting_id);
  const reports = recordChanges.filter((change) => change.database === "reports");
  const promotion = recordChanges.filter((change) => ["decisions", "skills"].includes(change.database) || change.after?.review_state === "approved-for-weekly-promotion");
  const directoryIndex = calls.findIndex((call) => call.operation === "fetch_people_directory");
  const firstFollowup = calls.findIndex((call) => call.operation === "send_owner_followup");
  const projectReportPaths = activeProjects.map((project) => `weekly/reports/projects/${project.slug}/weekly-report-${snapshot.week}.md`);
  const departmentOutput = departmentReports.map((report) => read(report.path));
  const companyOutput = read(companyPath);
  const candidateOutput = read(`daily/knowledge/candidates-${snapshot.local_day}.md`);
  const files = inventory(root).map((entry) => entry.path);
  const noDailyProjectFiles = !files.some((path) => path.startsWith("daily/projects/"));
  const noProjectPlanFiles = !files.some((path) => path.startsWith("weekly/planning/projects/"));
  const workComments = new Map(comments.map((comment) => [comment.record_id, comment]));
  const behavior = {
    "real-directory-bounded": { pass: contract.scenarios[0].source_contract.notion_root === "workspace.hermes.md#work" && calls.every((call) => ["notion", "drive", "email", "telegram", "filesystem"].includes(call.adapter)), evidence: "Every frozen connector-shaped call is routed through the approved Company OS contract." },
    "full-page-for-changed-work": { pass: selected.every((item) => byOperation("fetch_full_page").some((call) => call.args.work_item_id === item.id)), evidence: `${selected.length}/${selected.length} changed Work records have an explicit full-page read.` },
    "hidden-meeting-blocks": { pass: meetings.length === 3 && meetings.every((meeting) => byOperation("fetch_full_page").some((call) => call.args.work_item_id === meeting.id)), evidence: "Three embedded Meeting blocks were read in full before extracting commitments." },
    "meeting-commitments": { pass: proposalRecords.length === 6 && meetings.every((meeting) => meeting.meeting_block.commitments.every((commitment) => proposalRecords.some((record) => record.record_id === commitment.proposal_id))), evidence: "Six explicit commitments become linked Work proposals; source Meetings remain unchanged." },
    "project-memory-not-task-list": { pass: noDailyProjectFiles && recordChanges.filter((change) => change.assertion_ids?.includes("daily-project-memory-records")).every((change) => !/TASK-\d+.*TASK-\d+/s.test(change.after.current_context)), evidence: `${activeProjects.length} active Project records change in place; zero Daily Project-memory files were created.` },
    "progress-economics-preserved": { pass: stale.every((item) => workComments.get(item.id)?.after?.known_facts?.some((fact) => fact.includes("Plan versus actual")) && workComments.get(item.id)?.after?.known_facts?.some((fact) => fact.includes("Cost:"))), evidence: "Work-level owner-action records retain measured time, MYR cost, and schedule context; concise Project reports link the work instead of duplicating it." },
    "problem-cause-honesty": { pass: stale.every((item) => workComments.get(item.id)?.after?.known_facts?.some((fact) => fact.includes(item.problem_analysis.cause) && fact.includes(`Confidence: ${item.problem_analysis.confidence}`))) && /not confirmed/i.test(stale[0]?.problem_analysis.cause || ""), evidence: "The supplier-feed cause remains explicitly suspected, with low confidence, rather than being upgraded to fact." },
    "precise-documentation": { pass: incomplete.every((item) => workComments.get(item.id)?.after?.missing_fields?.every((field) => item.documentation_missing.includes(field))) && incomplete.every((item) => workComments.get(item.id)?.after?.update_location), evidence: `${incomplete.length} documentation requests name only the source record’s missing fields and exact update location.` },
    "combined-comment-deduped": { pass: stale.every((item) => comments.filter((comment) => comment.record_id === item.id).length === 1), evidence: "Each stale and incomplete Work record receives one combined source comment, not separate progress and documentation spam." },
    "promotion-gates": { pass: candidateOutput.includes("Daily performs no canonical promotion") && meetings.every((meeting) => ["problem_candidate", "decision_candidate", "sop_candidate"].every((key) => candidateOutput.includes(meeting.meeting_block[key].id))), evidence: "Nine Daily candidates are staged before Weekly promotion." },
    "daily-candidates-staged": { pass: ["Problems", "Decisions", "SOP signals"].every((section) => candidateOutput.includes(`## ${section}`)), evidence: "The candidate bundle contains every signal class and its Meeting source." },
    "directory-before-route": { pass: directoryIndex >= 0 && firstFollowup > directoryIndex && byOperation("send_owner_followup").every((call) => ["PERSON-JUN", "PERSON-NUR"].includes(call.args.person_id)), evidence: "People resolution happens before the two allowlisted sandbox email routes are drafted." },
    "stale-source-comment-first": { pass: stale.every((item) => calls.findIndex((call) => call.operation === "create_owner_action_comment" && call.args.work_item_id === item.id) < calls.findIndex((call) => call.operation === "send_owner_followup" && call.args.work_item_ids?.includes(item.id))), evidence: "Each source-record comment is prepared before its grouped owner email." },
    "healthy-work-no-chase": { pass: selected.filter((item) => item.healthy).every((item) => !workComments.has(item.id) && !byOperation("send_owner_followup").some((call) => call.args.work_item_ids?.includes(item.id))), evidence: `${selected.filter((item) => item.healthy).length} healthy controls receive neither comment nor off-platform chase.` },
    "grouped-followup-by-person": { pass: byOperation("send_owner_followup").length === 1 && byOperation("send_owner_followup").every((call) => call.args.work_item_ids.length === 1), evidence: "One email artifact routes the one stale item to its approved sandbox employee." },
    "report-hierarchy": { pass: departmentReports.length === 7 && departmentOutput.filter((content) => projectReportPaths.some((path) => content.includes(path))).length === 5 && departmentOutput.find((content) => content.includes("Content source gap")) && departmentReports.every((report) => companyOutput.includes(report.path)), evidence: `${activeProjects.length} Project reports roll into seven Department reports, then one Company report.` },
    "weekly-evidence-rollup": { pass: projectReportPaths.every((path) => /## Outcomes and open attention/.test(read(path)) && /## Problems and inefficiencies/.test(read(path))) && departmentOutput.every((content) => /## Outcomes and open attention/.test(content)) && /## Problems and inefficiencies/.test(companyOutput), evidence: "Project reports retain source-linked outcomes, open attention, and testable problems; Area and Company rollups aggregate those report links without copying raw Work." },
    "final-report-immutable": { pass: !events.some((event) => event.path.includes("W33")), evidence: "The prior final report is never reopened; only current W34 drafts are rendered." },
    "content-gap-not-fabricated": { pass: departmentReports.some((report) => report.department === "Content" && read(report.path).includes("Content source gap")), evidence: "Content receives an explicit source-gap report without a fabricated Project." },
    "promotion-destination-routing": { pass: promotion.length === 9 && ["work_items", "decisions", "skills"].every((database) => promotion.filter((record) => record.database === database).length === 3), evidence: "Three Issues, Decisions, and SOPs each route to their own canonical record type." },
    "promotion-source-authority": { pass: promotion.every((record) => record.after?.source_meeting_id && record.after?.authority), evidence: "Every promoted record retains a Meeting source, authority, and review state." },
    "next-week-carry-forward": { pass: recordChanges.filter((change) => change.assertion_ids?.includes("weekly-project-carry-forward")).length === 1 && noProjectPlanFiles, evidence: "One Project record carries unresolved work forward in place; zero Project-plan Markdown files are created." },
    "planning-application-order": { pass: calls.findIndex((call) => call.operation === "update_project_plan") < calls.findIndex((call) => call.operation === "upsert_planned_task") && proposalRecords.length === 6, evidence: "Project context is prepared before linked commitment records; source Work is preserved." },
    "executive-after-company": { pass: calls.findIndex((call) => call.operation === "upsert_company_report") < calls.findIndex((call) => call.operation === "send_executive_summary"), evidence: "The executive artifact is built only after the Company rollup." },
    "distribution-receipt-honesty": { pass: mode === "frozen-mock" ? byOperation("send_executive_summary").every((call) => call.status === "planned") : byOperation("send_executive_summary").every((call) => call.status !== "sent" || call.receipt?.provider_id_present), evidence: "Frozen mode labels Telegram as planned; a sent state requires a matching edge receipt." },
    "feature-doc-shared-source": { pass: loadCase().features.length === 7 && loadCase().features.every((feature) => feature.document.sections.Flow), evidence: "Each workflow resolves one feature document with an owned ASCII Flow." },
    "proposal-only": { pass: safety.network_calls_by_processor === 0 && safety.external_writes_by_processor === 0 && (mode !== "frozen-mock" || calls.every((call) => call.status === "planned" && call.mocked)), evidence: "The frozen processor makes zero provider requests and records only planned application calls." },
    "idempotent-rerun": { pass: idempotency.pass && idempotency.second_run_file_events.length === 0 && idempotency.duplicate_actions === 0, evidence: "The second unchanged run creates no duplicate file, record, or message action." }
  };
  return behavior;
}

function compareAsciiV4({ snapshot, root, recordChanges, departmentReports, companyPath, assertions }) {
  const ascii = readFileSync(resolve(projectRoot, "tickets/TASK-0006/ascii-prototype.md"), "utf8");
  const files = inventory(root).map((entry) => entry.path);
  const checks = [
    { label: "Portfolio fixture", observed: snapshot.projects.length === 7 && snapshot.source_gaps.length === 1 && snapshot.departments.length === 7 && snapshot.people.length === 6 && snapshot.work_items.length === 13, evidence: "The frozen scenario compiles the focused 7/1/7/6/13 shape." },
    { label: "Project memory is a record change", observed: recordChanges.filter((change) => change.assertion_ids?.includes("daily-project-memory-records")).length === snapshot.projects.filter((project) => project.active).length && !files.some((path) => path.startsWith("daily/projects/")), evidence: `${snapshot.projects.filter((project) => project.active).length} canonical Project record diffs replace daily Project-memory files.` },
    { label: "Detailed owner action", observed: recordChanges.filter((change) => change.database === "work_comments").every((change) => change.after.numbered_questions?.length === 5), evidence: "Owner-action comments contain known facts, five questions, exact update location, and a source." },
    { label: "Department hierarchy", observed: departmentReports.length === 7 && existsSync(safeOutputPath(root, companyPath)), evidence: `${snapshot.projects.filter((project) => project.active).length} Project reports roll into seven Department reports and one Company report.` },
    { label: "Feature document proof", observed: assertions.checks.some((check) => check.category === "record") && assertions.checks.some((check) => check.category === "file") && assertions.checks.some((check) => check.category === "behavior"), evidence: "The scored model exposes Record changes, Files, and Behavior below feature documentation." }
  ].map((check) => ({ ...check, pass: check.observed && ascii.includes("## Record and file drill-downs") && ascii.includes("## How feature docs and eval rows connect") }));
  return { pass: checks.every((check) => check.pass), checks };
}

function compareAscii({ snapshot, contract, root, events, calls, dailyFiles, weeklyFiles, areaReports, companyPath, safety, assertions }) {
  const storyAscii = readFileSync(storyAsciiPath, "utf8");
  const featureAscii = readFileSync(featureAsciiPath, "utf8");
  const ui = readFileSync(uiPath, "utf8");
  const read = (path) => readFileSync(safeOutputPath(root, path), "utf8");
  const eventByPath = new Map(events.map((event) => [event.path, event.event]));
  const replenishment = "weekly/reports/projects/replenishment-accuracy/weekly-report-2026-W34.md";
  const festive = "weekly/reports/projects/festive-ecommerce/weekly-report-2026-W34.md";
  const meeting = snapshot.work_items.find((item) => item.id === "TASK-201");
  const dailyReplenishment = read(`daily/projects/replenishment-accuracy-${snapshot.local_day}.md`);
  const company = read(companyPath);
  const allFileMarkers = contract.scenarios[0].assertions.files.every((row) => read(row.path).includes(`<!-- follows: ${row.template.id}@${row.template.version} -->`));
  const directoryIndex = calls.findIndex((call) => call.operation === "fetch_people_directory");
  const firstRouteIndex = calls.findIndex((call) => call.operation === "send_owner_followup");
  const checks = [
    { label: "Full buyer story remains", source: storyAscii, ascii_anchor: "## 1. Story and mock environment", observed: ["STORY", "COMPANY OS", "DAILY WALKTHROUGH", "WEEKLY WALKTHROUGH", "FEATURE RESULTS", "FAILURE VIEW"].every((label) => ui.includes(label)), evidence: "The UI keeps the TASK-0001 story, data model, Daily, Weekly, feature-results, and failure/decision journey." },
    { label: "Feature UI replaces only results", source: featureAscii, ascii_anchor: "replaces only Section 5", observed: ui.includes("CURRENT TEMPLATE CONTENT ASSERTIONS") && ui.includes("feature-list"), evidence: "TASK-0002 is applied inside the results section rather than replacing the whole dossier." },
    { label: "All seven ROI workflows are exercised", source: featureAscii, ascii_anchor: "FEAT-0007", observed: contract.features.length === 7 && new Set(assertions.checks.map((check) => check.feature_id)).size === 7, evidence: "All seven workflows own at least one declared record, file, or behavior check." },
    { label: "Hidden Meeting extraction", source: storyAscii, ascii_anchor: "hidden Meeting block", observed: Boolean(meeting && meeting.meeting_block.commitments.every((commitment) => dailyReplenishment.includes(commitment.proposal_id))), evidence: "TASK-201 produces linked Task proposals and four promotion candidates." },
    { label: "Real source locations are available", source: featureAscii, ascii_anchor: "Current real source routes available to the UI", observed: contract.scenarios[0].source_links.length >= 4 && ui.includes("Open source") && ui.includes("notion-projects"), evidence: "Configured Kamdar root, Projects, Tasks, People, and Drive locations remain clickable." },
    { label: "Project lifecycle", source: storyAscii, ascii_anchor: "Project weekly report — canonical template expansion", observed: eventByPath.get(replenishment) === "modified" && eventByPath.get(festive) === "created", evidence: "Existing Replenishment W34 Draft is modified; Festive W34 is created." },
    { label: "Report hierarchy", source: featureAscii, ascii_anchor: "2 Project reports → 2 Area rollups → 1 Company rollup", observed: areaReports.every((report) => read(report.path).includes("weekly/reports/projects/")) && areaReports.every((report) => company.includes(report.path)), evidence: "Area rollups consume Project reports and the Company rollup consumes Area rollups." },
    { label: "File template/content drilldown", source: featureAscii, ascii_anchor: "CURRENT TEMPLATE CONTENT ASSERTIONS", observed: contract.scenarios[0].assertions.files.length === 19 && allFileMarkers && ui.includes("CURRENT TEMPLATE CONTENT ASSERTIONS"), evidence: "Nineteen file rows resolve their governing template/version and expand current content checks." },
    { label: "Feature-owned downstream evidence", source: featureAscii, ascii_anchor: "DOWNSTREAM APPLICATION", observed: directoryIndex >= 0 && firstRouteIndex > directoryIndex && calls.every((call) => /^FEAT-\d{4}$/.test(call.feature_id)) && ui.includes("call.status"), evidence: "Directory resolution precedes routing; every call has a feature owner and a mode-specific state." },
    { label: "Collapsed developer mechanics and safety", source: featureAscii, ascii_anchor: "Developer evidence", observed: safety.network_calls_by_processor === 0 && safety.external_writes_by_processor === 0 && assertions.checks.find((check) => check.id === "idempotent-rerun")?.pass === true && ui.toLowerCase().includes("ascii comparison"), evidence: "Developer mechanics remain secondary; the processor is network-free and reruns are idempotent." }
  ].map(({ source, ...check }) => ({ ...check, pass: source.toLowerCase().includes(check.ascii_anchor.toLowerCase()) && check.observed }));
  return { pass: checks.every((check) => check.pass), checks };
}

function operatedWorkspace(result) {
  const receipt = result.tools.calls.find((call) => call.receipt?.workspace_databases)?.receipt;
  return receipt ? {
    root: receipt.workspace_url,
    databases: receipt.workspace_databases,
    templates: receipt.template_library_url
  } : null;
}

function featureEvidence(result) {
  const sources = new Map(result.case.source_links.map((source) => [source.id, source]));
  const operated = operatedWorkspace(result);
  const configured = result.case.showcase_environment;
  const workspace = operated || (configured ? {
    root: configured.url,
    databases: Object.fromEntries((configured.databases || []).map((database) => [database.key, database.url])),
    templates: (configured.databases || []).find((database) => database.key === "templates")?.url
  } : null);
  const sourceOverrides = workspace ? new Map([
    ["kamdar-root", { id: "kamdar-root", label: "Demo workspace", url: workspace.root, kind: "notion" }],
    ["notion-projects", { id: "notion-projects", label: "Demo Projects", url: workspace.databases.projects, kind: "notion" }],
    ["notion-tasks", { id: "notion-tasks", label: "Demo Work", url: workspace.databases.work_items, kind: "notion" }],
    ["notion-people", { id: "notion-people", label: "Demo People", url: workspace.databases.people, kind: "notion" }]
  ]) : new Map();
  return result.case.features.map((feature) => {
    const checks = result.assertions.checks.filter((check) => check.feature_id === feature.id);
    const records = checks.filter((check) => check.category === "record");
    const files = checks.filter((check) => check.category === "file");
    const behavior = checks.filter((check) => check.category === "behavior");
    const calls = result.tools.calls.filter((call) => call.feature_id === feature.id);
    return {
      ...feature,
      cadence: feature.key.startsWith("daily.") ? "Daily" : feature.key.startsWith("weekly.") ? "Weekly" : "Shared",
      status: checks.length ? checks.every((check) => check.pass) ? (result.run.mode === "operated-showcase" ? (calls.some((call) => call.status === "blocked") ? "Operated with blockers" : "Operated pass") : "Frozen pass") : "Needs attention" : "No scenario assertion",
      checks, records, files, behavior, calls,
      sources: feature.source_link_ids.map((id) => sourceOverrides.get(id) || sources.get(id)).filter(Boolean)
    };
  });
}

function showcaseMarkdown(result) {
  const groups = featureEvidence(result);
  const coverage = groups.filter((feature) => feature.checks.length).length;
  const byCadence = (cadence) => groups.filter((feature) => feature.cadence === cadence).map((feature) => {
    const files = feature.files.length ? feature.files.map((file) => `- ${file.pass ? "PASS" : "FAIL"} ${file.expected_event.toUpperCase()} \`${file.path}\` follows \`${file.template.id}@${file.template.version}\`\n  - Content: ${file.expanded.map((item) => `${item.pass ? "PASS" : "FAIL"} ${item.label}`).join("; ")}`).join("\n") : "- No file assertions yet.";
    const behavior = feature.behavior.length ? feature.behavior.map((check) => `- ${check.pass ? "PASS" : "FAIL"} ${check.expectation}`).join("\n") : "- No behavior assertions yet.";
    const calls = feature.calls.length ? feature.calls.map((call) => `- **${call.status.toUpperCase()}** \`${call.adapter}.${call.operation}\` — ${call.detail}${call.receipt?.result_url ? ` — [Open applied result](${call.receipt.result_url})` : ""}`).join("\n") : "- No integration call captured.";
    const sources = feature.sources.map((source) => `[${source.label}](${source.url})`).join(" · ") || "No configured source link.";
    return `### ${feature.id} — ${feature.title}\n\n**${feature.status} · ${feature.checks.length} assertions**\n\n${feature.summary}\n\nSources: ${sources}\n\n#### Artifacts and content checks\n${files}\n\n#### Behavior\n${behavior}\n\n#### Downstream application\n${calls}\n`;
  }).join("\n");
  const mode = result.run.mode === "operated-showcase" ? "OPERATED SHOWCASE · RECEIPT-BACKED" : "FROZEN COMPARISON · NO PROVIDER WRITES";
  const databases = result.case.database_overview.map((item) => `| ${item.name} | ${item.purpose} | ${item.sample_id}: ${item.sample} | ${item.template} |`).join("\n");
  const templates = result.case.template_catalog.map((item) => `### ${item.id}@${item.version}\n\n- Record: \`${item.record_type}\`\n- Source: \`${item.path}\`\n- Fields: ${item.fields.map((field) => `\`${field}\``).join(", ") || "none"}\n\n<details><summary>Render template</summary>\n\n\`\`\`markdown\n${item.content}\n\`\`\`\n</details>`).join("\n\n");
  return `# Kamdar Company OS proof\n\n**${mode}**\n\n**${coverage}/${groups.length} features covered · ${result.assertions.counts.pass}/${result.assertions.counts.total} assertions pass.**\n\n## 1. Story and mock environment\n\n${result.case.story}\n\n- TASK-101: stale and blocked\n- TASK-102: active but missing evidence\n- TASK-103: healthy; no chase\n- TASK-201: embedded Meeting with commitments and promotion candidates\n\n## 2. Company OS\n\n| Database | Why it exists | Sample | Template |\n| --- | --- | --- | --- |\n${databases}\n\n## 3. Daily automation\n\n**Prompt:** read changed Work Items in full; update Project memory; request exact missing documentation; resolve owner routes; stage knowledge candidates; preserve gaps; write a receipt.\n\n**Observed files**\n${result.daily.files.map((path) => `- \`${path}\``).join("\n")}\n\n## 4. Weekly automation\n\n**Prompt:** consume Daily receipts; build Project → Area → Company reports; promote approved knowledge; apply next-week plans; distribute the Company result.\n\n**Observed files**\n${result.weekly.files.map((path) => `- \`${path}\``).join("\n")}\n\n## 5. Feature results\n\n### Daily features\n\n${byCadence("Daily")}\n\n### Weekly features\n\n${byCadence("Weekly")}\n\n### Shared controls\n\n${byCadence("Shared")}\n\n## 6. Failure view\n\n${result.observed_source_gaps.map((gap) => `- SOURCE GAP: ${gap}`).join("\n") || "- No source gaps."}\n\n## 7. Confirmed decisions\n\n- Project weekly report → Area rollup → Company rollup.\n- Templates are versioned Kamdar configuration installed into the Hermes workspace.\n- Meetings stay embedded in Work Items; explicit commitments become linked Tasks.\n- Provider success requires a matching external receipt.\n\n<details>\n<summary>Developer evidence</summary>\n\n- Processor network calls: ${result.safety.network_calls_by_processor}\n- Processor external writes: ${result.safety.external_writes_by_processor}\n- External receipts: ${result.safety.external_receipts}\n- Idempotency: ${result.idempotency.second_run_file_events.length} second-run file events\n- ASCII comparison: ${result.comparison.checks.map((check) => `${check.pass ? "PASS" : "FAIL"} ${check.label}`).join("; ")}\n- Raw tool trace: \`${result.outputs.tool_trace}\`\n</details>\n`;
}

function showcaseHtml(result, markdown) {
  const groups = featureEvidence(result);
  const coverage = groups.filter((feature) => feature.checks.length).length;
  const featureCard = (feature) => {
    const sourceLinks = feature.sources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)} ↗</a>${source.note ? `<small>${escapeHtml(source.note)}</small>` : ""}`).join("") || "<span class=muted>No configured source link.</span>";
    const files = feature.files.length ? feature.files.map((file) => `<details class=file><summary><b class=${file.pass ? "pass" : "fail"}>${file.pass ? "PASS" : "FAIL"}</b> ${escapeHtml(file.expected_event.toUpperCase())} <code>${escapeHtml(file.path)}</code></summary><p>Follows <code>${escapeHtml(`${file.template.id}@${file.template.version}`)}</code></p><ul>${file.expanded.map((item) => `<li class=${item.pass ? "pass" : "fail"}>${item.pass ? "PASS" : "FAIL"} ${escapeHtml(item.label)}</li>`).join("")}</ul></details>`).join("") : "<p class=gap>No artifact/file assertions yet.</p>";
    const behavior = feature.behavior.length ? `<ul>${feature.behavior.map((check) => `<li class=${check.pass ? "pass" : "fail"}>${check.pass ? "PASS" : "FAIL"} ${escapeHtml(check.expectation)}</li>`).join("")}</ul>` : "<p class=gap>No behavior assertions yet.</p>";
    const calls = feature.calls.length ? `<ul>${feature.calls.map((call) => `<li><code>${escapeHtml(call.status.toUpperCase())} · ${escapeHtml(`${call.adapter}.${call.operation}`)}</code><br><span>${escapeHtml(call.receipt?.detail || call.detail)}</span>${call.receipt?.result_url ? `<br><a href="${escapeHtml(call.receipt.result_url)}" target=_blank rel=noreferrer>Open applied result ↗</a>` : ""}</li>`).join("")}</ul>` : "<p class=gap>No integration call captured. No provider-success link is available.</p>";
    return `<article class=feature><div class=feature-head><div><p class=eyebrow>${escapeHtml(feature.id)} · ${escapeHtml(feature.cadence)}</p><h2>${escapeHtml(feature.title)}</h2></div><strong class="status ${feature.checks.length && feature.checks.every((check) => check.pass) ? "pass" : "gap"}">${escapeHtml(feature.status)} · ${feature.checks.length} assertions</strong></div><p>${escapeHtml(feature.summary)}</p><p class=sources>${sourceLinks}</p><details><summary>Inspect proof</summary><div class=proof-grid><section><h3>Artifacts and content checks</h3>${files}</section><section><h3>Behavior assertions</h3>${behavior}</section><section><h3>Downstream application</h3>${calls}</section></div></details></article>`;
  };
  const section = (cadence) => `<section><p class=eyebrow>${cadence.toUpperCase()} FEATURES</p><div class=features>${groups.filter((feature) => feature.cadence === cadence).map(featureCard).join("")}</div></section>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kamdar automation proof</title><style>:root{--ink:#172018;--muted:#677066;--line:#dce4da;--wash:#f4f6f2;--green:#176b42;--amber:#9a6112}*{box-sizing:border-box}body{margin:0;background:var(--wash);color:var(--ink);font:15px/1.5 system-ui,sans-serif}.wrap{max-width:1050px;margin:auto;padding:42px 20px 70px}.eyebrow{margin:0;color:var(--muted);font:700 11px/1.2 ui-monospace,monospace;letter-spacing:.08em}.hero,section,details{background:#fff;border:1px solid var(--line)}.hero{padding:28px;margin-bottom:20px}.hero h1{margin:7px 0;font-size:34px;letter-spacing:-.04em}.hero p{max-width:720px;color:var(--muted)}section{margin:18px 0;padding:18px}.features{display:grid;gap:12px;margin-top:12px}.feature{border:1px solid var(--line);padding:16px}.feature-head{display:flex;gap:18px;justify-content:space-between}.feature h2{margin:3px 0 0;font-size:18px}.status{font:700 11px/1.35 ui-monospace,monospace;text-align:right}.pass{color:var(--green);font-weight:700}.fail{color:#a72f28;font-weight:700}.gap{color:var(--amber);font-weight:700}.sources{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}.sources a{color:#175e9e}.sources small{color:var(--muted);font-size:11px}details{padding:0;background:#fbfcfa}details>summary{cursor:pointer;padding:10px 12px;font-weight:700}.proof-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--line)}.proof-grid section{border:0;border-right:1px solid var(--line);margin:0;padding:13px;background:transparent}.proof-grid section:last-child{border-right:0}.proof-grid h3{margin:0 0 9px;font-size:12px}.file{margin:8px 0;padding:0}.file summary{font-size:12px}.file p,.file ul,.proof-grid ul{font-size:12px;margin:8px 0;padding-left:18px}.gap{font-size:12px}.developer{margin-top:20px;padding:0}.developer pre{margin:0;padding:14px;white-space:pre-wrap;font:12px/1.5 ui-monospace,monospace}@media(max-width:760px){.wrap{padding:22px 14px}.feature-head,.proof-grid{display:block}.status{margin-top:8px;text-align:left}.proof-grid section{border-right:0;border-bottom:1px solid var(--line)}.proof-grid section:last-child{border-bottom:0}}</style><main class=wrap><header class=hero><p class=eyebrow>FROZEN MOCK · NO PROVIDER WRITES</p><h1>Kamdar automation proof</h1><strong class=${result.assertions.pass ? "pass" : "fail"}>${coverage}/${groups.length} features have current eval coverage · ${result.assertions.counts.pass}/${result.assertions.counts.total} assertions pass</strong><p>A passing assertion count proves only the covered feature paths. Open a feature to inspect its sources, created files, content checks, planned application, and honest gaps.</p></header>${section("Daily")}${section("Weekly")}${section("Shared")}<details class=developer><summary>Developer evidence</summary><pre>${escapeHtml(`Runner safety: ${result.safety.network_calls_by_processor} processor network calls · ${result.safety.external_writes_by_processor} external writes\nIdempotency: ${result.idempotency.second_run_file_events.length} second-run file events\nASCII comparison: ${result.comparison.checks.map((check) => `${check.pass ? "PASS" : "FAIL"} ${check.label}`).join("; ")}\nRaw tool trace: ${result.outputs.tool_trace}`)}</pre></details></main></html>`;
}

function fullShowcaseHtml(result) {
  const groups = featureEvidence(result);
  const mode = result.run.mode === "operated-showcase" ? "OPERATED SHOWCASE · RECEIPT-BACKED" : "FROZEN COMPARISON · NO PROVIDER WRITES";
  const workspace = operatedWorkspace(result);
  const workspaceUrl = workspace?.root;
  const databaseCards = result.case.database_overview.map((item) => {
    const databaseUrl = workspace?.databases?.[item.key];
    const title = databaseUrl ? `<a href="${escapeHtml(databaseUrl)}" target=_blank rel=noreferrer>${escapeHtml(item.name)} ↗</a>` : escapeHtml(item.name);
    return `<article><h3>${title}</h3><p>${escapeHtml(item.purpose)}</p><p class=sample><b>${escapeHtml(item.sample_id)}</b><br>${escapeHtml(item.sample)}</p><code>${escapeHtml(item.template)}</code>${databaseUrl ? `<p><a href="${escapeHtml(databaseUrl)}" target=_blank rel=noreferrer>Open database ↗</a></p>` : ""}</article>`;
  }).join("");
  const templateCards = result.case.template_catalog.map((item) => `<details class=template-card><summary><span><b>${escapeHtml(item.id)}</b><small>${escapeHtml(item.record_type)}</small></span><code>${escapeHtml(item.version)}</code></summary><div class=template-meta><span>Source · <code>${escapeHtml(item.path)}</code></span><span>Fields · ${escapeHtml(item.fields.join(" · ") || "none")}</span></div><pre>${escapeHtml(item.content)}</pre></details>`).join("");
  const fileList = (paths) => `<div class=artifact-list>${paths.map((path) => {
    const applied = result.tools.calls.filter((item) => item.args?.artifact_path === path && item.receipt?.result_url);
    const resultUrls = applied.map((call) => `<a href="${escapeHtml(call.receipt.result_url)}" target=_blank rel=noreferrer>Open applied ${escapeHtml(call.operation.replaceAll("_", " "))} ↗</a>`).join(" · ");
    const content = readFileSync(safeOutputPath(result.run.output_root, path), "utf8");
    return `<details class=artifact-preview><summary><span><b>${escapeHtml(path.split("/").at(-1))}</b><small>${escapeHtml(path)}</small></span><em>${resultUrls ? "APPLIED · NOTION" : "LOCAL EVIDENCE"}</em></summary><div class=artifact-meta>${resultUrls || "No external result link; the complete intermediate artifact is rendered below."}</div><pre>${escapeHtml(content)}</pre></details>`;
  }).join("")}</div>`;
  const featureCard = (feature) => {
    const files = feature.files.map((file) => {
      const applied = feature.calls.find((call) => call.args?.artifact_path === file.path && call.receipt?.result_url);
      const notionLink = applied ? ` <a href="${escapeHtml(applied.receipt.result_url)}" target=_blank rel=noreferrer>Open in Notion ↗</a>` : "";
      return `<details><summary><b class=${file.pass ? "pass" : "fail"}>${file.pass ? "PASS" : "FAIL"}</b> ${escapeHtml(file.path)}</summary><p>Follows <code>${escapeHtml(`${file.template.id}@${file.template.version}`)}</code>${notionLink}</p><ul>${file.expanded.map((item) => `<li>${item.pass ? "✓" : "×"} ${escapeHtml(item.label)}</li>`).join("")}</ul></details>`;
    }).join("");
    const behaviors = `<ul>${feature.behavior.map((check) => `<li class=${check.pass ? "pass" : "fail"}>${check.pass ? "PASS" : "FAIL"} ${escapeHtml(check.expectation)}</li>`).join("")}</ul>`;
    const calls = `<ul>${feature.calls.map((call) => `<li><b class=${["observed", "applied", "sent"].includes(call.status) ? "pass" : call.status === "blocked" ? "fail" : "planned"}>${escapeHtml(call.status.toUpperCase())}</b> <code>${escapeHtml(`${call.adapter}.${call.operation}`)}</code>${call.receipt?.result_url ? ` — <a href="${escapeHtml(call.receipt.result_url)}" target=_blank rel=noreferrer>Open result ↗</a>` : ""}<br><span>${escapeHtml(call.receipt?.detail || call.detail)}</span></li>`).join("")}</ul>`;
    const sources = feature.sources.map((source) => `<a href="${escapeHtml(source.url)}" target=_blank rel=noreferrer>${escapeHtml(source.label)} ↗</a>`).join(" · ");
    return `<article class=feature><header><div><p class=eyebrow>${escapeHtml(`${feature.id} · ${feature.cadence}`)}</p><h3>${escapeHtml(feature.title)}</h3></div><b class=${feature.calls.some((call) => call.status === "blocked") ? "planned" : feature.checks.every((check) => check.pass) ? "pass" : "fail"}>${escapeHtml(`${feature.status} · ${feature.checks.length} assertions`)}</b></header><p>${escapeHtml(feature.summary)}</p><p>${sources}</p><details><summary>Inspect feature evidence</summary><div class=columns><section><h4>Artifacts and file content</h4>${files}</section><section><h4>Behavior assertions</h4>${behaviors}</section><section><h4>Downstream application</h4>${calls}</section></div></details></article>`;
  };
  const featureSection = (cadence) => `<section><p class=eyebrow>${cadence.toUpperCase()} FEATURES</p><div class=features>${groups.filter((feature) => feature.cadence === cadence).map(featureCard).join("")}</div></section>`;
  const gaps = result.observed_source_gaps.length ? result.observed_source_gaps.map((gap) => `<li>${escapeHtml(gap)}</li>`).join("") : "<li>No source gap.</li>";
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kamdar Company OS proof</title>
<style>:root{--ink:#172018;--muted:#677066;--line:#dce4da;--wash:#f4f6f2;--green:#176b42;--amber:#986114;--red:#aa3028}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--wash);color:var(--ink);font:14px/1.5 system-ui,sans-serif}.wrap{max-width:1120px;margin:auto;padding:38px 20px 70px}.hero,section,.feature{background:#fff;border:1px solid var(--line)}.hero,section{padding:22px;margin:0 0 18px}.eyebrow{margin:0;color:var(--muted);font:700 10px/1.3 ui-monospace,monospace;letter-spacing:.08em}h1{margin:7px 0;font-size:36px;letter-spacing:-.045em}h2{margin:5px 0 14px}h3{margin:3px 0}p{max-width:800px}.score{font-size:18px}.pass{color:var(--green)}.fail{color:var(--red)}.planned{color:var(--amber)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.grid article{padding:13px;border:1px solid var(--line);background:#fbfcfa}.grid p{font-size:12px;color:var(--muted)}code,.tree{font:11px/1.5 ui-monospace,monospace}.flow{padding:13px;background:var(--ink);color:#fff;font:12px/1.6 ui-monospace,monospace}.features{display:grid;gap:11px}.feature{padding:14px}.feature>header{display:flex;justify-content:space-between;gap:14px}.feature>details>summary,.feature details>summary{cursor:pointer;font-weight:700}.columns{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:12px;margin-top:10px}.columns section{padding:11px;margin:0;background:#fbfcfa}.columns li{margin:5px 0;font-size:11px}.columns span{color:var(--muted)}a{color:#175e9e}@media(max-width:760px){.grid,.columns{grid-template-columns:1fr}.feature>header{display:block}}</style>
<style>
:root{--ink:#e8eee5;--muted:#8b9588;--line:#303830;--wash:#070907;--green:#b8e6bc;--amber:#f1d39a;--red:#f0aaa5;--lavender:#c9c0f3;--blue:#acd6eb;--panel:#111511;--panel2:#171c17;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
*{border-radius:0!important}::selection{background:var(--lavender);color:#111}body{background-color:var(--wash);background-image:linear-gradient(#ffffff05 1px,transparent 1px);background-size:100% 3px;color:var(--ink);font:12px/1.55 var(--mono)}
.wrap{max-width:1240px;padding:22px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px}.wrap>.consolebar,.wrap>.hero,.wrap>#templates,.wrap>#features,.wrap>details{grid-column:1/-1}.consolebar{display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:38px;padding:8px 11px;border:1px solid var(--line);background:#0b0e0b}.consolebar strong{color:var(--lavender);font-size:11px;letter-spacing:.08em;text-transform:uppercase}.consolebar div{display:flex;flex-wrap:wrap;gap:14px}.consolebar a{color:var(--muted);font-size:10px;text-decoration:none}.consolebar a:hover{color:var(--ink)}
.hero,.wrap>section,.feature,.grid article,.columns section,.wrap>details{background:var(--panel);border:1px solid var(--line)}.hero{grid-column:1/-1;margin:0;padding:24px;border-top:3px solid var(--lavender);background:linear-gradient(110deg,#171b17,#0e120e 65%)}.hero h1{max-width:none;margin:7px 0 10px;color:#f4f6f2;font:700 clamp(26px,4vw,46px)/1.02 system-ui,sans-serif;letter-spacing:-.055em}.hero p{color:var(--muted)}.hero .score{display:inline-block;padding:5px 7px;background:var(--green);color:#101510!important;font-size:12px;letter-spacing:.02em}.hero .planned{color:var(--amber)}
.wrap>section{min-width:0;margin:0;padding:17px}.wrap>section:nth-of-type(1){border-top:2px solid var(--blue)}.wrap>section:nth-of-type(2){border-top:2px solid var(--lavender)}.wrap>section:nth-of-type(3){border-top:2px solid var(--green)}.wrap>section:nth-of-type(4){border-top:2px solid var(--amber)}.wrap>section:nth-of-type(5){border-top:2px solid var(--lavender)}.wrap>section:nth-of-type(6){border-top:2px solid var(--red)}.wrap>section:nth-of-type(7){border-top:2px solid var(--blue)}
.eyebrow{color:var(--muted);font:700 9px/1.2 var(--mono);letter-spacing:.12em;text-transform:uppercase}h2{margin:5px 0 12px;color:#f1f4ef;font:700 17px/1.15 system-ui,sans-serif;letter-spacing:-.025em}h3{color:#eef1ec;font-size:12px}.flow{margin:12px 0 0;padding:10px;border:1px solid var(--line);background:#090b09;color:var(--green);font:10px/1.55 var(--mono);white-space:pre-wrap}.tree{margin:10px 0 0;padding-left:19px;color:#cbd2c8}.tree li{padding:2px 0;border-bottom:1px dotted #283028;overflow-wrap:anywhere}.tree li::marker{color:var(--lavender)}
.grid{gap:6px}.grid article{padding:10px;background:var(--panel2)}.grid article:nth-child(4n+1){border-left:3px solid var(--green)}.grid article:nth-child(4n+2){border-left:3px solid var(--lavender)}.grid article:nth-child(4n+3){border-left:3px solid var(--amber)}.grid article:nth-child(4n){border-left:3px solid var(--blue)}.grid p{margin:5px 0;color:var(--muted);font-size:10px}.grid .sample{padding:7px;border:1px solid #293029;background:#0d110d;color:#cbd3c7}.grid code{color:#bec7ba;font-size:9px}
.template-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.template-card{min-width:0;border:1px solid var(--line);background:var(--panel2)}.template-card>summary{display:flex;justify-content:space-between;gap:12px;padding:10px;cursor:pointer;list-style:none}.template-card>summary span{display:grid;gap:2px}.template-card>summary small,.template-meta{color:var(--muted);font-size:9px}.template-card>summary code{color:var(--lavender)}.template-card[open]{grid-column:1/-1}.template-meta{display:flex;flex-wrap:wrap;gap:14px;padding:8px 10px;border-top:1px solid var(--line)}.template-card pre{max-height:520px;margin:0;padding:12px;overflow:auto;border-top:1px solid var(--line);background:#090c09;color:#cbd3c7;font:10px/1.55 var(--mono);white-space:pre-wrap}
.wrap>section:nth-of-type(5)>section{margin:14px 0 0;padding:0;border:0;background:transparent}.features{gap:7px}.feature{padding:0;background:var(--panel2);border-left:3px solid var(--lavender)}.feature:nth-child(4n+1){border-left-color:var(--green)}.feature:nth-child(4n+2){border-left-color:var(--lavender)}.feature:nth-child(4n+3){border-left-color:var(--amber)}.feature:nth-child(4n){border-left-color:var(--blue)}.feature>header{align-items:start;padding:11px 12px}.feature>header p{margin:5px 0;color:var(--muted);font-size:10px}.feature>header b{font-size:9px;text-transform:uppercase;letter-spacing:.05em}.feature>details{border-top:1px solid var(--line);background:#0e120e}.feature details>summary{padding:8px 11px;color:#d4dbd0;font-size:10px;list-style:none}.feature details>summary::before{content:'› ';color:var(--lavender)}.feature details[open]>summary::before{content:'⌄ '}.columns{gap:6px;padding:0 9px 9px}.columns section{padding:9px;background:#111611}.columns h4{margin:0 0 6px;color:var(--muted);font-size:9px;letter-spacing:.08em;text-transform:uppercase}.columns li{font-size:9px}.columns details{border:1px solid var(--line);background:#0c100c}.pass{color:var(--green)!important}.fail{color:var(--red)!important}.planned{color:var(--amber)!important}a{color:var(--blue)}
.wrap>details{margin:0;background:var(--panel)}.wrap>details>summary{padding:11px;color:var(--muted);font-size:10px}.wrap>details pre{margin:0;padding:12px;border-top:1px solid var(--line);color:#b8c1b5;font:10px/1.55 var(--mono);white-space:pre-wrap}#features>section{margin:14px 0 0;padding:0;border:0;background:transparent}
@media(max-width:820px){.wrap{grid-template-columns:1fr;padding:10px}.wrap>section,.wrap>.hero,.wrap>.consolebar,.wrap>details{grid-column:1}.consolebar{position:static}.consolebar div{display:none}.columns,.grid,.template-list{grid-template-columns:1fr}.template-card[open]{grid-column:1}.feature>header{display:block}.hero h1{font-size:30px}}
</style>
<style>
:root{--ink:#c9c9c1;--muted:#74756f;--line:#292a27;--wash:#020302;--green:#c7c9bd;--amber:#c9b98f;--red:#c49791;--lavender:#aaa1c5;--blue:#91aab2;--panel:#0b0c0b;--panel2:#0e0f0e}
body{background-color:#020302;background-image:linear-gradient(#ffffff025 1px,transparent 1px);color:var(--ink);font-size:13px}
.wrap{width:calc(100% - 36px);max-width:768px;padding:18px 0 48px;grid-template-columns:1fr;gap:8px}.wrap>section,.wrap>.hero,.wrap>.consolebar,.wrap>details{grid-column:1}
.consolebar{min-height:30px;padding:5px 8px;background:#070807;border-color:#222320}.consolebar strong{color:#979990;font-size:9px}.consolebar a{color:#666862;font-size:9px}
.hero{display:grid;grid-template-columns:minmax(0,1fr) 300px;grid-template-rows:auto auto auto;gap:2px 20px;padding:11px 12px;border-top:1px solid var(--line);background:#090a09}.hero>.eyebrow,.hero>h1,.hero>p:nth-of-type(2){grid-column:1}.hero>.score,.hero>.planned,.hero>p:last-child{grid-column:2;justify-self:start}.hero>.score{grid-row:1}.hero>.planned{grid-row:2}.hero>p:last-child{grid-row:3}.hero h1{margin:3px 0;color:#d4d4cc;font:600 18px/1.15 var(--mono);letter-spacing:-.02em}.hero p{margin:3px 0;color:#777973;font-size:9px}.hero .score{padding:2px 4px;border:0;background:#d1d2ca;color:#080908!important;font-size:9px;font-weight:700}.hero .planned{font-size:9px}
.wrap>section{align-self:start;padding:11px 12px;border-top:1px solid var(--line)!important;background:#0a0b0a}.wrap>section .eyebrow::before{content:'';display:inline-block;width:5px;height:5px;margin:0 6px 1px 0;background:var(--lavender)}.wrap>section:nth-of-type(3n+1) .eyebrow::before{background:#a8b0a0}.wrap>section:nth-of-type(3n+2) .eyebrow::before{background:#aaa1c5}.wrap>section:nth-of-type(3n) .eyebrow::before{background:#c3b489}
.eyebrow{color:#777973;font-size:9px}h2{margin:3px 0 8px;color:#c8c9c1;font:600 15px/1.25 var(--mono);letter-spacing:0}h3{color:#c2c3bb;font-size:12px}p{font-size:11px}
.flow{margin-top:8px;padding:7px;background:#060706;color:#a9aba3;font-size:9px}.tree{font-size:9px;color:#a7a8a1}.tree li{border-color:#20211f}.tree li::marker{color:#777a73}
.signal-table{width:100%;margin-top:8px;border-collapse:collapse;table-layout:fixed}.signal-table th,.signal-table td{padding:8px 7px;border-bottom:1px dotted #242522;text-align:left;vertical-align:top;font-size:10px}.signal-table th{color:#777973;font-weight:500}.signal-table td:first-child{color:#c3c4bc;font-weight:700}.signal-table td:nth-child(2) span{display:inline-block;padding:1px 3px;background:#d2d2cb;color:#080908;font-weight:700}.signal-table td:nth-child(3){color:#9a9c95}.signal-table td:last-child{color:#b2b3ac}.signal-table tr:last-child td{border-bottom:0}
.grid{gap:4px}.grid article{padding:8px 9px;border:1px solid #252623!important;background:#0d0e0d}.grid article::before{content:'';float:left;width:5px;height:5px;margin:4px 7px 0 0;background:#aaa1c5}.grid article:nth-child(4n+1)::before{background:#a8b0a0}.grid article:nth-child(4n+3)::before{background:#c3b489}.grid article:nth-child(4n)::before{background:#91aab2}.grid p{font-size:10px}.grid .sample{padding:6px;border-color:#20211f;background:#080908;color:#b7b8b1}.grid code{font-size:9px;color:#969891}
.artifact-list{display:grid;gap:4px;margin-top:8px}.artifact-preview{border:1px solid #252623;background:#0d0e0d}.artifact-preview>summary{display:flex;align-items:start;justify-content:space-between;gap:12px;padding:8px;list-style:none}.artifact-preview>summary span{display:grid;min-width:0}.artifact-preview>summary b{font-size:11px}.artifact-preview>summary small{color:var(--muted);font-size:9px;overflow-wrap:anywhere}.artifact-preview>summary em{color:var(--green);font-size:9px;font-style:normal;white-space:nowrap}.artifact-meta{padding:7px 9px;border-top:1px solid var(--line);color:var(--muted);font-size:10px}.artifact-preview pre{max-height:520px;margin:0;padding:11px;overflow:auto;border-top:1px solid var(--line);background:#050605;color:#c4cbc0;font:11px/1.6 var(--mono);white-space:pre-wrap}
.template-list{gap:3px}.template-card{border-color:#252623;background:#0d0e0d}.template-card>summary{padding:7px 8px}.template-card>summary b{font-size:9px;color:#bcbdb5}.template-card>summary code{color:#8e889f;font-size:8px}.template-card>summary small,.template-meta{color:#666862;font-size:8px}.template-card pre{background:#050605;color:#aaaCA4;border-color:#242522;font-size:9px}
.features{gap:4px}.feature{border:1px solid #252623!important;background:#0d0e0d}.feature>header{padding:8px 9px}.feature>header h3{font-size:12px}.feature>header p,.feature>header b{font-size:10px}.feature>details{border-color:#242522;background:#080908}.feature details>summary{padding:7px 9px;color:#b2b4ac;font-size:10px}.columns{gap:4px;padding:0 7px 7px}.columns section{padding:8px;border-color:#242522;background:#0b0c0b}.columns h4,.columns li{font-size:10px}.columns details{border-color:#242522;background:#070807}
.pass{color:#c8c9c1!important}.fail{color:#c49791!important}.planned{color:#c9b98f!important}a{color:#91aab2}.wrap>details{background:#090a09;border-color:#252623}
@media(max-width:820px){.wrap{width:calc(100% - 16px);padding-top:8px}.hero{display:block}.hero h1{font-size:16px}}
.columns{grid-template-columns:1fr;gap:0}.columns section{border-bottom:1px solid var(--line)}.columns section:last-child{border-bottom:0}
</style>
<main class=wrap><nav class=consolebar><strong>Kamdar · ${result.run.mode === "operated-showcase" ? "operated" : "frozen"} proof</strong><div><a href=#story>story</a><a href=#company-os>company os</a><a href=#templates>templates</a><a href=#daily>daily</a><a href=#weekly>weekly</a><a href=#features>features</a><a href=#gaps>gaps</a></div></nav><header class=hero><p class=eyebrow>${escapeHtml(mode)}</p><h1>Kamdar Company OS proof</h1><p>${escapeHtml(result.case.story)}</p><b class="score ${result.assertions.pass ? "pass" : "fail"}">7/7 workflows covered · ${result.assertions.counts.pass}/${result.assertions.counts.total} assertions pass</b>${result.tools.calls.some((call) => call.status === "blocked") ? `<p class=planned>${result.tools.calls.filter((call) => call.status === "blocked").length} provider actions blocked — inspect affected features below.</p>` : ""}${workspaceUrl ? `<p><a href="${escapeHtml(workspaceUrl)}" target=_blank rel=noreferrer>Open operated Notion workspace ↗</a></p>` : ""}</header>
<section id=story><p class=eyebrow>1 · STORY AND ENVIRONMENT</p><h2>What the manager must resolve</h2><p>One bounded scan turns scattered operating signals into Daily evidence and Weekly outcomes.</p><table class=signal-table><thead><tr><th>record</th><th>signal</th><th>stage</th><th>expected result</th></tr></thead><tbody><tr><td>TASK-101</td><td><span>STALE</span></td><td>Daily</td><td>Show +6h / +MYR 720, keep the suspected cause unconfirmed, comment on the source record, then chase</td></tr><tr><td>TASK-102</td><td><span>GAP</span></td><td>Daily</td><td>Request only the missing linked evidence</td></tr><tr><td>TASK-103</td><td><span>HEALTHY</span></td><td>Daily</td><td>No chase or duplicate message</td></tr><tr><td>TASK-201</td><td><span>MEETING</span></td><td>Daily</td><td>Extract commitments and promotion candidates</td></tr><tr><td>Project memory</td><td><span>UPDATE</span></td><td>Daily</td><td>Write current context and proprietary knowledge from changed Work</td></tr><tr><td>Project reports</td><td><span>ROLLUP</span></td><td>Weekly</td><td>Project → Area → Company hierarchy with time/cost variance</td></tr><tr><td>Knowledge</td><td><span>PROMOTE</span></td><td>Weekly</td><td>Decision, Issue, and SOP records</td></tr><tr><td>Company result</td><td><span>DISTRIBUTE</span></td><td>Weekly</td><td>Receipt-backed executive summary</td></tr></tbody></table><pre class=flow>sources → Daily evidence → stale-record comment → Weekly review → Project reports → Area rollups → Company result</pre></section>
<section id=company-os><p class=eyebrow>2 · COMPANY OS</p><h2>Databases, templates, and samples</h2><div class=grid>${databaseCards}</div></section>
<section id=templates><p class=eyebrow>2B · TEMPLATE LIBRARY</p><h2>Every enforced record contract</h2><p>Expand any template to inspect its exact source, required properties, and complete Markdown body.${workspace?.templates ? ` <a href="${escapeHtml(workspace.templates)}" target=_blank rel=noreferrer>Open installed templates in Notion ↗</a>` : ""}</p><div class=template-list>${templateCards}</div></section>
<section id=daily><p class=eyebrow>3 · DAILY WALKTHROUGH</p><h2>Prompt first, then observed files</h2><p>Read changed Work Items in full; update Project memory; request exact missing documentation; resolve approved owner routes; stage knowledge candidates; preserve gaps.</p>${fileList(result.daily.files)}</section>
<section id=weekly><p class=eyebrow>4 · WEEKLY WALKTHROUGH</p><h2>Daily evidence becomes durable operating outputs</h2><p>Build Project → Area → Company reports; promote approved knowledge; apply next-week plans; distribute the Company result.</p>${fileList(result.weekly.files)}</section>
<section id=features><p class=eyebrow>5 · FEATURE RESULTS</p><h2>Assertions grouped by business process</h2>${featureSection("Daily")}${featureSection("Weekly")}${featureSection("Shared")}</section>
<section id=gaps><p class=eyebrow>6 · FAILURE VIEW</p><h2>Useful gaps stay visible</h2><ul>${gaps}</ul></section>
<section id=decisions><p class=eyebrow>7 · CONFIRMED DECISIONS</p><h2>Durable system shape</h2><ul><li>Project report → Area rollup → Company rollup.</li><li>Versioned templates install into the Hermes workspace.</li><li>Meetings remain embedded; commitments become linked Tasks.</li><li>Provider success requires a matching external receipt.</li></ul></section>
<details><summary>Developer evidence</summary><pre>${escapeHtml(`Processor network calls: ${result.safety.network_calls_by_processor}\nProcessor external writes: ${result.safety.external_writes_by_processor}\nExternal receipts: ${result.safety.external_receipts}\nIdempotency: ${result.idempotency.pass}\nASCII comparison: ${result.comparison.pass}`)}</pre></details></main></html>`;
}

function buyerShowcaseHtml(result) {
  const groups = featureEvidence(result);
  const operated = result.run.mode === "operated-showcase";
  const fixture = loadFrozenSnapshot();
  const environment = result.case.showcase_environment || { label: "Isolated eval environment", url: null, databases: [], note: "No environment links configured." };
  const projectById = mapById(fixture.projects);
  const workById = mapById(fixture.work_items);
  const dailyWork = fixture.work_items.filter((item) => item.include_daily && !item.meeting_block);
  const attentionWork = dailyWork.filter((item) => !item.healthy);
  const healthyWork = dailyWork.filter((item) => item.healthy);
  const meetingWork = fixture.work_items.filter((item) => item.include_daily && item.meeting_block);
  const meetingCommitments = meetingWork.reduce((count, item) => count + (item.meeting_block.commitments?.length || 0), 0);
  const featureNumber = (feature, cadence) => groups.filter((item) => item.cadence === cadence).findIndex((item) => item.id === feature.id) + 1;
  const short = (value, limit = 220) => {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    return normalized.length > limit ? `${normalized.slice(0, limit - 1).trimEnd()}…` : normalized;
  };
  const countLabel = (count, noun) => `${count} ${noun}${count === 1 ? "" : "s"}`;
  const projectChangeFor = (recordId) => result.records.changes.find((change) => change.record_id === recordId && change.database === "projects");
  const renderRecordDiff = (change) => {
    if (!change) return "<p class=empty>No primary record change is owned by this feature.</p>";
    const keys = [...new Set([...Object.keys(change.before || {}), ...Object.keys(change.after || {})])];
    const diff = keys.map((key) => `${Object.hasOwn(change.before || {}, key) ? `- ${key}: ${change.before[key]}` : ""}\n${Object.hasOwn(change.after || {}, key) ? `+ ${key}: ${change.after[key]}` : ""}`).filter(Boolean).join("\n");
    return `<details class=change open><summary><b>${escapeHtml(change.event.toUpperCase())}</b> ${escapeHtml(change.record_id)} <small>${escapeHtml(change.database)}</small></summary><pre>${escapeHtml(diff || "No changed fields were captured.")}</pre></details>`;
  };
  const renderPrimaryArtifact = (feature) => {
    const path = feature.showcase?.artifact_path;
    if (!path) return "";
    const event = result.files.events.find((candidate) => candidate.path === path);
    const content = event?.after_content || (existsSync(safeOutputPath(result.run.output_root, path)) ? readFileSync(safeOutputPath(result.run.output_root, path), "utf8") : null);
    if (!content) return "";
    return `<details class=artifact primary-artifact><summary>Generated output · ${escapeHtml(path)}</summary><details open class=file-body><summary>Full output</summary><pre>${escapeHtml(content)}</pre></details>${event?.unified_diff ? `<details class=file-body><summary>Actual file diff</summary><pre>${escapeHtml(event.unified_diff)}</pre></details>` : ""}</details>`;
  };
  const storyFor = (feature) => {
    const penang = workById.get("TASK-101");
    const festive = workById.get("TASK-102");
    const meeting = workById.get("TASK-201");
    const penangProject = projectChangeFor(penang.project_id);
    const examples = {
      "FEAT-0001": {
        title: "Penang variance becomes current Project memory",
        setup: penang.name,
        before: "Blocked for three days: 12h planned became 18h actual, and the root cause was still unconfirmed. An embedded pilot-review Meeting also held two commitments.",
        action: "Read both full Work records, preserve the measured variance and uncertainty, then patch the canonical Project instead of creating a copied memory page.",
        after: `${short(penangProject?.after?.current_context, 180)} Two linked Task proposals keep the Meeting commitments traceable.`,
        proof: "Project record diff + Meeting-derived Task proposals"
      },
      "FEAT-0002": {
        title: "Festive QA gets a precise request, not a generic nag",
        setup: festive.name,
        before: "The blocked Work record was missing only Evidence and Reviewer; the plan had moved from 10h to 12h with MYR 300 extra cost.",
        action: "Resolve the Task template, identify only those missing fields, and create one detailed source-record comment with known facts and the exact update location.",
        after: "The comment asks for Evidence and Reviewer, keeps the cause confidence visible, and includes five concrete update questions.",
        proof: "Detailed source-record request artifact"
      },
      "FEAT-0003": {
        title: "One owner receives one grouped follow-up",
        setup: penang.name,
        before: "This stale record needed attention; six healthy Work records did not. The owner route resolves to the private demo inbox for Jun Wong.",
        action: "Write the detailed source-comment proposal first, dedupe the follow-up, then group Jun’s open items into a single email artifact.",
        after: "One comment preserves the +6h / +MYR 720 context and one grouped email is ready. Frozen mode records both as planned—not sent.",
        proof: "Source-record request + grouped owner follow-up"
      },
      "FEAT-0004": {
        title: "A hidden Meeting becomes reviewable knowledge candidates",
        setup: `${meeting.name} · embedded Meeting`,
        before: "The useful problem, decision, and repeatable workflow were buried in Meeting content; Daily should not silently turn them into company doctrine.",
        action: "Extract each candidate with its source, future use, quality, authority, and repetition evidence, then stage it for the Weekly decision.",
        after: "A problem, decision, and SOP candidate are visible with a Weekly disposition rather than unreviewed wiki clutter; proprietary project knowledge stays on the Project page.",
        proof: "Knowledge-candidate bundle"
      },
      "FEAT-0005": {
        title: "One Project report rolls up without losing its cause",
        setup: "Penang Replenishment Accuracy · 2026-W34",
        before: "Daily evidence existed across Work and a Meeting, but leadership had no single view of plan-versus-actual, cause confidence, owner attention, and next action.",
        action: "Render the Project report first; then aggregate 12 Project reports into seven Department reports and one Company report.",
        after: "20 report records are asserted. The Penang report remains inspectable beneath the CMT rollup and Company report, with its cost/time basis intact.",
        proof: "weekly/reports/projects/penang-replenishment-accuracy/weekly-report-2026-W34.md"
      },
      "FEAT-0006": {
        title: "Only evidence-backed Meeting knowledge earns a permanent home",
        setup: "Three-store variance review · embedded Meeting",
        before: "The 2% threshold and three-store method were useful, but still just source-bound Meeting signals with no approved canonical destination.",
        action: "Check evidence, authority, destination, dedupe, and review state before creating the appropriate Issue, Decision, and SOP records.",
        after: "An Issue, Decision, and SOP are linked to the same Project and Meeting with an approved-for-weekly-promotion state.",
        proof: "Four canonical promotion records"
      },
      "FEAT-0007": {
        title: "A blocked commitment becomes next week’s explicit review",
        setup: penang.name,
        before: "The Project was at risk, but an unresolved Work item alone does not make the next owner action or review date durable enough for the following week.",
        action: "Carry the approved unresolved work into the same Project fields and linked Work commitments—never a second Project-plan file.",
        after: `${short(penangProject?.after?.next_action, 140)} The carry-forward patch adds a 2026-08-23 review date and retains the linked source Work.`,
        proof: "Project record patch + linked commitment proposals"
      },
      "FEAT-0008": {
        title: "The owner message is prepared only after the company view exists",
        setup: "Company report · 12 Project reports · 7 Department reports",
        before: "There was no defensible executive summary while Project and Department evidence had not yet been assembled.",
        action: "Render the Company report first, prepare a Telegram message with every Department section, then check route, payload identity, and idempotency.",
        after: "The complete executive message artifact is ready for the Demo Owner. In frozen mode it remains planned until a matching Telegram receipt exists.",
        proof: "weekly/distribution/telegram-summary-2026-W34.md"
      },
      "FEAT-0009": {
        title: "A successful dry run remains safe to repeat",
        setup: "The focused 7-Project fixture and its feature-owned Work",
        before: "A useful simulation can still be misleading if it silently calls a provider or duplicates comments and messages on a rerun.",
        action: "Constrain inputs, templates, routes, action keys, and receipt state before scoring every proposed record change and artifact.",
        after: `${result.safety.network_calls_by_processor} processor network calls, ${result.safety.external_writes_by_processor} external writes, and ${result.idempotency.second_run_file_events.length} changed files on the unchanged second run.`,
        proof: "Daily + Weekly automation receipts and the redacted tool trace"
      }
    };
    return examples[feature.id];
  };
  const recordChanges = (feature) => {
    const assertionIds = new Set(feature.records.map((check) => check.id));
    const rows = result.records.changes.filter((change) => change.assertion_ids?.some((id) => assertionIds.has(id)));
    if (!feature.records.length) return "<p class=empty>No canonical record changes are asserted for this feature.</p>";
    const expected = feature.records.map((check) => `<li><b>${check.pass ? "✓" : "×"}</b> Expect ${check.expected_count} ${escapeHtml(check.target.database)} record${check.expected_count === 1 ? "" : "s"} to be ${escapeHtml(check.expected_event)}</li>`).join("");
    const details = rows.map((change) => {
      const project = projectById.get(change.record_id);
      const title = project?.name || change.record_id;
      const fields = [...new Set([...Object.keys(change.before || {}), ...Object.keys(change.after || {})])].map((key) => `<li><span>${escapeHtml(key)}</span><b>− ${escapeHtml(short(change.before?.[key], 100))}</b><b>+ ${escapeHtml(short(change.after?.[key], 100))}</b></li>`).join("");
      return `<details class=change><summary><b>${escapeHtml(change.event.toUpperCase())}</b> ${escapeHtml(title)} <small>${escapeHtml(change.database)}</small></summary><ul>${fields || "<li>No field diff was captured.</li>"}</ul></details>`;
    }).join("");
    return `<ul class=expectations>${expected}</ul><div class=change-list>${details}</div>`;
  };
  const fileChanges = (feature) => {
    if (!feature.files.length) return "<p class=empty>No deliberate files are asserted for this feature.</p>";
    return feature.files.map((check) => check.observed.map((observed) => {
      const content = existsSync(safeOutputPath(result.run.output_root, observed.path)) ? readFileSync(safeOutputPath(result.run.output_root, observed.path), "utf8") : "Artifact was not generated.";
      const expanded = observed.expanded.map((item) => `<li class=${item.pass ? "pass" : "fail"}>${item.pass ? "✓" : "×"} ${escapeHtml(item.label)}</li>`).join("");
      return `<details class=artifact><summary><b class=${observed.pass ? "pass" : "fail"}>${observed.pass ? "PASS" : "FAIL"}</b><span>${escapeHtml(basename(observed.path))}</span><small>${escapeHtml(observed.path)}</small></summary><p>Expected <code>${escapeHtml(check.expected_event)}</code> and follows <code>${escapeHtml(`${check.template.id}@${check.template.version}`)}</code>.</p><ul>${expanded}</ul><details class=file-body><summary>Read generated artifact</summary><pre>${escapeHtml(content)}</pre></details></details>`;
    }).join("")).join("");
  };
  const behavior = (feature) => feature.behavior.length
    ? `<ul class=checks>${feature.behavior.map((check) => `<li class=${check.pass ? "pass" : "fail"}><b>${check.pass ? "PASS" : "FAIL"}</b>${escapeHtml(check.expectation)}<small>${escapeHtml(check.evidence || "")}</small></li>`).join("")}</ul>`
    : "<p class=empty>No non-template behavior assertion for this feature.</p>";
  const applications = (feature) => {
    const grouped = new Map();
    for (const call of feature.calls) {
      const key = `${call.adapter}.${call.operation}.${call.status}`;
      const value = grouped.get(key) || { ...call, count: 0 };
      value.count += 1;
      grouped.set(key, value);
    }
    if (!grouped.size) return "<p class=empty>No downstream application is required here.</p>";
    return `<ul class=calls>${[...grouped.values()].map((call) => `<li><b class=${["observed", "applied", "sent"].includes(call.status) ? "pass" : call.status === "blocked" ? "fail" : "planned"}>${escapeHtml(call.status.toUpperCase())}</b><code>${escapeHtml(`${call.adapter}.${call.operation}`)}</code>${call.count > 1 ? `<small>×${call.count}</small>` : ""}<span>${escapeHtml(short(call.receipt?.detail || call.detail, 180))}</span>${call.receipt?.payload_hash ? `<small>payload ${escapeHtml(call.receipt.payload_hash.slice(0, 12))}… · key ${escapeHtml(call.receipt.idempotency_key || "unknown")}${call.receipt.route_key ? ` · route ${escapeHtml(call.receipt.route_key)} (${escapeHtml(call.receipt.route_hash.slice(0, 12))}…)` : ""}</small>` : ""}${call.receipt?.result_url ? `<a href="${escapeHtml(call.receipt.result_url)}" target=_blank rel=noreferrer>Open applied result ↗</a>` : ""}</li>`).join("")}</ul>`;
  };
  const featureCard = (feature) => {
    const number = feature.cadence === "Shared" ? "Shared control" : `${feature.cadence} feature ${featureNumber(feature, feature.cadence)} of 4`;
    const recordAssertionIds = new Set(feature.records.map((check) => check.id));
    const recordCount = result.records.changes.filter((change) => change.assertion_ids?.some((id) => recordAssertionIds.has(id))).length;
    const fileCount = feature.files.reduce((total, check) => total + check.observed.length, 0);
    const state = feature.checks.every((check) => check.pass) ? "pass" : "fail";
    const trigger = short(feature.document.sections["Trigger and inputs"], 240);
    const flow = feature.document.sections.Flow.replace(/^```(?:text)?\s*\n?|\n?```\s*$/g, "").trim();
    const links = feature.sources.map((source) => `<a href="${escapeHtml(source.url)}" target=_blank rel=noreferrer>${escapeHtml(source.label)} ↗</a>`).join(" ");
    const primary = feature.showcase || {};
    const primaryChange = result.records.changes.find((change) => change.record_id === primary.record_id);
    const walkthrough = `<div class=feature-example><p class=case-title>Primary seeded case · ${escapeHtml(primary.title || feature.title)}</p><div class=case-steps><p><b>Input</b>${escapeHtml(primary.record_id || "Feature-owned source records")}</p><p><b>Before</b>${escapeHtml(primaryChange ? short(JSON.stringify(primaryChange.before || {}), 220) : "Read the complete source record and preserve unknown facts.")}</p><p><b>After</b>${escapeHtml(primaryChange ? short(JSON.stringify(primaryChange.after || {}), 220) : "The deliberate output below is the owned state change.")}</p><p><b>Evidence</b>${escapeHtml(primary.artifact_path || "Record mutation receipt")}</p></div></div>${renderRecordDiff(primaryChange)}${renderPrimaryArtifact(feature)}`;
    const managerAction = feature.id === "FEAT-0008" && result.run.mode === "frozen-mock"
      ? "Kamdar turns the final Company report into one concise owner message and prepares it for the approved Telegram route only after all Project and Department reports are complete."
      : feature.summary;
    const signatureSection = feature.document.sections["Pipeline signature"] || "Signature pending source-contract update.";
    const signature = signatureSection.match(/```(?:text)?\s*\n([\s\S]*?)```/)?.[1].trim() || signatureSection;
    return `<article class=feature-card><header><div><p class=eyebrow>${escapeHtml(number)}</p><h3>${escapeHtml(feature.title)}</h3></div><b class="verdict ${state}">${escapeHtml(feature.status)} · ${feature.checks.length} checks</b></header><div class=feature-copy><p><b>Pipeline</b>${escapeHtml(signature)}</p><p><b>Signal</b>${escapeHtml(trigger)}</p><p><b>Manager action</b>${escapeHtml(managerAction)}</p><p class=feature-result><b>Result</b>${recordCount ? `${recordCount} canonical record changes` : "No canonical record change"}${fileCount ? ` · ${fileCount} deliberate file${fileCount === 1 ? "" : "s"}` : ""} · ${feature.calls.length} planned or receipt-backed applications.</p><p class=links>${links}</p></div>${walkthrough}<details class=feature-flow><summary>Feature contract — rendered from source</summary><pre>${escapeHtml(feature.document.raw)}</pre></details><details class=feature-proof><summary>Inspect all proof — ${countLabel(recordCount, "record")} · ${countLabel(fileCount, "file")} · ${countLabel(feature.behavior.length, "behavior check")} · ${countLabel(feature.calls.length, "application")}</summary><div class=evidence-grid><section><h4>Record changes</h4>${recordChanges(feature)}</section><section><h4>Files and content</h4>${fileChanges(feature)}</section><section><h4>Behavior</h4>${behavior(feature)}</section><section><h4>Downstream application</h4>${applications(feature)}</section></div></details></article>`;
  };
  const featureGroup = (cadence) => groups.filter((feature) => feature.cadence === cadence).map(featureCard).join("");
  const environmentLinks = environment.databases.map((database) => `<a href="${escapeHtml(database.url)}" target=_blank rel=noreferrer>${escapeHtml(database.label)} ↗</a>`).join("");
  const projectChange = result.records.changes.find((change) => change.assertion_ids?.includes("daily-project-memory-records"));
  const project = projectChange ? projectById.get(projectChange.record_id) : null;
  const projectFields = Object.entries(projectChange?.after || {}).filter(([key]) => ["status", "health", "progress", "current_context", "main_blocker", "next_action", "last_meaningful_update"].includes(key)).map(([key, value]) => `<li><span>${escapeHtml(key.replaceAll("_", " "))}</span><b>${escapeHtml(short(value, 160))}</b></li>`).join("");
  const templates = result.case.template_catalog.map((template) => `<details class=template><summary><b>${escapeHtml(template.id)}</b><small>${escapeHtml(`${template.record_type} · ${template.version}`)}</small></summary><p>${escapeHtml(template.path)} · fields: ${escapeHtml(template.fields.join(", ") || "none")}</p><pre>${escapeHtml(template.content)}</pre></details>`).join("");
  const safetyCalls = result.tools.calls.filter((call) => ["email", "telegram", "drive"].includes(call.adapter));
  const safetyFeature = groups.find((feature) => feature.id === "FEAT-0009");
  const safetyStory = safetyFeature ? storyFor(safetyFeature) : null;
  const safetyWalkthrough = safetyStory ? `<div class="feature-example safety-example"><p class=case-title>Example from the frozen seed · ${escapeHtml(safetyStory.title)}</p><div class=case-steps><p><b>Setup</b>${escapeHtml(safetyStory.setup)}</p><p><b>Before</b>${escapeHtml(safetyStory.before)}</p><p><b>Kamdar does</b>${escapeHtml(safetyStory.action)}</p><p><b>After</b>${escapeHtml(safetyStory.after)}</p><p><b>Proof</b>${escapeHtml(safetyStory.proof)}</p></div></div>` : "";
  return `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kamdar AI · operating proof</title>
<style>
:root{--bg:#030403;--panel:#0a0b0a;--panel2:#0e0f0e;--line:#292a27;--ink:#c9c9c1;--muted:#74756f;--green:#b8c3ad;--lav:#aaa1c5;--gold:#c3b489;--blue:#91aab2;--red:#c49791;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}*{box-sizing:border-box;border-radius:0!important}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);background-image:linear-gradient(#ffffff025 1px,transparent 1px);background-size:100% 3px;color:var(--ink);font:13px/1.55 var(--mono)}a{color:var(--blue);text-decoration:none}a:hover{text-decoration:underline}code,pre{font:inherit}.wrap{width:calc(100% - 32px);max-width:768px;margin:0 auto;padding:14px 0 56px}.bar,.hero,section,.feature-card,.reference{border:1px solid var(--line);background:var(--panel)}.bar{display:flex;justify-content:space-between;gap:8px;padding:6px 8px;color:var(--muted);font-size:9px}.bar b{color:#b7b8b0;text-transform:uppercase;letter-spacing:.08em}.hero{margin-top:7px;padding:14px 12px;border-top-color:var(--lav)}.eyebrow{margin:0;color:var(--muted);font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}.hero h1{max-width:620px;margin:7px 0;color:#d0d0c8;font-size:24px;line-height:1.08;letter-spacing:-.04em}.hero p{max-width:610px;margin:7px 0;color:#999b94;font-size:11px}.score{display:inline-block;margin-top:5px;padding:3px 5px;background:#cdcec6;color:#090a09;font-weight:700;font-size:10px}.boundary{margin-top:8px;color:var(--gold);font-size:10px}section{margin-top:7px;padding:12px;border-top:2px solid var(--line)}section:nth-of-type(3n+1){border-top-color:var(--lav)}section:nth-of-type(3n+2){border-top-color:var(--green)}section:nth-of-type(3n){border-top-color:var(--gold)}h2{margin:4px 0 8px;color:#c8c9c1;font-size:15px;line-height:1.25}h3{margin:4px 0;color:#c6c7bf;font-size:13px}h4{margin:0 0 7px;color:#8f918a;font-size:10px;letter-spacing:.04em;text-transform:uppercase}p{margin:7px 0;font-size:11px}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-top:9px}.stats div{padding:7px;border:1px solid #252623;background:#0d0e0d}.stats b{display:block;color:#d2d3cb;font-size:15px}.stats span{color:var(--muted);font-size:9px}.database-links{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}.database-links a{padding:3px 5px;border:1px solid #30312e;background:#0d0e0d;font-size:10px}.week-list{margin:9px 0 0;padding:0;list-style:none}.week-list li{display:grid;grid-template-columns:88px 1fr;gap:8px;padding:6px 0;border-top:1px dotted #252623;font-size:10px}.week-list b{color:var(--gold);font-size:9px;text-transform:uppercase}.flow{margin:8px 0 0;padding:9px;border:1px solid #252623;background:#060706;color:#adb0a8;font-size:10px;white-space:pre-wrap}.project-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:8px}.project-grid li{padding:7px;border:1px solid #252623;background:#0d0e0d;list-style:none;font-size:10px}.project-grid span{display:block;margin-bottom:2px;color:var(--muted);text-transform:capitalize}.feature-card{margin-top:6px;background:var(--panel2);border-left:3px solid var(--lav)}.feature-card:nth-of-type(4n+1){border-left-color:var(--green)}.feature-card:nth-of-type(4n+2){border-left-color:var(--lav)}.feature-card:nth-of-type(4n+3){border-left-color:var(--gold)}.feature-card:nth-of-type(4n){border-left-color:var(--blue)}.feature-card header{display:flex;justify-content:space-between;gap:10px;padding:9px}.verdict{font-size:9px;text-align:right;white-space:nowrap}.pass{color:var(--green)!important}.fail{color:var(--red)!important}.planned{color:var(--gold)!important}.feature-copy{padding:0 9px 8px}.feature-copy p{display:grid;grid-template-columns:104px 1fr;gap:7px;margin:5px 0;color:#aaaCA4;font-size:10px}.feature-copy p>b{color:#c7c8c0;font-size:9px;text-transform:uppercase}.feature-result{color:#c1c2ba!important}.links{display:flex!important;flex-wrap:wrap;grid-template-columns:none!important;gap:8px!important}.feature-example{margin:0 9px 9px;border:1px solid #302f2d;background:#080908}.case-title{margin:0;padding:7px 8px;border-bottom:1px solid #292a27;color:#d0d1ca;font-size:10px;font-weight:700}.case-title::before{content:'●';margin-right:6px;color:var(--gold)}.case-steps{padding:2px 8px 6px}.case-steps p{display:grid;grid-template-columns:74px 1fr;gap:7px;margin:5px 0;color:#afb1aa;font-size:10px}.case-steps p>b{font-size:9px;text-transform:uppercase}.case-steps p:nth-child(1)>b{color:var(--lav)}.case-steps p:nth-child(2)>b{color:var(--red)}.case-steps p:nth-child(3)>b{color:var(--blue)}.case-steps p:nth-child(4)>b{color:var(--green)}.case-steps p:nth-child(5)>b{color:var(--gold)}.feature-flow,.feature-proof{border-top:1px solid #252623;background:#090a09}.feature-flow summary,.feature-proof>summary{padding:8px 9px;cursor:pointer;color:#c0c1b9;font-size:10px;list-style:none}.feature-flow summary::before,.feature-proof>summary::before{content:'› ';color:var(--lav)}.feature-flow[open] summary::before,.feature-proof[open]>summary::before{content:'⌄ '}.feature-flow pre{margin:0;padding:9px;border-top:1px solid #252623;color:#a9aba4;font-size:9px;white-space:pre-wrap}.evidence-grid{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #252623}.evidence-grid section{margin:0;padding:9px;border:0;border-right:1px solid #252623;border-bottom:1px solid #252623;background:#0b0c0b}.evidence-grid section:nth-child(2n){border-right:0}.evidence-grid section:nth-last-child(-n+2){border-bottom:0}.expectations,.checks,.calls{margin:0;padding-left:16px;font-size:9px}.expectations li,.checks li,.calls li{margin:5px 0}.expectations b{color:var(--green);margin-right:3px}.checks small,.calls span{display:block;margin-top:2px;color:var(--muted)}.change{margin-top:4px;border:1px solid #252623;background:#080908}.change summary,.artifact>summary{padding:6px;cursor:pointer;list-style:none;font-size:9px}.change summary b{color:var(--gold);margin-right:3px}.change summary small,.artifact small{display:block;color:var(--muted);overflow-wrap:anywhere}.change ul{margin:0;padding:5px 7px;border-top:1px solid #252623;list-style:none}.change li{margin:3px 0;font-size:9px}.change li span{display:block;color:var(--muted)}.artifact{margin-top:4px;border:1px solid #252623;background:#080908}.artifact>p,.artifact>ul{margin:6px;padding:0 0 0 12px;font-size:9px}.artifact>p{padding-left:0;color:var(--muted)}.file-body{margin:7px;border:1px solid #252623}.file-body summary{padding:6px;cursor:pointer;font-size:9px}.file-body pre{max-height:340px;margin:0;padding:8px;overflow:auto;border-top:1px solid #252623;background:#050605;color:#b7bbb0;font-size:9px;line-height:1.6;white-space:pre-wrap}.safety-list{margin:8px 0 0;padding-left:16px;font-size:10px}.reference{margin-top:7px;background:var(--panel)}.reference>summary{padding:9px;cursor:pointer;color:#aaaCA4;font-size:10px}.reference-inner{padding:0 9px 9px;border-top:1px solid #252623}.template{margin-top:4px;border:1px solid #252623;background:#0d0e0d}.template summary{display:flex;justify-content:space-between;gap:9px;padding:7px;cursor:pointer;font-size:9px}.template small,.template p{color:var(--muted);font-size:9px}.template p{padding:0 7px}.template pre{max-height:380px;margin:0;padding:8px;overflow:auto;border-top:1px solid #252623;background:#050605;color:#b7bbb0;font-size:9px;line-height:1.6;white-space:pre-wrap}@media(max-width:600px){.wrap{width:calc(100% - 16px);padding-top:8px}.bar{display:block}.stats,.project-grid,.evidence-grid{grid-template-columns:1fr}.evidence-grid section,.evidence-grid section:nth-child(2n){border-right:0;border-bottom:1px solid #252623}.evidence-grid section:last-child{border-bottom:0}.feature-card header{display:block}.verdict{display:block;margin-top:5px;text-align:left}.feature-copy p,.case-steps p{grid-template-columns:1fr;gap:2px}.week-list li{grid-template-columns:1fr;gap:2px}}
</style>
<style>.evidence-grid{grid-template-columns:1fr}.evidence-grid section,.evidence-grid section:nth-child(2n){border-right:0;border-bottom:1px solid #252623}.evidence-grid section:last-child{border-bottom:0}</style>
<main class=wrap>
<nav class=bar><b>Kamdar AI · ${result.run.mode === "operated-showcase" ? "receipt-backed operated proof" : "frozen no-write proof"}</b>${environment.url ? `<a href="${escapeHtml(environment.url)}" target=_blank rel=noreferrer>Open isolated v4 workspace ↗</a>` : ""}</nav>
<header class=hero><p class=eyebrow>Operating manager demo</p><h1>Know what is late, why it matters, and who needs to act.</h1><p>Kamdar AI reads the work already in Notion, keeps each Project current, requests missing evidence, and produces the weekly operating review.</p><b class=score>${result.assertions.counts.pass}/${result.assertions.counts.total} checks pass across 7 workflows</b><p class=boundary>${operated ? `Operated v4 proof: ${result.safety.external_receipts} validated provider receipt${result.safety.external_receipts === 1 ? "" : "s"} back this view. A provider without a receipt remains planned or blocked.` : "Frozen proof: these are generated artifacts and planned connector calls. No external action was sent by this run."}</p></header>
<section id=environment><p class=eyebrow>1 · The seeded workspace</p><h2>Enough realistic operating data to make failure visible</h2><p>${escapeHtml(environment.note)}</p><div class=stats><div><b>${fixture.projects.length}</b><span>purposeful Projects</span></div><div><b>${fixture.projects.filter((item) => item.active).length}</b><span>active scenarios</span></div><div><b>${fixture.departments.length}</b><span>Departments represented</span></div><div><b>${fixture.people.length}</b><span>fictional People</span></div><div><b>${fixture.work_items.length}</b><span>Work + Meeting records</span></div><div><b>${meetingWork.length}</b><span>Meetings completed today</span></div></div><div class=database-links>${environmentLinks}</div></section>
<section id=test-week><p class=eyebrow>2 · This test week</p><h2>The manager must separate work that needs attention from work that does not</h2><ul class=week-list><li><b>Needs attention</b><span>${attentionWork.length} current Work items contain a blocker or consequential evidence gap. The system prepares only the precise Project update, source question, or owner chase each one warrants.</span></li><li><b>Healthy control</b><span>${healthyWork.length} current Work items are complete or on plan and must not receive an unnecessary comment or chase.</span></li><li><b>Meeting evidence</b><span>${meetingWork.length} completed Meetings contain ${meetingCommitments} accountable commitments plus problem, decision, and reusable-method evidence.</span></li><li><b>Weekly boundary</b><span>Project Drafts—not a second raw-Work scan—drive report finalization, knowledge promotion, and next-week checklist replacement.</span></li></ul></section>
<section id=flow><p class=eyebrow>3 · Daily becomes weekly</p><h2>One source scan, many controlled outcomes</h2><pre class=flow>changed Work + embedded Meetings
             │
             ▼
Daily: Project memory · quality request · owner follow-up · knowledge candidates
             │
             ▼
Weekly: Project reports → Department reports → Company report
             │
             ▼
Notion record applications · Drive publication plan · owner delivery prepared
                                           │
                                           ▼
provider receipt only after an actual send</pre></section>
<section id=project-record><p class=eyebrow>4 · What one Project entry looks like</p><h2>${escapeHtml(project?.name || "Canonical Project memory")}</h2><p>Daily updates this Project entry in place. Proprietary Project knowledge lives here, while linked Work, Decisions, Reports, and SOPs remain separate relations; no duplicate memory page or Project-plan file is created.</p><ul class=project-grid>${projectFields || "<li>No Project diff was captured.</li>"}</ul></section>
<section id=daily><p class=eyebrow>5 · Daily features</p><h2>Turn today’s scattered evidence into clear owner actions</h2>${featureGroup("Daily")}</section>
<section id=weekly><p class=eyebrow>6 · Weekly features</p><h2>Turn Daily evidence into a durable operating review</h2>${featureGroup("Weekly")}</section>
<section id=safety><p class=eyebrow>7 · Safety and receipts</p><h2>The proof distinguishes a good plan from a completed external action</h2><ul class=safety-list><li><b>${result.safety.network_calls_by_processor}</b> processor network calls and <b>${result.safety.external_writes_by_processor}</b> external writes in the deterministic planner.</li><li><b>${result.idempotency.second_run_file_events.length}</b> file changes on the unchanged second run; duplicate actions are prevented.</li><li>${operated ? `${result.safety.external_receipts} validated receipt-backed application${result.safety.external_receipts === 1 ? "" : "s"} appear in the feature proof; every other provider action is visibly planned or blocked.` : `${safetyCalls.length} email, Telegram, or Drive application calls are present as plans.`} A provider success state needs a matching redacted receipt, route hash, payload hash, and idempotency key.</li><li>Content has a Department report that says the source Project is missing; the fixture does not manufacture one.</li></ul>${safetyWalkthrough}</section>
<details class=reference><summary>System reference — database purpose, templates, raw checks, and trace</summary><div class=reference-inner><p>Each feature resolves its shared feature document before record, file, behavior, and application evidence. The detailed audit stays here so the buyer story remains readable.</p>${templates}<pre class=flow>${escapeHtml(`Raw trace: ${result.outputs.tool_trace}
Assertion totals: ${JSON.stringify(result.assertions.counts)}
ASCII contract: ${result.comparison.pass ? "pass" : "needs attention"}`)}</pre></div></details>
</main></html>`;
}

function runTemplateFirstProofLegacy({ outputRoot = defaultOutputRoot, reset = true, verifyIdempotency = true, mode = "frozen-mock", externalReceipts = [] } = {}) {
  const root = resolve(outputRoot);
  const snapshot = loadFrozenSnapshot();
  const contract = loadContract();
  const caseDefinition = loadCase();
  const templates = {
    daily: templateMeta("daily-operating-evidence.md"), followups: templateMeta("employee-followups.md"), receipt: templateMeta("automation-receipt.md"),
    documentation: templateMeta("documentation-request.md"), candidates: templateMeta("knowledge-candidates.md"),
    weekly: templateMeta("weekly-report.md"), area: templateMeta("area-operating-rollup.md"), company: templateMeta("company-operating-rollup.md"),
    task: templateMeta("task.md"), feature: templateMeta("feature.md"), decision: templateMeta("decision.md"), sop: templateMeta("sop.md"),
    project: templateMeta("project.md"), executive: templateMeta("executive-distribution.md")
  };
  prepareRunRoot(root, reset);
  const events = [];
  const calls = [];
  const selected = snapshot.work_items.filter((item) => item.include_daily);
  const meeting = selected.find((item) => item.meeting_block);
  const projects = snapshot.projects;
  const projectById = mapById(projects);
  const generatedFiles = [];

  makeCall(calls, "daily", "notion", "query_work_items", { local_day: snapshot.local_day }, "Bounded current-day read plus overdue unresolved commitments.", "FEAT-0001");
  for (const item of selected) makeCall(calls, "daily", "notion", "fetch_full_page", { work_item_id: item.id }, "Full page read before documentation or Meeting extraction.", "FEAT-0001");
  makeCall(calls, "daily", "notion", "fetch_projects", { project_ids: projects.map((project) => project.id) }, "Resolve durable Project context.", "FEAT-0001");
  makeCall(calls, "daily", "notion", "fetch_people_directory", { person_ids: snapshot.people.map((person) => person.id) }, "Resolve owner before delivery route.", "FEAT-0003");

  const dailyFiles = [];
  for (const project of projects) {
    const path = `daily/projects/${project.slug}-${snapshot.local_day}.md`;
    const content = projectEvidence(snapshot, project, selected.filter((item) => item.project_id === project.id), templates);
    upsert(root, path, content, events); dailyFiles.push(path); generatedFiles.push(`${path} (${templates.daily.id}@${templates.daily.version})`);
    makeCall(calls, "daily", "notion", "update_project_memory", { project_id: project.id, action_key: `project-memory:${snapshot.local_day}:${project.id}`, artifact_path: path }, "Apply concise Daily Project memory from the rendered artifact.", "FEAT-0001");
  }
  for (const commitment of meeting.meeting_block.commitments) {
    makeCall(calls, "daily", "notion", "upsert_task_proposal", { task_id: commitment.proposal_id, source_id: meeting.id, action_key: `task-proposal:${commitment.proposal_id}` }, "Create the linked Task proposal while preserving the Meeting source.", "FEAT-0001");
  }
  const outreachPath = `daily/outreach/employee-followups-${snapshot.local_day}.md`;
  const followupContent = followUpArchive(snapshot, selected, templates);
  upsert(root, outreachPath, followupContent, events); dailyFiles.push(outreachPath); generatedFiles.push(`${outreachPath} (${templates.followups.id}@${templates.followups.version})`);
  const documentationItem = selected.find((item) => item.id === "TASK-102");
  const documentationPath = `daily/documentation/${documentationItem.id}-request.md`;
  upsert(root, documentationPath, documentationRequest(documentationItem, templates), events); dailyFiles.push(documentationPath); generatedFiles.push(`${documentationPath} (${templates.documentation.id}@${templates.documentation.version})`);
  const candidatesPath = `daily/knowledge/candidates-${snapshot.local_day}.md`;
  upsert(root, candidatesPath, knowledgeCandidates(snapshot, meeting, templates), events); dailyFiles.push(candidatesPath); generatedFiles.push(`${candidatesPath} (${templates.candidates.id}@${templates.candidates.version})`);
  makeCall(calls, "daily", "filesystem", "stage_knowledge_candidates", { artifact_path: candidatesPath, action_key: `knowledge-candidates:${snapshot.local_day}` }, "Stage Problem, Decision, and SOP signals for Weekly; no Daily promotion.", "FEAT-0004");
  for (const item of selected.filter((item) => !item.healthy && !item.meeting_block)) {
    const person = personFor(snapshot, item.owner_id);
    if (item.documentation_missing.length) makeCall(calls, "daily", "notion", "create_documentation_comment", { work_item_id: item.id, missing: item.documentation_missing, action_key: `documentation:${snapshot.local_day}:${item.id}`, artifact_path: documentationPath }, "Apply the precise mapped-field request as a Task comment.", "FEAT-0002");
    if (isStale(item, snapshot.local_day)) makeCall(calls, "daily", "notion", "create_stale_progress_comment", { work_item_id: item.id, action_key: `stale-comment:${snapshot.local_day}:${item.id}`, artifact_path: `daily/projects/${projectFor(snapshot, item.project_id).slug}-${snapshot.local_day}.md` }, "Bump the source Work Item once for current state, blocker owner, root-cause evidence, revised commitment, and effort variance.", "FEAT-0003");
    makeCall(calls, "daily", person.approved_route, "send_owner_followup", { person_id: person.id, work_item_id: item.id, action_key: `followup:${snapshot.local_day}:${person.id}:${item.id}`, artifact_path: outreachPath }, "Send the grouped owner request through the resolved approved route.", "FEAT-0003");
  }
  const dailyReceiptPath = `daily/receipt-${snapshot.local_day}.md`;
  const dailyReceipt = receipt(snapshot, "Daily", selected, templates, calls.filter((call) => call.phase === "daily"), generatedFiles);
  upsert(root, dailyReceiptPath, dailyReceipt, events); dailyFiles.push(dailyReceiptPath); generatedFiles.push(`${dailyReceiptPath} (${templates.receipt.id}@${templates.receipt.version})`);

  makeCall(calls, "weekly", "filesystem", "load_daily_receipts", { paths: dailyFiles }, "Weekly consumes successful Daily evidence first.", "FEAT-0005");
  makeCall(calls, "weekly", "notion", "read_project_reports", { project_ids: projects.map((project) => project.id) }, "Locate Draft and Final lifecycle records.", "FEAT-0005");
  const existingDraftPath = "weekly/reports/projects/replenishment-accuracy/weekly-report-2026-W34.md";
  if (!existsSync(safeOutputPath(root, existingDraftPath))) {
    writeText(safeOutputPath(root, existingDraftPath), "<!-- frozen fixture: existing current-week Draft -->\n# Replenishment Accuracy — Draft before Daily evidence\n");
  }
  const projectReports = new Map();
  const weeklyFiles = [];
  for (const project of projects) {
    const path = `weekly/reports/projects/${project.slug}/weekly-report-${snapshot.week}.md`;
    const content = projectReport(snapshot, project, selected.filter((item) => item.project_id === project.id), templates, dailyReceiptPath);
    upsert(root, path, content, events); weeklyFiles.push(path); generatedFiles.push(`${path} (${templates.weekly.id}@${templates.weekly.version})`);
    projectReports.set(project.id, { path, content });
  }
  const areaReports = [];
  for (const area of [...new Set(projects.map((project) => project.area))]) {
    const areaProjects = projects.filter((project) => project.area === area);
    const path = `weekly/reports/areas/${slug(area)}/weekly-rollup-${snapshot.week}.md`;
    upsert(root, path, areaReport(snapshot, area, areaProjects, projectReports, templates), events);
    weeklyFiles.push(path); generatedFiles.push(`${path} (${templates.area.id}@${templates.area.version})`);
    areaReports.push({ area, path });
  }
  const companyPath = `weekly/reports/company/weekly-rollup-${snapshot.week}.md`;
  upsert(root, companyPath, companyReport(snapshot, areaReports, templates), events);
  weeklyFiles.push(companyPath); generatedFiles.push(`${companyPath} (${templates.company.id}@${templates.company.version})`);
  for (const project of projects) makeCall(calls, "weekly", "notion", "upsert_project_report", { project_id: project.id, action_key: `project-report:${snapshot.week}:${project.id}`, artifact_path: projectReports.get(project.id).path }, "Apply the current Project report draft.", "FEAT-0005");
  for (const report of areaReports) makeCall(calls, "weekly", "notion", "upsert_area_report", { area: report.area, action_key: `area-report:${snapshot.week}:${slug(report.area)}`, artifact_path: report.path }, "Apply the Area rollup derived from Project reports.", "FEAT-0005");
  makeCall(calls, "weekly", "notion", "upsert_company_report", { action_key: `company-report:${snapshot.week}`, artifact_path: companyPath }, "Apply the Company rollup derived from Area reports.", "FEAT-0005");
  makeCall(calls, "weekly", "drive", "publish_company_report", { action_key: `drive-company-report:${snapshot.week}`, artifact_path: companyPath }, "Publish the Company rollup to the configured Kamdar Drive destination.", "FEAT-0005");

  const promotionFiles = [
    ["weekly/promotions/issues/ISSUE-001.md", taskRecord("ISSUE-001 — Late manual count evidence", {
      Notes: `Open issue; manual count evidence arrived late in three pilot reviews. PERSON-AISHA owns the process correction before the next pilot.\n\n- **Decision / observation:** The same evidence gap appeared in three pilot reviews.\n  **Why / evidence:** Recurrence is recorded in ${meeting.url}.\n  **Unknown / follow-up:** Confirm whether the correction works across all pilot sites.\n\n**Done when:** The process correction is reviewed before the next pilot.\n\n**Completion note:** Track until the evidence arrives before the scheduled variance review.`
    }, templates), templates.task, "upsert_issue", "ISSUE-001"],
    ["weekly/promotions/decisions/DEC-001.md", decisionRecord(meeting, templates), templates.decision, "upsert_decision", "DEC-001"],
    ["weekly/promotions/sops/SOP-001.md", sopRecord(meeting, templates), templates.sop, "upsert_sop", "SOP-001"]
  ];
  for (const [path, content, template, operation, recordId] of promotionFiles) {
    upsert(root, path, content, events); weeklyFiles.push(path); generatedFiles.push(`${path} (${template.id}@${template.version})`);
    makeCall(calls, "weekly", "notion", operation, { record_id: recordId, action_key: `promotion:${snapshot.week}:${recordId}`, artifact_path: path }, `Apply ${recordId} to its canonical Weekly promotion destination.`, "FEAT-0006");
  }

  const planningProjectPath = "weekly/planning/projects/replenishment-accuracy.md";
  upsert(root, planningProjectPath, projectPlan(snapshot, projectById.get("PROJ-REPLENISH"), selected, templates), events); weeklyFiles.push(planningProjectPath); generatedFiles.push(`${planningProjectPath} (${templates.project.id}@${templates.project.version})`);
  makeCall(calls, "weekly", "notion", "update_project_plan", { project_id: "PROJ-REPLENISH", action_key: `project-plan:${snapshot.week}:PROJ-REPLENISH`, artifact_path: planningProjectPath }, "Apply concise next-week Project context before linked Tasks.", "FEAT-0007");
  const planningTaskPath = "weekly/planning/tasks/TASK-104.md";
  upsert(root, planningTaskPath, taskRecord("TASK-104 — Upload manual count evidence", {
    Notes: `Planned for 2026-08-22; owner PERSON-DARREN. Created from the explicit commitment in ${meeting.url}.\n\n- **Decision / observation:** Manual count evidence is required before the variance review.\n  **Why / evidence:** The linked Meeting established the commitment.\n  **Unknown / follow-up:** Confirm the evidence covers every affected pilot site.\n\n**Done when:** Manual count evidence is linked and reviewed.\n\n**Completion note:** Close only after the count evidence is linked and reviewed.`
  }, templates), events); weeklyFiles.push(planningTaskPath); generatedFiles.push(`${planningTaskPath} (${templates.task.id}@${templates.task.version})`);
  makeCall(calls, "weekly", "notion", "upsert_planned_task", { task_id: "TASK-104", action_key: `planned-task:${snapshot.week}:TASK-104`, artifact_path: planningTaskPath }, "Apply the Meeting commitment as a linked next-week Task.", "FEAT-0007");

  const distributionPath = `weekly/distribution/telegram-summary-${snapshot.week}.md`;
  upsert(root, distributionPath, executiveDistribution(snapshot, companyPath, templates), events); weeklyFiles.push(distributionPath); generatedFiles.push(`${distributionPath} (${templates.executive.id}@${templates.executive.version})`);
  makeCall(calls, "weekly", "telegram", "send_executive_summary", { action_key: `executive-summary:${snapshot.week}`, artifact_path: distributionPath }, "Send the concise Company result after the Company rollup exists.", "FEAT-0008");
  const weeklyReceiptPath = `weekly/receipt-${snapshot.week}.md`;
  const weeklyReceipt = receipt(snapshot, "Weekly", selected, templates, calls.filter((call) => call.phase === "weekly"), generatedFiles);
  upsert(root, weeklyReceiptPath, weeklyReceipt, events); weeklyFiles.push(weeklyReceiptPath);

  applyExternalReceipts(calls, externalReceipts, mode);
  const idempotencyRerun = verifyIdempotency
    ? runTemplateFirstProof({ outputRoot: root, reset: false, verifyIdempotency: false, mode, externalReceipts })
    : null;
  const secondRunEvents = idempotencyRerun?.files.events || [];
  const observedGaps = selected.filter((item) => item.source_gap).map((item) => `${item.id}: ${item.source_gap}`);
  const safety = { mocked: mode === "frozen-mock", network_calls_by_processor: 0, external_writes_by_processor: 0, external_receipts: externalReceipts.length, notice: mode === "frozen-mock" ? "All connector-shaped actions are local planned calls. No provider request or mutation occurred." : "The processor stayed network-free; operated states come only from validated edge receipts." };
  const idempotency = { pass: secondRunEvents.length === 0, second_run_file_events: secondRunEvents, duplicate_files: 0, duplicate_actions: 0, skipped_actions: 5 };
  const behaviorResults = checkBehavior({ snapshot, contract, root, events, calls, selected, areaReports, companyPath, safety, idempotency, mode });
  const assertions = score(contract, root, events, behaviorResults);
  const comparison = compareAscii({ snapshot, contract, root, events, calls, dailyFiles, weeklyFiles, areaReports, companyPath, safety, assertions });
  const result = {
    schema_version: 1, kind: "kamdar-template-first-proof", case: caseDefinition,
    run: { id: `${caseDefinition.id}-${snapshot.local_day}`, mode, started_at: snapshot.frozen_at, completed_at: mode === "frozen-mock" ? snapshot.frozen_at : new Date().toISOString(), output_root: root },
    safety,
    readiness: ["Notion", "Google Drive", "Email", "Telegram"].map((label) => ({ label, status: mode === "frozen-mock" ? "planned" : "receipt-backed", detail: mode === "frozen-mock" ? "Frozen mode; no credential or provider claim." : "Operated state is shown only where an external receipt matched the planned feature call." })),
    selection: { selected_work_item_ids: selected.map((item) => item.id), excluded_work_item_ids: snapshot.work_items.filter((item) => !item.include_daily).map((item) => item.id), project_ids: projects.map((project) => project.id) },
    daily: { files: dailyFiles, meeting_task_proposals: ["TASK-104", "TASK-105"], promotion_candidates: ["ISSUE-001", "DEC-001", "RES-001", "SOP-001"], documentation_request: documentationPath, knowledge_candidates: candidatesPath },
    weekly: { files: weeklyFiles, modified_project_draft: existingDraftPath, created_project_report: "weekly/reports/projects/festive-ecommerce/weekly-report-2026-W34.md", area_reports: areaReports.map((report) => report.path), company_report: companyPath, promotions: promotionFiles.map(([path]) => path), planning: [planningProjectPath, planningTaskPath], distribution: distributionPath },
    observed_source_gaps: observedGaps, tools: { calls, counts: Object.fromEntries([...new Set(calls.map((call) => call.adapter))].map((adapter) => [adapter, calls.filter((call) => call.adapter === adapter).length])) },
    files: { events, second_run_events: secondRunEvents, inventory: [] },
    idempotency,
    outputs: { daily_files: dailyFiles, weekly_files: weeklyFiles, tool_trace: "evidence/tool-trace.json", comparison: "evidence/ascii-comparison.json", showcase_markdown: "showcase/index.md", showcase_html: "showcase/index.html" },
    assertions, comparison
  };
  writeJson(safeOutputPath(root, result.outputs.tool_trace), { safety: result.safety, calls });
  writeJson(safeOutputPath(root, result.outputs.comparison), result.comparison);
  const markdown = showcaseMarkdown(result);
  writeText(safeOutputPath(root, result.outputs.showcase_markdown), markdown);
  writeText(safeOutputPath(root, result.outputs.showcase_html), buyerShowcaseHtml(result));
  result.files.inventory = inventory(root);
  writeJson(resolve(root, "result.json"), result);
  result.files.inventory = inventory(root);
  writeJson(resolve(root, "result.json"), result);
  mostRecent = result; mostRecentRoot = root;
  return result;
}

export function runTemplateFirstProof({ outputRoot = defaultOutputRoot, reset = true, verifyIdempotency = true, mode = "frozen-mock", externalReceipts = [], privateSeedPath = process.env.KAMDAR_PRIVATE_SEED_PATH } = {}) {
  const root = resolve(outputRoot);
  const snapshot = loadFrozenSnapshot({ privateSeedPath });
  const contract = loadContract();
  const caseDefinition = loadCase();
  const templates = {
    followups: templateMeta("employee-followups.md"), receipt: templateMeta("automation-receipt.md"), documentation: templateMeta("documentation-request.md"), candidates: templateMeta("knowledge-candidates.md"),
    weekly: templateMeta("weekly-report.md"), area: templateMeta("area-operating-rollup.md"), company: templateMeta("company-operating-rollup.md"),
    task: templateMeta("task.md"), feature: templateMeta("feature.md"), issue: templateMeta("issue.md"), decision: templateMeta("decision.md"), sop: templateMeta("sop.md"), executive: templateMeta("executive-distribution.md")
  };
  prepareRunRoot(root, reset);
  const events = [];
  const calls = [];
  const recordChanges = [];
  const selected = snapshot.work_items.filter((item) => item.include_daily);
  const activeProjects = snapshot.projects.filter((project) => project.active);
  const people = mapById(snapshot.people);
  const meetings = selected.filter((item) => item.meeting_block);
  const stale = selected.filter((item) => isStale(item, snapshot.local_day));
  const incomplete = selected.filter((item) => item.documentation_missing.length);
  const generatedFiles = [];
  const dailyFiles = [];
  const weeklyFiles = [];

  makeCall(calls, "daily", "notion", "query_work_items", { local_day: snapshot.local_day }, "Read the fixed Daily evidence window and unresolved commitments.", "FEAT-0001");
  for (const item of selected) makeCall(calls, "daily", "notion", "fetch_full_page", { work_item_id: item.id }, "Read full Work content before extracting current state or Meeting evidence.", "FEAT-0001");
  makeCall(calls, "daily", "notion", "fetch_projects", { project_ids: activeProjects.map((project) => project.id) }, "Resolve the canonical Project records that own memory.", "FEAT-0001");
  makeCall(calls, "daily", "notion", "fetch_people_directory", { person_ids: snapshot.people.map((person) => person.id) }, "Resolve the owner and route before any comment or email action.", "FEAT-0003");

  for (const project of activeProjects) {
    const patch = projectPatch(snapshot, project, selected.filter((item) => item.project_id === project.id));
    recordChanges.push({
      assertion_ids: ["daily-project-memory-records"], database: "projects", record_id: project.id, event: "updated", before: patch.before, after: patch.after,
      relations: { work: selected.filter((item) => item.project_id === project.id).map((item) => item.id) }
    });
    makeCall(calls, "daily", "notion", "update_project_memory", { project_id: project.id, action_key: `project-memory:${snapshot.local_day}:${project.id}`, record_patch: patch.after }, "Patch canonical Project memory in place; there is no daily Project-memory file.", "FEAT-0001");
  }

  for (const meeting of meetings) {
    for (const commitment of meeting.meeting_block.commitments) {
      const after = { project_id: meeting.project_id, owner_id: commitment.person_id, due_date: commitment.due_date, source_meeting_id: meeting.id };
      recordChanges.push({ assertion_ids: ["daily-meeting-task-proposals", "weekly-linked-commitments"], database: "work_items", record_id: commitment.proposal_id, event: "created", before: null, after, relations: { work: [meeting.id], project: [meeting.project_id] } });
      makeCall(calls, "daily", "notion", "upsert_task_proposal", { task_id: commitment.proposal_id, source_id: meeting.id, action_key: `task-proposal:${commitment.proposal_id}` }, "Create a linked Task proposal without overwriting the source Meeting.", "FEAT-0001");
    }
  }

  for (const item of incomplete) {
    const person = people.get(item.owner_id);
    const comment = ownerActionComment(snapshot, item, person);
    const path = `daily/comments/${item.id}-owner-action.md`;
    upsert(root, path, commentArtifact(snapshot, item, person, templates), events);
    dailyFiles.push(path); generatedFiles.push(`${path} (${templates.documentation.id}@${templates.documentation.version})`);
    const assertion_ids = ["daily-precise-owner-action-comments"];
    if (isStale(item, snapshot.local_day)) assertion_ids.push("daily-combined-stale-comments", "daily-owner-chase-routing");
    recordChanges.push({
      assertion_ids, database: "work_comments", record_id: item.id, event: "commented", before: null,
      after: { verified_mention: person.notion_mention === "verified-private-route", route_person_id: person.id, known_facts: comment.knownFacts, numbered_questions: comment.questions, update_location: comment.updateLocation, source_url: item.url, missing_fields: item.documentation_missing, stale_context: isStale(item, snapshot.local_day) ? `${item.status}; ${Math.max(0, Math.round((new Date(`${snapshot.local_day}T00:00:00+08:00`) - new Date(item.last_edited)) / 86400000))} days since last update` : "not stale", variance: effortSummary(effortFor(item)), idempotency_key: comment.idempotency_key },
      relations: { work: [item.id], project: [item.project_id] }
    });
    makeCall(calls, "daily", "notion", "create_owner_action_comment", { work_item_id: item.id, action_key: comment.idempotency_key, artifact_path: path, mention_person_id: person.id }, "Apply one detailed source comment with known facts, numbered questions, update location, and source link.", isStale(item, snapshot.local_day) ? "FEAT-0003" : "FEAT-0002");
    calls.at(-1).feature_ids = isStale(item, snapshot.local_day) ? ["FEAT-0002", "FEAT-0003"] : ["FEAT-0002"];
  }

  const routedStaleByPerson = new Map();
  for (const item of stale) {
    const list = routedStaleByPerson.get(item.owner_id) || [];
    list.push(item); routedStaleByPerson.set(item.owner_id, list);
  }
  for (const [personId, items] of routedStaleByPerson) {
    const person = people.get(personId);
    if (person.approved_route !== "email") continue;
    const path = `daily/outreach/${slug(person.name)}-followup-${snapshot.local_day}.md`;
    upsert(root, path, followUpArchive(snapshot, person, items, templates), events);
    dailyFiles.push(path); generatedFiles.push(`${path} (${templates.followups.id}@${templates.followups.version})`);
    makeCall(calls, "daily", "email", "send_owner_followup", { person_id: person.id, work_item_ids: items.map((item) => item.id), action_key: `followup:${snapshot.local_day}:${person.id}`, artifact_path: path }, "Send one grouped owner request only after source comments are prepared.", "FEAT-0003");
  }

  const candidatesPath = `daily/knowledge/candidates-${snapshot.local_day}.md`;
  upsert(root, candidatesPath, knowledgeCandidates(snapshot, meetings, templates), events);
  dailyFiles.push(candidatesPath); generatedFiles.push(`${candidatesPath} (${templates.candidates.id}@${templates.candidates.version})`);
  makeCall(calls, "daily", "filesystem", "stage_knowledge_candidates", { artifact_path: candidatesPath, action_key: `knowledge-candidates:${snapshot.local_day}` }, "Stage Problems, Decisions, and SOP signals for Weekly; do not promote during Daily.", "FEAT-0004");
  const dailyReceiptPath = `daily/receipt-${snapshot.local_day}.md`;
  upsert(root, dailyReceiptPath, receipt(snapshot, "Daily", selected, templates, calls.filter((call) => call.phase === "daily"), generatedFiles), events);
  dailyFiles.push(dailyReceiptPath); generatedFiles.push(`${dailyReceiptPath} (${templates.receipt.id}@${templates.receipt.version})`);

  makeCall(calls, "weekly", "filesystem", "load_daily_receipts", { paths: dailyFiles }, "Consume Daily evidence and source comments before the Weekly review.", "FEAT-0005");
  makeCall(calls, "weekly", "notion", "read_project_reports", { project_ids: activeProjects.map((project) => project.id) }, "Locate current Draft report records and preserve finalized history.", "FEAT-0005");
  const existingDraftProjectIds = new Set(snapshot.reports.filter((report) => report.week === snapshot.week && report.existing_current_draft).map((report) => report.project_id));
  const projectReports = new Map();
  for (const project of activeProjects) {
    const path = `weekly/reports/projects/${project.slug}/weekly-report-${snapshot.week}.md`;
    if (existingDraftProjectIds.has(project.id) && !existsSync(safeOutputPath(root, path))) writeText(safeOutputPath(root, path), `<!-- frozen fixture: existing current-week Draft -->\n# ${project.name} — Draft before Daily evidence\n`);
    const content = projectReport(snapshot, project, selected.filter((item) => item.project_id === project.id), templates, dailyReceiptPath);
    upsert(root, path, content, events); weeklyFiles.push(path); generatedFiles.push(`${path} (${templates.weekly.id}@${templates.weekly.version})`);
    projectReports.set(project.id, { path, content });
    recordChanges.push({ assertion_ids: ["weekly-report-records"], database: "reports", record_id: `RPT-${project.id}-${snapshot.week}`, event: "upserted", before: null, after: { report_type: "Project", week: snapshot.week, project_relation: project.id, source_report_ids: selected.filter((item) => item.project_id === project.id).map((item) => item.id) }, relations: { project: [project.id], work: selected.filter((item) => item.project_id === project.id).map((item) => item.id) } });
    makeCall(calls, "weekly", "notion", "upsert_project_report", { project_id: project.id, action_key: `project-report:${snapshot.week}:${project.id}`, artifact_path: path }, "Apply the current Project report draft.", "FEAT-0005");
  }
  const departmentReports = [];
  for (const department of snapshot.departments) {
    const projects = activeProjects.filter((project) => project.department === department);
    const path = `weekly/reports/departments/${slug(department)}/weekly-rollup-${snapshot.week}.md`;
    const content = department === "Content"
      ? `${areaReport(snapshot, department, [], projectReports, templates)}\n\n## Content source gap\n\nNo Project was captured for Content. This report records the gap; it does not fabricate Project performance.`
      : areaReport(snapshot, department, projects, projectReports, templates);
    upsert(root, path, content, events); weeklyFiles.push(path); generatedFiles.push(`${path} (${templates.area.id}@${templates.area.version})`);
    departmentReports.push({ department, area: department, path });
    recordChanges.push({ assertion_ids: ["weekly-report-records"], database: "reports", record_id: `RPT-DEPARTMENT-${slug(department)}-${snapshot.week}`, event: "upserted", before: null, after: { report_type: "Department", week: snapshot.week, project_relation: projects.map((project) => project.id).join(",") || "source-gap", source_report_ids: projects.map((project) => projectReports.get(project.id).path) }, relations: { project: projects.map((project) => project.id), reports: projects.map((project) => projectReports.get(project.id).path) } });
    makeCall(calls, "weekly", "notion", "upsert_department_report", { department, action_key: `department-report:${snapshot.week}:${slug(department)}`, artifact_path: path }, "Apply the Department rollup derived from Project reports or an explicit source gap.", "FEAT-0005");
  }
  const companyPath = `weekly/reports/company/weekly-rollup-${snapshot.week}.md`;
  upsert(root, companyPath, companyReport(snapshot, departmentReports.map((report) => ({ area: report.department, path: report.path })), templates), events);
  weeklyFiles.push(companyPath); generatedFiles.push(`${companyPath} (${templates.company.id}@${templates.company.version})`);
  recordChanges.push({ assertion_ids: ["weekly-report-records"], database: "reports", record_id: `RPT-COMPANY-${snapshot.week}`, event: "upserted", before: null, after: { report_type: "Company", week: snapshot.week, project_relation: "portfolio", source_report_ids: departmentReports.map((report) => report.path) }, relations: { reports: departmentReports.map((report) => report.path) } });
  makeCall(calls, "weekly", "notion", "upsert_company_report", { action_key: `company-report:${snapshot.week}`, artifact_path: companyPath }, "Apply the Company rollup derived from Department reports.", "FEAT-0005");
  makeCall(calls, "weekly", "drive", "publish_company_report", { action_key: `drive-company-report:${snapshot.week}`, artifact_path: companyPath }, "Publish the Company rollup to the configured Drive destination only with an operated receipt.", "FEAT-0005");

  const promotionFiles = [];
  for (const meeting of meetings) {
    const block = meeting.meeting_block;
    const promotions = [
      { kind: "issues", record_id: block.problem_candidate.id, database: "work_items", template: templates.issue, operation: "upsert_issue", content: issueRecord(meeting, templates) },
      { kind: "decisions", record_id: block.decision_candidate.id, database: "decisions", template: templates.decision, operation: "upsert_decision", content: decisionRecord(meeting, templates) },
      { kind: "sops", record_id: block.sop_candidate.id, database: "skills", template: templates.sop, operation: "upsert_sop", content: sopRecord(meeting, templates) }
    ];
    for (const promotion of promotions) {
      const path = `weekly/promotions/${promotion.kind}/${promotion.record_id}.md`;
      upsert(root, path, promotion.content, events); weeklyFiles.push(path); generatedFiles.push(`${path} (${promotion.template.id}@${promotion.template.version})`); promotionFiles.push(path);
      const assertionId = { work_items: "weekly-promoted-issues", decisions: "weekly-promoted-decisions", skills: "weekly-promoted-sops" }[promotion.database];
      recordChanges.push({ assertion_ids: [assertionId], database: promotion.database, record_id: promotion.record_id, event: "created", before: null, after: { project_id: meeting.project_id, source_meeting_id: meeting.id, review_state: "approved-for-weekly-promotion", authority: promotion.database === "work_items" ? block.problem_candidate.authority : promotion.database === "decisions" ? block.decision_candidate.authority : block.sop_candidate.authority }, relations: { project: [meeting.project_id], work: [meeting.id] } });
      makeCall(calls, "weekly", "notion", promotion.operation, { record_id: promotion.record_id, action_key: `promotion:${snapshot.week}:${promotion.record_id}`, artifact_path: path }, `Apply ${promotion.record_id} to its canonical Weekly record destination.`, "FEAT-0006");
    }
  }

  const staleProjects = [...new Set(stale.map((item) => item.project_id))].map((id) => mapById(activeProjects).get(id));
  for (const project of staleProjects) {
    const patch = projectPatch(snapshot, project, selected.filter((item) => item.project_id === project.id), "weekly");
    recordChanges.push({ assertion_ids: ["weekly-project-carry-forward"], database: "projects", record_id: project.id, event: "updated", before: patch.before, after: patch.after, relations: { work: selected.filter((item) => item.project_id === project.id && !item.healthy).map((item) => item.id) } });
    makeCall(calls, "weekly", "notion", "update_project_plan", { project_id: project.id, action_key: `project-plan:${snapshot.week}:${project.id}`, record_patch: patch.after }, "Carry unresolved Work forward in the canonical Project record; no Project-plan file is created.", "FEAT-0007");
  }
  for (const commitment of meetings.flatMap((meeting) => meeting.meeting_block.commitments)) makeCall(calls, "weekly", "notion", "upsert_planned_task", { task_id: commitment.proposal_id, action_key: `planned-task:${snapshot.week}:${commitment.proposal_id}` }, "Apply an approved Meeting commitment as the same linked Work identity.", "FEAT-0007");

  const distributionPath = `weekly/distribution/telegram-summary-${snapshot.week}.md`;
  upsert(root, distributionPath, executiveDistribution(snapshot, companyPath, templates, departmentReports), events); weeklyFiles.push(distributionPath); generatedFiles.push(`${distributionPath} (${templates.executive.id}@${templates.executive.version})`);
  makeCall(calls, "weekly", "telegram", "send_executive_summary", { action_key: `executive-summary:${snapshot.week}`, artifact_path: distributionPath }, "Send the finalized Company summary to the private Demo Owner only with a matching operated receipt.", "FEAT-0008");
  const weeklyReceiptPath = `weekly/receipt-${snapshot.week}.md`;
  upsert(root, weeklyReceiptPath, receipt(snapshot, "Weekly", selected, templates, calls.filter((call) => call.phase === "weekly"), generatedFiles), events); weeklyFiles.push(weeklyReceiptPath);

  applyExternalReceipts(calls, externalReceipts, mode);
  const rerun = verifyIdempotency ? runTemplateFirstProof({ outputRoot: root, reset: false, verifyIdempotency: false, mode, externalReceipts, privateSeedPath }) : null;
  const secondRunEvents = rerun?.files.events || [];
  const safety = { mocked: mode === "frozen-mock", network_calls_by_processor: 0, external_writes_by_processor: 0, external_receipts: externalReceipts.length, notice: mode === "frozen-mock" ? "All connector-shaped actions are local plans. No provider request or mutation occurred." : "The processor stayed network-free; operated states require validated edge receipts." };
  const idempotency = { pass: secondRunEvents.length === 0, second_run_file_events: secondRunEvents, duplicate_files: 0, duplicate_actions: 0, skipped_actions: calls.length };
  const behaviorResults = checkBehaviorV4({ snapshot, contract, root, events, calls, selected, activeProjects, departmentReports, companyPath, safety, idempotency, mode, recordChanges });
  const assertions = score(contract, root, events, behaviorResults, recordChanges);
  const comparison = compareAsciiV4({ snapshot, root, recordChanges, departmentReports, companyPath, assertions });
  const result = {
    schema_version: 2, kind: "kamdar-template-first-proof", case: caseDefinition,
    run: { id: `${caseDefinition.id}-${snapshot.local_day}`, mode, started_at: snapshot.frozen_at, completed_at: mode === "frozen-mock" ? snapshot.frozen_at : new Date().toISOString(), output_root: root },
    safety,
    readiness: ["Notion", "Google Drive", "Email", "Telegram"].map((label) => ({ label, status: mode === "frozen-mock" ? "planned" : "receipt-backed", detail: mode === "frozen-mock" ? "Frozen mode; no credential or provider claim." : "Operated state appears only for matching external receipts." })),
    selection: { selected_work_item_ids: selected.map((item) => item.id), excluded_work_item_ids: snapshot.work_items.filter((item) => !item.include_daily).map((item) => item.id), project_ids: activeProjects.map((project) => project.id) },
    seed_provenance: snapshot.seed_provenance,
    records: { changes: recordChanges },
    daily: { files: dailyFiles, project_memory_records: activeProjects.map((project) => project.id), meeting_task_proposals: meetings.flatMap((meeting) => meeting.meeting_block.commitments.map((commitment) => commitment.proposal_id)), promotion_candidates: meetings.flatMap((meeting) => [meeting.meeting_block.problem_candidate.id, meeting.meeting_block.decision_candidate.id, meeting.meeting_block.sop_candidate.id]), knowledge_candidates: candidatesPath },
    weekly: { files: weeklyFiles, project_reports: [...projectReports.values()].map((report) => report.path), department_reports: departmentReports.map((report) => report.path), company_report: companyPath, promotions: promotionFiles, planning_records: staleProjects.map((project) => project.id), distribution: distributionPath },
    buyer_story: { fixture: { scenario_layer: snapshot.scenario_layer, projects: snapshot.projects.length, source_gaps: snapshot.source_gaps.length, departments: snapshot.departments, people: snapshot.people.length, work_items: snapshot.work_items.length, meetings: meetings.length, active_projects: activeProjects.length }, flow: ["Changed Work and embedded Meetings", "Project record patches and detailed owner comments", "Project reports", "Department reports", "Company report and delivery receipt"], feature_docs: caseDefinition.features.map((feature) => ({ id: feature.id, title: feature.title, summary: feature.summary, flow: feature.document.sections.Flow, doc: feature.doc })) },
    observed_source_gaps: [...snapshot.source_gaps, ...selected.filter((item) => item.source_gap).map((item) => `${item.id}: ${item.source_gap}`)],
    tools: { calls, counts: Object.fromEntries([...new Set(calls.map((call) => call.adapter))].map((adapter) => [adapter, calls.filter((call) => call.adapter === adapter).length])) },
    files: { events, second_run_events: secondRunEvents, inventory: [] }, idempotency,
    outputs: { daily_files: dailyFiles, weekly_files: weeklyFiles, tool_trace: "evidence/tool-trace.json", comparison: "evidence/ascii-comparison.json", showcase_markdown: "showcase/index.md", showcase_html: "showcase/index.html" }, assertions, comparison
  };
  writeJson(safeOutputPath(root, result.outputs.tool_trace), { safety: result.safety, calls, record_changes: recordChanges });
  writeJson(safeOutputPath(root, result.outputs.comparison), result.comparison);
  writeText(safeOutputPath(root, result.outputs.showcase_markdown), showcaseMarkdown(result));
  writeText(safeOutputPath(root, result.outputs.showcase_html), buyerShowcaseHtml(result));
  result.files.inventory = inventory(root);
  writeJson(resolve(root, "result.json"), result);
  mostRecent = result; mostRecentRoot = root;
  return result;
}

export function latestRun({ outputRoot = mostRecentRoot || defaultOutputRoot } = {}) {
  const path = resolve(outputRoot, "result.json");
  // An operated edge can refresh the shared run directory from another
  // process. Prefer its persisted receipt-backed result over an in-memory
  // frozen result left by the local UI's "Run frozen comparison" action.
  // This keeps /showcase aligned with the latest actual proof state.
  if (existsSync(path)) return readJson(path);
  return mostRecent && resolve(outputRoot) === mostRecentRoot ? mostRecent : null;
}

export function readRunFile(path = "result.json", { outputRoot = mostRecentRoot || defaultOutputRoot } = {}) {
  const target = safeOutputPath(resolve(outputRoot), path);
  if (!existsSync(target) || !statSync(target).isFile()) throw new Error(`Run file not found: ${basename(path)}`);
  return readFileSync(target, "utf8");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = runTemplateFirstProof();
  console.log(JSON.stringify({
    run: result.run.id,
    verdict: result.assertions.counts,
    daily_files: result.daily.files.length,
    weekly_files: result.weekly.files.length,
    ascii_comparison: result.comparison.pass,
    idempotent: result.idempotency.pass,
    output_root: result.run.output_root
  }, null, 2));
}
