import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import test from "node:test";
import {
  buildReadOnlyPreflight,
  redact,
  sha256,
  validateProviderReceipt,
  v4Namespace
} from "../scripts/live-kamdar-poc.mjs";

function fixtureRoot(t) {
  const root = mkdtempSync(resolve(tmpdir(), "kamdar-live-edge-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value)}\n`);
}

function readyProfile(root) {
  writeJson(resolve(root, "runtime-showcase/kamdar-ai-eval-demo-v4/state.json"), { version: 4, namespace: v4Namespace });
  writeJson(resolve(root, "google_token.json"), {
    scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/gmail.send"],
    expiry: "2030-01-01T00:00:00.000Z"
  });
  writeJson(resolve(root, "channel_directory.json"), { platforms: { telegram: [{ label: "private-eval-route" }] } });
  writeJson(resolve(root, "gateway_state.json"), { platforms: { telegram: { state: "configured" } } });
  writeJson(resolve(root, "kamdar-eval-routes.json"), {
    version: 1,
    namespace: "kamdar-eval-v4",
    routes: [
      { key: "drive:kamdar-eval-v4", provider: "drive", recipient_hash: "a".repeat(64) },
      { key: "email:PERSON-AISHA", provider: "email", recipient_hash: "b".repeat(64) },
      { key: "telegram:owner", provider: "telegram", recipient_hash: "c".repeat(64) }
    ]
  });
}

function plannedCalls() {
  return {
    tools: {
      calls: [
        { feature_id: "FEAT-0005", adapter: "drive", operation: "publish_company_report", args: { action_key: "drive:week-34", artifact_path: "weekly/company.md" } },
        { feature_id: "FEAT-0003", adapter: "email", operation: "send_owner_followup", args: { action_key: "email:work-101", person_id: "PERSON-AISHA", artifact_path: "daily/followup.md" } },
        { feature_id: "FEAT-0008", adapter: "telegram", operation: "send_executive_summary", args: { action_key: "telegram:week-34", artifact_path: "weekly/telegram.md" } }
      ]
    }
  };
}

test("read-only preflight proves the v4 boundary, hashes artifacts, and never exposes routes", (t) => {
  const profile = fixtureRoot(t);
  const output = fixtureRoot(t);
  readyProfile(profile);
  for (const [path, content] of Object.entries({ "weekly/company.md": "# Company report", "daily/followup.md": "# Follow-up", "weekly/telegram.md": "# Summary" })) {
    const target = resolve(output, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  const result = buildReadOnlyPreflight({ planned: plannedCalls(), output, profile, now: new Date("2026-08-21T00:00:00.000Z") });
  assert.equal(result.mode, "read-only-preflight");
  assert.equal(result.applies_provider_writes, false);
  assert.equal(result.boundary.status, "ready");
  assert.equal(result.actions.every((action) => action.status === "ready"), true);
  assert.equal(result.actions[0].payload_hash, sha256("# Company report"));
  assert.equal(JSON.stringify(result).includes("@"), false);
  assert.equal(JSON.stringify(result).includes("private-eval-route"), false);
});

test("receipt validation requires exact payload, route, and idempotency while returning a redacted display receipt", (t) => {
  const profile = fixtureRoot(t);
  const output = fixtureRoot(t);
  readyProfile(profile);
  const target = resolve(output, "weekly/telegram.md");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, "# Summary");
  const preflight = buildReadOnlyPreflight({ planned: plannedCalls(), output, profile, now: new Date("2026-08-21T00:00:00.000Z") }).actions[2];
  const receipt = validateProviderReceipt({
    preflight,
    receipt: {
      feature_id: preflight.feature_id,
      adapter: preflight.adapter,
      operation: preflight.operation,
      action_key: preflight.action_key,
      status: "sent",
      provider_id: "message-42",
      recorded_at: "2026-08-21T10:00:00.000Z",
      route_key: preflight.route_key,
      payload_hash: preflight.payload_hash,
      idempotency_key: preflight.action_key,
      result_url: "https://example.test/message/42",
      detail: "Sent through the allowlisted Demo Owner route."
    }
  });
  assert.equal(receipt.valid, true);
  assert.equal(receipt.receipt.provider_id_present, true);
  assert.equal(receipt.receipt.detail, "Sent through the allowlisted Demo Owner route.");
  assert.equal(redact("Sent to demo.owner@example.test"), "Sent to [REDACTED_EMAIL]");
  assert.equal(validateProviderReceipt({ preflight, receipt: { ...receipt.receipt, feature_id: preflight.feature_id, adapter: preflight.adapter, operation: preflight.operation, action_key: preflight.action_key, provider_id: "message-42", route_key: preflight.route_key, payload_hash: "wrong", idempotency_key: preflight.action_key } }).reason, "receipt_route_payload_or_idempotency_mismatch");
});

test("the CLI cannot apply or send providers on its default or explicit apply path", () => {
  const script = resolve(import.meta.dirname, "../scripts/live-kamdar-poc.mjs");
  const defaultRun = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(defaultRun.status, 0);
  assert.equal(JSON.parse(defaultRun.stdout).status, "not_run");
  const applyRun = spawnSync(process.execPath, [script, "--apply"], { encoding: "utf8" });
  assert.equal(applyRun.status, 2);
  assert.equal(JSON.parse(applyRun.stderr).reason.includes("provider_apply_not_implemented"), true);
});
