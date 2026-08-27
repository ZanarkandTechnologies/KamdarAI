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
            "workspace.hermes.md",
            "automations",
            "templates",
            "skills/setup-kamdar-workspace/SKILL.md",
            "skills/notion-webhook-onboarding/SKILL.md",
            "plugins/platforms/notion/plugin.yaml",
        }
        self.assertTrue(required.issubset(set(self.owned)))
        for excluded in ("docs", "tickets", "tests", "seed", "evals/filesystem"):
            self.assertFalse(any(path == excluded or path.startswith(f"{excluded}/") for path in self.owned))
        self.assertFalse(any("company-os-onboard" in path for path in self.owned))

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
