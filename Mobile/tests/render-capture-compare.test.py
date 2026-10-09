import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import sys
from PIL import Image

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("comparison", Path(__file__).parents[1] / "scripts" / "compare-render-captures.py")
comparison = importlib.util.module_from_spec(spec)
spec.loader.exec_module(comparison)


class CaptureCompareTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.manifest = {"schema": "soloscape-render-capture-v1", "source": "test",
                         "match": {"frameId": "fixture", "serverTick": 1, "clientCycle": 30,
                                   "cache": {"revision": 240, "archives": [{"archive": 2, "crc": 12, "revision": 1}]},
                                   "viewport": {"width": 2, "height": 1, "cssWidth": 2, "cssHeight": 1},
                                   "camera": {"target": [0, 0, 0], "yaw": 0, "pitch": 0.5, "distance": 60, "origin": {"mapX": 50, "mapY": 50}},
                                   "scene": {"zoneX": 400, "zoneY": 400, "baseX": 3152, "baseY": 3152, "instance": False,
                                             "templates": [], "player": {"x": 3200, "y": 3200, "plane": 0, "orientation": 0},
                                             "actors": {"player": {}, "npcs": [], "scenery": [], "appearance": None}, "varps": [], "regions": ["50,50"]},
                                   "settings": {"brightness": 0.8, "smoothBanding": True, "brightTextures": False,
                                                "fogDepth": 0, "colorBlindMode": 0, "colorBlindIntensity": 100, "anisotropicFilteringLevel": 1,
                                                "visibleLevel": 0, "roofLevel": 0, "touch": False, "drawMode": 4,
                                                "antialias": True, "textureElapsedMs": 0}}}
        self.write("a", self.manifest)
        self.write("b", self.manifest)
        Image.new("RGBA", (2, 1), (20, 40, 60, 255)).save(self.root / "a.png")
        Image.new("RGBA", (2, 1), (20, 40, 60, 255)).save(self.root / "b.png")

    def tearDown(self):
        self.temp.cleanup()

    def write(self, name, manifest):
        (self.root / f"{name}.json").write_text(json.dumps(manifest), encoding="utf-8")

    def compare(self):
        return comparison.compare(self.root / "a.png", self.root / "a.json", self.root / "b.png", self.root / "b.json", self.root / "diff.png")

    def test_equal_then_changed_pixel(self):
        self.assertTrue(self.compare()["exactPixelMatch"])
        image = Image.open(self.root / "b.png")
        image.putpixel((1, 0), (21, 40, 60, 255)); image.save(self.root / "b.png")
        result = self.compare()
        self.assertEqual(result["changedPixels"], 1)
        self.assertEqual(result["meanAbsoluteChannelError"], 0.125)
        self.assertEqual(Image.open(self.root / "diff.png").getpixel((1, 0)), (1, 0, 0, 255))

    def test_metadata_mismatches_refused(self):
        for key in ("camera", "settings", "cache", "scene", "serverTick", "clientCycle"):
            modified = json.loads(json.dumps(self.manifest))
            if isinstance(modified["match"][key], dict): modified["match"][key]["different"] = True
            else: modified["match"][key] += 1
            self.write("b", modified)
            with self.assertRaisesRegex(ValueError, "Unmatched captures"):
                self.compare()

    def test_dimensions_refused(self):
        Image.new("RGBA", (3, 1)).save(self.root / "b.png")
        with self.assertRaisesRegex(ValueError, "dimensions"):
            self.compare()

    def test_incomplete_metadata_refused(self):
        self.manifest["match"]["camera"] = {}
        self.write("a", self.manifest); self.write("b", self.manifest)
        with self.assertRaisesRegex(ValueError, "Incomplete"):
            self.compare()


if __name__ == "__main__":
    unittest.main()
