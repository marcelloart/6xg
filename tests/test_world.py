"""Check the Python world compiler and the published JavaScript scenery."""
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("world_builder", ROOT / "tools" / "build_world.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class WorldCompilerTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((ROOT / "data" / "world.json").read_text(encoding="utf-8"))

    def test_generated_asset_matches_authored_world(self):
        self.assertEqual(builder.build(self.config), builder.OUTPUT.read_text(encoding="utf-8"))

    def test_html_references_current_published_assets(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertEqual(builder.refresh_asset_versions(html), html)

    def test_seed_is_reproducible_and_changes_the_world(self):
        self.assertEqual(builder.build(self.config), builder.build(copy.deepcopy(self.config)))
        changed = copy.deepcopy(self.config)
        changed["seed"] += 1
        self.assertNotEqual(builder.build(self.config), builder.build(changed))

    def test_off_map_sites_are_rejected(self):
        self.config["camps"][0]["x"] = 99999
        with self.assertRaisesRegex(ValueError, "outside"):
            builder.build(self.config)

    def test_missing_economic_site_is_rejected(self):
        del self.config["sites"]["mine"]
        with self.assertRaises(ValueError):
            builder.build(self.config)

    def test_scenery_budget_prevents_oversized_worlds(self):
        self.config["vegetation"]["treeCandidates"] = 1000000
        with self.assertRaises(ValueError):
            builder.build(self.config)

    def test_finite_coordinates_and_render_size_are_required(self):
        self.config["sites"]["lumber"]["x"] = float("nan")
        with self.assertRaises(ValueError):
            builder.build(self.config)


if __name__ == "__main__":
    unittest.main()
