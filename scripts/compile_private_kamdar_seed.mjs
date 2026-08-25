/**
 * Compile the private Notion browser capture into a 0600 profile-state seed.
 *
 * The output is deliberately not a repository fixture: it retains captured
 * Project names only in private state. Git receives the matching aggregate
 * manifest, so the frozen proof can demonstrate the same portfolio shape
 * without rendering customer data.
 */
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const expected = Object.freeze({ rows: 49, projects: 39, sourceGaps: 10, departments: 7 });

function digest(value) { return createHash("sha256").update(value).digest("hex"); }
function text(value) { return typeof value === "string" ? value.trim() : ""; }
function stable(value) { return JSON.stringify(value, null, 2).concat("\n"); }

function requireRows(capture) {
  const rows = capture?.table?.rows;
  if (!Array.isArray(rows)) throw new Error("Expected a browser capture with table.rows.");
  return rows;
}

function unique(values) { return [...new Set(values)]; }

/**
 * @param {object} capture untrusted private browser-capture JSON
 * @returns {{ privateSeed: object, publicManifest: object }}
 */
export function compilePrivateKamdarSeed(capture) {
  const rows = requireRows(capture);
  const named = [];
  const gaps = [];
  const departments = [];

  for (const row of rows) {
    const fields = row?.fields || {};
    const projectName = text(fields["Project Name"]);
    const department = text(fields.Department);
    if (department) departments.push(department);
    if (projectName) {
      named.push({
        source_row_index: Number.isInteger(row.source_row_index) ? row.source_row_index : named.length,
        project_name: projectName,
        department: department || null
      });
    } else {
      gaps.push({
        source_row_index: Number.isInteger(row?.source_row_index) ? row.source_row_index : gaps.length,
        reason: "missing_project_name"
      });
    }
  }

  const projects = unique(named.map((project) => project.project_name)).map((projectName, index) => {
    const original = named.find((project) => project.project_name === projectName);
    return {
      project_key: `CAPTURE-PROJECT-${String(index + 1).padStart(2, "0")}`,
      ...original
    };
  });
  const observedDepartments = unique(departments);
  const raw = stable(capture);
  const aggregate = {
    rendered_rows: rows.length,
    named_projects: projects.length,
    source_gaps: gaps.length,
    observed_departments: observedDepartments.length
  };
  const manifestBase = {
    schema_version: "kamdar-private-seed-manifest@1.0.0",
    compiler: "scripts/compile_private_kamdar_seed.mjs",
    source_capture_sha256: digest(raw),
    input_schema_version: capture?.schema_version || null,
    aggregate
  };
  const publicManifest = {
    ...manifestBase,
    manifest_sha256: digest(stable(manifestBase))
  };
  const privateSeed = {
    schema_version: "kamdar-private-seed@1.0.0",
    source_capture_sha256: publicManifest.source_capture_sha256,
    public_manifest_sha256: publicManifest.manifest_sha256,
    aggregate,
    projects,
    source_gaps: gaps,
    departments: observedDepartments
  };
  return { privateSeed, publicManifest };
}

export function assertExpectedShape({ privateSeed, publicManifest }, shape = expected) {
  const actual = privateSeed.aggregate;
  const checks = [
    ["rows", actual.rendered_rows, shape.rows],
    ["projects", actual.named_projects, shape.projects],
    ["source gaps", actual.source_gaps, shape.sourceGaps],
    ["departments", actual.observed_departments, shape.departments]
  ];
  const mismatch = checks.find(([, value, required]) => value !== required);
  if (mismatch) throw new Error(`Private capture has ${mismatch[0]}=${mismatch[1]}; expected ${mismatch[2]}.`);
  if (privateSeed.source_capture_sha256 !== publicManifest.source_capture_sha256) throw new Error("Private seed and manifest source hashes diverged.");
  return true;
}

export function writePrivateSeed({ outputPath, privateSeed }) {
  if (!outputPath) throw new Error("--output is required; private seed paths must be explicit.");
  const target = resolve(outputPath);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  writeFileSync(target, stable(privateSeed), { mode: 0o600 });
  chmodSync(target, 0o600);
  return target;
}

export function writePublicManifest({ outputPath, publicManifest }) {
  if (!outputPath) throw new Error("--manifest is required when writing a public manifest.");
  const target = resolve(outputPath);
  mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
  writeFileSync(target, stable(publicManifest), { mode: 0o644 });
  return target;
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) throw new Error(`Unknown argument: ${token}`);
    const key = token.slice(2);
    if (!new Set(["input", "output", "manifest"]).has(key)) throw new Error(`Unknown option: --${key}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`--${key} needs a value.`);
    options[key] = value;
    index += 1;
  }
  if (!options.input || !options.output) throw new Error("Usage: node scripts/compile_private_kamdar_seed.mjs --input <capture.json> --output <private-seed.json> [--manifest <public-manifest.json>]");
  return options;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const capture = JSON.parse(readFileSync(resolve(options.input), "utf8"));
    const compiled = compilePrivateKamdarSeed(capture);
    assertExpectedShape(compiled);
    writePrivateSeed({ outputPath: options.output, privateSeed: compiled.privateSeed });
    if (options.manifest) writePublicManifest({ outputPath: options.manifest, publicManifest: compiled.publicManifest });
    process.stdout.write(`${JSON.stringify({
      output: resolve(options.output),
      aggregate: compiled.publicManifest.aggregate,
      source_capture_sha256: compiled.publicManifest.source_capture_sha256,
      manifest_written: Boolean(options.manifest)
    })}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
