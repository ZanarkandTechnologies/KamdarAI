#!/usr/bin/env node
/**
 * Read-only integration preflight for the isolated Kamdar v4 showcase.
 *
 * This module deliberately has no provider apply/send implementation. It
 * derives expected delivery inputs from the frozen plan, checks only local
 * profile metadata, and validates a later private receipt before the showcase
 * may render it as provider evidence.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { loadFrozenSnapshot, runTemplateFirstProof } from "./template-first-kamdar.mjs";

const filesystemRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const outputRoot = resolve(filesystemRoot, "runs/kamdar-template-first-latest");
export const profileRoot = "/Users/kenjipcx/.hermes/profiles/vishan-kamdar-ai";
export const v4StateRoot = resolve(profileRoot, "runtime-showcase/kamdar-ai-eval-demo-v4");
export const v4StatePath = resolve(v4StateRoot, "state.json");
export const v4Namespace = "Kamdar AI · Eval Demo";
const routeRegistryFilename = "kamdar-eval-routes.json";
const providerAdapters = new Set(["drive", "email", "telegram"]);
const supportedReceiptStates = new Set(["observed", "applied", "sent", "blocked"]);
const successReceiptStates = new Set(["observed", "applied", "sent"]);

export function redact(value) {
  return String(value || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/(?:token|secret|authorization|cookie|refresh_token|client_secret)\s*[=:]\s*[^\s,}]+/gi, "$1=[REDACTED]")
    .replace(/\b\d{8,}:[A-Za-z0-9_-]{20,}\b/g, "[REDACTED_TELEGRAM_TOKEN]");
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function safeJson(path) {
  try {
    return { value: JSON.parse(readFileSync(path, "utf8")), error: null };
  } catch {
    return { value: null, error: "invalid_json" };
  }
}

function hasScope(scopes, expected) {
  return scopes.some((scope) => scope === expected || scope.endsWith(`/${expected}`));
}

function commandAvailable(command) {
  return Boolean(process.env.PATH?.split(":").some((entry) => existsSync(resolve(entry, command))));
}

function jsonStatus(path) {
  if (!existsSync(path)) return { present: false, value: null, error: "missing" };
  const parsed = safeJson(path);
  return { present: true, value: parsed.value, error: parsed.error };
}

function normalizeRoutes(value) {
  if (!value || value.version !== 1 || value.namespace !== "kamdar-eval-v4" || !Array.isArray(value.routes)) {
    return { valid: false, routes: new Map(), reason: "route_registry_invalid" };
  }
  const routes = new Map();
  for (const route of value.routes) {
    if (!route || typeof route !== "object" || !providerAdapters.has(route.provider) || typeof route.key !== "string" || !/^[a-z0-9:-]+$/i.test(route.key) || !/^[a-f0-9]{64}$/i.test(route.recipient_hash || "")) {
      return { valid: false, routes: new Map(), reason: "route_registry_invalid" };
    }
    // The registry is intentionally hashes-and-keys only. It must never carry
    // an address, chat ID, OAuth secret, or a raw recipient value.
    const serialized = JSON.stringify(route);
    if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized) || /"(?:email|recipient|recipient_id|chat_id|access_token|refresh_token|client_secret)"\s*:/i.test(serialized)) {
      return { valid: false, routes: new Map(), reason: "route_registry_contains_private_value" };
    }
    if (routes.has(route.key)) return { valid: false, routes: new Map(), reason: "route_registry_duplicate_key" };
    routes.set(route.key, { key: route.key, provider: route.provider, recipient_hash: route.recipient_hash.toLowerCase() });
  }
  return { valid: true, routes, reason: null };
}

/** Read profile metadata only; it never invokes a provider CLI or API. */
export function inspectProfileReadiness({
  profile = profileRoot,
  commandExists = commandAvailable,
  now = new Date()
} = {}) {
  const token = jsonStatus(resolve(profile, "google_token.json"));
  const tokenScopes = token.value && Array.isArray(token.value.scopes) ? token.value.scopes.map(String) : [];
  const expiry = token.value?.expiry ? new Date(token.value.expiry) : null;
  const unexpired = Boolean(expiry && !Number.isNaN(expiry.getTime()) && expiry.getTime() > now.getTime());
  const googleChecks = {
    cli_available: commandExists("gws"),
    credential_present: token.present && !token.error,
    credential_unexpired: unexpired,
    drive_scope: hasScope(tokenScopes, "drive"),
    gmail_send_scope: hasScope(tokenScopes, "gmail.send")
  };
  const googleReady = Object.values(googleChecks).every(Boolean);

  const channelDirectory = jsonStatus(resolve(profile, "channel_directory.json"));
  const gateway = jsonStatus(resolve(profile, "gateway_state.json"));
  const telegramEntries = Array.isArray(channelDirectory.value?.platforms?.telegram) ? channelDirectory.value.platforms.telegram : [];
  const telegramGateway = gateway.value?.platforms?.telegram;
  const telegramChecks = {
    channel_directory_present: channelDirectory.present && !channelDirectory.error && telegramEntries.length > 0,
    gateway_metadata_present: Boolean(telegramGateway && typeof telegramGateway.state === "string")
  };

  const routeRegistry = jsonStatus(resolve(profile, routeRegistryFilename));
  const routes = routeRegistry.present ? normalizeRoutes(routeRegistry.value) : { valid: false, routes: new Map(), reason: "route_registry_missing" };
  return {
    profile_present: existsSync(profile),
    google: { status: googleReady ? "ready" : "blocked", checks: googleChecks },
    telegram: { status: Object.values(telegramChecks).every(Boolean) ? "ready" : "blocked", checks: telegramChecks },
    routes: { status: routes.valid ? "ready" : "blocked", reason: routes.reason || routeRegistry.error || "route_registry_missing", values: routes.routes }
  };
}

export function readV4Boundary({ statePath = v4StatePath } = {}) {
  const state = jsonStatus(statePath);
  const valid = Boolean(state.value && state.value.version === 4 && state.value.namespace === v4Namespace);
  return {
    status: valid ? "ready" : "blocked",
    version: valid ? 4 : null,
    reason: valid ? null : (state.error || "not_v4_namespace")
  };
}

function safeArtifactPath(root, artifactPath) {
  if (typeof artifactPath !== "string" || !artifactPath) return null;
  const candidate = resolve(root, artifactPath);
  return candidate.startsWith(`${resolve(root)}${sep}`) ? candidate : null;
}

export function expectedRouteKey(call) {
  if (typeof call?.args?.route_key === "string" && call.args.route_key) return call.args.route_key;
  if (call?.adapter === "email" || call?.adapter === "telegram") return `${call.adapter}:${call.args?.person_id || "owner"}`;
  if (call?.adapter === "drive" && /publish/i.test(call.operation || "")) return "drive:kamdar-eval-v4";
  return null;
}

function artifactReadiness(call, root) {
  const path = safeArtifactPath(root, call.args?.artifact_path);
  if (!call.args?.artifact_path) return { status: "not_required", path: null, payload_hash: null };
  if (!path || !existsSync(path)) return { status: "blocked", path: null, payload_hash: null, reason: "artifact_missing_or_outside_run" };
  return { status: "ready", path: call.args.artifact_path, payload_hash: sha256(readFileSync(path, "utf8")) };
}

function providerReady(call, profile) {
  if (call.adapter === "drive" || call.adapter === "email") return profile.google.status === "ready";
  if (call.adapter === "telegram") return profile.telegram.status === "ready";
  return false;
}

/**
 * Derive non-mutating preflight rows from frozen planned calls. A ready row is
 * a permission to request operated-send approval later, never a send claim.
 */
export function buildReadOnlyPreflight({ planned, output = outputRoot, profile = profileRoot, now } = {}) {
  if (!planned?.tools?.calls) throw new Error("A frozen planned result is required for provider preflight.");
  const boundary = readV4Boundary({ statePath: resolve(profile, "runtime-showcase/kamdar-ai-eval-demo-v4/state.json") });
  const readiness = inspectProfileReadiness({ profile, now });
  const calls = planned.tools.calls.filter((call) => providerAdapters.has(call.adapter));
  const actions = calls.map((call) => {
    const artifact = artifactReadiness(call, output);
    const route_key = expectedRouteKey(call);
    const requiresActionKey = Boolean(call.args?.artifact_path || /send|publish/i.test(call.operation || ""));
    const route = route_key ? readiness.routes.values.get(route_key) : null;
    const reasons = [];
    if (boundary.status !== "ready") reasons.push("v4_boundary_not_ready");
    if (!providerReady(call, readiness)) reasons.push(`${call.adapter}_provider_not_ready`);
    if (artifact.status === "blocked") reasons.push(artifact.reason);
    if (requiresActionKey && !call.args?.action_key) reasons.push("action_key_missing");
    if (route_key && (!route || route.provider !== call.adapter)) reasons.push("allowlisted_route_missing");
    return {
      feature_id: call.feature_id,
      adapter: call.adapter,
      operation: call.operation,
      action_key: call.args?.action_key || null,
      route_key,
      route_hash_present: Boolean(route?.recipient_hash),
      artifact_path: artifact.path,
      payload_hash: artifact.payload_hash,
      status: reasons.length ? "blocked" : "ready",
      reasons
    };
  });
  return {
    mode: "read-only-preflight",
    applies_provider_writes: false,
    boundary,
    providers: {
      google: readiness.google,
      telegram: readiness.telegram,
      private_allowlist: { status: readiness.routes.status, reason: readiness.routes.reason }
    },
    actions
  };
}

function hasRawPrivateValue(value) {
  const serialized = JSON.stringify(value || {});
  return /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(serialized) || /"(?:email|recipient|recipient_id|chat_id|access_token|refresh_token|client_secret)"\s*:/i.test(serialized);
}

function receiptStatusFitsOperation(receipt) {
  if (/^send_/.test(receipt.operation || "")) return receipt.status === "sent";
  if (/^publish_/.test(receipt.operation || "")) return receipt.status === "applied";
  if (/^list_/.test(receipt.operation || "")) return receipt.status === "observed";
  return successReceiptStates.has(receipt.status);
}

/**
 * Validate a private operated receipt against one preflight row. The returned
 * object is display-safe: IDs and routes are represented only by presence or
 * hashes. Validation alone performs no provider operation.
 */
export function validateProviderReceipt({ preflight, receipt } = {}) {
  if (!preflight || !receipt) return { valid: false, reason: "receipt_or_preflight_missing" };
  if (!supportedReceiptStates.has(receipt.status)) return { valid: false, reason: "receipt_status_invalid" };
  for (const key of ["feature_id", "adapter", "operation"]) {
    if (receipt[key] !== preflight[key]) return { valid: false, reason: `receipt_${key}_mismatch` };
  }
  if ((receipt.action_key || null) !== (preflight.action_key || null)) return { valid: false, reason: "receipt_action_key_mismatch" };
  if (receipt.status === "blocked") return { valid: !hasRawPrivateValue(receipt), reason: receipt.reason || "provider_blocked", receipt: { status: "blocked", detail: redact(receipt.detail || "Provider preflight remained blocked.") } };
  if (preflight.status !== "ready") return { valid: false, reason: "receipt_claimed_success_without_ready_preflight" };
  if (!receiptStatusFitsOperation(receipt)) return { valid: false, reason: "receipt_status_does_not_match_operation" };
  if (!receipt.provider_id || !receipt.recorded_at || Number.isNaN(new Date(receipt.recorded_at).getTime())) return { valid: false, reason: "receipt_provider_metadata_missing" };
  if (receipt.route_key !== preflight.route_key || receipt.payload_hash !== preflight.payload_hash || receipt.idempotency_key !== preflight.action_key) return { valid: false, reason: "receipt_route_payload_or_idempotency_mismatch" };
  if (receipt.result_url && !/^https:\/\//.test(receipt.result_url)) return { valid: false, reason: "receipt_result_url_invalid" };
  if (hasRawPrivateValue(receipt)) return { valid: false, reason: "receipt_contains_private_value" };
  return {
    valid: true,
    reason: null,
    receipt: {
      status: receipt.status,
      recorded_at: receipt.recorded_at,
      provider_id_present: true,
      result_url: receipt.result_url || null,
      payload_hash: receipt.payload_hash,
      route_key: receipt.route_key,
      idempotency_key: receipt.idempotency_key,
      detail: redact(receipt.detail || "Provider receipt validated.")
    }
  };
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--apply") || argv.includes("--send")) {
    console.error(JSON.stringify({ mode: "read-only-preflight", status: "blocked", reason: "provider_apply_not_implemented; operated-send requires separate explicit approval and a private edge" }));
    process.exitCode = 2;
    return;
  }
  if (!argv.includes("--preflight")) {
    console.log(JSON.stringify({ mode: "read-only-preflight", status: "not_run", usage: "node scripts/live-kamdar-poc.mjs --preflight", applies_provider_writes: false }));
    return;
  }
  // The frozen planner writes ignored local eval evidence only; no provider
  // client, Notion API, or Hermes send command is invoked here.
  try {
    const planned = runTemplateFirstProof({ outputRoot, mode: "frozen-mock", reset: true });
    const result = buildReadOnlyPreflight({ planned, output: outputRoot });
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ mode: "read-only-preflight", status: "blocked", reason: "frozen_plan_unavailable", detail: redact(error.message) }));
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();

export { loadFrozenSnapshot };
