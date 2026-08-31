from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

from seed.schemas import load_seed_config, seed_bundle_sha256
from seed.review_schema import SeedRealismReview
from seed.private_overlay import (
    compile_private_company_seed,
    write_private_company_seed,
)
from seed.private_capture import (
    assert_expected_shape,
    compile_private_seed,
)


class SeedContractTests(unittest.TestCase):
    def representative_capture(self) -> dict:
        departments = ["Marketing", "Merchandising", "CMT", "Ecommerce", "Property", "DTC", "Content"]
        return {
            "schema_version": "0.1.0",
            "table": {
                "rows": [
                    {
                        "source_row_index": index,
                        "fields": {
                            "Project Name": f"Private Project {index + 1:02d}" if index < 39 else "",
                            "Department": departments[index % len(departments)],
                        },
                    }
                    for index in range(49)
                ]
            },
        }

    def private_capture(self, config: dict) -> dict:
        departments = ["Marketing", "Merchandising", "CMT", "Ecommerce", "Property Management", "DTC Brands", "Content"]
        focused = [(row["properties"]["name"], row["properties"]["department"]) for row in config["entities"]["projects"]]
        return {
            "schema_version": "kamdar-private-seed@1.0.0",
            "source_capture_sha256": config["provenance"]["source_capture_sha256"],
            "public_manifest_sha256": "a" * 64,
            "aggregate": {"rendered_rows": 49, "named_projects": 39, "source_gaps": 10, "observed_departments": 7},
            "projects": [
                {
                    "project_key": f"CAPTURE-PROJECT-{index + 1:02d}",
                    "project_name": focused[index][0] if index < len(focused) else f"Capture Project {index + 1}",
                    "department": focused[index][1] if index < len(focused) else departments[index % len(departments)],
                }
                for index in range(39)
            ],
            "source_gaps": [{"source_row_index": index, "reason": "missing_project_name"} for index in range(10)],
            "departments": departments,
        }

    def test_tracked_seed_validates_and_has_stable_digest(self) -> None:
        config = load_seed_config()
        self.assertEqual(len(config["entities"]["projects"]), 7)
        self.assertRegex(seed_bundle_sha256(), r"^[a-f0-9]{64}$")

    def test_realism_review_is_pydantic_valid_and_bound_to_seed(self) -> None:
        review = SeedRealismReview.model_validate_json(
            (Path(__file__).resolve().parents[2] / "seed/reviews/realism.json").read_text(encoding="utf-8"),
            strict=True,
        )
        self.assertEqual(review.seed_sha256, seed_bundle_sha256())

    def test_private_capture_compiler_is_deterministic_and_aggregate_only(self) -> None:
        capture = self.representative_capture()
        first = compile_private_seed(capture)
        second = compile_private_seed(capture)
        self.assertEqual(first, second)
        assert_expected_shape(*first)
        private, manifest = first
        self.assertEqual(len(private["projects"]), 39)
        self.assertNotIn("Private Project", str(manifest))

    def test_private_company_overlay_preserves_links_and_mode(self) -> None:
        config = load_seed_config()
        compiled = compile_private_company_seed(config, self.private_capture(config))
        departments = {row["id"]: row["properties"]["department"] for row in compiled["entities"]["projects"]}
        for group in ("work_items", "meetings", "reports"):
            for row in compiled["entities"][group]:
                self.assertEqual(row["properties"]["department"], departments[row["properties"]["project"]])
        with tempfile.TemporaryDirectory() as temporary:
            target = write_private_company_seed(Path(temporary) / "private.json", compiled)
            self.assertEqual(os.stat(target).st_mode & 0o777, 0o600)

    def test_private_company_overlay_rejects_wrong_capture(self) -> None:
        config = load_seed_config()
        capture = self.private_capture(config)
        capture["source_capture_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "capture hash"):
            compile_private_company_seed(config, capture)


if __name__ == "__main__":
    unittest.main()
