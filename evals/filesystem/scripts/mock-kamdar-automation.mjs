/**
 * Deterministic Kamdar company-manager proof.
 *
 * The processor is intentionally dependency-free and never calls a network.
 * Mock mode records connector-shaped calls. Live POC orchestration may pass a
 * sanitized snapshot and externally captured receipts through the same scorer.
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const filesystemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const casesRoot = resolve(filesystemRoot, "cases");
const defaultFixtureRoot = resolve(filesystemRoot, "fixtures/daily-company-showcase");
const defaultOutputRoot = resolve(filesystemRoot, "runs/kamdar-daily-company-showcase-latest");
const caseFileName = "kamdar-daily-company-showcase.json";
const contactOperations = new Set([
  "notion:create_task_comment",
  "email:send_message",
  "telegram:send_message"
]);

let mostRecent = null;
let mostRecentRoot = null;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeText(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`, "utf8");
}

function writeJson(path, value) {
  writeText(path, JSON.stringify(value, null, 2));
}

function safeOutputPath(root, value) {
  if (typeof value !== "string" || !value || isAbsolute(value)) throw new Error("Output path must be relative.");
  const path = resolve(root, value);
  const inner = relative(root, path);
  if (!inner || inner === ".." || inner.startsWith(`..${sep}`) || isAbsolute(inner)) throw new Error("Output path escaped the run root.");
  return path;
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function orderedUnique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function byId(values) {
  return new Map(values.map((value) => [value.id, value]));
}

function replaceTemplate(template, replacements) {
  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, String(value)),
    template
  );
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function html(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeReceiptValue(value, key = "") {
  const normalizedKey = key.toLowerCase().replaceAll("-", "_");
  if (/(^|_)(authorization|cookie|credential|password|secret|token|api_key|private_key)($|_)/.test(normalizedKey)) {
    return "[REDACTED_SECRET]";
  }
  if (["to", "from", "cc", "bcc", "email", "phone", "chat", "chat_id", "address"].includes(normalizedKey)) {
    return "[REDACTED_CONTACT]";
  }
  if (typeof value === "string") {
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
      .replace(/Bearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED_SECRET]")
      .replace(/([?&](?:access_token|token|api_key|key|secret)=)[^&#\s]+/gi, "$1[REDACTED_SECRET]");
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeReceiptValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([childKey, childValue]) => [childKey, sanitizeReceiptValue(childValue, childKey)]));
  }
  return value;
}

function validateSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") throw new Error("Automation snapshot must be an object.");
  for (const key of ["company", "frozen_at", "local_date", "week", "week_start", "week_end", "notion", "drive", "templates"]) {
    if (!(key in snapshot)) throw new Error(`Automation snapshot is missing ${key}.`);
  }
  for (const key of ["tasks", "projects", "people"]) {
    if (!Array.isArray(snapshot.notion[key])) throw new Error(`snapshot.notion.${key} must be a list.`);
  }
  for (const key of ["resources", "reports"]) {
    if (!Array.isArray(snapshot.drive[key])) throw new Error(`snapshot.drive.${key} must be a list.`);
  }
  if (!snapshot.drive.report_files || typeof snapshot.drive.report_files !== "object") throw new Error("snapshot.drive.report_files must be an object.");
  return copy(snapshot);
}

export function loadCase({ casesDirectory = casesRoot } = {}) {
  const files = readdirSync(casesDirectory).filter((name) => name.endsWith(".json"));
  if (files.length !== 1 || files[0] !== caseFileName) {
    throw new Error(`Expected exactly one comprehensive case named ${caseFileName}.`);
  }
  const definition = readJson(resolve(casesDirectory, caseFileName));
  if (definition.schema_version !== 2 || definition.id !== "kamdar-daily-company-showcase") {
    throw new Error("The comprehensive Kamdar case must use schema version 2 and the canonical id.");
  }
  for (const key of ["reference_points", "expected_tool_calls", "expected_file_events", "content_assertions"]) {
    if (!Array.isArray(definition[key]) || definition[key].length === 0) throw new Error(`Case ${key} must be a non-empty list.`);
  }
  return definition;
}

export function loadFrozenSnapshot({ fixtureRoot = defaultFixtureRoot } = {}) {
  const scenario = readJson(resolve(fixtureRoot, "scenario.json"));
  const reports = readJson(resolve(fixtureRoot, "drive/reports.json"));
  const reportFiles = {};
  for (const report of reports) {
    if (report.source_file) reportFiles[report.path] = readFileSync(resolve(fixtureRoot, "drive", report.source_file), "utf8");
  }
  return validateSnapshot({
    ...scenario,
    notion: {
      projects: readJson(resolve(fixtureRoot, "notion/projects.json")),
      tasks: readJson(resolve(fixtureRoot, "notion/tasks.json")),
      people: readJson(resolve(fixtureRoot, "notion/people.json"))
    },
    drive: {
      resources: readJson(resolve(fixtureRoot, "drive/resources.json")),
      reports,
      report_files: reportFiles
    },
    templates: {
      area_report: readFileSync(resolve(fixtureRoot, "templates/area-weekly-report.md"), "utf8"),
      company_rollup: readFileSync(resolve(fixtureRoot, "templates/company-weekly-rollup.md"), "utf8"),
      employee_followups: readFileSync(resolve(fixtureRoot, "templates/employee-followups.md"), "utf8")
    }
  });
}

function createRecorder(snapshot) {
  const calls = [];
  let phase = "run-1";
  return {
    calls,
    setPhase(value) { phase = value; },
    record(adapter, operation, args, result) {
      const entry = {
        sequence: calls.length + 1,
        phase,
        adapter,
        operation,
        args: copy(args),
        result: copy(result),
        recorded_at: snapshot.frozen_at,
        source: "recording-adapter",
        mocked: true
      };
      calls.push(entry);
      return result;
    }
  };
}

function createRecordingAdapters(snapshot, recorder) {
  return {
    notion: {
      queryTasksModified({ since, until }) {
        const tasks = snapshot.notion.tasks
          .filter((task) => task.last_edited_time >= since && task.last_edited_time < until)
          .sort((left, right) => left.id.localeCompare(right.id));
        return recorder.record("notion", "query_tasks_modified", { since, until }, { count: tasks.length, ids: tasks.map((task) => task.id) }) && tasks;
      },
      fetchProjects(projectIds) {
        const wanted = new Set(projectIds);
        const projects = snapshot.notion.projects.filter((project) => wanted.has(project.id)).sort((left, right) => left.id.localeCompare(right.id));
        recorder.record("notion", "fetch_projects", { project_ids: [...wanted].sort() }, { count: projects.length, ids: projects.map((project) => project.id) });
        return projects;
      },
      fetchPeople(personIds) {
        const wanted = new Set(personIds);
        const people = snapshot.notion.people.filter((person) => wanted.has(person.id)).sort((left, right) => left.id.localeCompare(right.id));
        recorder.record("notion", "fetch_people_directory", { person_ids: [...wanted].sort() }, { count: people.length, ids: people.map((person) => person.id) });
        return people;
      },
      createTaskComment(task, comment, actionKey) {
        return recorder.record("notion", "create_task_comment", {
          task_id: task.id,
          task_url: task.url,
          comment,
          action_key: actionKey
        }, { status: "recorded", comment_id: `mock-comment-${task.id}` });
      }
    },
    drive: {
      listProjectResources(projectIds, since) {
        const wanted = new Set(projectIds);
        const resources = snapshot.drive.resources
          .filter((resource) => wanted.has(resource.project_id) && resource.modified_time >= since)
          .sort((left, right) => left.id.localeCompare(right.id));
        recorder.record("drive", "list_project_resources", { project_ids: [...wanted].sort(), modified_since: since }, { count: resources.length, ids: resources.map((resource) => resource.id) });
        return resources;
      },
      readLatestAreaReports(areas) {
        const latest = {};
        for (const area of areas) {
          const match = snapshot.drive.reports
            .filter((report) => report.area === area)
            .sort((left, right) => right.modified_time.localeCompare(left.modified_time))[0];
          if (match) latest[area] = match;
        }
        recorder.record("drive", "read_latest_area_reports", { areas }, { reports: Object.fromEntries(Object.entries(latest).map(([area, report]) => [area, report.id])) });
        return latest;
      },
      upsertMarkdown(path, week, event) {
        return recorder.record("drive", "upsert_markdown", { path, week, mode: event === "created" ? "create" : "update" }, { status: "recorded", path });
      }
    },
    email: {
      sendMessage(person, subject, body, actionKey) {
        return recorder.record("email", "send_message", {
          to: person.email,
          recipient_id: person.id,
          subject,
          body,
          action_key: actionKey
        }, { status: "recorded", message_id: `mock-email-${person.id}` });
      }
    },
    telegram: {
      sendMessage(chat, body, actionKey) {
        return recorder.record("telegram", "send_message", { chat, body, action_key: actionKey }, { status: "recorded", message_id: "mock-telegram-owner" });
      }
    }
  };
}

function normalizeReceipts(receipts, snapshot) {
  if (!Array.isArray(receipts)) throw new Error("externalReceipts must be a list.");
  return receipts.map((receipt, index) => {
    if (!receipt || typeof receipt !== "object" || !receipt.adapter || !receipt.operation) {
      throw new Error(`externalReceipts[${index}] must name adapter and operation.`);
    }
    return {
      sequence: index + 1,
      phase: receipt.phase || "run-1",
      adapter: String(receipt.adapter),
      operation: String(receipt.operation),
      args: sanitizeReceiptValue(receipt.args || {}),
      result: sanitizeReceiptValue(receipt.result || {}),
      evidence: sanitizeReceiptValue(receipt.evidence || {}),
      recorded_at: receipt.recorded_at || snapshot.frozen_at,
      source: "external-receipt",
      mocked: false
    };
  });
}

function fileState(root, path) {
  const absolute = safeOutputPath(root, path);
  if (!existsSync(absolute)) return null;
  const content = readFileSync(absolute, "utf8");
  return { content, sha256: sha256(content), bytes: Buffer.byteLength(content) };
}

function upsertManagedFile(root, path, content, events) {
  const before = fileState(root, path);
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  if (before?.content === normalized) return "unchanged";
  writeText(safeOutputPath(root, path), normalized);
  const event = before ? "modified" : "created";
  events.push({ path, event, before_sha256: before?.sha256 || null, after_sha256: sha256(normalized) });
  return event;
}

function latestReportsSelection(latestReports) {
  return Object.fromEntries(Object.entries(latestReports).map(([area, report]) => [area, report.id]));
}

function followUpForTask(task) {
  if (task.needs_progress_chase) {
    return {
      kind: "progress",
      task,
      missing: [],
      comment: `Progress check for ${task.id}: please confirm the current status, Blocker owner, and Expected resolution date. Next known action: ${task.next_action}`
    };
  }
  if (task.documentation?.missing?.length) {
    return {
      kind: "documentation-quality",
      task,
      missing: task.documentation.missing,
      comment: `Documentation quality check for ${task.id}: please add ${task.documentation.missing.join(" and ")}. Next known action: ${task.next_action}`
    };
  }
  return null;
}

function taskBlock(task, person, resources) {
  const docs = task.documentation.missing.length
    ? `Missing: ${task.documentation.missing.join(", ")}`
    : "Complete against the configured task fields";
  const links = resources.length
    ? resources.map((resource) => `  - [${resource.name}](${resource.url})`).join("\n")
    : "  - No current Drive resource found.";
  return `### ${task.id} — ${task.name}\n\n- Status: ${task.status}\n- Owner: ${person.name} (${person.role})\n- Due: ${task.due_date}\n- Progress: ${task.progress}\n- Blocker: ${task.blocker}\n- Documentation quality: ${docs}\n- Next action: ${task.next_action}\n- Notion: ${task.url}\n- Drive evidence:\n${links}`;
}

function renderAreaReport(snapshot, area, projects, tasks, people, resources, latestReport) {
  const peopleMap = byId(people);
  const projectSections = projects.map((project) => {
    const projectTasks = tasks.filter((task) => task.project_id === project.id);
    const sections = projectTasks.map((task) => taskBlock(
      task,
      peopleMap.get(task.owner_id),
      resources.filter((resource) => resource.project_id === project.id)
    )).join("\n\n");
    return `## ${project.name}\n\n- Project status: ${project.status}\n- Canonical project: ${project.url}\n\n${sections}`;
  }).join("\n\n");
  const followUps = tasks.map(followUpForTask).filter(Boolean);
  const sources = [
    ...projects.map((project) => `- [Project: ${project.name}](${project.url})`),
    ...tasks.map((task) => `- [Task: ${task.id}](${task.url})`),
    ...resources.map((resource) => `- [Drive: ${resource.name}](${resource.url})`),
    ...(latestReport ? [`- [Latest prior area report: ${latestReport.id}](${latestReport.url})`] : [])
  ].join("\n");
  return replaceTemplate(snapshot.templates.area_report, {
    area,
    week: snapshot.week,
    generated_at: snapshot.frozen_at,
    executive_summary: `${tasks.length} task${tasks.length === 1 ? "" : "s"} changed this week across ${projects.length} project${projects.length === 1 ? "" : "s"}. ${followUps.length} follow-up${followUps.length === 1 ? "" : "s"} ${followUps.length === 1 ? "requires" : "require"} attention.`,
    project_sections: projectSections,
    follow_ups: followUps.length
      ? followUps.map((item) => `- ${item.task.id}: ${item.kind === "progress" ? "progress update requested" : `documentation improvement requested (${item.missing.join(", ")})`}.`).join("\n")
      : "- No follow-up required.",
    sources
  });
}

function renderCompanyRollup(snapshot, areaRows, tasks, followUps) {
  const areaSections = areaRows.map((row) => `### ${row.area}\n\n- Report: [${row.path}](../areas/${slug(row.area)}/weekly-report-${snapshot.week}.md)\n- Projects: ${row.projects.map((project) => project.name).join(", ")}\n- Tasks: ${row.tasks.map((task) => task.id).join(", ")}\n- Follow-ups: ${row.followUps.length}`).join("\n\n");
  return replaceTemplate(snapshot.templates.company_rollup, {
    company: snapshot.company.name,
    week: snapshot.week,
    generated_at: snapshot.frozen_at,
    company_summary: `${tasks.length} tasks changed this week across ${areaRows.length} areas. ${followUps.length} follow-ups require owner attention.`,
    area_sections: areaSections,
    owner_attention: followUps.map((item) => `- ${item.task.id}: ${item.kind === "progress" ? "stale blocked progress" : `missing ${item.missing.join(" and ")}`}.`).join("\n") || "- No owner attention required."
  });
}

function renderEmailArchive(snapshot, groupedFollowUps, peopleMap) {
  const recipientSections = [...groupedFollowUps.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([personId, items]) => {
    const person = peopleMap.get(personId);
    const workItems = items.map((item) => `### ${item.task.id} — ${item.task.name}\n\n${item.kind === "progress" ? "Please add a current progress update." : `Please improve the ticket with: ${item.missing.join(", ")}.`}\n\nNext known action: ${item.task.next_action}\n\nTask: ${item.task.url}`).join("\n\n");
    return `## ${person.name} <${person.email}>\n\nSubject: Action requested for ${items.length} work item${items.length === 1 ? "" : "s"}\n\n${workItems}`;
  }).join("\n\n---\n\n");
  return replaceTemplate(snapshot.templates.employee_followups, {
    local_date: snapshot.local_date,
    recipient_sections: recipientSections
  });
}

function performOnce({ snapshot, adapters, recorder, outputRoot, actionLedger, phase }) {
  recorder.setPhase(phase);
  const events = [];
  const tasks = adapters.notion.queryTasksModified({ since: snapshot.week_start, until: snapshot.week_end });
  const projectIds = orderedUnique(tasks.map((task) => task.project_id));
  const projects = adapters.notion.fetchProjects(projectIds);
  const personIds = orderedUnique(projects.map((project) => project.owner_id));
  const people = adapters.notion.fetchPeople(personIds);
  const resources = adapters.drive.listProjectResources(projectIds, snapshot.week_start);
  const areas = orderedUnique(projects.map((project) => project.area));
  const latestReports = adapters.drive.readLatestAreaReports(areas);
  const peopleMap = byId(people);
  const followUps = tasks.map(followUpForTask).filter(Boolean);
  const groupedFollowUps = new Map();
  for (const followUp of followUps) {
    const items = groupedFollowUps.get(followUp.task.owner_id) || [];
    items.push(followUp);
    groupedFollowUps.set(followUp.task.owner_id, items);
  }

  const areaRows = areas.map((area) => {
    const areaProjects = projects.filter((project) => project.area === area);
    const areaProjectIds = new Set(areaProjects.map((project) => project.id));
    const areaTasks = tasks.filter((task) => areaProjectIds.has(task.project_id));
    const areaResources = resources.filter((resource) => areaProjectIds.has(resource.project_id));
    const areaFollowUps = followUps.filter((item) => areaProjectIds.has(item.task.project_id));
    const path = `reports/areas/${slug(area)}/weekly-report-${snapshot.week}.md`;
    const content = renderAreaReport(snapshot, area, areaProjects, areaTasks, people, areaResources, latestReports[area]);
    const event = upsertManagedFile(outputRoot, path, content, events);
    if (event !== "unchanged") adapters.drive.upsertMarkdown(path, snapshot.week, event);
    return { area, path, projects: areaProjects, tasks: areaTasks, followUps: areaFollowUps };
  });

  const companyPath = `reports/company/weekly-report-${snapshot.week}.md`;
  const companyEvent = upsertManagedFile(outputRoot, companyPath, renderCompanyRollup(snapshot, areaRows, tasks, followUps), events);
  if (companyEvent !== "unchanged") adapters.drive.upsertMarkdown(companyPath, snapshot.week, companyEvent);

  const emailPath = `outreach/email-followups-${snapshot.local_date}.md`;
  upsertManagedFile(outputRoot, emailPath, renderEmailArchive(snapshot, groupedFollowUps, peopleMap), events);
  const telegramPath = `outreach/telegram-summary-${snapshot.local_date}.md`;
  const telegramBody = `${snapshot.company.name} ${snapshot.week}: ${tasks.length} tasks across ${areas.length} areas; ${followUps.length} follow-ups. Area reports and the company rollup are ready.`;
  upsertManagedFile(outputRoot, telegramPath, `# MOCK TELEGRAM DELIVERY\n\nChat: ${snapshot.company.telegram_chat}\n\n${telegramBody}`, events);

  const runAction = (key, callback) => {
    if (actionLedger.has(key)) {
      recorder.record("harness", "dedupe_skip", { action_key: key }, { status: "already-recorded" });
      return false;
    }
    actionLedger.add(key);
    callback();
    return true;
  };

  for (const followUp of followUps) {
    const key = `notion:${snapshot.local_date}:${followUp.kind}:${followUp.task.id}`;
    runAction(key, () => adapters.notion.createTaskComment(followUp.task, followUp.comment, key));
  }
  for (const [personId, items] of [...groupedFollowUps.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const person = peopleMap.get(personId);
    const key = `email:${snapshot.local_date}:${personId}`;
    const body = items.map((item) => `${item.task.id}: ${item.comment}`).join("\n\n");
    runAction(key, () => adapters.email.sendMessage(person, `Action requested for ${items.length} work item${items.length === 1 ? "" : "s"}`, body, key));
  }
  const telegramKey = `telegram:${snapshot.local_date}:owner-summary`;
  runAction(telegramKey, () => adapters.telegram.sendMessage(snapshot.company.telegram_chat, telegramBody, telegramKey));

  return {
    events,
    tasks,
    projects,
    people,
    resources,
    latestReports,
    areaRows,
    followUps,
    outputs: {
      area_reports: areaRows.map((row) => row.path),
      company_rollup: companyPath,
      email_archive: emailPath,
      telegram_archive: telegramPath
    }
  };
}

function inventory(root) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) {
        if (relative(root, path).replaceAll("\\", "/") === "result.json") continue;
        const content = readFileSync(path);
        files.push({
          path: relative(root, path).replaceAll("\\", "/"),
          bytes: statSync(path).size,
          sha256: createHash("sha256").update(content).digest("hex"),
          content_type: entry.name.endsWith(".json") ? "application/json" : entry.name.endsWith(".html") ? "text/html" : "text/markdown"
        });
      }
    }
  };
  if (existsSync(root)) visit(root);
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function observedToolCalls(mode, plannedCalls, externalReceipts, snapshot) {
  return mode === "mock" ? plannedCalls : normalizeReceipts(externalReceipts, snapshot);
}

function makeCheck(id, category, expectation, pass, evidence) {
  return { id, category, expectation, pass: Boolean(pass), evidence };
}

function scoreCase(definition, result, outputRoot) {
  const checks = [];
  const selection = result.selection;
  for (const id of definition.expected_selection.included_task_ids) {
    checks.push(makeCheck(`selection:included:${id}`, "source-selection", `${id} is selected`, selection.included_task_ids.includes(id), selection.included_task_ids));
  }
  for (const id of definition.expected_selection.excluded_task_ids) {
    checks.push(makeCheck(`selection:excluded:${id}`, "source-selection", `${id} is excluded`, selection.excluded_task_ids.includes(id), selection.excluded_task_ids));
  }
  for (const id of definition.expected_selection.project_ids) {
    checks.push(makeCheck(`selection:project:${id}`, "source-selection", `${id} project is fetched`, selection.project_ids.includes(id), selection.project_ids));
  }
  for (const id of definition.expected_selection.people_ids) {
    checks.push(makeCheck(`selection:person:${id}`, "source-selection", `${id} directory record is fetched`, selection.people_ids.includes(id), selection.people_ids));
  }
  for (const id of definition.expected_selection.resource_ids) {
    checks.push(makeCheck(`selection:resource:${id}`, "source-selection", `${id} Drive resource is fetched`, selection.drive_resource_ids.includes(id), selection.drive_resource_ids));
  }
  for (const [area, id] of Object.entries(definition.expected_selection.latest_reports)) {
    checks.push(makeCheck(`selection:latest:${area}:${id}`, "source-selection", `${id} is the latest ${area} report`, selection.latest_reports[area] === id, selection.latest_reports));
  }

  for (const expected of definition.expected_tool_calls) {
    const candidates = result.tools.calls.filter((call) => call.adapter === expected.adapter && call.operation === expected.operation && (!expected.phase || call.phase === expected.phase));
    const matching = candidates.filter((call) => (expected.args_contain || []).every((text) => JSON.stringify(call).includes(text)));
    checks.push(makeCheck(`tool:${expected.id}`, "tool-call", `${expected.adapter}.${expected.operation} occurs ${expected.times} time(s) with the expected arguments`, matching.length === expected.times, { count: matching.length, candidate_count: candidates.length, sequences: matching.map((call) => call.sequence), args_contain: expected.args_contain || [] }));
  }
  const directorySequence = result.tools.calls.find((call) => call.adapter === "notion" && call.operation === "fetch_people_directory" && call.phase === "run-1")?.sequence;
  const firstEmailSequence = result.tools.calls.find((call) => call.adapter === "email" && call.operation === "send_message" && call.phase === "run-1")?.sequence;
  checks.push(makeCheck("tool:directory-before-email", "tool-call", "Directory contacts are fetched before email routing", directorySequence && firstEmailSequence && directorySequence < firstEmailSequence, { directory_sequence: directorySequence || null, first_email_sequence: firstEmailSequence || null }));

  for (const expected of definition.expected_file_events) {
    const event = result.files.events.find((item) => item.path === expected.path);
    checks.push(makeCheck(`file:${expected.id}`, "file-event", `${expected.path} is ${expected.event}`, event?.event === expected.event, event || null));
  }
  for (const expected of definition.content_assertions) {
    const state = fileState(outputRoot, expected.path);
    const missing = (expected.present || []).filter((text) => !state?.content.includes(text));
    const forbidden = (expected.absent || []).filter((text) => state?.content.includes(text));
    checks.push(makeCheck(`content:${expected.id}`, "file-content", `${expected.path} contains required evidence and omits forbidden content`, Boolean(state) && missing.length === 0 && forbidden.length === 0, { missing, forbidden }));
  }
  const expectedIdempotency = definition.expected_idempotency;
  const idempotencyPass = result.idempotency.duplicate_files === expectedIdempotency.duplicate_files
    && result.idempotency.duplicate_actions === expectedIdempotency.duplicate_actions
    && result.idempotency.second_run_new_external_actions === expectedIdempotency.second_run_new_external_actions;
  checks.push(makeCheck("idempotency:all", "idempotency", "A second run creates no duplicate file or contact action", idempotencyPass, result.idempotency));

  const checksById = new Map(checks.map((check) => [check.id, check]));
  const referencePoints = definition.reference_points.map((point) => {
    const missingChecks = point.assertion_ids.filter((id) => !checksById.has(id));
    const failedChecks = point.assertion_ids.filter((id) => checksById.has(id) && !checksById.get(id).pass);
    return { id: point.id, text: point.text, pass: missingChecks.length === 0 && failedChecks.length === 0, assertion_ids: point.assertion_ids, missing_checks: missingChecks, failed_checks: failedChecks };
  });
  const pass = checks.every((check) => check.pass) && referencePoints.every((point) => point.pass);
  return {
    pass,
    counts: { pass: checks.filter((check) => check.pass).length, fail: checks.filter((check) => !check.pass).length, total: checks.length },
    checks,
    reference_points: referencePoints
  };
}

function showcaseMarkdown(result) {
  const selectedTasks = result.selection.included_task_ids.map((id) => `\`${id}\``).join(", ");
  const tools = result.tools.calls.map((call) => `| ${call.sequence} | ${call.phase} | ${call.adapter} | ${call.operation} | ${call.source} |`).join("\n") || "| — | — | — | — | No observed receipt |";
  const checks = result.assertions?.reference_points?.map((point) => `| ${point.pass ? "PASS" : "FAIL"} | ${point.text} |`).join("\n") || "| PENDING | Assertions are being calculated. |";
  const files = Object.values(result.outputs).flat().filter((value) => typeof value === "string").map((path) => `- [${path}](../${path})`).join("\n");
  const proofHeading = result.safety.mocked ? "Mocked connector proof" : "Live POC connector proof";
  const proofDetail = result.safety.mocked
    ? "All mock adapter calls are recorded. A live POC must supply separate external receipts."
    : "The external calls were operated by the bounded edge adapter and are represented here by sanitized live receipts. The frozen output projection remains the Mocked connector proof oracle.";
  return `---\nkind: kamdar-automation-showcase\nmode: ${result.run.mode}\nmocked: ${result.safety.mocked}\ngenerated_at: ${result.run.completed_at}\n---\n\n# ${result.case.title}\n\n## ${proofHeading}\n\n> ${result.safety.notice}\n\nNo network calls were made by this processor. ${proofDetail}\n\n## What the manager selected\n\n- Tasks changed this week: ${selectedTasks}\n- Excluded as older work: ${result.selection.excluded_task_ids.map((id) => `\`${id}\``).join(", ")}\n- Areas: ${Object.keys(result.selection.latest_reports).join(", ")}\n- Directory contacts resolved: ${result.selection.people_ids.length}\n- Current Drive resources: ${result.selection.drive_resource_ids.length}\n\n## Output files\n\n${files}\n\n## Recorded tool activity\n\n| # | Pass | Adapter | Operation | Evidence source |\n| ---: | --- | --- | --- | --- |\n${tools}\n\n## Eval reference points\n\n| Result | Expected behavior |\n| --- | --- |\n${checks}\n\n## Repeatability\n\n- Duplicate files: ${result.idempotency.duplicate_files}\n- Duplicate contact actions: ${result.idempotency.duplicate_actions}\n- Second-run new contact actions: ${result.idempotency.second_run_new_external_actions}\n- Dedupe skips recorded: ${result.idempotency.skipped_actions}\n`;
}

function showcaseHtml(result, markdown) {
  const checkRows = result.assertions?.reference_points?.map((point) => `<tr><td class="${point.pass ? "pass" : "fail"}">${point.pass ? "PASS" : "FAIL"}</td><td>${html(point.text)}</td></tr>`).join("") || "";
  const fileSections = result.outputs.area_reports.concat([result.outputs.company_rollup, result.outputs.email_archive, result.outputs.telegram_archive]).map((path) => {
    const content = readRunFile(path, { outputRoot: result.run.output_root });
    return `<details><summary>${html(path)}</summary><pre>${html(content)}</pre></details>`;
  }).join("");
  const proofLabel = result.safety.mocked ? "Mocked connector proof." : "Live POC connector proof.";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(result.case.title)}</title><style>body{font:16px/1.5 ui-sans-serif,system-ui;color:#172033;background:#f5f7fb;margin:0}.wrap{max-width:1080px;margin:auto;padding:40px 24px}.notice{border:1px solid #8aa2c8;background:#edf4ff;padding:16px;border-radius:8px}section{background:#fff;border:1px solid #dfe5ee;border-radius:10px;padding:22px;margin:18px 0}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #e4e8ef;padding:10px}.pass{color:#087443;font-weight:700}.fail{color:#b42318;font-weight:700}details{border-top:1px solid #e4e8ef;padding:12px 0}summary{cursor:pointer;font-weight:650}pre{white-space:pre-wrap;background:#f7f8fa;padding:16px;overflow:auto}.meta{color:#596579}</style></head><body><main class="wrap"><p class="meta">Kamdar automation proof · ${html(result.run.mode)}</p><h1>${html(result.case.title)}</h1><div class="notice"><strong>${proofLabel}</strong> ${html(result.safety.notice)} No network calls were made by this processor.</div><section><h2>Observed result</h2><p>${html(result.summary)}</p><p>${result.selection.included_task_ids.length} current tasks · ${Object.keys(result.selection.latest_reports).length} areas · ${result.idempotency.skipped_actions} dedupe skips</p></section><section><h2>Reference points</h2><table><thead><tr><th>Result</th><th>Expected behavior</th></tr></thead><tbody>${checkRows}</tbody></table></section><section><h2>Generated files</h2>${fileSections}</section><section><h2>Raw sanitized showcase Markdown</h2><details><summary>Inspect source</summary><pre>${html(markdown)}</pre></details></section></main></body></html>`;
}

function stageExistingReports(snapshot, outputRoot) {
  for (const [path, content] of Object.entries(snapshot.drive.report_files)) writeText(safeOutputPath(outputRoot, path), content);
}

function prepareRunRoot(root, reset, definition) {
  if (reset && existsSync(root)) {
    const marker = resolve(root, ".kamdar-eval-run.json");
    const priorResult = resolve(root, "result.json");
    const ownsRoot = existsSync(marker)
      || (existsSync(priorResult) && readJson(priorResult).kind === "kamdar-automation-proof");
    if (readdirSync(root).length > 0 && !ownsRoot) {
      throw new Error(`Refusing to reset an output root not owned by ${definition.id}.`);
    }
    rmSync(root, { recursive: true, force: true });
  }
  mkdirSync(root, { recursive: true });
  writeJson(resolve(root, ".kamdar-eval-run.json"), { schema_version: 1, owner: definition.id });
}

export function runAutomationSnapshot({
  snapshot: inputSnapshot,
  outputRoot = defaultOutputRoot,
  mode = "mock",
  externalReceipts = [],
  reset = true,
  definition = loadCase()
} = {}) {
  if (!inputSnapshot) throw new Error("runAutomationSnapshot requires a snapshot.");
  if (!['mock', 'live-poc'].includes(mode)) throw new Error("mode must be mock or live-poc.");
  const snapshot = validateSnapshot(inputSnapshot);
  const root = resolve(outputRoot);
  prepareRunRoot(root, reset, definition);
  stageExistingReports(snapshot, root);

  const recorder = createRecorder(snapshot);
  const adapters = createRecordingAdapters(snapshot, recorder);
  const actionLedger = new Set();
  const first = performOnce({ snapshot, adapters, recorder, outputRoot: root, actionLedger, phase: "run-1" });
  const actionsAfterFirst = actionLedger.size;
  const secondStart = recorder.calls.length;
  const second = performOnce({ snapshot, adapters, recorder, outputRoot: root, actionLedger, phase: "run-2" });
  const secondCalls = recorder.calls.slice(secondStart);
  const secondNewContactActions = secondCalls.filter((call) => contactOperations.has(`${call.adapter}:${call.operation}`)).length;
  const managedPaths = first.outputs.area_reports.concat([first.outputs.company_rollup, first.outputs.email_archive, first.outputs.telegram_archive]);
  const duplicateFiles = managedPaths.length - new Set(managedPaths).size;
  const observedCalls = observedToolCalls(mode, recorder.calls, externalReceipts, snapshot);
  const excludedTasks = snapshot.notion.tasks.filter((task) => !first.tasks.some((selected) => selected.id === task.id)).map((task) => task.id).sort();
  const completedAt = snapshot.frozen_at;
  const result = {
    schema_version: 1,
    kind: "kamdar-automation-proof",
    case: { id: definition.id, title: definition.title, operator_request: definition.operator_request },
    run: {
      id: `${definition.id}-${snapshot.local_date}`,
      started_at: snapshot.frozen_at,
      completed_at: completedAt,
      mode,
      output_root: root
    },
    safety: {
      mocked: mode === "mock",
      network_calls_by_processor: 0,
      external_writes_by_processor: 0,
      notice: mode === "mock"
        ? "Every Notion, Drive, email, and Telegram action shown here was produced by a local recording adapter."
        : "This processor made no network call; observed connector evidence comes only from externally supplied live POC receipts."
    },
    readiness: [
      { id: "snapshot", label: "Company snapshot", status: "ready", detail: `${first.tasks.length} current tasks selected` },
      { id: "notion", label: "Notion", status: mode === "mock" || observedCalls.some((call) => call.adapter === "notion") ? "ready" : "needs-receipts", detail: mode === "mock" ? "recording adapter" : "external receipt" },
      { id: "drive", label: "Google Drive", status: mode === "mock" || observedCalls.some((call) => call.adapter === "drive") ? "ready" : "needs-receipts", detail: mode === "mock" ? "recording adapter" : "external receipt" },
      { id: "email", label: "Email", status: mode === "mock" || observedCalls.some((call) => call.adapter === "email") ? "ready" : "needs-receipts", detail: mode === "mock" ? "recording adapter" : "external receipt" },
      { id: "telegram", label: "Telegram", status: mode === "mock" || observedCalls.some((call) => call.adapter === "telegram") ? "ready" : "needs-receipts", detail: mode === "mock" ? "recording adapter" : "external receipt" }
    ],
    selection: {
      included_task_ids: first.tasks.map((task) => task.id),
      excluded_task_ids: excludedTasks,
      project_ids: first.projects.map((project) => project.id),
      people_ids: first.people.map((person) => person.id),
      drive_resource_ids: first.resources.map((resource) => resource.id),
      latest_reports: latestReportsSelection(first.latestReports)
    },
    outputs: {
      ...first.outputs,
      tool_trace: "evidence/tool-trace.json",
      showcase_markdown: "showcase/index.md",
      showcase_html: "showcase/index.html"
    },
    files: { events: first.events, second_run_events: second.events, inventory: [] },
    tools: {
      calls: observedCalls,
      planned_calls: recorder.calls,
      counts: Object.fromEntries(orderedUnique(observedCalls.map((call) => call.adapter)).map((adapter) => [adapter, observedCalls.filter((call) => call.adapter === adapter).length]))
    },
    idempotency: {
      pass: duplicateFiles === 0 && actionLedger.size === actionsAfterFirst && secondNewContactActions === 0,
      second_run: true,
      duplicate_files: duplicateFiles,
      duplicate_actions: actionLedger.size - actionsAfterFirst,
      second_run_new_external_actions: secondNewContactActions,
      skipped_actions: secondCalls.filter((call) => call.adapter === "harness" && call.operation === "dedupe_skip").length,
      second_run_file_events: second.events
    },
    assertions: { pass: false, counts: { pass: 0, fail: 0, total: 0 }, checks: [], reference_points: [] },
    summary: `${first.tasks.length} tasks across ${first.areaRows.length} areas produced ${first.outputs.area_reports.length} area reports, one company rollup, ${first.followUps.length} employee follow-ups, and one owner summary.`
  };

  writeJson(safeOutputPath(root, result.outputs.tool_trace), { schema_version: 1, mode, safety: result.safety, observed_calls: observedCalls, planned_calls: recorder.calls });
  let markdown = showcaseMarkdown(result);
  writeText(safeOutputPath(root, result.outputs.showcase_markdown), markdown);
  writeText(safeOutputPath(root, result.outputs.showcase_html), showcaseHtml(result, markdown));
  result.assertions = scoreCase(definition, result, root);
  markdown = showcaseMarkdown(result);
  writeText(safeOutputPath(root, result.outputs.showcase_markdown), markdown);
  writeText(safeOutputPath(root, result.outputs.showcase_html), showcaseHtml(result, markdown));
  result.files.inventory = inventory(root);
  writeJson(resolve(root, "result.json"), result);
  result.files.inventory = inventory(root);
  writeJson(resolve(root, "result.json"), result);
  mostRecent = result;
  mostRecentRoot = root;
  return result;
}

export function runMockAutomation({ outputRoot = defaultOutputRoot } = {}) {
  return runAutomationSnapshot({ snapshot: loadFrozenSnapshot(), outputRoot, mode: "mock", externalReceipts: [], reset: true });
}

export function latestRun({ outputRoot = mostRecentRoot || defaultOutputRoot } = {}) {
  if (mostRecent && resolve(outputRoot) === mostRecentRoot) return mostRecent;
  const path = resolve(outputRoot, "result.json");
  return existsSync(path) ? readJson(path) : null;
}

export function readRunFile(path = "result.json", { outputRoot = mostRecentRoot || defaultOutputRoot } = {}) {
  const safePath = safeOutputPath(resolve(outputRoot), path);
  if (!existsSync(safePath) || !statSync(safePath).isFile()) throw new Error(`Run file not found: ${basename(path)}`);
  return readFileSync(safePath, "utf8");
}
