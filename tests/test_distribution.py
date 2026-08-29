from __future__ import annotations

import unittest
from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


class DistributionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.manifest = yaml.safe_load((ROOT / "distribution.yaml").read_text(encoding="utf-8"))
        self.owned = self.manifest["distribution_owned"]

    def test_manifest_installs_only_runtime_owned_surfaces(self) -> None:
        self.assertEqual(self.manifest["name"], "kamdar-ai")
        required = {
            "setup.py",
            "setup.cmd",
            "compose.yaml",
            "scripts/setup_runtime.py",
            "scripts/setup_cli",
            "scripts/setup_workspace.py",
            "scripts/setup_profile.py",
            "scripts/provider_catalog.py",
            "scripts/composio_session.py",
            "scripts/run_connection_evals.py",
            "scripts/run_installed_evals.py",
            "catalog/data-sources",
            "workspace.hermes.template.md",
            "automations",
            "templates",
            "plugins/platforms/notion/plugin.yaml",
        }
        self.assertTrue(required.issubset(set(self.owned)))
        self.assertNotIn("workspace.hermes.md", self.owned)
        for excluded in ("docs", "tickets", "tests", "seed", "evals/filesystem"):
            self.assertFalse(any(path == excluded or path.startswith(f"{excluded}/") for path in self.owned))
        self.assertFalse(any("company-os-onboard" in path for path in self.owned))
        self.assertFalse(any("notion-webhook-onboarding" in path for path in self.owned))
        self.assertFalse(any(path == "skills" or path.startswith("skills/") for path in self.owned))
        self.assertNotIn("NGROK_AUTHTOKEN", {
            item["name"] for item in self.manifest.get("env_requires", [])
        })

    def test_every_owned_path_exists_and_payload_is_small(self) -> None:
        files: set[Path] = set()
        for relative in self.owned:
            path = ROOT / relative
            self.assertTrue(path.exists(), relative)
            if path.is_file():
                files.add(path)
            else:
                files.update(item for item in path.rglob("*") if item.is_file() and ".pyc" not in item.suffix)
        payload_bytes = sum(path.stat().st_size for path in files)
        self.assertLess(payload_bytes, 1_000_000, payload_bytes)


if __name__ == "__main__":
    unittest.main()
