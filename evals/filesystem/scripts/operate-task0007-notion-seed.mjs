#!/usr/bin/env node
/**
 * Fresh, Notion-only provider edge for TASK-0007.
 *
 * The operator creates exactly one marked root, uses only data sources beneath
 * that root, and keeps IDs/action receipts in the Hermes profile. It never
 * reads or changes a production Kamdar root, sends a message, or deletes data.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { loadKamdarSeedConfig, seedConfigPath } from "./kamdar-seed-config.mjs";
import { loadAndValidateSeedRealismReview } from "./quality-review-contracts.mjs";
import { runTask0007FixtureAutomation } from "./run-task0007-fixture-automation.mjs";
import { WeeklyReviewResultSchema } from "../../../automations/schemas/weekly-review-result.zod.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const projectRoot = resolve(scriptDirectory, "../../..");
export const seedRealismReviewPath = resolve(projectRoot, "evals/seed/kamdar-company-os.seed-review.json");
export const profileRoot = "/Users/kenjipcx/.hermes/profiles/vishan-kamdar-ai";
export const task0007SeedNamespace = "kamdar-task0007-isolated-notion-seed-v1";
export const task0007OwnedMarker = "kamdar-eval-seed-owned:v1";
export const task0007SeedRoot = resolve(profileRoot, "runtime-showcase/task0007-2026-08-25/isolated-notion-seed");
export const defaultStatePath = resolve(task0007SeedRoot, "state.json");
export const defaultReceiptPath = resolve(task0007SeedRoot, "notion-receipt.json");
export const defaultOperationSummaryPath = resolve(task0007SeedRoot, "last-operation-summary.json");
export const defaultRunRoot = resolve(task0007SeedRoot, "automation-run-001");
export const rootTitle = "[EVAL] Kamdar TASK-0007 — source-safe seed";
export const task0007Environment = Object.freeze({
  namespace: task0007SeedNamespace,
  owned_marker: task0007OwnedMarker,
  root_title: rootTitle,
  private_root: task0007SeedRoot,
  run_root: defaultRunRoot
});
export const currentEvalSeedEnvironment = Object.freeze({
  namespace: "kamdar-company-os-isolated-notion-seed-2026-08-26-v4",
  owned_marker: "kamdar-company-os-eval-seed-owned:2026-08-26-v4",
  root_title: "[EVAL] Kamdar Company OS — grounded v4 — 2026-08-26",
  private_root: resolve(profileRoot, "runtime-showcase/kamdar-company-os-current-seed-2026-08-26-04"),
  run_root: resolve(profileRoot, "runtime-showcase/kamdar-company-os-current-seed-2026-08-26-04/automation-run-001")
});

const databaseDefinitions = Object.freeze({
  projects: { title: "Projects", properties: ["Name", "ID", "Department", "Owner", "Status", "Priority", "Start date", "Due date", "Progress", "Template", "Run key"] },
  people: {
    title: "People",
    properties: ["Name", "ID", "Department", "Role", "Status", "Manager", "Preferred contact channel", "Approved contact channels", "Contact endpoint", "Contact instructions", "Timezone", "Expertise", "Template", "Run key"],
    propertyTypes: { "Preferred contact channel": "select" }
  },
  work_items: {
    title: "Work items",
    properties: ["Name", "ID", "Project", "Department", "Owner", "Type", "Status", "Priority", "Start date", "Due date", "Progress", "Last meaningful update", "Meeting date", "Attendees", "Facilitator", "Daily review version", "Template", "Run key"],
    propertyTypes: { Type: "select", Status: "status" },
    propertyOptions: {
      Type: [{ name: "Task", color: "blue" }, { name: "Meeting", color: "purple" }, { name: "Issue", color: "red" }],
      Status: [
        { name: "Blocked", color: "red" },
        { name: "In progress", color: "blue" },
        { name: "On track", color: "blue" },
        { name: "Done", color: "green" },
        { name: "Processed", color: "green" }
      ]
    }
  },
  decisions: { title: "Decisions", properties: ["Name", "ID", "Project", "Department", "Proposer", "Approver", "Status", "Decided at", "Review date", "Template", "Run key"] },
  skills: { title: "SOPs", properties: ["Name", "ID", "Project", "Department", "Owner", "Status", "Source path", "Latest eval", "Last reviewed", "Template", "Run key"] },
  reports: { title: "Reports", properties: ["Name", "ID", "Project", "Department", "Level", "Week start", "Status", "Report version", "Finalized at", "Previous report", "Source report IDs", "Template", "Run key"] },
  artifacts: { title: "Automation artifacts", properties: ["Name", "ID", "Pipeline", "Status", "Summary", "Artifact hash", "Output path", "Run key"] }
});

function stable(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function sha256(value) { return createHash("sha256").update(String(value)).digest("hex"); }
function now() { return new Date().toISOString(); }
function fail(message) { throw new Error(`TASK-0007 isolated Notion seed: ${message}`); }
function readJson(path, label = path) { try { return JSON.parse(readFileSync(path, "utf8")); } catch (error) { fail(`${label} is invalid JSON: ${error.message}`); } }
function writePrivateJson(path, value) { mkdirSync(dirname(path), { recursive: true, mode: 0o700 }); writeFileSync(path, stable(value), { mode: 0o600 }); }
function privatePath(path, label, privateRoot = task0007SeedRoot) { const resolved = resolve(path); const root = resolve(privateRoot); if (!resolved.startsWith(`${root}/`) && resolved !== root) fail(`${label} must remain under the private isolated seed root.`); return resolved; }
function environmentPaths(environment = task0007Environment, overrides = {}) {
  const privateRoot = resolve(overrides.privateRoot || environment.private_root);
  return {
    environment,
    privateRoot,
    statePath: resolve(overrides.statePath || privateRoot, overrides.statePath ? "" : "state.json"),
    receiptPath: resolve(overrides.receiptPath || privateRoot, overrides.receiptPath ? "" : "notion-receipt.json"),
    operationSummaryPath: resolve(overrides.operationSummaryPath || privateRoot, overrides.operationSummaryPath ? "" : "last-operation-summary.json"),
    runRoot: resolve(overrides.runRoot || environment.run_root || resolve(privateRoot, "automation-run-001"))
  };
}

function requireApprovedSeed(options = {}) {
  const seed = loadKamdarSeedConfig();
  const reviewPath = resolve(options.seedRealismReviewPath || seedRealismReviewPath);
  const approval = loadAndValidateSeedRealismReview({ seed, seedPath: seedConfigPath, reviewPath });
  return { seed, approval };
}
function directDraftRunRoot(requestedRoot, privateRoot) {
  const root = privatePath(requestedRoot, "automation run root", privateRoot);
  const resultPath = resolve(root, "result.json");
  if (!existsSync(resultPath)) return root;
  const existing = readJson(resultPath, "existing fixture automation result");
  if (existing.run?.mode === "local-markdown-draft-projection") return root;
  const corrective = privatePath(root + "-direct-draft-v2", "corrective automation run root", privateRoot);
  const correctiveResult = resolve(corrective, "result.json");
  if (!existsSync(corrective)) return corrective;
  if (!existsSync(correctiveResult)) {
    if (readdirSync(corrective).length) fail("corrective automation run root is nonempty without a result; refuse to overwrite it.");
    return corrective;
  }
  if (readJson(correctiveResult, "corrective fixture automation result").run?.mode !== "local-markdown-draft-projection") {
    fail("corrective automation run root has an incompatible result; refuse to overwrite it.");
  }
  return corrective;
}
function richText(value) { return value === undefined || value === null || value === "" ? [] : [{ type: "text", text: { content: String(value).slice(0, 1900) } }]; }
function schemaProperties(definition) {
  return Object.fromEntries(definition.properties.map((name) => {
    const type = name === "Name" ? "title" : definition.propertyTypes?.[name] || "rich_text";
    const options = definition.propertyOptions?.[name];
    return [name, { [type]: options ? { options } : {} }];
  }));
}
function compact(value) { return String(value ?? "").replace(/\s+/g, " ").trim(); }
export function stripDuplicatedBodyMetadata(markdown) {
  return String(markdown || "")
    .replace(/^- \*\*ID:\*\*[^\n]*\n- \*\*Template:\*\*[^\n]*(?:\n|$)/, "")
    .replace(/^\n+/, "");
}
export function bodyMarkdown(entity) {
  if (typeof entity.body !== "string" || !entity.body.trim()) fail(`seeded entity ${entity.id || "unknown"} needs one complete template body.`);
  return entity.body;
}

function defaultCommandRunner(args, { input } = {}) {
  const result = spawnSync("ntn", args, { encoding: "utf8", timeout: 120_000, maxBuffer: 5_000_000, ...(input === undefined ? {} : { input }) });
  return { status: Number.isInteger(result.status) ? result.status : 1, stdout: result.stdout || "", stderr: result.stderr || "", timed_out: result.error?.code === "ETIMEDOUT" };
}
function invoke(commandRunner, args, label, options) {
  const result = commandRunner(args, options);
  if (!result || result.status !== 0) fail(`${label} failed: ${compact(result?.stderr || result?.stdout || "command failed").slice(0, 500)}`);
  return String(result.stdout || "");
}
function notionJson(commandRunner, args, label) { try { return JSON.parse(invoke(commandRunner, args, label)); } catch (error) { if (error.message.startsWith("TASK-0007")) throw error; fail(`${label} did not return JSON: ${error.message}`); } }
function titleValue(properties) {
  const property = properties?.title || properties?.Name || Object.values(properties || {}).find((entry) => Array.isArray(entry?.title));
  const values = property?.title || property?.rich_text || [];
  return values.map((entry) => entry.plain_text || entry.text?.content || "").join("");
}
function propertyText(property) {
  if (property?.select) return property.select.name || "";
  if (property?.status) return property.status.name || "";
  return (property?.title || property?.rich_text || []).map((entry) => entry.plain_text || entry.text?.content || "").join("");
}
function weekStart(week) {
  const match = String(week).match(/^(\d{4})-W(\d{2})$/);
  if (!match) fail(`invalid ISO week ${week}.`);
  const year = Number(match[1]); const weekNumber = Number(match[2]);
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(januaryFourth);
  monday.setUTCDate(januaryFourth.getUTCDate() - ((januaryFourth.getUTCDay() + 6) % 7) + ((weekNumber - 1) * 7));
  return monday.toISOString().slice(0, 10);
}
function pageIdentity(page) { return { id: page?.id || "", url: page?.url || "" }; }
function requirePageIdentity(page, label) { if (!page?.id || !page?.url) fail(`${label} did not return a page identity.`); return pageIdentity(page); }
function sourceSchema(commandRunner, dataSourceId, label) {
  const schema = notionJson(commandRunner, ["api", `v1/data_sources/${dataSourceId}`], `read ${label} data source`);
  if (schema.id !== dataSourceId || schema.in_trash) fail(`${label} is missing or in trash.`);
  return schema;
}
function databaseState(commandRunner, databaseId, title, requiredProperties) {
  const resolved = notionJson(commandRunner, ["datasources", "resolve", databaseId, "--json"], `resolve ${title}`);
  const sources = resolved.data_sources || [];
  if (resolved.database_id !== databaseId || sources.length !== 1 || !sources[0]?.id) fail(`${title} is not an exact one-source database.`);
  const dataSourceId = sources[0].id;
  const schema = sourceSchema(commandRunner, dataSourceId, title);
  const missing = requiredProperties.filter((property) => !schema.properties?.[property]);
  if (missing.length) fail(`${title} is missing required properties: ${missing.join(", ")}.`);
  return { database_id: databaseId, data_source_id: dataSourceId, title, required_properties: requiredProperties, schema };
}
function rootIdentity(commandRunner, state, environment = task0007Environment) {
  const page = notionJson(commandRunner, ["api", `v1/pages/${state.root.id}`], "read isolated seed root");
  if (page.id !== state.root.id || page.in_trash || titleValue(page.properties) !== environment.root_title) fail("stored root is not the marked live isolated seed root; refusing all writes.");
  return { id: page.id, url: page.url || state.root.url || null, title: titleValue(page.properties) };
}

function emptyState({ root, seedHash, runRoot = defaultRunRoot, environment = task0007Environment }) {
  return {
    schema_version: 1, namespace: environment.namespace, owned_marker: environment.owned_marker, root_title: environment.root_title, status: "provisioning", created_at: now(), updated_at: now(),
    root, source_seed: { path: relative(projectRoot, seedConfigPath), sha256: seedHash }, run_root: runRoot, databases: {}
  };
}
function readState(statePath, privateRoot = task0007SeedRoot, environment = task0007Environment) {
  const path = privatePath(statePath, "state path", privateRoot);
  if (!existsSync(path)) return null;
  const state = readJson(path, "seed state");
  if (state.schema_version !== 1 || state.namespace !== environment.namespace || state.owned_marker !== environment.owned_marker || !state.root?.id || typeof state.databases !== "object") fail("state does not belong to this isolated seed namespace.");
  return state;
}
function writeState(statePath, state, privateRoot = task0007SeedRoot) { state.updated_at = now(); writePrivateJson(privatePath(statePath, "state path", privateRoot), state); }
function createRoot(commandRunner, environment = task0007Environment) {
  const page = notionJson(commandRunner, ["api", "v1/pages", "-d", JSON.stringify({
    parent: { type: "workspace", workspace: true }, properties: { title: { title: richText(environment.root_title) } },
    markdown: `# ${environment.root_title}\n\n- **Marker:** \`${environment.owned_marker}\`\n- **Scope:** source-safe Company OS evaluation root only.\n- **Boundary:** no production records, provider messages, or external delivery.\n- **Lifecycle:** do not reuse outside this evaluation.`
  })], "create isolated seed root");
  return requirePageIdentity(page, "isolated seed root");
}
function createDatabase(commandRunner, root, key) {
  const definition = databaseDefinitions[key];
  const database = notionJson(commandRunner, ["api", "v1/databases", "-d", JSON.stringify({
    parent: { type: "page_id", page_id: root.id }, title: richText(`[EVAL] ${definition.title}`),
    description: richText("TASK-0007 source-safe isolated evaluation data source."), initial_data_source: { properties: schemaProperties(definition) }
  })], `create ${definition.title} database`);
  if (!database?.id) fail(`${definition.title} database creation did not return an id.`);
  return databaseState(commandRunner, database.id, definition.title, definition.properties);
}

/** Provision only the dedicated root and its child data sources. */
export function provisionTask0007NotionSeed(options = {}) {
  const commandRunner = options.commandRunner || defaultCommandRunner;
  const paths = environmentPaths(options.environment, options);
  const { environment, statePath, privateRoot, runRoot } = paths;
  const { seed } = requireApprovedSeed(options);
  const seedHash = sha256(readFileSync(seedConfigPath, "utf8"));
  let state = readState(statePath, privateRoot, environment);
  if (!state) {
    const root = createRoot(commandRunner, environment);
    state = emptyState({ root, seedHash, runRoot, environment });
    writeState(statePath, state, privateRoot);
  } else {
    rootIdentity(commandRunner, state, environment);
    if (state.source_seed.sha256 !== seedHash) fail("source seed changed after provisioning; refuse to mix a new seed with this root.");
  }
  for (const key of Object.keys(databaseDefinitions)) {
    if (state.databases[key]) continue;
    state.databases[key] = createDatabase(commandRunner, state.root, key);
    writeState(statePath, state, privateRoot);
  }
  state.status = "ready";
  writeState(statePath, state, privateRoot);
  return { mode: "provision", status: "ready", namespace: state.namespace, root: state.root, databases: Object.fromEntries(Object.entries(state.databases).map(([key, database]) => [key, { database_id: database.database_id, data_source_id: database.data_source_id, title: database.title }])) };
}

/** Read-only identity/schema check. It never creates, patches, or archives anything. */
export function preflightTask0007NotionSeed(options = {}) {
  const commandRunner = options.commandRunner || defaultCommandRunner;
  const { environment, statePath, privateRoot } = environmentPaths(options.environment, options);
  const state = readState(statePath, privateRoot, environment);
  if (!state || state.status !== "ready") fail("isolated seed is not provisioned and ready.");
  const root = rootIdentity(commandRunner, state, environment);
  const databases = {};
  for (const [key, definition] of Object.entries(databaseDefinitions)) {
    const stored = state.databases[key];
    if (!stored?.database_id || !stored?.data_source_id) fail(`${key} is absent from the isolated state.`);
    const current = databaseState(commandRunner, stored.database_id, definition.title, definition.properties);
    if (current.data_source_id !== stored.data_source_id) fail(`${key} data source changed from the stored isolated root identity.`);
    databases[key] = current;
  }
  return { mode: "preflight", applies_notion_writes: false, namespace: state.namespace, root, databases: Object.fromEntries(Object.entries(databases).map(([key, value]) => [key, { database_id: value.database_id, data_source_id: value.data_source_id, title: value.title }])) };
}

function materializeProperties(schema, fields) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined && value !== null).map(([name, value]) => {
    const property = schema.properties?.[name];
    if (!property) return null;
    const text = String(value);
    if (property.type === "title") return [name, { title: richText(text) }];
    if (property.type === "select") return [name, text ? { select: { name: text } } : { select: null }];
    if (property.type === "status") return [name, text ? { status: { name: text } } : { status: null }];
    return [name, { rich_text: richText(text) }];
  }).filter(Boolean));
}
function queryRows(commandRunner, database) {
  const response = notionJson(commandRunner, ["datasources", "query", database.data_source_id, "--limit", "100", "--json"], `query ${database.title}`);
  if (response.next_cursor) fail(`${database.title} exceeds the bounded 100-row query limit.`);
  return new Map((response.results || []).map((page) => [propertyText(page.properties?.ID), page]).filter(([id]) => id));
}
function readReceipt(receiptPath, privateRoot = task0007SeedRoot, environment = task0007Environment) {
  const path = privatePath(receiptPath, "receipt path", privateRoot);
  if (!existsSync(path)) return { schema_version: 1, namespace: environment.namespace, actions: {} };
  const receipt = readJson(path, "isolated Notion receipt");
  if (receipt.schema_version !== 1 || receipt.namespace !== environment.namespace || typeof receipt.actions !== "object" || Array.isArray(receipt.actions)) fail("receipt is not owned by the isolated seed namespace.");
  return receipt;
}
function writeReceipt(receiptPath, receipt, privateRoot = task0007SeedRoot) { writePrivateJson(privatePath(receiptPath, "receipt path", privateRoot), receipt); }
function actionEntry({ actionKey, database, operation, event, page, payload }) {
  return { action_key: actionKey, database, operation, status: event === "skipped" ? "skipped" : "applied", provider: "notion", provider_id_hash: sha256(page.id || actionKey), result_url: page.url || null, payload_hash: sha256(payload), idempotency_key: actionKey, recorded_at: now() };
}
function upsertPage({ commandRunner, databaseKey, database, rows, receipt, actionKey, operation, fields, markdown, replaceMarkdown = false }) {
  const payload = stable({ fields, markdown });
  const prior = receipt.actions[actionKey];
  const existing = rows.get(fields.ID);
  if (prior?.payload_hash === sha256(payload) && existing) return { event: "skipped", page: requirePageIdentity(existing, `${databaseKey} existing page`), action: { ...prior, status: "skipped", recorded_at: now() } };
  const properties = materializeProperties(database.schema, fields);
  const response = existing
    ? notionJson(commandRunner, ["api", "-X", "PATCH", `v1/pages/${existing.id}`, "-d", JSON.stringify({ properties })], `patch ${databaseKey}:${fields.ID}`)
    : notionJson(commandRunner, ["api", "v1/pages", "-d", JSON.stringify({ parent: { type: "data_source_id", data_source_id: database.data_source_id }, properties, ...(markdown ? { markdown } : {}) })], `create ${databaseKey}:${fields.ID}`);
  if (existing && replaceMarkdown && markdown) invoke(commandRunner, ["pages", "edit", existing.id], `replace ${databaseKey}:${fields.ID} body`, { input: markdown });
  const page = requirePageIdentity(response, `${databaseKey}:${fields.ID}`);
  rows.set(fields.ID, page);
  const action = actionEntry({ actionKey, database: databaseKey, operation, event: existing ? "updated" : "created", page, payload });
  return { event: existing ? "updated" : "created", page, action };
}

function sourceEntityFields(entity, key, runKey) {
  const p = entity.properties || {}; const body = entity.body || {};
  if (key === "projects") return { Name: p.name, ID: entity.id, Department: p.department, Owner: p.owner, Status: p.status, Priority: p.priority || "", "Start date": p.start_date || "", "Due date": p.due_date || "", Progress: p.progress, Template: entity.template, "Run key": runKey };
  if (key === "people") return { Name: p.name, ID: entity.id, Department: p.department, Role: p.role, Status: p.status, Manager: p.manager, "Preferred contact channel": p.preferred_contact_channel, "Approved contact channels": p.approved_contact_channels, "Contact endpoint": p.contact_endpoint, "Contact instructions": p.contact_instructions, Timezone: p.timezone, Expertise: p.expertise, Template: entity.template, "Run key": runKey };
  if (key === "work_items") return { Name: p.name, ID: entity.id, Project: p.project, Department: p.department, Owner: p.owner, Type: p.type, Status: p.status, Priority: p.priority, "Start date": p.start_date, "Due date": p.due_date, Progress: p.progress, "Last meaningful update": p.last_meaningful_update, "Meeting date": p.date, Attendees: p.attendees, Facilitator: p.facilitator, "Daily review version": entity.metadata?.daily_review_version || "", Template: entity.template, "Run key": runKey };
  if (key === "reports") return { Name: p.name, ID: entity.id, Project: p.project, Department: p.department, Level: p.report_type, "Week start": p.week_start, Status: p.report_status, "Report version": p.report_version, "Finalized at": p.finalized_at, "Previous report": p.previous_report, "Source report IDs": p.source_report_ids, Template: entity.template, "Run key": runKey };
  fail(`unsupported source entity database ${key}.`);
}
function dailyContextProjectFields(project, runKey, progress) {
  return {
    Name: project.name,
    ID: project.id,
    Department: "Evaluation",
    Owner: project.owner_person_id || "unassigned",
    Status: "Active",
    Priority: "",
    "Start date": "",
    "Due date": "",
    Progress: progress,
    Template: "company-os-project",
    "Run key": runKey
  };
}
function dailyContextProjectMarkdown(project, sections) {
  return [
    `# ${project.name}`,
    "",
    "## Overview",
    "",
    `**Goal:** Isolated Daily pipeline target for ${project.name}.`,
    "",
    "## Project knowledge",
    "",
    sections.project_knowledge || "No source-backed Project knowledge has been proposed.",
    "",
    "## This week's attention",
    "",
    sections.this_weeks_attention || "No current-week attention item has been proposed.",
    "",
    "## Evaluation boundary",
    "",
    `- **Context:** \`${project.source_id}\``,
    "- **Scope:** synthetic TASK-0007 evaluation record only."
  ].join("\n");
}
function runArtifactPath(runRoot, path, label) {
  const root = resolve(runRoot); const candidate = resolve(path);
  const resolved = candidate.startsWith(`${root}/`) ? candidate : resolve(root, path);
  if (!resolved.startsWith(`${root}/`)) fail(`${label} escapes the isolated automation run.`);
  return resolved;
}
function dailyContextSources(context) {
  return new Set([
    ...(context.source_manifest || []).flatMap((entry) => entry.source_ids || []),
    ...(context.projects || []).map((entry) => entry.source_id),
    ...(context.work_items || []).map((entry) => entry.source_id),
    ...(context.meetings || []).map((entry) => entry.source_id),
    ...(context.people || []).map((entry) => entry.source_id)
  ].filter(Boolean));
}
function validateDailyProjectPlan({ context, plan }) {
  if (plan?.artifact_type !== "kamdar-project-diff-plan" || !Array.isArray(plan?.patches)) fail("Daily Project memory artifact is not a valid diff plan.");
  const projects = new Map((context.projects || []).map((project) => [project.id, project]));
  const sources = dailyContextSources(context);
  for (const patch of plan.patches) {
    const project = projects.get(patch?.project?.project_id);
    if (!project) fail(`Daily Project patch target ${patch?.project?.project_id || "unknown"} is absent from the embedded context.`);
    if (!["project_knowledge", "this_weeks_attention"].includes(patch.target_section)) fail(`Daily Project patch ${patch.patch_id || "unknown"} targets an unsupported section.`);
    if (!["append", "replace"].includes(patch.operation)) fail(`Daily Project patch ${patch.patch_id || "unknown"} has an unsupported operation.`);
    if (!Array.isArray(patch.source_ids) || !patch.source_ids.length || patch.source_ids.some((sourceId) => !sources.has(sourceId))) fail(`Daily Project patch ${patch.patch_id || "unknown"} references a source outside the context.`);
    const reset = project.weekly_attention_reset || {};
    if (patch.target_section === "this_weeks_attention" && patch.operation === "replace") {
      if (reset.requested !== true || patch.attention_reset?.requested !== true || patch.attention_reset?.week !== reset.week || patch.attention_reset?.reason !== reset.reason || patch.attention_reset?.source_id !== reset.source_id) fail(`Daily Project patch ${patch.patch_id || "unknown"} replaces weekly attention without the exact embedded reset authority.`);
    }
    if (patch.target_section === "this_weeks_attention" && patch.operation !== "replace" && patch.attention_reset?.requested === true) fail(`Daily Project patch ${patch.patch_id || "unknown"} declares a reset without replacing the checklist.`);
  }
  return projects;
}
function finalizedReportFields({ id, level, path }, runKey) {
  const basename = path.split("/").at(-1).replace(/\.md$/, "");
  const project = level === "Project" ? basename.replace(/-\d{4}-W\d{2}$/, "") : "portfolio";
  const department = "";
  const template = level === "Project" ? "company-os-weekly-report"
    : level === "Department" ? "company-os-area-rollup" : "company-os-company-rollup";
  return { Name: `${level} — ${id}`, ID: id, Project: project, Department: department, Level: level, "Week start": weekStart("2026-W34"), Status: "Final", "Source report IDs": "", Template: template, "Run key": runKey };
}
function finalizedReportEntries(result) {
  const make = (level, prefix, path) => ({ id: prefix + path.split("/").at(-1).replace(/\.md$/, ""), level, path });
  return [
    ...result.weekly.project_reports.map((path) => make("Project", "RPT-PROJECT-", path)),
    ...result.weekly.department_reports.map((path) => make("Department", "RPT-DEPARTMENT-", path)),
    make("Company", "RPT-COMPANY-", result.weekly.company_report)
  ];
}

function reportTitle(markdown, reportId) {
  const heading = String(markdown).match(/^#\s+(.+)$/m)?.[1]?.trim();
  if (!heading) fail(`weekly report ${reportId} has no H1 title.`);
  return heading;
}
function weeklyTemplate(reportLevel) {
  if (reportLevel === "Project") return "company-os-weekly-report";
  if (reportLevel === "Area") return "kamdar-area-operating-rollup";
  return "kamdar-company-operating-rollup";
}
function weeklyOperation(reportLevel) {
  if (reportLevel === "Project") return "finalize_project_report";
  if (reportLevel === "Area") return "upsert_area_report";
  return "upsert_company_report";
}
function promotionDocument(markdown) {
  const match = String(markdown || "").match(/^---\n([\s\S]*?)\n---\n+([\s\S]*)$/);
  if (!match) fail("promoted destination must contain template frontmatter and a body.");
  const metadata = Object.fromEntries(match[1].split("\n").map((line) => {
    const field = line.match(/^([a-z0-9_]+):\s*(.*)$/i);
    if (!field) return null;
    return [field[1], field[2].replace(/^['"]|['"]$/g, "")];
  }).filter(Boolean));
  const body = match[2].replace(/^# [^\n]+\n+/, "").trim();
  if (!metadata.template_id || !metadata.name || !body.startsWith("## ")) fail("promoted destination is not template-complete.");
  return { metadata, body };
}
function promotionTarget(disposition, seed, result) {
  const { metadata, body } = promotionDocument(disposition.rendered_markdown);
  const runKey = `weekly:${result.context_id}`;
  if (disposition.kind === "problem") {
    const source = [...seed.entities.work_items, ...seed.entities.meetings].find((row) => row.id === disposition.candidate_id);
    if (!source) fail(`promoted problem ${disposition.candidate_id} has no source Work record.`);
    return {
      databaseKey: "work_items",
      operation: "promote_problem",
      fields: {
        Name: metadata.name, ID: disposition.destination_id, Project: metadata.project,
        Department: metadata.department, Owner: source.properties.owner, Type: "Issue",
        Status: "Blocked", Priority: metadata.priority, "Start date": metadata.start_date,
        "Due date": metadata.due_date, Progress: metadata.progress,
        "Last meaningful update": metadata.last_meaningful_update, "Meeting date": "",
        Attendees: "", Facilitator: "", "Daily review version": "", Template: metadata.template_id,
        "Run key": runKey
      },
      body
    };
  }
  if (disposition.kind === "decision") return {
    databaseKey: "decisions", operation: "promote_decision",
    fields: { Name: metadata.name, ID: disposition.destination_id, Project: metadata.project, Department: metadata.department, Proposer: metadata.proposer, Approver: metadata.approver, Status: metadata.status, "Decided at": metadata.decided_at, "Review date": metadata.review_date, Template: metadata.template_id, "Run key": runKey },
    body
  };
  if (disposition.kind === "sop") return {
    databaseKey: "skills", operation: "promote_sop",
    fields: { Name: metadata.name, ID: disposition.destination_id, Project: metadata.project, Department: metadata.department, Owner: metadata.owner, Status: metadata.status, "Source path": metadata.source_path, "Latest eval": metadata.latest_eval, "Last reviewed": metadata.last_reviewed, Template: metadata.template_id, "Run key": runKey },
    body
  };
  fail(`unsupported promoted destination kind ${disposition.kind}.`);
}
function weeklyReportFields(report, result) {
  return {
    Name: reportTitle(report.report_markdown, report.report_id),
    ID: report.report_id,
    Project: report.project_id || "",
    Department: report.area || "",
    Level: report.report_level,
    "Week start": weekStart(result.week),
    Status: report.report_status,
    "Report version": String(report.report_version),
    "Finalized at": report.finalized_at || "",
    "Previous report": report.previous_report_id || "",
    "Source report IDs": report.source_report_ids.join(", "),
    Template: weeklyTemplate(report.report_level),
    "Run key": `weekly:${result.context_id}`
  };
}
function validateWeeklyApplicationOrder(result) {
  const reports = result.report_results;
  const ids = new Set(); let priorRank = -1;
  const rank = { Project: 0, Area: 1, Company: 2 };
  for (const report of reports) {
    if (ids.has(report.report_id)) fail(`weekly result repeats report_id ${report.report_id}.`);
    ids.add(report.report_id);
    if (rank[report.report_level] < priorRank) fail("weekly result must order Project reports before Area reports and the Company report last.");
    priorRank = rank[report.report_level];
    if (report.report_status !== "Final") fail(`weekly application requires Final reports; ${report.report_id} is ${report.report_status}.`);
  }
  const projects = reports.filter((report) => report.report_level === "Project");
  const areas = reports.filter((report) => report.report_level === "Area");
  const companies = reports.filter((report) => report.report_level === "Company");
  if (!projects.length || !areas.length || companies.length !== 1) fail("weekly result requires Project reports, matching Area reports, and exactly one Company report.");
  const expectedAreas = [...new Set(projects.map((report) => report.area))].sort();
  const actualAreas = areas.map((report) => report.area).sort();
  if (stable(expectedAreas) !== stable(actualAreas)) fail(`weekly Area reports must exactly cover Project areas: ${expectedAreas.join(", ")}.`);
  for (const area of areas) {
    const requiredProjectIds = projects.filter((report) => report.area === area.area).map((report) => report.report_id);
    const missing = requiredProjectIds.filter((id) => !area.source_report_ids.includes(id));
    if (missing.length) fail(`${area.report_id} is missing Project report sources: ${missing.join(", ")}.`);
  }
  const company = companies[0];
  const missingAreaSources = areas.map((report) => report.report_id).filter((id) => !company.source_report_ids.includes(id));
  if (missingAreaSources.length) fail(`${company.report_id} is missing Area report sources: ${missingAreaSources.join(", ")}.`);
  return { projects, areas, company };
}
export function canonicalReportText(markdown) {
  return String(markdown || "")
    .replace(/\\([\[\]])/g, "$1")
    .replace(/^# [^\n]+\n?/m, "")
    .replace(/<\/?(?:table|tr)(?:\s[^>]*)?>/g, "\n")
    .replace(/<\/?td(?:\s[^>]*)?>/g, "\n")
    .replace(/^\|(?:\s*:?-+:?\s*\|)+\s*$/gm, "")
    .replace(/\|/g, "\n")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
function readBackWeeklyReport(commandRunner, page, fields, markdown, report) {
  const metadataPage = notionJson(commandRunner, ["api", `v1/pages/${page.id}`], `read back weekly report ${report.report_id} metadata`);
  const bodyPage = notionJson(commandRunner, ["pages", "get", page.id, "--json"], `read back weekly report ${report.report_id} body`);
  const observedMarkdown = bodyPage.markdown?.markdown ?? bodyPage.markdown ?? "";
  const observedFields = Object.fromEntries(Object.keys(fields).map((name) => [name, propertyText(metadataPage.properties?.[name])]));
  const mismatchedFields = Object.entries(fields).filter(([name, value]) => observedFields[name] !== String(value)).map(([name]) => name);
  if (mismatchedFields.length) fail(`${report.report_id} read-back metadata differs for: ${mismatchedFields.join(", ")}.`);
  const intendedCanonical = canonicalReportText(markdown);
  const observedCanonical = canonicalReportText(observedMarkdown);
  if (observedCanonical !== intendedCanonical) fail(`${report.report_id} read-back body differs materially from report_markdown.`);
  return {
    page_id: page.id,
    url: page.url,
    metadata: observedFields,
    metadata_sha256: sha256(stable(observedFields)),
    report_markdown: observedMarkdown,
    report_markdown_sha256: sha256(observedMarkdown),
    intended_report_markdown_sha256: sha256(markdown),
    canonical_text_sha256: sha256(observedCanonical),
    read_back_mode: observedMarkdown === markdown ? "exact_markdown" : "notion_canonical_text",
    matched: true
  };
}

/** Apply one already-extracted Weekly result to the isolated Reports database. */
export function applyWeeklyReviewResultToNotion(options = {}) {
  const commandRunner = options.commandRunner || defaultCommandRunner;
  const paths = environmentPaths(options.environment, options);
  const { environment, statePath, receiptPath, privateRoot } = paths;
  const sourcePath = options.resultPath;
  if (!sourcePath || !isAbsolute(sourcePath)) fail("weekly result path must be absolute.");
  const parsed = WeeklyReviewResultSchema.safeParse(readJson(sourcePath, "weekly review result"));
  if (!parsed.success) fail(`weekly review result does not match its Zod schema: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`);
  const result = parsed.data;
  const ordered = validateWeeklyApplicationOrder(result);
  const preflight = preflightTask0007NotionSeed({ commandRunner, statePath, privateRoot, environment });
  const state = readState(statePath, privateRoot, environment);
  const databaseKeys = ["reports", "work_items", "decisions", "skills"];
  const databases = Object.fromEntries(databaseKeys.map((key) => [key, databaseState(commandRunner, state.databases[key].database_id, databaseDefinitions[key].title, databaseDefinitions[key].properties)]));
  const rows = Object.fromEntries(databaseKeys.map((key) => [key, queryRows(commandRunner, databases[key])]));
  const receipt = readReceipt(receiptPath, privateRoot, environment);
  const applicationReceipts = [];
  const applyReport = (report) => {
    const fields = weeklyReportFields(report, result);
    const actionKey = `weekly:${result.week}:report:${report.report_id}:v${report.report_version}`;
    let application = upsertPage({
      commandRunner,
      databaseKey: "reports",
      database: databases.reports,
      rows: rows.reports,
      receipt,
      actionKey,
      operation: weeklyOperation(report.report_level),
      fields,
      markdown: report.report_markdown,
      replaceMarkdown: true
    });
    let read_back;
    try {
      read_back = readBackWeeklyReport(commandRunner, application.page, fields, report.report_markdown, report);
    } catch (error) {
      if (application.action.status !== "skipped") throw error;
      delete receipt.actions[actionKey];
      application = upsertPage({
        commandRunner,
        databaseKey: "reports",
        database: databases.reports,
        rows: rows.reports,
        receipt,
        actionKey,
        operation: weeklyOperation(report.report_level),
        fields,
        markdown: report.report_markdown,
        replaceMarkdown: true
      });
      read_back = readBackWeeklyReport(commandRunner, application.page, fields, report.report_markdown, report);
    }
    if (!(application.action.status === "skipped" && receipt.actions[actionKey]?.status === "applied")) receipt.actions[actionKey] = application.action;
    applicationReceipts.push({
      report_id: report.report_id,
      report_level: report.report_level,
      operation: weeklyOperation(report.report_level),
      status: application.action.status,
      result_url: application.page.url,
      payload_sha256: application.action.payload_hash,
      idempotency_key: actionKey,
      read_back
    });
  };
  for (const report of ordered.projects) applyReport(report);
  const seed = loadKamdarSeedConfig();
  const promotionReceipts = [];
  for (const disposition of result.promotion_dispositions.filter((row) => row.disposition === "promoted")) {
    const target = promotionTarget(disposition, seed, result);
    const actionKey = `weekly:${result.week}:promotion:${disposition.destination_id}`;
    const application = upsertPage({
      commandRunner, databaseKey: target.databaseKey, database: databases[target.databaseKey],
      rows: rows[target.databaseKey], receipt, actionKey, operation: target.operation,
      fields: target.fields, markdown: target.body, replaceMarkdown: true
    });
    if (!(application.action.status === "skipped" && receipt.actions[actionKey]?.status === "applied")) receipt.actions[actionKey] = application.action;
    const metadataPage = notionJson(commandRunner, ["api", `v1/pages/${application.page.id}`], `read back promotion ${disposition.destination_id} metadata`);
    const bodyPage = notionJson(commandRunner, ["pages", "get", application.page.id, "--json"], `read back promotion ${disposition.destination_id} body`);
    const observedBody = bodyPage.markdown?.markdown ?? bodyPage.markdown ?? "";
    const mismatchedFields = Object.entries(target.fields).filter(([name, value]) => propertyText(metadataPage.properties?.[name]) !== String(value)).map(([name]) => name);
    if (mismatchedFields.length || canonicalReportText(observedBody) !== canonicalReportText(target.body)) fail(`${disposition.destination_id} promotion read-back differs from the extracted destination${mismatchedFields.length ? ` fields: ${mismatchedFields.join(", ")}` : " body"}.`);
    promotionReceipts.push({ destination_id: disposition.destination_id, kind: disposition.kind, operation: target.operation, status: application.action.status, result_url: application.page.url, payload_sha256: application.action.payload_hash, idempotency_key: actionKey, read_back: { page_id: application.page.id, matched: true, body_sha256: sha256(observedBody) } });
  }
  for (const report of [...ordered.areas, ordered.company]) applyReport(report);
  writeReceipt(receiptPath, receipt, privateRoot);
  const outcome = {
    schema_version: 1,
    mode: "apply-weekly-result",
    namespace: environment.namespace,
    context_id: result.context_id,
    week: result.week,
    source_result: { path: sourcePath, sha256: sha256(readFileSync(sourcePath, "utf8")) },
    root: preflight.root,
    applies_notion_writes: true,
    external_messages_sent: 0,
    counts: {
      expected: applicationReceipts.length + promotionReceipts.length,
      applied: [...applicationReceipts, ...promotionReceipts].filter((entry) => entry.status === "applied").length,
      skipped: [...applicationReceipts, ...promotionReceipts].filter((entry) => entry.status === "skipped").length,
      project_reports: ordered.projects.length,
      area_reports: ordered.areas.length,
      company_reports: 1,
      promotions: promotionReceipts.length
    },
    reports: applicationReceipts,
    promotions: promotionReceipts
  };
  const weeklyReceiptPath = privatePath(options.weeklyReceiptPath || resolve(privateRoot, "weekly-review-application-receipt.json"), "weekly application receipt", privateRoot);
  writePrivateJson(weeklyReceiptPath, outcome);
  return { ...outcome, receipt_path: weeklyReceiptPath };
}

/** Remove body-owned sections from database fields and legacy metadata bullets from page bodies. */
export function repairCurrentNotionTemplateOwnership(options = {}) {
  const commandRunner = options.commandRunner || defaultCommandRunner;
  const paths = environmentPaths(options.environment, options);
  const { environment, statePath, privateRoot } = paths;
  const preflight = preflightTask0007NotionSeed({ commandRunner, statePath, privateRoot, environment });
  const state = readState(statePath, privateRoot, environment);
  const databaseKeys = ["projects", "people", "work_items", "reports"];
  const databases = Object.fromEntries(databaseKeys.map((key) => [key, databaseState(commandRunner, state.databases[key].database_id, databaseDefinitions[key].title, databaseDefinitions[key].properties)]));
  const rows = Object.fromEntries(databaseKeys.map((key) => [key, queryRows(commandRunner, databases[key])]));
  const backup = { schema_version: 1, namespace: environment.namespace, recorded_at: now(), schemas: {}, pages: [] };
  const pagePlans = [];
  const actions = [];
  for (const key of databaseKeys) {
    backup.schemas[key] = Object.keys(databases[key].schema.properties || {});
    for (const [recordId, page] of rows[key]) {
      const response = notionJson(commandRunner, ["pages", "get", page.id, "--json"], `read ${key}:${recordId} body`);
      const markdown = response.markdown?.markdown || "";
      backup.pages.push({ database: key, record_id: recordId, page_id: page.id, markdown });
      const corrected = stripDuplicatedBodyMetadata(markdown);
      if (corrected !== markdown) pagePlans.push({ key, recordId, page, corrected });
    }
  }
  const backupPath = privatePath(options.backupPath || resolve(privateRoot, "template-ownership-backup.json"), "template ownership backup", privateRoot);
  writePrivateJson(backupPath, backup);
  for (const { key, recordId, page, corrected } of pagePlans) {
    if (corrected) {
      invoke(commandRunner, ["pages", "edit", page.id], `repair ${key}:${recordId} body`, { input: corrected });
    } else {
      const children = notionJson(commandRunner, ["api", "-X", "GET", `v1/blocks/${page.id}/children`, "page_size==100"], `read ${key}:${recordId} blocks`);
      if (children.next_cursor) fail(`${key}:${recordId} body exceeds the bounded 100-block cleanup limit.`);
      for (const block of children.results || []) notionJson(commandRunner, ["api", "-X", "DELETE", `v1/blocks/${block.id}`], `clear ${key}:${recordId} metadata block`);
    }
    actions.push({ operation: "remove_duplicated_body_metadata", database: key, record_id: recordId, result_url: page.url || null });
  }
  const obsoleteProperties = { projects: ["Project knowledge", "This week's attention"], work_items: ["Notes"] };
  for (const [key, names] of Object.entries(obsoleteProperties)) {
    const present = names.filter((name) => databases[key].schema.properties?.[name]);
    if (!present.length) continue;
    notionJson(commandRunner, ["api", "-X", "PATCH", `v1/data_sources/${databases[key].data_source_id}`, "-d", JSON.stringify({ properties: Object.fromEntries(present.map((name) => [name, null])) })], `remove duplicated ${key} properties`);
    for (const name of present) actions.push({ operation: "remove_body_owned_property", database: key, property: name });
  }
  const receiptPath = privatePath(options.templateOwnershipReceiptPath || resolve(privateRoot, "template-ownership-repair.json"), "template ownership repair receipt", privateRoot);
  const result = { mode: "repair-template-ownership", namespace: environment.namespace, root: preflight.root, applies_notion_writes: actions.length > 0, external_messages_sent: 0, counts: { body_repairs: actions.filter((action) => action.operation === "remove_duplicated_body_metadata").length, properties_removed: actions.filter((action) => action.operation === "remove_body_owned_property").length }, actions, backup_path: backupPath };
  writePrivateJson(receiptPath, result);
  return result;
}

/** Seed only the canonical source entities; the current Hermes automations run later. */
export function seedCurrentNotionEnvironment(options = {}) {
  const { seed } = requireApprovedSeed(options);
  const commandRunner = options.commandRunner || defaultCommandRunner;
  const paths = environmentPaths(options.environment, options);
  const { environment, statePath, receiptPath, operationSummaryPath, privateRoot } = paths;
  const preflight = preflightTask0007NotionSeed({ commandRunner, statePath, privateRoot, environment });
  const state = readState(statePath, privateRoot, environment);
  const databases = Object.fromEntries(Object.entries(databaseDefinitions).map(([key, definition]) => [key, databaseState(commandRunner, state.databases[key].database_id, definition.title, definition.properties)]));
  const rows = Object.fromEntries(Object.entries(databases).map(([key, database]) => [key, queryRows(commandRunner, database)]));
  const receipt = readReceipt(receiptPath, privateRoot, environment);
  const actions = [];
  const remember = (action) => {
    if (!(action.status === "skipped" && receipt.actions[action.action_key]?.status === "applied")) receipt.actions[action.action_key] = action;
    actions.push(action);
  };
  const apply = (key, actionKey, operation, fields, markdown) => {
    const value = upsertPage({ commandRunner, databaseKey: key, database: databases[key], rows: rows[key], receipt, actionKey, operation, fields, markdown, replaceMarkdown: true });
    remember(value.action);
  };
  const runKey = `seed:${seed.metadata?.seed_id || seed.schema_version}`;
  for (const entity of seed.entities.projects) apply("projects", `seed:project:${entity.id}`, "seed_project", sourceEntityFields(entity, "projects", runKey), bodyMarkdown(entity, seed.entities));
  for (const entity of seed.entities.people) apply("people", `seed:person:${entity.id}`, "seed_person", sourceEntityFields(entity, "people", runKey), bodyMarkdown(entity, seed.entities));
  for (const entity of [...seed.entities.work_items, ...seed.entities.meetings]) apply("work_items", `seed:work:${entity.id}`, "seed_work_item", sourceEntityFields(entity, "work_items", runKey), bodyMarkdown(entity, seed.entities));
  for (const entity of seed.entities.reports) apply("reports", `seed:report:${entity.id}`, "seed_report", sourceEntityFields(entity, "reports", runKey), bodyMarkdown(entity, seed.entities));
  writeReceipt(receiptPath, receipt, privateRoot);
  const outcome = {
    mode: "seed-only",
    namespace: environment.namespace,
    root: preflight.root,
    applies_notion_writes: true,
    external_messages_sent: 0,
    source_seed_sha256: state.source_seed.sha256,
    counts: {
      expected: seed.entities.projects.length + seed.entities.people.length + seed.entities.work_items.length + seed.entities.meetings.length + seed.entities.reports.length,
      applied: actions.filter((entry) => entry.status === "applied").length,
      skipped: actions.filter((entry) => entry.status === "skipped").length
    },
    actions
  };
  writePrivateJson(privatePath(operationSummaryPath, "operation summary path", privateRoot), outcome);
  return outcome;
}
function artifactRows(result, runRoot, additionalEntries = []) {
  const entries = [
    ...result.daily.pipeline_artifacts,
    { id: "daily-receipt", pipeline: "daily", artifact_path: result.daily.receipt, status: "prepared", summary: "Daily fan-out receipt." },
    { id: "weekly-finalization", pipeline: "weekly-report-finalization", artifact_path: result.weekly.finalization_plan, status: "prepared", summary: "Weekly reads the current Draft and renders its report hierarchy." },
    { id: "weekly-receipt", pipeline: "weekly", artifact_path: result.weekly.receipt, status: "prepared", summary: "Weekly finalization receipt." },
    ...additionalEntries
  ];
  return entries.map((entry) => ({ ...entry, content: readFileSync(runArtifactPath(runRoot, entry.artifact_path, `artifact ${entry.id}`), "utf8") }));
}

/** Apply a source-safe seed and its generated Notion-only report artifacts. */
export function operateTask0007NotionSeed(options = {}) {
  const commandRunner = options.commandRunner || defaultCommandRunner;
  const paths = environmentPaths(options.environment, options);
  const { environment, statePath, receiptPath, operationSummaryPath, runRoot, privateRoot } = paths;
  const preflight = preflightTask0007NotionSeed({ commandRunner, statePath, privateRoot, environment });
  const state = readState(statePath, privateRoot, environment);
  const actualRunRoot = directDraftRunRoot(options.runRoot || state.run_root || runRoot, privateRoot);
  let result;
  if (existsSync(resolve(actualRunRoot, "result.json"))) result = readJson(resolve(actualRunRoot, "result.json"), "fixture automation result");
  else result = runTask0007FixtureAutomation({ outputRoot: actualRunRoot });
  if (result.run?.provider_effects !== false || result.run?.mode !== "local-markdown-draft-projection") fail("fixture automation result has an unsafe provider state.");
  const context = readJson(runArtifactPath(actualRunRoot, result.daily.context_path, "Daily context artifact"), "Daily context artifact");
  const projectMemoryArtifact = result.daily.pipeline_artifacts.find((entry) => entry.id === "project-memory");
  if (!projectMemoryArtifact?.artifact_path) fail("fixture run lacks its Daily Project memory artifact.");
  const projectMemoryPlan = readJson(runArtifactPath(actualRunRoot, projectMemoryArtifact.artifact_path, "Daily Project memory artifact"), "Daily Project memory artifact");
  const dailyProjects = validateDailyProjectPlan({ context, plan: projectMemoryPlan });
  const databases = Object.fromEntries(Object.entries(databaseDefinitions).map(([key, definition]) => [key, databaseState(commandRunner, state.databases[key].database_id, definition.title, definition.properties)]));
  const rows = Object.fromEntries(Object.entries(databases).map(([key, database]) => [key, queryRows(commandRunner, database)]));
  const receipt = readReceipt(receiptPath, privateRoot, environment); const actions = [];
  const remember = (action) => {
    // A verification rerun may display a skipped action, but it must not erase
    // the original observed application from the durable receipt.
    if (!(action.status === "skipped" && receipt.actions[action.action_key]?.status === "applied")) receipt.actions[action.action_key] = action;
    actions.push(action);
  };
  const apply = (key, actionKey, operation, fields, markdown, options = {}) => { const value = upsertPage({ commandRunner, databaseKey: key, database: databases[key], rows: rows[key], receipt, actionKey, operation, fields, markdown, ...options }); remember(value.action); return value; };
  const runKey = result.run.id;
  const seed = loadKamdarSeedConfig();
  for (const entity of seed.entities.projects) apply("projects", `seed:project:${entity.id}`, "seed_project", sourceEntityFields(entity, "projects", runKey), bodyMarkdown(entity, seed.entities));
  const dailySectionState = new Map();
  for (const project of dailyProjects.values()) {
    const sections = { project_knowledge: project.project_knowledge || "", this_weeks_attention: project.this_weeks_attention || "" };
    dailySectionState.set(project.id, sections);
    apply("projects", `seed:daily-context-project:${project.id}`, "seed_daily_context_project", dailyContextProjectFields(project, runKey, "Daily context collected; Project memory pending review."), dailyContextProjectMarkdown(project, sections));
  }
  for (const entity of seed.entities.people) apply("people", `seed:person:${entity.id}`, "seed_person", sourceEntityFields(entity, "people", runKey), bodyMarkdown(entity, seed.entities));
  for (const entity of [...seed.entities.work_items, ...seed.entities.meetings]) apply("work_items", `seed:work:${entity.id}`, "seed_work_item", sourceEntityFields(entity, "work_items", runKey), bodyMarkdown(entity, seed.entities));
  for (const entity of seed.entities.reports) apply("reports", `seed:report:${entity.id}`, "seed_report", sourceEntityFields(entity, "reports", runKey), bodyMarkdown(entity, seed.entities));
  for (const report of finalizedReportEntries(result)) {
    const markdown = readFileSync(runArtifactPath(actualRunRoot, report.path, `finalized ${report.level} report`), "utf8");
    apply("reports", `apply:weekly-finalization:${report.id}`, "apply_finalized_report", finalizedReportFields(report, runKey), markdown, { replaceMarkdown: true });
  }
  const appliedProjectPatches = [];
  for (const patch of projectMemoryPlan.patches) {
    const project = dailyProjects.get(patch.project.project_id);
    const sections = dailySectionState.get(project.id);
    const prior = sections[patch.target_section];
    sections[patch.target_section] = patch.operation === "append" ? [prior, patch.proposed_markdown].filter(Boolean).join("\n\n") : patch.proposed_markdown;
    const application = apply(
      "projects",
      `apply:daily-project-memory:${patch.idempotency_key}`,
      "apply_daily_project_diff",
      dailyContextProjectFields(project, runKey, `Daily Project memory applied from ${context.context_id}.`),
      dailyContextProjectMarkdown(project, sections),
      { replaceMarkdown: true }
    );
    appliedProjectPatches.push({ patch_id: patch.patch_id, project_id: project.id, target_section: patch.target_section, operation: patch.operation, source_ids: patch.source_ids, idempotency_key: patch.idempotency_key, result_url: application.page.url || null });
  }
  const projectMemoryApplicationPath = "daily/receipts/project-memory-isolated-application.json";
  writePrivateJson(runArtifactPath(actualRunRoot, projectMemoryApplicationPath, "isolated Project memory application receipt"), {
    artifact_type: "kamdar-project-diff-application-receipt",
    artifact_version: "0.1.0",
    state: "applied",
    boundary: "isolated Notion seed only",
    context_diff_id: context.context_id,
    provider: "notion",
    external_messages_sent: 0,
    patches: appliedProjectPatches
  });
  const extraArtifacts = [{ id: "project-memory-application", pipeline: "daily-project-memory", artifact_path: projectMemoryApplicationPath, status: "applied", summary: "Isolated Notion receipt for guarded Daily Project-memory patches." }];
  for (const artifact of artifactRows(result, actualRunRoot, extraArtifacts)) {
    const fields = { Name: artifact.id, ID: artifact.id, Pipeline: artifact.pipeline, Status: artifact.status, Summary: artifact.summary, "Artifact hash": sha256(artifact.content), "Output path": artifact.artifact_path, "Run key": runKey };
    apply("artifacts", `apply:artifact:${artifact.id}`, "record_artifact", fields, artifact.content);
  }
  writeReceipt(receiptPath, receipt, privateRoot);
  const displayActions = actions.map(({ action_key, database, operation, status, provider, provider_id_hash, result_url, payload_hash, idempotency_key, recorded_at }) => ({ action_key, database, operation, status, provider, provider_id_hash, result_url, payload_hash, idempotency_key, recorded_at }));
  const outcome = { mode: "operate", namespace: state.namespace, root: preflight.root, applies_notion_writes: true, external_messages_sent: 0, preflight, run: { id: result.run.id, path: actualRunRoot }, counts: { applied: displayActions.filter((entry) => entry.status === "applied").length, skipped: displayActions.filter((entry) => entry.status === "skipped").length }, actions: displayActions, report: { company_report: result.weekly.company_report, feature_outcomes: result.feature_outcomes } };
  writePrivateJson(privatePath(operationSummaryPath, "operation summary path", privateRoot), outcome);
  return outcome;
}

function main(argv = process.argv.slice(2)) {
  const knownModes = ["--provision", "--preflight", "--seed-only", "--operate", "--repair-template-ownership", "--apply-weekly-result"];
  const modes = argv.filter((arg) => knownModes.includes(arg));
  const useCurrent = argv.includes("--current");
  const weeklyIndex = argv.indexOf("--apply-weekly-result");
  const weeklyPath = weeklyIndex >= 0 ? argv[weeklyIndex + 1] : null;
  const allowed = new Set([...knownModes, "--current", ...(weeklyPath ? [weeklyPath] : [])]);
  if (modes.length !== 1 || argv.some((arg) => !allowed.has(arg)) || (weeklyIndex >= 0 && (!weeklyPath || !isAbsolute(weeklyPath)))) { process.stderr.write(stable({ status: "blocked", reason: "usage: node operate-task0007-notion-seed.mjs [--current] --provision | --preflight | --seed-only | --operate | --repair-template-ownership | --apply-weekly-result <absolute-json-path>" })); process.exitCode = 2; return; }
  try {
    const options = { ...(useCurrent ? { environment: currentEvalSeedEnvironment } : {}), ...(weeklyPath ? { resultPath: weeklyPath } : {}) };
    const result = modes[0] === "--provision" ? provisionTask0007NotionSeed(options)
      : modes[0] === "--preflight" ? preflightTask0007NotionSeed(options)
        : modes[0] === "--seed-only" ? seedCurrentNotionEnvironment(options)
          : modes[0] === "--repair-template-ownership" ? repairCurrentNotionTemplateOwnership(options)
            : modes[0] === "--apply-weekly-result" ? applyWeeklyReviewResultToNotion(options)
              : operateTask0007NotionSeed(options);
    process.stdout.write(stable(result));
  } catch (error) { process.stderr.write(stable({ mode: modes[0]?.slice(2) || "unknown", status: "blocked", reason: error.message })); process.exitCode = 1; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
