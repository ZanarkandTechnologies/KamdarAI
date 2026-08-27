/** Validate and expand the compact Kamdar eval seed. */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const filesystemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectRoot = resolve(filesystemRoot, "../..");
export const seedRoot = resolve(projectRoot, "seed");
export const seedConfigPath = resolve(seedRoot, "manifest.json");
const templateRoot = resolve(projectRoot, "templates");
const requiredFeatureIds = Object.freeze([
  ...Array.from({ length: 7 }, (_value, index) => `FEAT-${String(index + 1).padStart(4, "0")}`),
  "FEAT-0010",
]);
const templateFiles = {
  project: "project.md",
  person: "person.md",
  task: "task.md",
  meeting: "meeting.md",
  project_report: "weekly-report.md",
};

function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function isObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function fail(message) { throw new Error(`Kamdar seed config: ${message}`); }

const tableKeys = ["projects", "people", "work_items", "meetings", "reports", "pipeline_cases"];

function resolveTablePath(manifestPath, declaredPath, key) {
  requiredString(declaredPath, `tables.${key}`);
  const root = dirname(resolve(manifestPath));
  const path = resolve(root, declaredPath);
  const inner = relative(root, path);
  if (!inner || inner === ".." || inner.startsWith(`..${sep}`)) fail(`tables.${key} must remain inside the seed directory.`);
  return path;
}

export function loadKamdarSeedBundle({ path = seedConfigPath } = {}) {
  const manifestPath = resolve(path);
  const manifest = readJson(manifestPath);
  if (!isObject(manifest)) fail("manifest must be an object.");
  assertOnlyKeys(manifest, ["schema_version", "seed_id", "environments", "capture", "clock", "tables"], "manifest");
  if (!isObject(manifest.tables)) fail("manifest.tables is required.");
  assertOnlyKeys(manifest.tables, tableKeys, "manifest.tables");
  for (const key of tableKeys) if (!(key in manifest.tables)) fail(`manifest.tables.${key} is required.`);

  const tablePaths = Object.fromEntries(tableKeys.map((key) => [key, resolveTablePath(manifestPath, manifest.tables[key], key)]));
  const tables = Object.fromEntries(tableKeys.map((key) => [key, readJson(tablePaths[key])]));
  const source = {
    schema_version: manifest.schema_version,
    seed_id: manifest.seed_id,
    environments: manifest.environments,
    capture: manifest.capture,
    clock: manifest.clock,
    entities: {
      projects: tables.projects,
      people: tables.people,
      work_items: tables.work_items,
      meetings: tables.meetings,
      reports: tables.reports,
    },
    pipeline_cases: tables.pipeline_cases,
  };
  const digest = createHash("sha256");
  for (const [name, filePath] of [["manifest", manifestPath], ...tableKeys.map((key) => [key, tablePaths[key]])]) {
    digest.update(`${name}\0`);
    digest.update(readFileSync(filePath));
    digest.update("\0");
  }
  return { source, sha256: digest.digest("hex"), manifestPath, tablePaths };
}
function requiredString(value, path) {
  if (typeof value !== "string" || !value.trim()) fail(`${path} must be a non-empty string.`);
}
function assertOnlyKeys(value, allowed, path) {
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unexpected.length) fail(`${path} has unsupported keys: ${unexpected.join(", ")}.`);
}
function asArray(value, path) {
  if (!Array.isArray(value)) fail(`${path} must be an array.`);
  return value;
}
function assertDate(value, path) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(`${path} must be an ISO local date.`);
}
function assertStableId(value, path) {
  if (typeof value !== "string" || !/^[A-Z][A-Z0-9_-]+$/.test(value)) fail(`${path} must be a stable ID.`);
}
function assertSourceSafe(value, path = "config") {
  if (typeof value === "string") {
    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(value) || /(^|\s)@[A-Za-z0-9_]+\b/.test(value)) fail(`${path} must not contain a contact endpoint or mention.`);
    if (/^[a-f0-9]{32}$/i.test(value)) fail(`${path} must not contain a Notion page or user identifier.`);
    return;
  }
  if (Array.isArray(value)) return value.forEach((item, index) => assertSourceSafe(item, `${path}[${index}]`));
  if (!isObject(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (/(?:^|[_-])(?:token|secret|credential|password|chat_id)$/i.test(key)) fail(`${path}.${key} is not permitted in a tracked seed.`);
    assertSourceSafe(item, `${path}.${key}`);
  }
}
function templateContract(key) {
  const filename = templateFiles[key];
  const path = resolve(templateRoot, filename);
  const inner = relative(templateRoot, path);
  if (!inner || inner === ".." || inner.startsWith(`..${sep}`)) fail(`template escaped the templates directory: ${filename}`);
  const content = readFileSync(path, "utf8");
  const id = content.match(/^template_id:\s*([^\n]+)$/m)?.[1]?.trim();
  const version = content.match(/^template_version:\s*["']?([^\n"']+)/m)?.[1]?.trim();
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/m)?.[1] || "";
  const properties = frontmatter.split(/\r?\n/).map((line) => line.match(/^([a-z][a-z0-9_]*):/)?.[1]).filter((name) => name && !["template_id", "template_version"].includes(name));
  const headings = [...content.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => match[1]);
  if (!id || !version) fail(`template metadata is missing for ${filename}.`);
  return { path: filename, id, version, properties, headings };
}
function assertTemplateRecord(record, contract, group) {
  const unknownProperties = Object.keys(record.properties).filter((key) => !contract.properties.includes(key));
  const missingProperties = contract.properties.filter((key) => !(key in record.properties));
  if (unknownProperties.length) fail(`${group}.${record.id} has properties not owned by ${contract.path}: ${unknownProperties.join(", ")}.`);
  if (missingProperties.length) fail(`${group}.${record.id} is missing properties required by ${contract.path}: ${missingProperties.join(", ")}.`);
  if (typeof record.body !== "string" || !record.body.trim()) fail(`${group}.${record.id} needs one non-empty Markdown body.`);
  if (/^---\s*$/m.test(record.body) || /^#\s+/m.test(record.body)) fail(`${group}.${record.id} body must not duplicate template frontmatter or the Notion page title.`);
  if (/\{\{[^}]+\}\}|<!--/.test(record.body)) fail(`${group}.${record.id} body contains an unresolved template placeholder or comment.`);
  const headings = [...record.body.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => match[1]);
  if (JSON.stringify(headings) !== JSON.stringify(contract.headings)) fail(`${group}.${record.id} body headings must exactly match ${contract.path} in template order.`);
  for (const [index, heading] of headings.entries()) {
    const start = record.body.indexOf(`## ${heading}`) + heading.length + 3;
    const end = index + 1 < headings.length ? record.body.indexOf(`## ${headings[index + 1]}`, start) : record.body.length;
    if (!record.body.slice(start, end).trim()) fail(`${group}.${record.id} has an empty ${heading} section.`);
  }
}

function normalizeRecord(source, expectedTemplate, contract, group) {
  assertOnlyKeys(source, ["id", "source_url", "template", "properties", "body", "metadata"], `${group}.${source?.id || "unknown"}`);
  assertStableId(source.id, `${group}.id`);
  if (source.source_url !== undefined) {
    let url;
    try { url = new URL(source.source_url); } catch { fail(`${group}.${source.id}.source_url must be a valid URL.`); }
    if (!url || !["http:", "https:"].includes(url.protocol)) fail(`${group}.${source.id}.source_url must use http or https.`);
  }
  if (source.template !== expectedTemplate) fail(`${group}.${source.id} must use template ${expectedTemplate}.`);
  if (!isObject(source.properties)) fail(`${group}.${source.id}.properties must be an object.`);
  requiredString(source.properties.name, `${group}.${source.id}.properties.name`);
  for (const key of ["start_date", "due_date", "last_meaningful_update", "date", "week_start"]) {
    const value = source.properties[key];
    if (value !== undefined && value !== "") assertDate(value, `${group}.${source.id}.properties.${key}`);
  }
  if (source.metadata !== undefined && !isObject(source.metadata)) fail(`${group}.${source.id}.metadata must be an object.`);
  const record = clone(source);
  assertTemplateRecord(record, contract, group);
  return record;
}

export function validateKamdarSeedConfig(source) {
  if (!isObject(source)) fail("root must be an object.");
  if (source.schema_version !== "kamdar-company-os-seed@4.0.0") fail("schema_version must be kamdar-company-os-seed@4.0.0.");
  assertOnlyKeys(source, ["schema_version", "seed_id", "environments", "capture", "clock", "entities", "pipeline_cases"], "root");
  requiredString(source.seed_id, "seed_id");
  assertSourceSafe(source);

  if (!isObject(source.environments)) fail("environments must be an object.");
  assertOnlyKeys(source.environments, ["frozen", "notion_eval"], "environments");
  for (const name of ["frozen", "notion_eval"]) {
    const environment = source.environments[name];
    if (!isObject(environment)) fail(`environment ${name} is required.`);
    assertOnlyKeys(environment, ["reset_marker"], `environment ${name}`);
    requiredString(environment.reset_marker, `environment ${name}.reset_marker`);
  }

  const capture = source.capture;
  if (!isObject(capture)) fail("capture is required.");
  assertOnlyKeys(capture, ["sha256", "manifest", "departments", "source_gap_count", "material_source_gaps"], "capture");
  if (typeof capture.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(capture.sha256)) fail("capture.sha256 must be a SHA-256 digest.");
  requiredString(capture.manifest, "capture.manifest");
  if (asArray(capture.departments, "capture.departments").length !== 7) fail("capture.departments must retain the seven scraped Departments.");
  if (!Number.isInteger(capture.source_gap_count) || capture.source_gap_count < 1) fail("capture.source_gap_count must be positive.");
  asArray(capture.material_source_gaps, "capture.material_source_gaps");

  const clock = source.clock;
  if (!isObject(clock)) fail("clock is required.");
  assertOnlyKeys(clock, ["company", "timezone", "frozen_at", "local_day", "week", "week_start", "week_end"], "clock");
  for (const key of ["company", "timezone", "frozen_at", "local_day", "week", "week_start", "week_end"]) requiredString(clock[key], `clock.${key}`);
  for (const key of ["local_day", "week_start", "week_end"]) assertDate(clock[key], `clock.${key}`);
  if (!/^\d{4}-W\d{2}$/.test(clock.week)) fail("clock.week must be an ISO week.");

  if (!isObject(source.entities)) fail("entities is required.");
  assertOnlyKeys(source.entities, ["projects", "people", "work_items", "meetings", "reports"], "entities");
  const contracts = Object.fromEntries(Object.keys(templateFiles).map((key) => [key, templateContract(key)]));
  const entities = {
    projects: asArray(source.entities.projects, "entities.projects").map((row) => normalizeRecord(row, "project", contracts.project, "entities.projects")),
    people: asArray(source.entities.people, "entities.people").map((row) => normalizeRecord(row, "person", contracts.person, "entities.people")),
    work_items: asArray(source.entities.work_items, "entities.work_items").map((row) => normalizeRecord(row, "task", contracts.task, "entities.work_items")),
    meetings: asArray(source.entities.meetings, "entities.meetings").map((row) => normalizeRecord(row, "meeting", contracts.meeting, "entities.meetings")),
    reports: asArray(source.entities.reports, "entities.reports").map((row) => normalizeRecord(row, "project_report", contracts.project_report, "entities.reports")),
  };
  if (entities.projects.length !== 7) fail("the eval seed must contain exactly seven purposeful Projects.");

  const allIds = new Set();
  for (const [group, rows] of Object.entries(entities)) {
    for (const row of rows) {
      if (allIds.has(row.id)) fail(`duplicate entity id ${row.id}.`);
      allIds.add(row.id);
      assertTemplateRecord(row, contracts[row.template], `entities.${group}`);
    }
  }
  const projectIds = new Set(entities.projects.map((row) => row.id));
  const peopleIds = new Set(entities.people.map((row) => row.id));
  for (const row of entities.projects) if (row.properties.owner && !peopleIds.has(row.properties.owner)) fail(`${row.id}.owner references an unknown Person.`);
  for (const row of [...entities.work_items, ...entities.meetings]) {
    if (!projectIds.has(row.properties.project)) fail(`${row.id}.project references an unknown Project.`);
    if (!peopleIds.has(row.properties.owner)) fail(`${row.id}.owner references an unknown Person.`);
    row.properties.department = entities.projects.find((project) => project.id === row.properties.project).properties.department;
  }
  for (const row of entities.reports) {
    const project = entities.projects.find((candidate) => candidate.id === row.properties.project);
    if (!project) fail(`${row.id}.project references an unknown Project.`);
    row.properties.department = project.properties.department;
  }

  const pipelineCases = asArray(source.pipeline_cases, "pipeline_cases");
  const caseIds = pipelineCases.map((item) => item.feature_id);
  if (caseIds.length !== requiredFeatureIds.length || [...new Set(caseIds)].length !== requiredFeatureIds.length || !requiredFeatureIds.every((id) => caseIds.includes(id))) fail("pipeline_cases must cover FEAT-0001 through FEAT-0007 and FEAT-0010 exactly once.");
  for (const item of pipelineCases) {
    assertOnlyKeys(item, ["feature_id", "name", "entity_ids", "shows"], `pipeline case ${item.feature_id || "unknown"}`);
    requiredString(item.name, `${item.feature_id}.name`);
    if (!Array.isArray(item.entity_ids) || !item.entity_ids.length) fail(`${item.feature_id}.entity_ids must be non-empty.`);
    if (!Array.isArray(item.shows) || !item.shows.length || !item.shows.every((value) => typeof value === "string" && value)) fail(`${item.feature_id}.shows must contain plain descriptions.`);
    for (const id of item.entity_ids) if (!allIds.has(id)) fail(`${item.feature_id} references unknown entity ${id}.`);
  }

  return {
    schema_version: source.schema_version,
    seed_id: source.seed_id,
    environments: clone(source.environments),
    capture: clone(source.capture),
    provenance: { source_capture_sha256: capture.sha256, private_seed_manifest: capture.manifest },
    templates: Object.fromEntries(Object.entries(contracts).map(([key, contract]) => [key, { path: contract.path, id: contract.id, version: contract.version }])),
    entities: {
      departments: clone(capture.departments),
      source_gaps: clone(capture.material_source_gaps),
      ...entities,
    },
    pipeline_cases: clone(pipelineCases),
    frozen_snapshot: {
      company: { name: clock.company, timezone: clock.timezone },
      frozen_at: clock.frozen_at,
      local_day: clock.local_day,
      week: clock.week,
      week_start: clock.week_start,
      week_end: clock.week_end,
      source_capture_sha256: capture.sha256,
      private_seed_manifest: capture.manifest,
    },
  };
}

export function loadKamdarSeedConfig({ path = seedConfigPath } = {}) {
  return validateKamdarSeedConfig(loadKamdarSeedBundle({ path }).source);
}

export function kamdarSeedBundleSha256({ path = seedConfigPath } = {}) {
  return loadKamdarSeedBundle({ path }).sha256;
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
function defaultOwner(department) {
  return ({
    Marketing: "PERSON-MAYA",
    Merchandising: "PERSON-NUR",
    CMT: "PERSON-AISHA",
    Ecommerce: "PERSON-DARREN",
    "DTC Brands": "PERSON-LINA",
  })[department] || "PERSON-MAYA";
}
function markdownSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = String(markdown || "");
  const match = new RegExp(`^## ${escaped}\\s*$`, "m").exec(source);
  if (!match) return "";
  const start = match.index + match[0].length;
  const next = /^##\s+/m.exec(source.slice(start));
  return source.slice(start, next ? start + next.index : source.length).trim();
}
function markdownSubsection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const source = String(markdown || "");
  const match = new RegExp(`^### ${escaped}\\s*$`, "m").exec(source);
  if (!match) return "";
  const start = match.index + match[0].length;
  const next = /^#{2,3}\s+/m.exec(source.slice(start));
  return source.slice(start, next ? start + next.index : source.length).trim();
}
function boldField(markdown, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return String(markdown || "").match(new RegExp(`(?:^- )?\\*\\*${escaped}:\\*\\*\\s*([^\\n]+)`, "mi"))?.[1]?.trim() || "";
}
function plainBlock(value) { return String(value || "").replace(/^[-*]\s+/, "").trim(); }
function listItems(markdown) {
  return String(markdown || "").split("\n").map((line) => line.match(/^- (?!\*\*)(.+)$/)?.[1]?.trim()).filter(Boolean);
}
function taskNotes(record) {
  const notes = markdownSection(record.body, "Notes");
  const problemBlock = markdownSubsection(notes, "Problem analysis");
  const text = (heading) => plainBlock(markdownSubsection(notes, heading));
  return {
    blocker: text("Blocker"),
    next_action: text("Next action"),
    source_gap: text("Source gap"),
    planned_hours: Number(text("Planned hours") || 0),
    actual_hours: Number(text("Actual hours") || 0),
    hourly_cost_myr: Number(text("Hourly cost myr") || 0),
    documentation_missing: listItems(markdownSubsection(notes, "Documentation missing")),
    problem_analysis: {
      cause: boldField(problemBlock, "Cause") || "No current problem.",
      contributing_factors: listItems(problemBlock),
      confidence: boldField(problemBlock, "Confidence") || "high",
      confirmation_needed: boldField(problemBlock, "Confirmation needed") || "None.",
    },
  };
}
function candidateFrom(markdown, heading) {
  const block = markdownSubsection(markdown, heading);
  if (!block) return undefined;
  const output = {};
  for (const label of ["Id", "Summary", "Recurrence", "Authority", "Decided at", "Dedupe match", "Repetition evidence"]) {
    const value = boldField(block, label);
    if (value) output[label.toLowerCase().replaceAll(" ", "_")] = /^\d+$/.test(value) ? Number(value) : value;
  }
  return output;
}
function commitmentsFrom(markdown) {
  return String(markdown || "").split(/^- \*\*Record\*\*\s*$/m).slice(1).map((block) => ({
    person_id: boldField(block, "Person id"), action: boldField(block, "Action"), due_date: boldField(block, "Due date"), proposal_id: boldField(block, "Proposal id")
  })).filter((row) => row.person_id && row.action);
}
function projectLegacy(record) {
  const p = record.properties, active = Boolean(record.metadata?.active);
  const overview = markdownSection(record.body, "Overview");
  const knowledge = markdownSection(record.body, "Project knowledge");
  const attention = markdownSection(record.body, "This week's attention");
  return {
    id: record.id,
    name: p.name,
    slug: slug(p.name),
    department: p.department,
    area: p.department,
    owner_id: p.owner || defaultOwner(p.department),
    active,
    status: p.status || (active ? "Active" : "Backlog"),
    health: boldField(knowledge, "Health") || (active ? "Healthy" : "Not selected"),
    progress: p.progress || "",
    current_context: boldField(knowledge, "Conclusion") || "",
    main_blocker: boldField(overview, "Main blocker") || boldField(knowledge, "Operational impact") || "None.",
    next_action: boldField(attention, "Next action") || "",
    last_meaningful_update: boldField(attention, "Last meaningful update") || "",
    objective: boldField(overview, "Goal") || "",
  };
}
function personLegacy(record) {
  const p = record.properties;
  return { id: record.id, name: p.name, role: p.role, department: p.department, approved_route: p.preferred_contact_channel || "none", route_label: p.contact_endpoint || "none", notion_mention: "not-applicable" };
}
function workLegacy(record) {
  const p = record.properties, notes = taskNotes(record);
  const missing = notes.documentation_missing;
  const problem = notes.problem_analysis;
  const includeDaily = Boolean(record.metadata?.include_daily);
  const healthy = p.status !== "Blocked" && missing.length === 0;
  return {
    id: record.id,
    project_id: p.project,
    owner_id: p.owner,
    name: p.name,
    type: p.type,
    include_daily: includeDaily,
    full_page_read: includeDaily,
    healthy,
    last_edited: record.metadata?.completed_at || (p.last_meaningful_update ? `${p.last_meaningful_update}T10:00:00+08:00` : ""),
    ...(p.due_date ? { due_date: p.due_date } : {}),
    planned_hours: notes.planned_hours || 0,
    actual_hours: notes.actual_hours || 0,
    hourly_cost_myr: notes.hourly_cost_myr || 0,
    schedule_variance_days: 0,
    progress: p.progress || "",
    blocker: notes.blocker || "None.",
    next_action: notes.next_action || "",
    documentation_missing: missing,
    problem_analysis: problem,
    ...(notes.source_gap ? { source_gap: notes.source_gap } : {}),
    status: p.status,
    url: `notion://${record.id}`,
    ...(p.type === "Meeting" ? {
      meeting_block: {
        title: p.name,
        commitments: commitmentsFrom(markdownSection(record.body, "Commitments")),
        decision_candidate: candidateFrom(markdownSection(record.body, "Decisions"), "Decision candidate"),
        problem_candidate: candidateFrom(markdownSection(record.body, "Notes"), "Problem candidate"),
        sop_candidate: candidateFrom(markdownSection(record.body, "Follow-up"), "Sop candidate"),
        project_id: p.project,
      }
    } : {}),
  };
}
function reportLegacy(record) {
  return {
    id: record.id,
    project_id: record.properties.project,
    week: record.metadata.week,
    status: record.metadata.status,
    ...(record.metadata.immutable ? { immutable: true } : {}),
    ...(record.metadata.existing_current_draft ? { existing_current_draft: true } : {}),
  };
}

export function compileKamdarSeedSnapshot(sourceOrConfig) {
  const checked = sourceOrConfig?.provenance && sourceOrConfig?.templates ? clone(sourceOrConfig) : validateKamdarSeedConfig(sourceOrConfig);
  return {
    ...checked.frozen_snapshot,
    schema_version: "2.0.0",
    scenario_layer: "sanitized-synthetic-overlay",
    departments: clone(checked.entities.departments),
    source_gaps: clone(checked.entities.source_gaps),
    projects: checked.entities.projects.map(projectLegacy),
    people: checked.entities.people.map(personLegacy),
    work_items: [...checked.entities.work_items, ...checked.entities.meetings].map(workLegacy),
    reports: checked.entities.reports.map(reportLegacy),
  };
}

export function loadKamdarSeedSnapshot(options = {}) {
  return compileKamdarSeedSnapshot(loadKamdarSeedConfig(options));
}

export const loadSeedConfig = loadKamdarSeedConfig;
export const compileSeedSnapshot = compileKamdarSeedSnapshot;
