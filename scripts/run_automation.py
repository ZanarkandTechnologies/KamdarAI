#!/usr/bin/env python3
"""Review or apply an immutable Company OS Stage 2 handoff."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from pathlib import Path

from schemas.automations.delivery import DeliveryPlan, stable_sha256
from scripts.automation_delivery import DeliveryError, apply_plan, render_plan
from scripts.automation_prepare import sha256


DEFAULT_PROFILE = Path.home() / ".hermes" / "profiles" / "vishan-kamdar-ai"


def _load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise DeliveryError(f"unreadable handoff artifact: {path.name}") from error
    if not isinstance(value, dict):
        raise DeliveryError(f"invalid handoff artifact: {path.name}")
    return value


def load_handoff(path: Path) -> tuple[dict, DeliveryPlan]:
    handoff_path = path.expanduser().resolve()
    handoff = _load_json(handoff_path)
    if handoff.get("schema_version") != "kamdar-automation-prepare-handoff@1.0.0":
        raise DeliveryError("unsupported prepare handoff")
    cadence_root = handoff_path.parent
    result = _load_json(cadence_root / "result.json")
    plan_path = cadence_root / "delivery-plan.json"
    plan_payload = _load_json(plan_path)
    plan = DeliveryPlan.model_validate_json(plan_path.read_text(encoding="utf-8"))
    if plan.cadence != handoff.get("cadence"):
        raise DeliveryError("handoff cadence does not match the delivery plan")
    if sha256(result) != handoff.get("result_sha256") or plan.result_sha256 != stable_sha256(result):
        raise DeliveryError("Stage 1 result changed after the handoff was prepared")
    if stable_sha256(plan_payload) != handoff.get("delivery_plan_sha256"):
        raise DeliveryError("delivery plan changed after the handoff was prepared")
    feature_states = handoff.get("feature_states") or {}
    if any(state in {"fail", "needs_information"} for state in feature_states.values()):
        raise DeliveryError("Stage 1 is not pass-ready; downstream delivery is blocked")
    return handoff, plan


def _write_receipt(path: Path, payload: dict) -> None:
    descriptor, temporary = tempfile.mkstemp(prefix=".delivery-receipt-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(payload, stream, indent=2, ensure_ascii=False, sort_keys=True)
            stream.write("\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def operate(args: argparse.Namespace) -> int:
    handoff, plan = load_handoff(args.handoff)
    print(render_plan(plan))
    if args.command == "review":
        return 0 if not plan.blocked_actions else 1
    if not args.apply:
        print("\nNo downstream actions were applied. Rerun with --apply after reviewing this plan.")
        return 1
    if handoff.get("delivery_status") not in {"ready", "not_requested"}:
        raise DeliveryError(f"handoff delivery is {handoff.get('delivery_status', 'blocked')}")
    profile = args.profile_home.expanduser().resolve()
    workspace = args.workspace.expanduser().resolve() if args.workspace else profile / "workspace" / ".hermes.md"
    receipt = apply_plan(plan, profile_home=profile, workspace=workspace)
    receipt_path = args.handoff.expanduser().resolve().parent / "delivery-receipt.json"
    _write_receipt(receipt_path, receipt.model_dump(mode="json"))
    print("\nStage 2 result")
    for row in receipt.actions:
        print(f"{row.provider.value:20} {row.operation.value:28} {row.state}")
    print(f"\nStatus: {receipt.status}")
    print(f"Redacted receipt: {receipt_path}")
    return 0 if receipt.status in {"not_requested", "applied"} else 2


def parser() -> argparse.ArgumentParser:
    command = argparse.ArgumentParser(description=__doc__)
    subcommands = command.add_subparsers(dest="command", required=True)
    for name in ("review", "deliver"):
        selected = subcommands.add_parser(name)
        selected.add_argument("--handoff", type=Path, required=True)
        selected.add_argument("--profile-home", type=Path, default=DEFAULT_PROFILE)
        selected.add_argument("--workspace", type=Path)
        if name == "deliver":
            selected.add_argument("--apply", action="store_true")
    return command


def main(argv: list[str] | None = None) -> int:
    try:
        return operate(parser().parse_args(argv))
    except DeliveryError as error:
        print(json.dumps({"status": "blocked", "reason": str(error)}, sort_keys=True))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
