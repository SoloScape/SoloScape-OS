"""Compare genuinely matched captures; refuse metadata mismatches before reading pixels."""
import argparse
import json
import math
from pathlib import Path
from PIL import Image, ImageChops


def load_manifest(path):
    manifest = json.loads(Path(path).read_text(encoding="utf-8"))
    if manifest.get("schema") != "soloscape-render-capture-v1":
        raise ValueError("Unsupported capture manifest schema")
    match = manifest.get("match", {})
    required = {"frameId", "serverTick", "clientCycle", "cache", "viewport", "camera", "scene", "settings"}
    if set(match) != required or not match["frameId"]:
        raise ValueError("Incomplete capture matching metadata")
    if not match["cache"].get("archives"):
        raise ValueError("Capture lacks verified cache archive fingerprints")
    fields = {
        "cache": {"revision", "archives"},
        "viewport": {"width", "height", "cssWidth", "cssHeight"},
        "camera": {"target", "yaw", "pitch", "distance", "origin"},
        "scene": {"zoneX", "zoneY", "baseX", "baseY", "instance", "templates", "player", "actors", "varps", "regions"},
        "settings": {"brightness", "smoothBanding", "brightTextures", "fogDepth", "colorBlindMode", "colorBlindIntensity", "anisotropicFilteringLevel",
                     "visibleLevel", "roofLevel", "touch", "drawMode", "antialias", "textureElapsedMs"},
    }
    for key, names in fields.items():
        if not isinstance(match[key], dict) or not names.issubset(match[key]):
            raise ValueError("Incomplete capture matching metadata: " + key)
    def valid_numbers(value):
        if isinstance(value, float) and not math.isfinite(value):
            raise ValueError("Nonfinite capture metadata")
        if isinstance(value, dict):
            for entry in value.values(): valid_numbers(entry)
        elif isinstance(value, list):
            for entry in value: valid_numbers(entry)
    valid_numbers(match)
    return manifest


def compare(left_png, left_json, right_png, right_json, diff_path):
    left_meta, right_meta = load_manifest(left_json), load_manifest(right_json)
    if left_meta["match"] != right_meta["match"]:
        differing = [key for key in left_meta["match"] if left_meta["match"][key] != right_meta["match"][key]]
        raise ValueError("Unmatched captures: " + ", ".join(differing))
    left, right = Image.open(left_png).convert("RGBA"), Image.open(right_png).convert("RGBA")
    viewport = left_meta["match"]["viewport"]
    expected = (viewport["width"], viewport["height"])
    if left.size != right.size or left.size != expected:
        raise ValueError("Capture dimensions must match each other and the manifest; no resizing/cropping")
    difference = ImageChops.difference(left, right)
    visible_difference = difference.copy()
    visible_difference.putalpha(255)
    visible_difference.save(diff_path)
    changed = 0
    absolute = 0
    maximum = 0
    channels = difference.tobytes()
    for at in range(0, len(channels), 4):
        pixel = channels[at:at + 4]
        changed += any(pixel)
        absolute += sum(pixel)
        maximum = max(maximum, *pixel)
    total = left.width * left.height
    return {"width": left.width, "height": left.height, "changedPixels": changed,
            "changedFraction": changed / total, "meanAbsoluteChannelError": absolute / (total * 4),
            "maxChannelError": maximum, "exactPixelMatch": changed == 0,
            "scope": "This recorded frame only; this result does not establish renderer parity."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("left_png"); parser.add_argument("left_json")
    parser.add_argument("right_png"); parser.add_argument("right_json")
    parser.add_argument("--diff", required=True)
    args = parser.parse_args()
    try:
        result = compare(args.left_png, args.left_json, args.right_png, args.right_json, args.diff)
    except (ValueError, KeyError, OSError) as error:
        parser.exit(2, f"Capture comparison refused: {error}\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
