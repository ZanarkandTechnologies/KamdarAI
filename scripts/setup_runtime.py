"""Profile operations used by the customer-facing setup wizard.

This module owns filesystem writes, Hermes configuration commands, secret
storage, and verification receipts. It has no interactive prompts, which keeps
the operations deterministic and independently testable.
"""

from __future__ import annotations

import hashlib
import json
import importlib.util
import ipaddress
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Callable


PROFILE_NAME = "kamdar-ai"
NOTION_MCP_URL = "https://mcp.notion.com/mcp"
WEBHOOK_PATH = "/notion/webhook"
WEBHOOK_HEALTH_PATH = "/notion/health"
TUNNEL_TOKEN_RELATIVE = Path("secrets/cloudflare-tunnel-token")
RECEIPT_DIRECTORY = Path("receipts")
MESSAGING_TEST_RECEIPT = Path("state/messaging-setup/latest.json")
EXPECTED_CRON_NAMES = {
    "Company OS Daily Operating Update",
    "Company OS Weekly Operating Review",
}
MODEL_SECRET_NAMES = {
    "OPENROUTER_API_KEY",
    "ANTHROPIC_API_KEY",
    "OPENAI_API_KEY",
    "NOUS_API_KEY",
    "XAI_API_KEY",
    "GEMINI_API_KEY",
    "MISTRAL_API_KEY",
}


class RuntimeSetupError(Exception):
    """A redacted, operator-actionable runtime setup failure."""


def profile_environment(profile_home: Path) -> dict[str, str]:
    environment = os.environ.copy()
    environment["HERMES_HOME"] = str(profile_home)
    environment.pop("HERMES_PROFILE", None)
    return environment


def run_command(
    arguments: list[str],
    profile_home: Path,
    *,
    input_text: str | None = None,
    check: bool = True,
    timeout: int = 180,
) -> subprocess.CompletedProcess[str]:
    """Run a command in one profile and return only redacted failure details."""
    try:
        result = subprocess.run(
            arguments,
            input=input_text,
            text=True,
            capture_output=True,
            check=False,
            timeout=timeout,
            env=profile_environment(profile_home),
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise RuntimeSetupError(f"command_unavailable:{Path(arguments[0]).name}") from error
    if check and result.returncode:
        detail = (result.stderr or result.stdout).strip().splitlines()
        message = detail[-1] if detail else f"exit_{result.returncode}"
        raise RuntimeSetupError(f"{Path(arguments[0]).name}_failed:{message}")
    return result


def root_home_for_profile(profile_home: Path) -> Path:
    resolved = profile_home.expanduser().resolve()
    if resolved.parent.name == "profiles":
        return resolved.parent.parent
    return resolved


def default_profile_home() -> Path:
    explicit = os.environ.get("KAMDAR_PROFILE_HOME", "").strip()
    if explicit:
        return Path(explicit).expanduser().resolve()
    root = Path(os.environ.get("HERMES_HOME", Path.home() / ".hermes")).expanduser()
    if root.parent.name == "profiles" or root.name == PROFILE_NAME:
        return root.resolve()
    return (root / "profiles" / PROFILE_NAME).resolve()


def install_or_update_distribution(source: Path, profile_home: Path) -> str:
    """Use Hermes' native profile commands to install or update the source."""
    source = source.resolve()
    profile_home = profile_home.resolve()
    root_home = root_home_for_profile(profile_home)
    if (profile_home / "distribution.yaml").is_file():
        run_command(
            ["hermes", "profile", "update", PROFILE_NAME, "--yes"],
            root_home,
        )
        return "updated"
    run_command(
        [
            "hermes", "profile", "install", str(source),
            "--name", PROFILE_NAME, "--yes",
        ],
        root_home,
    )
    if not (profile_home / "distribution.yaml").is_file():
        raise RuntimeSetupError("profile_install_did_not_create_distribution")
    return "installed"


def save_profile_secret(profile_home: Path, key: str, value: str) -> None:
    """Use Hermes' credential writer without exposing the value in argv."""
    if not re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
        raise RuntimeSetupError("invalid_secret_name")
    if not value.strip():
        raise RuntimeSetupError(f"empty_secret:{key}")
    program = (
        "import json,sys; "
        "from hermes_cli.config import save_env_value_secure; "
        "payload=json.load(sys.stdin); "
        "save_env_value_secure(payload['key'], payload['value'])"
    )
    run_command(
        [str(hermes_python(profile_home)), "-c", program],
        profile_home,
        input_text=json.dumps({"key": key, "value": value}),
    )


def hermes_python(profile_home: Path) -> Path:
    """Resolve the interpreter bundled with Hermes, never an arbitrary Python."""
    explicit = os.environ.get("HERMES_PYTHON", "").strip()
    root_home = root_home_for_profile(profile_home)
    candidates = [
        Path(explicit).expanduser() if explicit else None,
        Path("/opt/hermes/.venv/bin/python"),
        root_home / "hermes-agent" / "venv" / "bin" / "python",
        root_home / "hermes-agent" / "venv" / "Scripts" / "python.exe",
        Path.home() / ".hermes" / "hermes-agent" / "venv" / "bin" / "python",
        Path.home() / ".hermes" / "hermes-agent" / "venv" / "Scripts" / "python.exe",
    ]
    if importlib.util.find_spec("hermes_cli") is not None:
        candidates.insert(0, Path(sys.executable))
    for candidate in candidates:
        if candidate and candidate.is_file():
            # Preserve a venv's `bin/python` symlink. Resolving it to the base
            # interpreter drops pyvenv.cfg discovery and therefore Hermes.
            return candidate.expanduser().absolute()
    hermes = shutil.which("hermes")
    if hermes:
        launcher = Path(hermes).resolve()
        for parent in launcher.parents:
            for relative in (Path("venv/bin/python"), Path("venv/Scripts/python.exe")):
                candidate = parent / relative
                if candidate.is_file():
                    return candidate.absolute()
    raise RuntimeSetupError("hermes_python_not_found")


def save_tunnel_token(profile_home: Path, token: str) -> Path:
    """Persist the tunnel-scoped credential as an owner-only profile file."""
    cleaned = token.strip()
    if not cleaned:
        raise RuntimeSetupError("empty_tunnel_token")
    destination = profile_home / TUNNEL_TOKEN_RELATIVE
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(
        prefix=".cloudflare-token-", dir=destination.parent
    )
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            stream.write(cleaned)
            stream.write("\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return destination


def configured_secret_names(profile_home: Path) -> set[str]:
    """Read credential names without returning or logging their values."""
    path = profile_home / ".env"
    try:
        lines = path.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    except OSError:
        return set()
    names: set[str] = set()
    for line in lines:
        match = re.match(r"^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=", line)
        if match:
            names.add(match.group(1))
    return names


def read_profile_secret(profile_home: Path, key: str) -> str | None:
    """Read one named profile secret for an authorized local API call."""
    if not re.fullmatch(r"[A-Z][A-Z0-9_]*", key):
        raise RuntimeSetupError("invalid_secret_name")
    program = (
        "import json,sys; "
        "from hermes_cli.config import get_env_value; "
        "value=get_env_value(json.load(sys.stdin)['key']); "
        "print(json.dumps({'value': value}))"
    )
    result = run_command(
        [str(hermes_python(profile_home)), "-c", program],
        profile_home,
        input_text=json.dumps({"key": key}),
    )
    try:
        value = json.loads(result.stdout).get("value")
    except (AttributeError, json.JSONDecodeError) as error:
        raise RuntimeSetupError("secret_read_failed") from error
    return value if isinstance(value, str) and value else None


def configure_notion_mcp(profile_home: Path) -> None:
    """Register Notion's hosted MCP through Hermes-owned configuration."""
    values = {
        "mcp_servers.notion.url": NOTION_MCP_URL,
        "mcp_servers.notion.auth": "oauth",
        "mcp_servers.notion.enabled": "true",
    }
    for key, value in values.items():
        run_command(
            ["hermes", "config", "set", "--force", key, value],
            profile_home,
        )


def install_catalog_mcp(profile_home: Path, name: str) -> None:
    """Install one Nous-approved MCP through Hermes' catalog owner."""
    if not re.fullmatch(r"[a-z][a-z0-9_-]*", name):
        raise RuntimeSetupError("invalid_mcp_catalog_name")
    run_command(["hermes", "mcp", "install", name], profile_home)


def configure_remote_mcp(profile_home: Path, name: str, url: str) -> None:
    """Register one already-provisioned hosted MCP without exposing its URL."""
    if not re.fullmatch(r"[a-z][a-z0-9_-]*", name):
        raise RuntimeSetupError("invalid_remote_mcp_name")
    if not url.startswith("https://"):
        raise RuntimeSetupError("invalid_remote_mcp_url")
    program = (
        "import json,sys; "
        "from hermes_cli.config import set_config_value; "
        "payload=json.load(sys.stdin); "
        "set_config_value(payload['url_key'], payload['url'], force=True); "
        "set_config_value(payload['enabled_key'], 'true', force=True)"
    )
    run_command(
        [str(hermes_python(profile_home)), "-c", program],
        profile_home,
        input_text=json.dumps(
            {
                "url_key": f"mcp_servers.{name}.url",
                "url": url,
                "enabled_key": f"mcp_servers.{name}.enabled",
            }
        ),
    )


def configure_notion_webhook(profile_home: Path, public_url: str) -> None:
    """Bind the private adapter to a validated public HTTPS endpoint."""
    endpoint = normalize_webhook_url(public_url)
    save_profile_secret(profile_home, "NOTION_WEBHOOK_PUBLIC_URL", endpoint)
    values = {
        "platforms.notion.enabled": "true",
        "platforms.notion.extra.host": "0.0.0.0",
        "platforms.notion.extra.port": "8645",
        "platforms.notion.extra.path": WEBHOOK_PATH,
    }
    for key, value in values.items():
        run_command(
            ["hermes", "config", "set", "--force", key, value],
            profile_home,
        )


def normalize_webhook_url(public_url: str) -> str:
    """Accept only stable public HTTPS hostnames and the canonical path."""
    raw = public_url.strip()
    try:
        parsed = urllib.parse.urlsplit(raw)
        port = parsed.port
    except ValueError as error:
        raise RuntimeSetupError("webhook_url_invalid") from error
    hostname = (parsed.hostname or "").lower().rstrip(".")
    if parsed.scheme.lower() != "https" or not hostname:
        raise RuntimeSetupError("webhook_url_must_be_public_https")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise RuntimeSetupError("webhook_url_must_be_origin_or_canonical_path")
    if port not in (None, 443):
        raise RuntimeSetupError("webhook_url_must_use_standard_https")
    if (
        hostname == "localhost"
        or hostname.endswith(".localhost")
        or hostname.endswith(".local")
        or hostname == "trycloudflare.com"
        or hostname.endswith(".trycloudflare.com")
    ):
        raise RuntimeSetupError("webhook_url_requires_stable_public_hostname")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        address = None
    if address is not None and not address.is_global:
        raise RuntimeSetupError("webhook_url_requires_stable_public_hostname")
    path = parsed.path.rstrip("/")
    if path not in ("", WEBHOOK_PATH):
        raise RuntimeSetupError("webhook_url_path_must_be_notion_webhook")
    return f"https://{parsed.netloc.lower()}{WEBHOOK_PATH}"


def _profile_env_value(profile_home: Path, key: str) -> str:
    """Read one named profile value without exposing unrelated credentials."""
    try:
        lines = (profile_home / ".env").read_text(
            encoding="utf-8-sig", errors="replace"
        ).splitlines()
    except OSError:
        return ""
    for line in lines:
        match = re.match(
            rf"^\s*(?:export\s+)?{re.escape(key)}\s*=\s*(.*?)\s*$", line
        )
        if not match:
            continue
        value = match.group(1)
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        return value.strip()
    return ""


def webhook_public_url(profile_home: Path) -> str:
    value = _profile_env_value(profile_home, "NOTION_WEBHOOK_PUBLIC_URL")
    if not value:
        return ""
    try:
        return normalize_webhook_url(value)
    except RuntimeSetupError:
        return ""


def webhook_verification_token(profile_home: Path) -> str:
    state = _read_json(profile_home / "state" / "notion-webhook.json")
    if not isinstance(state, dict):
        return ""
    return str(state.get("verification_token") or "").strip()


def webhook_enabled(profile_home: Path) -> bool:
    """Report readiness from required secret names and the tunnel token file."""
    configured = configured_secret_names(profile_home)
    return (
        {"NOTION_TOKEN", "NOTION_WEBHOOK_PUBLIC_URL"}.issubset(configured)
        and (profile_home / TUNNEL_TOKEN_RELATIVE).is_file()
    )


def model_auth_configured(profile_home: Path) -> bool:
    """Detect supported model credentials without reading their contents."""
    if configured_secret_names(profile_home) & MODEL_SECRET_NAMES:
        return True
    auth_candidates = (
        profile_home / "auth.json",
        profile_home / "oauth.json",
        profile_home / "auth" / "credentials.json",
    )
    return any(path.is_file() and path.stat().st_size > 2 for path in auth_candidates)


def approve_workspace_context(path: Path) -> None:
    """Promote exactly one reviewed draft frontmatter field, atomically."""
    try:
        content = path.read_text(encoding="utf-8")
    except OSError as error:
        raise RuntimeSetupError("workspace_configuration_missing") from error
    if not content.startswith("---\n"):
        raise RuntimeSetupError("workspace_frontmatter_missing")
    frontmatter_end = content.find("\n---", 4)
    if frontmatter_end < 0:
        raise RuntimeSetupError("workspace_frontmatter_missing")
    matches = list(re.finditer(
        r"^status:\s*(draft|approved)\s*$",
        content[:frontmatter_end],
        re.MULTILINE,
    ))
    if len(matches) != 1:
        raise RuntimeSetupError("workspace_status_invalid")
    if matches[0].group(1) == "approved":
        return
    updated = (
        content[:matches[0].start()]
        + "status: approved"
        + content[matches[0].end():]
    )
    descriptor, temporary = tempfile.mkstemp(prefix=".workspace-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            stream.write(updated)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def _read_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def write_private_json(profile_home: Path, relative: Path, payload: dict[str, Any]) -> Path:
    """Atomically write owner-only profile state without exposing it in logs."""
    destination = profile_home / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{destination.name}-", dir=destination.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(payload, stream, indent=2, sort_keys=True)
            stream.write("\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return destination


def write_messaging_test_receipt(profile_home: Path, payload: dict[str, Any]) -> Path:
    from schemas.workspace import MessagingTestReceipt

    receipt = MessagingTestReceipt.model_validate(payload)
    return write_private_json(
        profile_home, MESSAGING_TEST_RECEIPT, receipt.model_dump(mode="json")
    )


def current_messaging_target(profile_home: Path, bindings: list[Any]) -> str | None:
    """Return the exact confirmed target only while its typed binding is current."""
    from pydantic import ValidationError
    from schemas.workspace import MessagingTestReceipt, configuration_hash

    try:
        receipt = MessagingTestReceipt.model_validate(
            _read_json(profile_home / MESSAGING_TEST_RECEIPT)
        )
    except ValidationError:
        return None
    recipient_hashes = {
        hashlib.sha256(binding.send_to.casefold().encode()).hexdigest()
        for binding in bindings
    }
    if (
        receipt.status != "passed"
        or not receipt.recipient_confirmed
        or receipt.configuration_sha256 != configuration_hash(bindings)
        or receipt.recipient_sha256 not in recipient_hashes
        or not receipt.exact_target
    ):
        return None
    return receipt.exact_target


def messaging_test_current(profile_home: Path, bindings: list[Any]) -> bool:
    return current_messaging_target(profile_home, bindings) is not None


def _http_json(url: str, timeout: float = 3.0) -> tuple[bool, dict[str, Any]]:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
            return response.status == 200, payload if isinstance(payload, dict) else {}
    except (OSError, ValueError, urllib.error.URLError):
        return False, {}


def _http_ready(url: str, timeout: float = 3.0) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return response.status == 200
    except (OSError, urllib.error.URLError):
        return False


def _http_post_status(
    url: str,
    body: bytes,
    headers: dict[str, str],
    timeout: float = 3.0,
) -> int:
    request = urllib.request.Request(
        url,
        data=body,
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return int(response.status)
    except urllib.error.HTTPError as error:
        return int(error.code)
    except (OSError, urllib.error.URLError):
        return 0


def _lane(name: str, status: str, detail: str, required: bool = True) -> dict[str, Any]:
    return {
        "name": name,
        "status": status,
        "required": required,
        "detail": detail,
    }


def _local_profile_lanes(
    profile_home: Path,
    workspace: Path,
    command_runner: Callable[..., subprocess.CompletedProcess[str]],
) -> list[dict[str, Any]]:
    """Check installed files, model auth, schedules, and packaged evals."""
    distribution_ready = all(
        (profile_home / name).is_file()
        for name in ("distribution.yaml", "setup.py", "workspace.hermes.md")
    )
    workspace_ready = (workspace / ".hermes.md").is_file()
    model_ready = model_auth_configured(profile_home)

    config = command_runner(
        ["hermes", "config", "get", "terminal.cwd"],
        profile_home,
        check=False,
    )
    cwd_ready = (
        config.returncode == 0
        and Path(config.stdout.strip()).resolve() == workspace.resolve()
    )

    jobs_payload = _read_json(profile_home / "cron" / "jobs.json")
    jobs = jobs_payload.get("jobs", []) if isinstance(jobs_payload, dict) else []
    active_names = {
        str(job.get("name"))
        for job in jobs
        if isinstance(job, dict) and job.get("enabled", True) is not False
    }
    schedules_ready = EXPECTED_CRON_NAMES.issubset(active_names)

    eval_runner = profile_home / "scripts" / "run_installed_evals.py"
    eval_result = (
        command_runner(
            [sys.executable, str(eval_runner), "--root", str(profile_home)],
            profile_home,
            check=False,
            timeout=60,
        )
        if eval_runner.is_file()
        else subprocess.CompletedProcess([], 1, "", "missing")
    )
    try:
        eval_payload = json.loads(eval_result.stdout)
    except (json.JSONDecodeError, TypeError):
        eval_payload = {}
    evals_ready = eval_result.returncode == 0 and eval_payload.get("status") == "pass"

    return [
        _lane(
            "distribution",
            "pass" if distribution_ready else "fail",
            "installed distribution present"
            if distribution_ready
            else "distribution files missing",
        ),
        _lane(
            "workspace",
            "pass" if workspace_ready else "fail",
            "workspace context installed" if workspace_ready else "workspace context missing",
        ),
        _lane(
            "model_auth",
            "pass" if model_ready else "fail",
            "model credential present"
            if model_ready
            else "run the guided Hermes model authorization",
        ),
        _lane(
            "terminal_cwd",
            "pass" if cwd_ready else "fail",
            "workspace is the runtime cwd"
            if cwd_ready
            else "terminal cwd does not match workspace",
        ),
        _lane(
            "automations",
            "pass" if schedules_ready else "fail",
            "daily and weekly schedules installed"
            if schedules_ready
            else "required schedules missing",
        ),
        _lane(
            "feature_evals",
            "pass" if evals_ready else "fail",
            "Daily, Weekly, and Meeting frozen contract evals passed"
            if evals_ready
            else "packaged feature evals failed or are missing",
        ),
    ]


def _notion_mcp_lane(
    profile_home: Path,
    *,
    live: bool,
    command_runner: Callable[..., subprocess.CompletedProcess[str]],
) -> dict[str, Any]:
    """Check Notion configuration, then its live connection when requested."""
    notion_config = command_runner(
        ["hermes", "config", "get", "mcp_servers.notion.url"],
        profile_home,
        check=False,
    )
    configured = (
        notion_config.returncode == 0
        and notion_config.stdout.strip() == NOTION_MCP_URL
    )
    if configured and live:
        notion_test = command_runner(
            ["hermes", "mcp", "test", "notion"],
            profile_home,
            check=False,
            timeout=120,
        )
        ready = notion_test.returncode == 0 and "Connected" in notion_test.stdout
        detail = (
            "Notion MCP live connection passed"
            if ready
            else "Notion MCP requires authorization or repair"
        )
    else:
        ready = configured
        detail = (
            "Notion MCP configured; live probe skipped"
            if ready
            else "Notion MCP is not configured"
        )
    return _lane("notion_mcp", "pass" if ready else "fail", detail)


def _gateway_lane(
    profile_home: Path,
    command_runner: Callable[..., subprocess.CompletedProcess[str]],
) -> dict[str, Any]:
    gateway = command_runner(
        ["hermes", "gateway", "status"], profile_home, check=False
    )
    ready = "Gateway is running" in f"{gateway.stdout}\n{gateway.stderr}"
    return _lane(
        "gateway",
        "pass" if ready else "fail",
        "gateway running" if ready else "gateway not yet observed",
    )


def _messaging_lanes(profile_home: Path) -> list[dict[str, Any]]:
    """Separate a running gateway from an exact, user-confirmed owner route."""
    from schemas.workspace import DeliveryBehavior, parse_workspace_communications

    workspace = profile_home / "workspace.hermes.md"
    try:
        config = parse_workspace_communications(workspace.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return [
            _lane(
                "messaging_configured",
                "skip",
                "no managed messaging choices are installed",
                required=False,
            ),
            _lane(
                "messaging_delivery",
                "skip",
                "no owner message route is enabled",
                required=False,
            ),
        ]
    bindings = config.communications
    if not bindings:
        return [
            _lane("messaging_configured", "skip", "owner messages not configured", required=False),
            _lane("messaging_delivery", "skip", "owner messages not enabled", required=False),
        ]
    automatic = any(
        binding.behavior is DeliveryBehavior.SEND_AUTOMATICALLY
        for binding in bindings
    )
    confirmed = messaging_test_current(profile_home, bindings)
    if confirmed:
        return [
            _lane(
                "messaging_configured",
                "pass",
                "exact owner route confirmed by a current setup test",
                required=False,
            ),
            _lane(
                "messaging_delivery",
                "pass",
                "confirmed setup test matches the current messaging choices",
                required=False,
            ),
        ]
    if automatic:
        return [
            _lane(
                "messaging_configured",
                "fail",
                "automatic sending is blocked until the exact owner route is confirmed",
                required=False,
            ),
            _lane(
                "messaging_delivery",
                "fail",
                "no current confirmed connection test",
                required=False,
            ),
        ]
    return [
        _lane(
            "messaging_configured",
            "skip",
            "draft preparation does not require a connected messaging route",
            required=False,
        ),
        _lane(
            "messaging_delivery",
            "skip",
            "drafts require approval and are not sent automatically",
            required=False,
        ),
    ]


def _webhook_lanes(profile_home: Path, *, live: bool) -> list[dict[str, Any]]:
    """Return optional webhook and ingress lanes without promoting skips."""
    if not webhook_enabled(profile_home):
        return [
            _lane(
                "notion_webhook",
                "skip",
                "optional real-time comments not configured",
                required=False,
            )
        ]
    if not live:
        return [
            _lane(
                "notion_webhook",
                "skip",
                "configured; live probe not requested",
                required=False,
            )
        ]

    origin = os.environ.get("KAMDAR_GATEWAY_ORIGIN", "http://gateway:8645").rstrip("/")
    webhook_ok, webhook_payload = _http_json(origin + WEBHOOK_HEALTH_PATH)
    verified = webhook_ok and bool(webhook_payload.get("verification_token_captured"))
    tunnel_origin = os.environ.get(
        "KAMDAR_TUNNEL_METRICS", "http://cloudflared:2000"
    )
    tunnel_ready = _http_ready(tunnel_origin.rstrip("/") + "/ready")
    public_url = webhook_public_url(profile_home)
    public_health = (
        public_url.removesuffix(WEBHOOK_PATH) + WEBHOOK_HEALTH_PATH
        if public_url
        else ""
    )
    public_ready, public_payload = (
        _http_json(public_health, timeout=8.0) if public_health else (False, {})
    )
    public_ready = public_ready and bool(public_payload.get("ok"))
    invalid_signature_rejected = (
        _http_post_status(
            public_url,
            b"{}",
            {
                "Content-Type": "application/json",
                "X-Notion-Signature": "sha256=invalid-setup-probe",
            },
            timeout=8.0,
        )
        == 401
        if public_url
        else False
    )
    return [
        _lane(
            "notion_webhook",
            "pass" if verified else "fail",
            "webhook reachable and verified"
            if verified
            else "webhook awaits Notion verification",
            required=False,
        ),
        _lane(
            "public_ingress",
            "pass" if tunnel_ready else "fail",
            "Cloudflare tunnel ready" if tunnel_ready else "Cloudflare tunnel not ready",
            required=False,
        ),
        _lane(
            "public_endpoint",
            "pass" if public_ready else "fail",
            "stable public webhook endpoint reachable"
            if public_ready
            else "stable public webhook endpoint is not reachable",
            required=False,
        ),
        _lane(
            "signature_rejection",
            "pass" if invalid_signature_rejected else "fail",
            "invalid webhook signature rejected"
            if invalid_signature_rejected
            else "invalid-signature rejection was not observed",
            required=False,
        ),
    ]


def _comment_eval_lane(
    profile_home: Path,
    *,
    live: bool,
    comment_after: float | None,
) -> dict[str, Any]:
    """Require a reply newer than the operator's live-test starting point."""
    if not live or not webhook_enabled(profile_home):
        return _lane(
            "notion_comment_eval",
            "skip",
            "live comment eval not requested",
            required=False,
        )

    state = _read_json(profile_home / "state" / "notion-webhook.json")
    last_reply = state.get("last_reply", {}) if isinstance(state, dict) else {}
    sent_at = last_reply.get("sent_at") if isinstance(last_reply, dict) else None
    ready = bool(
        isinstance(last_reply, dict)
        and last_reply.get("message_id")
        and (
            comment_after is None
            or (isinstance(sent_at, (int, float)) and float(sent_at) > comment_after)
        )
    )
    return _lane(
        "notion_comment_eval",
        "pass" if ready else "fail",
        "threaded reply observed"
        if ready
        else "leave one @hermes test comment and retry",
        required=False,
    )


def _connection_eval_lane(profile_home: Path, *, live: bool) -> dict[str, Any]:
    """Report whether the latest certification matches current provider bindings."""
    from scripts import provider_catalog

    workspace = profile_home / "workspace.hermes.md"
    catalog_directory = profile_home / "catalog" / "data-sources"
    try:
        catalog = provider_catalog.load_catalog(
            catalog_directory
            if catalog_directory.is_dir()
            else provider_catalog.DEFAULT_CATALOG
        )
        bindings = provider_catalog.selected_bindings(workspace, catalog)
    except (provider_catalog.CatalogError, OSError) as error:
        return _lane(
            "connection_evals",
            "fail" if live else "skip",
            f"provider catalog or workspace binding is invalid: {error}",
            required=live,
        )
    if not bindings:
        return _lane(
            "connection_evals",
            "skip",
            "no configured catalog providers",
            required=False,
        )
    latest = _read_json(profile_home / "state" / "connection-evals" / "latest.json")
    if not latest:
        return _lane(
            "connection_evals",
            "fail" if live else "skip",
            "configured integrations have not been certified",
            required=live,
        )
    expected_hash = provider_catalog.configuration_hash(bindings)
    if latest.get("configuration_sha256") != expected_hash:
        return _lane(
            "connection_evals",
            "fail" if live else "skip",
            "integration certification is stale after a workspace change",
            required=live,
        )
    status = latest.get("status")
    if status == "deferred":
        return _lane(
            "connection_evals",
            "fail",
            "integration certification was deferred; rerun setup and choose Test integrations",
            required=False,
        )
    return _lane(
        "connection_evals",
        "pass" if status == "passed" else "fail",
        "all configured integration evals passed with one consolidated judgment"
        if status == "passed"
        else f"integration certification status is {status or 'invalid'}",
        required=live,
    )


def verify_profile(
    profile_home: Path,
    *,
    live: bool = False,
    comment_after: float | None = None,
    command_runner: Callable[..., subprocess.CompletedProcess[str]] = run_command,
) -> dict[str, Any]:
    """Run independent readiness lanes and derive one honest profile status."""
    profile_home = profile_home.resolve()
    workspace = profile_home / "workspace"
    lanes = _local_profile_lanes(profile_home, workspace, command_runner)
    lanes.append(
        _notion_mcp_lane(
            profile_home,
            live=live,
            command_runner=command_runner,
        )
    )
    lanes.append(_connection_eval_lane(profile_home, live=live))
    lanes.append(_gateway_lane(profile_home, command_runner))
    lanes.extend(_messaging_lanes(profile_home))
    lanes.extend(_webhook_lanes(profile_home, live=live))
    lanes.append(
        _comment_eval_lane(
            profile_home,
            live=live,
            comment_after=comment_after,
        )
    )

    required_failed = any(
        lane["required"] and lane["status"] != "pass" for lane in lanes
    )
    optional_failed = any(
        not lane["required"] and lane["status"] == "fail" for lane in lanes
    )
    status = "blocked" if required_failed else ("partial" if optional_failed else "ready")
    return {
        "schema_version": 1,
        "status": status,
        "profile": PROFILE_NAME,
        "profile_home": str(profile_home),
        "live": live,
        "lanes": lanes,
    }


def write_receipt(profile_home: Path, receipt: dict[str, Any]) -> Path:
    directory = profile_home / RECEIPT_DIRECTORY
    directory.mkdir(parents=True, exist_ok=True)
    stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    destination = directory / f"setup-{stamp}.json"
    descriptor, temporary = tempfile.mkstemp(prefix=".setup-receipt-", dir=directory)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
            json.dump(receipt, stream, indent=2, sort_keys=True)
            stream.write("\n")
        os.chmod(temporary, 0o600)
        os.replace(temporary, destination)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)
    return destination
