#!/usr/bin/env node
/**
 * Bounded Notion-only operator for the isolated Kamdar AI Eval Demo v4 root.
 *
 * This is deliberately separate from the deterministic template-first runner:
 *
 * frozen runner -> reviewed local artifacts/record patches
 * operate-kamdar-v4 --operate-v4 -> only the fixed v4 Notion databases
 *                                      + private redacted Notion receipt
 *
 * It never sends Gmail, Drive, or Telegram effects; those remain distinct
 * provider edges. The default command is a non-mutating preflight.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadFrozenSnapshot, runTemplateFirstProof } from "./template-first-kamdar.mjs";
import { profileRoot, readV4Boundary, v4Namespace } from "./live-kamdar-poc.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const filesystemRoot = resolve(scriptDirectory, "..");
const defaultPrivateSeedPath = resolve(profileRoot, "state/kamdar-eval/private-seed-2026-08-21.json");
const defaultReceiptPath = resolve(profileRoot, "runtime-showcase/kamdar-ai-eval-demo-v4/operated-notion-receipt.json");
const defaultStatePath = resolve(profileRoot, "runtime-showcase/kamdar-ai-eval-demo-v4/state.json");

export const v4RootId = "3c3d43a2-3942-8112-b2e1-e0a3628b9587";
export { v4Namespace };
export const v4Databases = Object.freeze({
  projects: { database_id: "90221bfc-fd63-49ff-b2b4-ebf57750a07d", data_source_id: "2b06ad93-a1fa-4169-8d91-8e3a95117b82", title: "Projects" },
  work_items: { database_id: "f2fff399-db77-4df3-8f9d-a0f92f66362e", data_source_id: "81b91e22-3ecb-4618-a3de-1410436be2bf", title: "Work" },
  people: { database_id: "02a1348b-ee73-41a0-8dd6-829156595978", data_source_id: "7fedf8d3-4fc4-4b82-b446-25b9030c33cb", title: "People" },
  decisions: { database_id: "4d6c46fe-f331-4c61-b034-337b676d2854", data_source_id: "c4c92b99-1fc4-48f9-a378-dd640c246ab3", title: "Decisions" },
  reports: { database_id: "9ccf015b-ffd8-4ddb-9762-d1ca808cdab2", data_source_id: "09cabf1e-c49a-4d5a-b9a4-7014405e4790", title: "Reports" },
  skills: { database_id: "8e697656-01a6-4cea-9cc9-4562e76520d5", data_source_id: "dc29786a-fe2c-41a3-befa-091c6798bdf3", title: "Skills" },
  templates: { database_id: "3cdca1a6-c307-4eb3-9e4e-824eef8eaabe", data_source_id: "fcd72368-b315-494d-9e79-a29ee8171412", title: "Templates" }
});

const requiredBaseProperties = Object.freeze({
  projects: ["ID", "Name", "Department", "Owner", "Progress", "Status", "Next action", "Template"],
  work_items: ["ID", "Name", "Project", "Owner", "Status", "Template", "Type"],
  people: ["ID", "Name", "Department", "Role", "Route", "Status", "Template"],
  decisions: ["ID", "Name", "Project", "Status", "Template"],
  reports: ["ID", "Name", "Project", "Status", "Template", "Week", "Level"],
  skills: ["ID", "Name", "Status", "Template"]
});

const relationSpecifications = Object.freeze([
  { database: "work_items", property: "Projects", reciprocal: "Work" },
  { database: "decisions", property: "Projects", reciprocal: "Decisions" },
  { database: "reports", property: "Projects", reciprocal: "Reports" },
  { database: "skills", property: "Projects", reciprocal: "Skills" }
]);

const projectPropertySpecifications = Object.freeze({
  "Main blocker": { rich_text: {} },
  "Last automation run": { rich_text: {} }
});

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function stable(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function parseJson(value, label) {
  try {
    return JSON.parse(String(value));
  } catch (error) {
    throw new Error(`${label} did not return JSON: ${error.message}`);
  }
}

function defaultCommandRunner(args) {
  const result = spawnSync("ntn", args, { encoding: "utf8" });
  return {
    status: Number.isInteger(result.status) ? result.status : 1,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function invoke(commandRunner, args, label) {
  const result = commandRunner(args);
  if (!result || result.status !== 0) {
    const detail = String(result?.stderr || result?.stdout || "command failed").replace(/\s+/g, " ").slice(0, 500);
    throw new Error(`${label} failed: ${detail}`);
  }
  return String(result.stdout || "");
}

function notionJson(commandRunner, args, label) {
  return parseJson(invoke(commandRunner, args, label), label);
}

function idOf(property) {
  if (!property || typeof property !== "object") return "";
  if (Array.isArray(property.title)) return property.title.map((item) => item.plain_text || item.text?.content || "").join("");
  if (Array.isArray(property.rich_text)) return property.rich_text.map((item) => item.plain_text || item.text?.content || "").join("");
  if (typeof property.url === "string") return property.url;
  return "";
}

function chunks(value, size = 1900) {
  const text = String(value ?? "");
  return text ? Array.from({ length: Math.ceil(text.length / size) }, (_, index) => ({ type: "text", text: { content: text.slice(index * size, (index + 1) * size) } })) : [];
}

function relationValue(ids) {
  return { relation: [...new Set((ids || []).filter(Boolean))].map((id) => ({ id })) };
}

function propertyValue(schemaProperty, value) {
  if (!schemaProperty) return null;
  switch (schemaProperty.type) {
    case "title": return { title: chunks(value) };
    case "rich_text": return { rich_text: chunks(value) };
    case "url": return { url: value || null };
    case "relation": return relationValue(Array.isArray(value) ? value : [value]);
    case "number": return { number: value === "" || value === null || value === undefined ? null : Number(value) };
    case "checkbox": return { checkbox: Boolean(value) };
    default: return null;
  }
}

function materializeProperties(schema, fields) {
  return Object.fromEntries(Object.entries(fields)
    .map(([key, value]) => [key, propertyValue(schema.properties?.[key], value)])
    .filter(([, value]) => value));
}

function artifactAt(runRoot, relativePath) {
  if (!relativePath) return "";
  const candidate = resolve(runRoot, relativePath);
  if (!candidate.startsWith(`${resolve(runRoot)}/`) || !existsSync(candidate)) {
    throw new Error(`Frozen artifact is missing or outside the run root: ${relativePath}`);
  }
  return readFileSync(candidate, "utf8");
}

function titleFromKey(key, fallback) {
  return `${key} — ${String(fallback || key).replace(/\s+/g, " ").slice(0, 180)}`;
}

function normalizeDepartment(value) {
  const compact = String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases = {
    ecommerce: "ecommerce",
    digitalcommerce: "ecommerce",
    property: "property",
    propertymanagement: "property",
    dtc: "dtc",
    dtcbrands: "dtc",
    merchandising: "merchandising",
    marketing: "marketing",
    cmt: "cmt",
    content: "content"
  };
  return aliases[compact] || compact || "unassigned";
}

function loadPrivateSeed(privateSeedPath) {
  if (!privateSeedPath || !existsSync(privateSeedPath)) throw new Error("Private seed is missing; provision requires the profile-private 0600 capture seed.");
  if ((statSync(privateSeedPath).mode & 0o777) !== 0o600) throw new Error("Private seed must remain mode 0600.");
  const seed = parseJson(readFileSync(privateSeedPath, "utf8"), "Private seed");
  const aggregate = seed.aggregate || {};
  if (seed.schema_version !== "kamdar-private-seed@1.0.0" || !Array.isArray(seed.projects) || seed.projects.length !== 39 || aggregate.named_projects !== 39 || aggregate.source_gaps !== 10 || aggregate.observed_departments !== 7) {
    throw new Error("Private seed does not match the approved 39/10/7 capture contract.");
  }
  return seed;
}

function planFromResult(result) {
  if (!result?.records?.changes || !result?.tools?.calls || !result?.run?.output_root) {
    throw new Error("A current template-first frozen result is required.");
  }
  return result;
}

function temporaryFrozenPlan({ privateSeedPath, retain = true }) {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-v4-preflight-"));
  const result = runTemplateFirstProof({ outputRoot: root, reset: true, mode: "frozen-mock", privateSeedPath });
  const planned = planFromResult(result);
  if (!retain) rmSync(root, { recursive: true, force: true });
  return { result: planned, temporary_root: retain ? root : null };
}

function readDataSource(commandRunner, key) {
  const database = v4Databases[key];
  const resolved = notionJson(commandRunner, ["datasources", "resolve", database.database_id, "--json"], `resolve ${key}`);
  const sources = resolved.data_sources || [];
  if (resolved.database_id !== database.database_id || sources.length !== 1 || sources[0].id !== database.data_source_id) {
    throw new Error(`${key} is not the fixed v4 database/data source pair.`);
  }
  const schema = notionJson(commandRunner, ["api", `v1/data_sources/${database.data_source_id}`], `read ${key} schema`);
  if (schema.id !== database.data_source_id || schema.parent?.database_id !== database.database_id || schema.in_trash) {
    throw new Error(`${key} did not resolve to a live v4 data source.`);
  }
  const missingBase = (requiredBaseProperties[key] || []).filter((property) => !schema.properties?.[property]);
  return { ...database, schema, missing_base_properties: missingBase };
}

function getSchemas(commandRunner) {
  return Object.fromEntries(Object.keys(v4Databases).map((key) => [key, readDataSource(commandRunner, key)]));
}

function plannedSchemaChanges(schemas) {
  const changes = [];
  for (const [name, spec] of Object.entries(projectPropertySpecifications)) {
    if (!schemas.projects.schema.properties?.[name]) changes.push({ database: "projects", property: name, type: "rich_text" });
  }
  for (const relation of relationSpecifications) {
    const existing = schemas[relation.database].schema.properties?.[relation.property];
    if (!existing) changes.push({ database: relation.database, property: relation.property, type: "relation", related_database: "projects", reciprocal: relation.reciprocal });
    else if (existing.type !== "relation") throw new Error(`${relation.database}.${relation.property} exists but is not a relation; refusing a destructive conversion.`);
  }
  return changes;
}

function validateBoundary(statePath) {
  const boundary = readV4Boundary({ statePath });
  if (boundary.status !== "ready" || boundary.version !== 4) throw new Error(`v4 boundary is not ready: ${boundary.reason || "unknown"}`);
  return boundary;
}

function resultSummary(result, snapshot) {
  return {
    projects: snapshot.projects.length,
    people: snapshot.people.length,
    work_items: snapshot.work_items.length,
    project_patches: result.records.changes.filter((change) => change.database === "projects").length,
    reports: result.records.changes.filter((change) => change.database === "reports").length,
    promotions: result.records.changes.filter((change) => ["decisions", "skills"].includes(change.database) || (change.database === "work_items" && /^ISSUE-/.test(change.record_id || ""))).length,
    comments: result.records.changes.filter((change) => change.database === "work_comments").length
  };
}

/**
 * Read-only check of the exact fixed v4 state. It performs authenticated reads
 * through `ntn`, but never calls a mutating Notion endpoint.
 */
export function preflightKamdarV4({
  commandRunner = defaultCommandRunner,
  statePath = defaultStatePath,
  privateSeedPath = defaultPrivateSeedPath,
  privateSeed,
  frozenResult,
  snapshot
} = {}) {
  const boundary = validateBoundary(statePath);
  const seed = privateSeed || loadPrivateSeed(privateSeedPath);
  const loadedSnapshot = snapshot || loadFrozenSnapshot({ privateSeedPath });
  const result = frozenResult || temporaryFrozenPlan({ privateSeedPath, retain: false }).result;
  const schemas = getSchemas(commandRunner);
  const missingBase = Object.entries(schemas).flatMap(([database, value]) => value.missing_base_properties.map((property) => `${database}.${property}`));
  if (missingBase.length) throw new Error(`v4 schema lost required base properties: ${missingBase.join(", ")}`);
  return {
    mode: "preflight",
    applies_notion_writes: false,
    namespace: v4Namespace,
    root_id: v4RootId,
    boundary,
    private_seed: { verified: true, projects: seed.projects.length, source_gaps: seed.source_gaps.length, departments: seed.departments.length },
    databases: Object.fromEntries(Object.entries(schemas).map(([key, value]) => [key, { database_id: value.database_id, data_source_id: value.data_source_id, title: value.title }])),
    planned_schema_changes: plannedSchemaChanges(schemas),
    planned_apply: resultSummary(result, loadedSnapshot)
  };
}

function updateDataSource(commandRunner, sourceId, properties, label) {
  return notionJson(commandRunner, ["api", "-X", "PATCH", `v1/data_sources/${sourceId}`, "-d", JSON.stringify({ properties })], label);
}

function ensureSchema(commandRunner, schemas) {
  const applied = [];
  const projectMissing = Object.fromEntries(Object.entries(projectPropertySpecifications)
    .filter(([name]) => !schemas.projects.schema.properties?.[name]));
  if (Object.keys(projectMissing).length) {
    updateDataSource(commandRunner, schemas.projects.data_source_id, projectMissing, "add project memory properties");
    applied.push(...Object.keys(projectMissing).map((property) => ({ database: "projects", property, operation: "added" })));
  }
  for (const relation of relationSpecifications) {
    if (schemas[relation.database].schema.properties?.[relation.property]) continue;
    const property = {
      relation: {
        data_source_id: schemas.projects.data_source_id,
        type: "dual_property",
        dual_property: { synced_property_name: relation.reciprocal }
      }
    };
    updateDataSource(commandRunner, schemas[relation.database].data_source_id, { [relation.property]: property }, `add ${relation.database} project relation`);
    applied.push({ database: relation.database, property: relation.property, operation: "added_relation", related_database: "projects" });
  }
  return applied;
}

function queryRows(commandRunner, database) {
  const response = notionJson(commandRunner, ["datasources", "query", database.data_source_id, "--limit", "100", "--json"], `query ${database.title}`);
  if (response.next_cursor) throw new Error(`${database.title} exceeds the bounded 100-row operator query; refusing partial upsert.`);
  const rows = response.results || [];
  return new Map(rows.map((row) => [idOf(row.properties?.ID), row]).filter(([id]) => id));
}

function writePage(commandRunner, { database, schema, existing, fields, markdown, label }) {
  const properties = materializeProperties(schema, fields);
  let page;
  let event;
  if (existing) {
    page = notionJson(commandRunner, ["api", "-X", "PATCH", `v1/pages/${existing.id}`, "-d", JSON.stringify({ properties })], `patch ${label}`);
    event = "updated";
  } else {
    page = notionJson(commandRunner, ["api", "v1/pages", "-d", JSON.stringify({
      parent: { type: "data_source_id", data_source_id: database.data_source_id },
      properties,
      ...(markdown ? { markdown } : {})
    })], `create ${label}`);
    event = "created";
  }
  if (!page?.id || !page?.url) throw new Error(`${label} did not return a page id and URL.`);
  // Existing v4 records may contain manually-created child pages. Replacing a
  // page body would delete those children, so this operator updates properties
  // only. New demo records receive the template-derived Markdown at creation.
  return { event, id: page.id, url: page.url, content_preserved: Boolean(existing && markdown) };
}

function syntheticProjectMap(privateSeed, snapshot) {
  const available = new Map();
  for (const project of privateSeed.projects) {
    const department = normalizeDepartment(project.department);
    if (!available.has(department)) available.set(department, []);
    available.get(department).push(project);
  }
  const fallback = [...privateSeed.projects];
  const selected = new Set();
  const bySyntheticId = new Map();
  for (const project of snapshot.projects) {
    const department = normalizeDepartment(project.department);
    const candidate = (available.get(department) || []).find((entry) => !selected.has(entry.project_key)) || fallback.find((entry) => !selected.has(entry.project_key));
    if (!candidate) throw new Error("Private Project seed did not provide a one-to-one Project mapping.");
    selected.add(candidate.project_key);
    bySyntheticId.set(project.id, candidate.project_key);
  }
  return bySyntheticId;
}

function sourceUrl() {
  return `https://app.notion.com/p/${v4RootId.replace(/-/g, "")}`;
}

function loadReceipt(path) {
  if (!existsSync(path)) return { version: 1, namespace: v4Namespace, actions: {} };
  const value = parseJson(readFileSync(path, "utf8"), "Private Notion receipt");
  if (value.version !== 1 || value.namespace !== v4Namespace || typeof value.actions !== "object" || Array.isArray(value.actions)) {
    throw new Error("Existing private Notion receipt does not belong to the v4 namespace.");
  }
  return value;
}

function writeReceipt(path, receipt) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, stable(receipt), { mode: 0o600 });
}

function redactedAction({ action_key, database, operation, result, payload, feature_id = null, adapter = "notion" }) {
  return {
    action_key,
    database,
    operation,
    feature_id,
    adapter,
    status: result.event === "skipped" ? "skipped" : "applied",
    recorded_at: new Date().toISOString(),
    provider: "notion",
    provider_id_hash: sha256(result.id || action_key),
    result_url: result.url || null,
    payload_hash: sha256(payload || action_key),
    idempotency_key: action_key
  };
}

/**
 * Project the private Notion receipt into the public runner's receipt shape.
 * Only actions that correspond exactly to a planned template-first Notion call
 * are emitted. The provider id remains a hash; no contact, page id, token, or
 * other raw identifier crosses this boundary.
 */
export function toTemplateFirstExternalReceipts({ actions, workspace_url = null, workspace_databases = null, template_library_url = null } = {}) {
  if (!Array.isArray(actions)) throw new Error("A Notion action list is required to derive template-first receipts.");
  return actions
    .filter((action) => action.status === "applied" && action.adapter === "notion" && /^FEAT-\d{4}$/.test(action.feature_id || ""))
    .map((action) => ({
      feature_id: action.feature_id,
      adapter: "notion",
      operation: action.operation,
      action_key: action.action_key,
      status: "applied",
      provider_id: action.provider_id_hash,
      recorded_at: action.recorded_at,
      result_url: action.result_url,
      detail: "Applied only in the isolated Kamdar AI Eval Demo v4 namespace.",
      payload_hash: action.payload_hash,
      idempotency_key: action.idempotency_key,
      ...(workspace_url ? { workspace_url } : {}),
      ...(workspace_databases ? { workspace_databases } : {}),
      ...(template_library_url ? { template_library_url } : {})
    }));
}

function alreadyApplied(receipt, actionKey, payload) {
  const prior = receipt.actions?.[actionKey];
  return prior && prior.status === "applied" && prior.payload_hash === sha256(payload || actionKey);
}

function fieldsForProject(project, owner) {
  return {
    ID: project.project_key,
    Name: project.project_name,
    Department: project.department || "Unassigned",
    Owner: owner || "Unassigned — capture did not include an owner",
    Status: "Portfolio record",
    Progress: "Capture-derived Project catalog record. Current operating detail is supplied only by linked synthetic Work and reviewed automation updates.",
    "Main blocker": "Source capture did not include a Project page body.",
    "Next action": "Review linked operating evidence when the Project becomes active.",
    "Last automation run": "Not yet evaluated",
    Template: "company-os-project@0.3.0",
    Source: sourceUrl()
  };
}

function fieldsForPerson(person) {
  return {
    ID: person.id,
    Name: person.name,
    Department: person.department,
    Role: person.role,
    Route: person.route_label,
    Status: person.approved_route === "none" ? "route-not-approved" : "private-route-approved",
    Template: "company-os-person@0.1.0",
    Source: sourceUrl()
  };
}

function fieldsForWork(item, projectPageId) {
  return {
    ID: item.id,
    Name: item.name,
    Type: item.type,
    Project: item.project_id,
    Projects: [projectPageId],
    Owner: item.owner_id,
    Status: item.status,
    Priority: item.healthy ? "Normal" : "Needs attention",
    Due: item.due_date,
    Template: workTemplateId(item.type),
    Source: sourceUrl()
  };
}

function workTemplateId(type) {
  return {
    Feature: "company-os-feature@0.1.0",
    Issue: "kamdar-issue@0.3.0",
    Meeting: "kamdar-meeting@0.3.0"
  }[type] || "company-os-task@0.7.0";
}

function contentForWork(item) {
  if (item.type === "Feature") {
    return `# ${item.name}\n\n## Problem and value\n\n${item.blocker}\n\n## Scope for this cycle\n\n${item.next_action}\n\n## Success and acceptance\n\nSource evidence and owner review show the targeted outcome occurred.\n\n## Notes\n\n${item.progress}\n`;
  }
  if (item.type === "Issue") {
    return `# ${item.name}\n\n## Problem and impact\n\n${item.blocker}\n\n## Evidence and reproduction\n\nSource: ${sourceUrl()}\n\n## Diagnosis\n\n${item.problem_analysis?.cause || "Not assessed"}\n\n## Containment and next action\n\n${item.next_action}\n\n## Resolution and verification\n\nNot resolved.\n\n## Related records\n\nProject: ${item.project_id}\n`;
  }
  if (item.type === "Meeting") {
    return `# ${item.name}\n\n## Purpose and agenda\n\n${item.next_action}\n\n## Notes\n\n${item.progress}\n\n## Decisions\n\nCreate or link canonical Decision records.\n\n## Commitments\n\nCreate or link canonical Work records.\n\n## Follow-up\n\n${item.next_action}\n`;
  }
  return `# ${item.name}\n\n## Notes\n\n${item.progress}\n\n**Blocker:** ${item.blocker}\n\n**Next action:** ${item.next_action}\n\n**Evidence / analysis:** ${item.problem_analysis?.cause || "Not assessed"}\n`;
}

function commentContent(markdown, item, peoplePages) {
  const owner = item?.owner_id ? peoplePages.get(item.owner_id) : null;
  const heading = String(markdown).replace(/^@[^\n—]+\s+—\s+/m, "Owner action needed — ");
  // The v4 People rows are directory records, not authenticated Notion users.
  // A normal page link is therefore the truthful available routing primitive;
  // do not manufacture an @-mention that the Notion API cannot resolve.
  return owner?.url
    ? heading.replace(/^(# .*\n)/m, `$1\nDirectory record: [${item.owner_id}](${owner.url})\n`)
    : heading;
}

function reportCallForChange(change, calls) {
  if (change.record_id === "RPT-COMPANY-2026-W34") return calls.find((call) => call.operation === "upsert_company_report");
  if (change.after?.report_type === "Department") return calls.find((call) => call.operation === "upsert_department_report" && `RPT-DEPARTMENT-${String(call.args?.department || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-2026-W34` === change.record_id);
  return calls.find((call) => call.operation === "upsert_project_report" && `RPT-${call.args?.project_id}-2026-W34` === change.record_id);
}

function fallbackReportCall(change, calls) {
  if (change.after?.report_type === "Company") return calls.find((call) => call.operation === "upsert_company_report");
  if (change.after?.report_type === "Department") return calls.find((call) => call.operation === "upsert_department_report" && String(call.args?.department || "").toLowerCase() === String(change.after?.department || "").toLowerCase());
  return calls.find((call) => call.operation === "upsert_project_report" && call.args?.project_id === change.after?.project_relation);
}

function projectRelationIds(value, projectPages) {
  const ids = String(value || "").split(",").map((id) => id.trim()).filter(Boolean);
  return ids.map((id) => projectPages.get(id)).filter(Boolean);
}

/**
 * Apply the frozen plan to only the isolated v4 Notion environment. Callers
 * must pass `operate: true`; this function has no default write path.
 */
export function operateKamdarV4({
  operate = false,
  commandRunner = defaultCommandRunner,
  statePath = defaultStatePath,
  privateSeedPath = defaultPrivateSeedPath,
  privateSeed,
  frozenResult,
  snapshot,
  runRoot,
  receiptPath = defaultReceiptPath
} = {}) {
  if (!operate) throw new Error("Notion operation is disabled. Pass operate: true (CLI: --operate-v4) after a successful preflight.");
  const seed = privateSeed || loadPrivateSeed(privateSeedPath);
  const loadedSnapshot = snapshot || loadFrozenSnapshot({ privateSeedPath });
  const plan = frozenResult || temporaryFrozenPlan({ privateSeedPath }).result;
  const result = planFromResult(plan);
  const root = runRoot || result.run.output_root;
  const preflight = preflightKamdarV4({ commandRunner, statePath, privateSeedPath, privateSeed: seed, frozenResult: result, snapshot: loadedSnapshot });
  let schemas = getSchemas(commandRunner);
  const schemaChanges = ensureSchema(commandRunner, schemas);
  if (schemaChanges.length) schemas = getSchemas(commandRunner);
  const receipt = loadReceipt(receiptPath);
  const actions = [];
  const remember = (entry) => {
    const prior = receipt.actions[entry.action_key];
    // A retry may skip an already-applied write. Preserve the original applied
    // receipt so the dashboard keeps historical provider evidence instead of
    // making a real action disappear after an idempotency check.
    const durable = entry.status === "skipped" && prior?.status === "applied" ? prior : entry;
    receipt.actions[durable.action_key] = durable;
    receipt.updated_at = entry.recorded_at;
    writeReceipt(receiptPath, receipt);
    actions.push(durable);
  };

  const pages = Object.fromEntries(["projects", "people", "work_items", "decisions", "reports", "skills"].map((key) => [key, queryRows(commandRunner, schemas[key])]));
  const projectMap = syntheticProjectMap(seed, loadedSnapshot);
  const projectPages = new Map();

  // Capture-derived Project catalog: deliberately uses the private project seed
  // and never writes those titles to local artifacts or receipts.
  for (const project of seed.projects) {
    const actionKey = `seed-project:${project.project_key}`;
    const payload = stable(fieldsForProject(project));
    let applied;
    if (alreadyApplied(receipt, actionKey, payload) && pages.projects.get(project.project_key)) {
      const current = pages.projects.get(project.project_key);
      applied = { event: "skipped", id: current.id, url: current.url };
    } else {
      applied = writePage(commandRunner, { database: schemas.projects, schema: schemas.projects.schema, existing: pages.projects.get(project.project_key), fields: fieldsForProject(project), label: `Project ${project.project_key}` });
      pages.projects.set(project.project_key, { id: applied.id, url: applied.url });
    }
    projectPages.set(project.project_key, applied.id);
    remember(redactedAction({ action_key: actionKey, database: "projects", operation: "upsert_capture_project", result: applied, payload }));
  }
  const syntheticProjectPages = new Map([...projectMap].map(([syntheticId, projectKey]) => [syntheticId, projectPages.get(projectKey)]));

  const peoplePages = new Map();
  for (const person of loadedSnapshot.people) {
    const actionKey = `seed-person:${person.id}`;
    const payload = stable(fieldsForPerson(person));
    const applied = alreadyApplied(receipt, actionKey, payload) && pages.people.get(person.id)
      ? { event: "skipped", id: pages.people.get(person.id).id, url: pages.people.get(person.id).url }
      : writePage(commandRunner, { database: schemas.people, schema: schemas.people.schema, existing: pages.people.get(person.id), fields: fieldsForPerson(person), label: `Person ${person.id}` });
    pages.people.set(person.id, { id: applied.id, url: applied.url });
    peoplePages.set(person.id, applied.id);
    remember(redactedAction({ action_key: actionKey, database: "people", operation: "upsert_person", result: applied, payload }));
  }

  for (const item of loadedSnapshot.work_items) {
    const actionKey = `seed-work:${item.id}`;
    const projectKey = projectMap.get(item.project_id);
    const fields = fieldsForWork(item, projectPages.get(projectKey));
    const markdown = contentForWork(item);
    const payload = stable({ fields, markdown });
    const applied = alreadyApplied(receipt, actionKey, payload) && pages.work_items.get(item.id)
      ? { event: "skipped", id: pages.work_items.get(item.id).id, url: pages.work_items.get(item.id).url }
      : writePage(commandRunner, { database: schemas.work_items, schema: schemas.work_items.schema, existing: pages.work_items.get(item.id), fields, markdown, label: `Work ${item.id}` });
    pages.work_items.set(item.id, { id: applied.id, url: applied.url });
    remember(redactedAction({ action_key: actionKey, database: "work_items", operation: "upsert_work", result: applied, payload }));
  }

  const notionCalls = result.tools.calls.filter((call) => call.adapter === "notion");

  // Daily/Weekly in-place Project patches are now applied to their mapped,
  // capture-derived Project record. There is no child Project-memory page.
  for (const change of result.records.changes.filter((entry) => entry.database === "projects" && entry.after)) {
    const projectKey = projectMap.get(change.record_id);
    const page = projectKey && pages.projects.get(projectKey);
    if (!page) throw new Error(`No capture-derived v4 Project page maps to ${change.record_id}.`);
    const fields = {
      Progress: change.after.current_context || change.after.progress || "Reviewed by the current Kamdar automation run.",
      "Main blocker": change.after.main_blocker || "No material blocker recorded.",
      "Next action": change.after.next_action || "Review the linked Work evidence.",
      Status: change.after.status || "Active",
      "Last automation run": result.run.id
    };
    const planned = change.assertion_ids?.includes("weekly-project-carry-forward")
      ? notionCalls.find((call) => call.operation === "update_project_plan" && call.args?.project_id === change.record_id)
      : notionCalls.find((call) => call.operation === "update_project_memory" && call.args?.project_id === change.record_id);
    if (!planned) throw new Error(`Frozen Project patch ${change.record_id} has no matching planned Notion application.`);
    const actionKey = planned.args.action_key;
    const payload = stable(fields);
    const applied = alreadyApplied(receipt, actionKey, payload)
      ? { event: "skipped", id: page.id, url: page.url }
      : writePage(commandRunner, { database: schemas.projects, schema: schemas.projects.schema, existing: page, fields, label: `Project patch ${change.record_id}` });
    remember(redactedAction({ action_key: actionKey, database: "projects", operation: planned.operation, feature_id: planned.feature_id, adapter: planned.adapter, result: applied, payload }));
  }

  for (const change of result.records.changes.filter((entry) => entry.database === "reports" && entry.after)) {
    const call = reportCallForChange(change, notionCalls) || fallbackReportCall(change, notionCalls);
    if (!call?.args?.artifact_path) throw new Error(`Frozen report ${change.record_id} has no generated artifact path.`);
    const markdown = artifactAt(root, call.args.artifact_path);
    const fields = {
      ID: change.record_id,
      Name: titleFromKey(change.record_id, change.after.report_type),
      Level: change.after.report_type,
      Week: loadedSnapshot.week,
      Project: String(change.after.project_relation || "source-gap"),
      Projects: projectRelationIds(change.after.project_relation, syntheticProjectPages),
      Status: "Final",
      Template: "company-os-weekly-report@0.3.0",
      Source: sourceUrl()
    };
    const payload = stable({ fields, markdown });
    const actionKey = call.args.action_key || `report:${change.record_id}`;
    const applied = alreadyApplied(receipt, actionKey, payload) && pages.reports.get(change.record_id)
      ? { event: "skipped", id: pages.reports.get(change.record_id).id, url: pages.reports.get(change.record_id).url }
      : writePage(commandRunner, { database: schemas.reports, schema: schemas.reports.schema, existing: pages.reports.get(change.record_id), fields, markdown, label: `Report ${change.record_id}` });
    pages.reports.set(change.record_id, { id: applied.id, url: applied.url });
    remember(redactedAction({ action_key: actionKey, database: "reports", operation: call.operation, feature_id: call.feature_id, adapter: call.adapter, result: applied, payload }));
  }

  const promotionDatabaseByOperation = { upsert_issue: "work_items", upsert_decision: "decisions", upsert_sop: "skills" };
  for (const call of notionCalls.filter((entry) => Object.hasOwn(promotionDatabaseByOperation, entry.operation))) {
    const databaseKey = promotionDatabaseByOperation[call.operation];
    const recordId = call.args.record_id;
    const change = result.records.changes.find((entry) => entry.database === databaseKey && entry.record_id === recordId);
    if (!change) throw new Error(`Frozen promotion ${recordId} is absent from record changes.`);
    const markdown = artifactAt(root, call.args.artifact_path);
    const projectKey = projectMap.get(change.after?.project_id);
    const fields = {
      ID: recordId,
      Name: titleFromKey(recordId, call.operation.replace(/^upsert_/, "").replace(/_/g, " ")),
      Project: change.after?.project_id || "",
      Projects: projectKey ? [projectPages.get(projectKey)] : [],
      Status: "Approved",
      Template: databaseKey === "work_items" ? "kamdar-issue@1.0.0" : databaseKey === "skills" ? "kamdar-employee-sop@1.0.0" : `company-os-${databaseKey.slice(0, -1)}@0.3.0`,
      Source: sourceUrl(),
      ...(databaseKey === "decisions" ? { Approver: change.after?.authority || "recorded", Decided: loadedSnapshot.local_day } : {})
    };
    const payload = stable({ fields, markdown });
    const actionKey = call.args.action_key || `promotion:${recordId}`;
    const applied = alreadyApplied(receipt, actionKey, payload) && pages[databaseKey].get(recordId)
      ? { event: "skipped", id: pages[databaseKey].get(recordId).id, url: pages[databaseKey].get(recordId).url }
      : writePage(commandRunner, { database: schemas[databaseKey], schema: schemas[databaseKey].schema, existing: pages[databaseKey].get(recordId), fields, markdown, label: `Promotion ${recordId}` });
    pages[databaseKey].set(recordId, { id: applied.id, url: applied.url });
    remember(redactedAction({ action_key: actionKey, database: databaseKey, operation: call.operation, feature_id: call.feature_id, adapter: call.adapter, result: applied, payload }));
  }

  for (const comment of result.records.changes.filter((entry) => entry.database === "work_comments")) {
    const target = pages.work_items.get(comment.record_id);
    const path = `daily/comments/${comment.record_id}-owner-action.md`;
    const item = loadedSnapshot.work_items.find((entry) => entry.id === comment.record_id);
    const markdown = commentContent(artifactAt(root, path), item, peoplePages);
    const planned = notionCalls.filter((call) => call.operation === "create_owner_action_comment" && call.args?.work_item_id === comment.record_id);
    if (!planned.length) throw new Error(`Frozen comment ${comment.record_id} has no matching planned Notion application.`);
    if (planned.every((call) => alreadyApplied(receipt, call.args.action_key, markdown))) {
      for (const call of planned) remember({ ...receipt.actions[call.args.action_key], status: "skipped", recorded_at: new Date().toISOString() });
      continue;
    }
    if (!target) throw new Error(`Cannot comment on missing seeded Work item ${comment.record_id}.`);
    // Use Notion's native rich_text comment payload rather than its Markdown
    // importer: the latter guesses @ syntax as an unsupported custom-emoji
    // mention when our directory rows are not authenticated Notion users.
    const response = notionJson(commandRunner, ["api", "-X", "POST", "v1/comments", "-d", JSON.stringify({ parent: { page_id: target.id }, rich_text: chunks(markdown) })], `comment ${comment.record_id}`);
    if (!response?.id) throw new Error(`Notion did not return a comment id for ${comment.record_id}.`);
    for (const call of planned) {
      remember(redactedAction({ action_key: call.args.action_key, database: "work_items", operation: call.operation, feature_id: call.feature_id, adapter: call.adapter, result: { event: "created", id: response.id, url: target.url }, payload: markdown }));
    }
  }

  const displayActions = actions.map((entry) => ({
    action_key: entry.action_key,
    database: entry.database,
    operation: entry.operation,
    status: entry.status,
    recorded_at: entry.recorded_at,
    provider: entry.provider,
    provider_id_hash: entry.provider_id_hash,
    result_url: entry.result_url,
    payload_hash: entry.payload_hash,
    idempotency_key: entry.idempotency_key
  }));
  return {
    mode: "operated-v4",
    applies_notion_writes: true,
    namespace: v4Namespace,
    root_id: v4RootId,
    preflight,
    schema_changes: schemaChanges,
    receipt_path: receiptPath,
    actions: displayActions,
    counts: {
      applied: displayActions.filter((entry) => entry.status === "applied").length,
      skipped: displayActions.filter((entry) => entry.status === "skipped").length
    }
  };
}

function main(argv = process.argv.slice(2)) {
  const operate = argv.includes("--operate-v4");
  const unsupported = argv.filter((arg) => !["--preflight", "--operate-v4"].includes(arg));
  if (unsupported.length || (!operate && argv.length && !argv.includes("--preflight"))) {
    process.stderr.write(`${JSON.stringify({ status: "blocked", reason: "usage: node scripts/operate-kamdar-v4.mjs [--preflight | --operate-v4]" })}\n`);
    process.exitCode = 2;
    return;
  }
  try {
    const result = operate ? operateKamdarV4({ operate: true }) : preflightKamdarV4();
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${JSON.stringify({ mode: operate ? "operated-v4" : "preflight", status: "blocked", reason: error.message })}\n`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
