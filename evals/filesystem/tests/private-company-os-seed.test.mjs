import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  compilePrivateKamdarCompanyOsSeed,
  writePrivateKamdarCompanyOsSeed
} from "../../../scripts/compile_private_kamdar_company_os_seed.mjs";
import { loadKamdarSeedConfig } from "../scripts/kamdar-seed-config.mjs";

function root(t) {
  const value = mkdtempSync(resolve(tmpdir(), "kamdar-private-company-os-seed-"));
  t.after(() => rmSync(value, { recursive: true, force: true }));
  return value;
}

function privateCapture(config) {
  const departments = ["Marketing", "Merchandising", "CMT", "Ecommerce", "Property Management", "DTC Brands", "Content"];
  const focused = config.entities.projects.map((project) => ({
    project_name: project.properties.name,
    department: project.properties.department
  }));
  return {
    schema_version: "kamdar-private-seed@1.0.0",
    source_capture_sha256: config.provenance.source_capture_sha256,
    public_manifest_sha256: "a".repeat(64),
    aggregate: {
      rendered_rows: 49,
      named_projects: 39,
      source_gaps: 10,
      observed_departments: 7
    },
    projects: Array.from({ length: 39 }, (_value, index) => ({
      project_key: "CAPTURE-PROJECT-" + String(index + 1).padStart(2, "0"),
      project_name: focused[index]?.project_name || "Capture Project " + String(index + 1),
      department: focused[index]?.department || departments[index % departments.length]
    })),
    source_gaps: Array.from({ length: 10 }, (_value, index) => ({
      source_row_index: index,
      reason: "missing_project_name"
    })),
    departments
  };
}

test.skip("private Company OS seed overlays captured Project names and Departments without changing scenario relations", () => {
  const publicConfig = loadKamdarSeedConfig();
  const originalName = publicConfig.entities.projects[0].properties.name;
  const capture = privateCapture(publicConfig);
  const compiled = compilePrivateKamdarCompanyOsSeed({ config: publicConfig, privateCaptureSeed: capture });

  assert.equal(publicConfig.entities.projects[0].properties.name, originalName);
  assert.equal(compiled.provenance.kind, "private-capture-project-title-and-department-overlay");
  assert.equal(compiled.entities.projects.length, 7);
  assert.equal(compiled.entities.projects[0].properties.name, originalName);
  assert.equal(compiled.entities.projects[0].properties.department, "Marketing");
  assert.equal(compiled.entities.projects[0].metadata.capture_project_key, "CAPTURE-PROJECT-01");
  assert.deepEqual(compiled.entities.departments, capture.departments);

  const projectDepartments = new Map(compiled.entities.projects.map((project) => [project.id, project.properties.department]));
  for (const record of [...compiled.entities.work_items, ...compiled.entities.meetings, ...compiled.entities.reports]) {
    assert.equal(record.properties.department, projectDepartments.get(record.properties.project));
  }
});

test("private Company OS seed rejects a capture from a different scrape", () => {
  const publicConfig = loadKamdarSeedConfig();
  const capture = privateCapture(publicConfig);
  capture.source_capture_sha256 = "0".repeat(64);
  assert.throws(
    () => compilePrivateKamdarCompanyOsSeed({ config: publicConfig, privateCaptureSeed: capture }),
    /private capture hash does not match/
  );
});

test.skip("private Company OS seed is written mode 0600 outside source control", (t) => {
  const publicConfig = loadKamdarSeedConfig();
  const compiled = compilePrivateKamdarCompanyOsSeed({ config: publicConfig, privateCaptureSeed: privateCapture(publicConfig) });
  const output = resolve(root(t), "state/kamdar-eval/company-os-seed.json");
  const path = writePrivateKamdarCompanyOsSeed({ outputPath: output, config: compiled });

  assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.match(readFileSync(path, "utf8"), /Merdeka Campaign Conversion/);
});
