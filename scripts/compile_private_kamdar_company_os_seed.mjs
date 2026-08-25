#!/usr/bin/env node
/**
 * Build the private, application-ready Kamdar Company OS seed.
 *
 * The tracked seed owns fictional scenario facts. This compiler replaces only
 * Project title and Department with values from the mode-0600 private capture
 * seed, then carries each Project Department through linked Work and Reports.
 * The resulting full seed remains profile-private and must never be written
 * into this repository or provider receipts.
 */
import { createHash } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import {
  loadKamdarSeedConfig,
  seedConfigPath,
  validateKamdarSeedConfig
} from "../evals/filesystem/scripts/kamdar-seed-config.mjs";

const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function stable(value) { return JSON.stringify(value, null, 2).concat("\n"); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function digest(value) { return createHash("sha256").update(value).digest("hex"); }
function fail(message) { throw new Error("Private Kamdar Company OS seed: " + message); }
function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail((label || path) + " is invalid JSON: " + error.message);
  }
}

function captureKeyNumber(value) {
  const match = String(value || "").match(/^CAPTURE-PROJECT-(\d{2})$/);
  return match ? Number(match[1]) : Number.NaN;
}

function validatePrivateCaptureSeed(seed, publicConfig) {
  const aggregate = seed && typeof seed === "object" ? seed.aggregate || {} : {};
  if (!seed || seed.schema_version !== "kamdar-private-seed@1.0.0") fail("expected a kamdar-private-seed@1.0.0 capture seed.");
  if (seed.source_capture_sha256 !== publicConfig.provenance.source_capture_sha256) fail("private capture hash does not match the reviewed public seed provenance.");
  if (!Array.isArray(seed.projects) || seed.projects.length !== aggregate.named_projects) fail("private Project count must match the reviewed capture aggregate.");
  if (aggregate.named_projects !== 39 || aggregate.source_gaps !== publicConfig.capture.source_gap_count || aggregate.observed_departments !== publicConfig.capture.departments.length) {
    fail("private capture aggregate does not match the approved 39/10/7 contract.");
  }
  if (!Array.isArray(seed.departments) || seed.departments.length !== aggregate.observed_departments) fail("private capture departments are incomplete.");
  const orderedProjects = [...seed.projects].sort((left, right) => captureKeyNumber(left.project_key) - captureKeyNumber(right.project_key));
  const keys = new Set();
  for (const [index, project] of orderedProjects.entries()) {
    const expected = "CAPTURE-PROJECT-" + String(index + 1).padStart(2, "0");
    if (!project || project.project_key !== expected || keys.has(project.project_key)) fail("private capture Project keys must be unique and sequential.");
    if (typeof project.project_name !== "string" || !project.project_name.trim()) fail("private capture Project " + expected + " needs a non-empty name.");
    if (typeof project.department !== "string" || !project.department.trim()) fail("private capture Project " + expected + " needs a non-empty Department.");
    keys.add(project.project_key);
  }
  return orderedProjects;
}

/**
 * Returns an application-ready, private configuration. It is safe to validate
 * against the normal seed schema, but contains capture Project names and must
 * remain outside source control.
 */
export function compilePrivateKamdarCompanyOsSeed({ config, privateCaptureSeed }) {
  const publicConfig = config?.provenance && config?.templates ? clone(config) : validateKamdarSeedConfig(config);
  const captureProjects = validatePrivateCaptureSeed(privateCaptureSeed, publicConfig);
  const output = clone(publicConfig);
  const projectDepartments = new Map();

  output.provenance.kind = "private-capture-project-title-and-department-overlay";
  output.provenance.policy = "Private local application seed. Captured Project titles and Departments remain outside source control, receipts, and public run output.";
  output.entities.departments = clone(privateCaptureSeed.departments);

  const capturesByName = new Map(captureProjects.map((project) => [project.project_name, project]));
  if (capturesByName.size !== captureProjects.length) fail("private capture Project names must be unique.");
  for (const project of output.entities.projects) {
    const capture = capturesByName.get(project.properties.name);
    if (!capture) fail(`focused Project ${project.properties.name} is absent from the reviewed private capture.`);
    project.properties.name = capture.project_name;
    project.properties.department = capture.department;
    project.metadata = {
      ...(project.metadata || {}),
      capture_project_key: capture.project_key
    };
    projectDepartments.set(project.id, capture.department);
  }

  for (const group of [output.entities.work_items, output.entities.meetings, output.entities.reports]) {
    for (const record of group) {
      const department = projectDepartments.get(record.properties.project);
      if (!department) fail("linked record " + record.id + " has no projected Project Department.");
      record.properties.department = department;
    }
  }

  return output;
}

export function loadPrivateCaptureSeed({ path }) {
  if (!path || !existsSync(path)) fail("private capture seed is missing.");
  const target = resolve(path);
  if ((statSync(target).mode & 0o777) !== 0o600) fail("private capture seed must remain mode 0600.");
  return readJson(target, "Private capture seed");
}

export function writePrivateKamdarCompanyOsSeed({ outputPath, config }) {
  if (!outputPath) fail("output path is required.");
  const target = resolve(outputPath);
  if (target === sourceRoot || target.startsWith(sourceRoot + sep)) {
    fail("refusing to write capture-derived data inside the source repository.");
  }
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  writeFileSync(target, stable(config), { mode: 0o600 });
  chmodSync(target, 0o600);
  return target;
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!["--capture-seed", "--output", "--config"].includes(key)) fail("unsupported argument " + key + ".");
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail(key + " needs a value.");
    options[key.slice(2).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase())] = value;
    index += 1;
  }
  if (!options.captureSeed || !options.output) fail("usage: node scripts/compile_private_kamdar_company_os_seed.mjs --capture-seed <private-seed.json> --output <private-company-os-seed.json> [--config <public-seed.json>]");
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const publicConfig = loadKamdarSeedConfig({ path: options.config || seedConfigPath });
    const privateCaptureSeed = loadPrivateCaptureSeed({ path: options.captureSeed });
    const compiled = compilePrivateKamdarCompanyOsSeed({ config: publicConfig, privateCaptureSeed });
    const output = writePrivateKamdarCompanyOsSeed({ outputPath: options.output, config: compiled });
    process.stdout.write(JSON.stringify({
      output,
      mode: "0600",
      projects: compiled.entities.projects.length,
      departments: compiled.entities.departments.length,
      source_capture_sha256: compiled.provenance.source_capture_sha256,
      config_sha256: digest(stable(compiled))
    }) + "\n");
  } catch (error) {
    process.stderr.write(JSON.stringify({ status: "blocked", reason: error.message }) + "\n");
    process.exitCode = 1;
  }
}
