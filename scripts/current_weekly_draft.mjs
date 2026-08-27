/** Local, source-keyed Markdown updates for the canonical current Weekly Draft. */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const weeklyDraftArtifactType = "kamdar-current-weekly-draft";
export const weeklyDraftAnchors = Object.freeze([
  "Problems and inefficiencies",
  "Decisions",
  "SOPs",
  "PM attention"
]);

const kindAnchor = Object.freeze({
  problem: "Problems and inefficiencies",
  inefficiency: "Problems and inefficiencies",
  decision: "Decisions",
  sop: "SOPs",
  pm_attention: "PM attention",
  risk: "Problems and inefficiencies",
  cost: "Problems and inefficiencies"
});
const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const canonicalTemplatePath = resolve(sourceRoot, "templates/current-weekly-draft.md");

function fail(message) { throw new Error(`Current Weekly Draft: ${message}`); }
function normalize(value) { return String(value || "").replace(/\r\n/g, "\n").trim(); }
function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function marker(key) { return `<!-- kamdar-weekly-key: ${key} -->`; }

export function renderCurrentWeeklyDraft({ week }) {
  if (!/^\d{4}-W\d{2}$/.test(String(week || ""))) fail("week must be YYYY-Www.");
  const template = readFileSync(canonicalTemplatePath, "utf8");
  if (!template.includes("{{WEEK}}")) fail("canonical template must contain {{WEEK}}.");
  return template.replaceAll("{{WEEK}}", String(week));
}

export function initializeCurrentWeeklyDraft({ draftPath, week }) {
  if (!draftPath) fail("draftPath is required.");
  const target = resolve(draftPath);
  if (existsSync(target)) return { state: "existing", path: target, content: readFileSync(target, "utf8") };
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  const content = renderCurrentWeeklyDraft({ week });
  writeFileSync(target, content, { mode: 0o600 });
  return { state: "created", path: target, content };
}

export function validateCurrentWeeklyDraft(content, { expectedWeek } = {}) {
  const normalized = normalize(content);
  const artifact = normalized.match(/^artifact_type:\s*(.+)$/m)?.[1]?.trim();
  const week = normalized.match(/^week:\s*["']?([^\n"']+)/m)?.[1]?.trim();
  const state = normalized.match(/^state:\s*(.+)$/m)?.[1]?.trim();
  const draftVersion = Number(normalized.match(/^draft_version:\s*(\d+)$/m)?.[1]);
  const lastUpdated = normalized.match(/^last_updated:\s*(.+)$/m)?.[1]?.trim();
  if (artifact !== weeklyDraftArtifactType) fail(`artifact_type must be ${weeklyDraftArtifactType}.`);
  if (!/^\d{4}-W\d{2}$/.test(String(week || ""))) fail("draft week is missing or invalid.");
  if (expectedWeek && week !== expectedWeek) fail(`draft week ${week} does not equal requested week ${expectedWeek}.`);
  if (state !== "draft") fail("only a Draft may receive Daily updates.");
  if (!Number.isInteger(draftVersion) || draftVersion < 0) fail("draft_version must be a non-negative integer.");
  if (!lastUpdated) fail("last_updated is required.");
  for (const anchor of weeklyDraftAnchors) {
    if (!normalized.includes(`## ${anchor}`)) fail(`missing section ${anchor}.`);
  }
  return { artifact_type: artifact, week, state, draft_version: draftVersion, last_updated: lastUpdated };
}

function assertEntry(entry) {
  if (!entry || typeof entry !== "object") fail("each entry must be an object.");
  if (!Object.hasOwn(kindAnchor, entry.kind)) fail(`unsupported entry kind ${entry.kind || "unknown"}.`);
  if (entry.anchor !== kindAnchor[entry.kind]) fail(`${entry.kind} must target ${kindAnchor[entry.kind]}.`);
  if (typeof entry.key !== "string" || !entry.key.startsWith(`${entry.kind}:`)) fail("entry key must start with its kind.");
  if (!Array.isArray(entry.source_ids) || !entry.source_ids.length || entry.source_ids.some((id) => !id)) fail(`${entry.key} needs source_ids.`);
  if (!normalize(entry.markdown)) fail(`${entry.key} needs Markdown.`);
}

function entryBlock(entry) {
  return `${marker(entry.key)}\n${normalize(entry.markdown)}\n<!-- /kamdar-weekly-key: ${entry.key} -->`;
}

function existingBlock(content, key) {
  const expression = new RegExp(`${escapeRegExp(marker(key))}\\n([\\s\\S]*?)\\n<!-- /kamdar-weekly-key: ${escapeRegExp(key)} -->`);
  const found = content.match(expression);
  return found ? found[0] : null;
}

function insertAtAnchor(content, anchor, blocks) {
  const start = content.indexOf(`## ${anchor}`);
  if (start < 0) fail(`missing section ${anchor}.`);
  const nextHeading = content.indexOf("\n## ", start + 3);
  const index = nextHeading < 0 ? content.length : nextHeading + 1;
  const prefix = content.slice(0, index);
  const suffix = content.slice(index);
  const insertion = `${blocks.join("\n\n")}\n\n`;
  return `${prefix}${insertion}${suffix}`;
}

/**
 * Apply a batch atomically: duplicate keys do nothing; any material conflict
 * blocks the whole batch so a direct file write never becomes a partial update.
 */
export function updateCurrentWeeklyDraft({ draftPath, expectedWeek, entries = [] }) {
  if (!draftPath) fail("draftPath is required.");
  if (!Array.isArray(entries) || !entries.length) return { state: "no_finding", path: resolve(draftPath), applied: [], duplicates: [], conflicts: [] };
  const target = resolve(draftPath);
  if (!existsSync(target)) return { state: "configuration_gap", path: target, reason: "missing_current_weekly_draft", applied: [], duplicates: [], conflicts: [] };
  const before = readFileSync(target, "utf8");
  const draft = validateCurrentWeeklyDraft(before, { expectedWeek });
  const seen = new Set();
  for (const entry of entries) {
    assertEntry(entry);
    if (seen.has(entry.key)) fail(`batch repeats ${entry.key}.`);
    seen.add(entry.key);
  }
  const duplicates = [];
  const conflicts = [];
  const fresh = [];
  for (const entry of entries) {
    const existing = existingBlock(before, entry.key);
    if (!existing) { fresh.push(entry); continue; }
    if (normalize(existing) === normalize(entryBlock(entry))) duplicates.push(entry.key);
    else conflicts.push({ key: entry.key, anchor: entry.anchor, repair: "Preserve the Draft entry and resolve the evidence disagreement before retry." });
  }
  if (conflicts.length) return { state: "conflict", path: target, week: draft.week, applied: [], duplicates, conflicts };
  if (!fresh.length) return { state: "duplicate", path: target, week: draft.week, applied: [], duplicates, conflicts: [] };
  let after = before;
  for (const anchor of weeklyDraftAnchors) {
    const blocks = fresh.filter((entry) => entry.anchor === anchor).sort((left, right) => left.key.localeCompare(right.key)).map(entryBlock);
    if (blocks.length) after = insertAtAnchor(after, anchor, blocks);
  }
  after = after.replace(/^draft_version:\s*\d+$/m, `draft_version: ${draft.draft_version + 1}`);
  after = after.replace(/^last_updated:\s*.+$/m, `last_updated: ${new Date().toISOString()}`);
  const temporary = `${target}.tmp-${process.pid}`;
  writeFileSync(temporary, after.endsWith("\n") ? after : `${after}\n`, { mode: 0o600 });
  renameSync(temporary, target);
  return { state: "applied", path: target, week: draft.week, applied: fresh.map((entry) => entry.key), duplicates, conflicts: [] };
}

export function draftAnchorText(content, anchor) {
  if (!weeklyDraftAnchors.includes(anchor)) fail(`unknown anchor ${anchor}.`);
  const heading = `## ${anchor}`;
  const startIndex = content.indexOf(heading);
  const nextHeading = content.indexOf("\n## ", startIndex + heading.length);
  if (startIndex < 0) fail(`missing section ${anchor}.`);
  return content.slice(startIndex + heading.length, nextHeading < 0 ? content.length : nextHeading).trim();
}
