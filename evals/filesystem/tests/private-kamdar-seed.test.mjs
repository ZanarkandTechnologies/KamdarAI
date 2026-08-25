import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";

import {
  assertExpectedShape,
  compilePrivateKamdarSeed,
  writePrivateSeed,
  writePublicManifest
} from "../../../scripts/compile_private_kamdar_seed.mjs";

function representativeCapture() {
  const departments = ["Marketing", "Merchandising", "CMT", "Ecommerce", "Property", "DTC", "Content"];
  const rows = Array.from({ length: 49 }, (_, index) => ({
    source_row_index: index,
    fields: {
      "Project Name": index < 39 ? `Private Project ${String(index + 1).padStart(2, "0")}` : "",
      Department: departments[index % departments.length]
    }
  }));
  return { schema_version: "0.1.0", table: { rows } };
}

test("private capture compiler is deterministic, aggregate-only in its manifest, and writes a 0600 private seed", (t) => {
  const capture = representativeCapture();
  const first = compilePrivateKamdarSeed(capture);
  const second = compilePrivateKamdarSeed(capture);
  assert.deepEqual(first, second);
  assertExpectedShape(first);
  assert.equal(first.privateSeed.projects.length, 39);
  assert.equal(first.privateSeed.source_gaps.length, 10);
  assert.equal(first.privateSeed.departments.length, 7);
  const manifestText = JSON.stringify(first.publicManifest);
  assert.doesNotMatch(manifestText, /Private Project|Marketing|Content/);

  const root = mkdtempSync(resolve(tmpdir(), "kamdar-private-seed-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const seedPath = writePrivateSeed({ outputPath: resolve(root, "seed.json"), privateSeed: first.privateSeed });
  const manifestPath = writePublicManifest({ outputPath: resolve(root, "manifest.json"), publicManifest: first.publicManifest });
  assert.equal(statSync(seedPath).mode & 0o777, 0o600);
  assert.equal(statSync(manifestPath).mode & 0o777, 0o644);
  assert.match(readFileSync(seedPath, "utf8"), /Private Project 01/);
});

test("private capture compiler refuses an unexpected current-shape input", () => {
  const capture = representativeCapture();
  capture.table.rows.pop();
  assert.throws(() => assertExpectedShape(compilePrivateKamdarSeed(capture)), /rows=48/);
});
