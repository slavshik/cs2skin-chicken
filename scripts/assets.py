#!/usr/bin/env python3
"""Builds the game's assets from the originals in raw_assets/, as listed in src/assets/assets.json.

Usage: python3 scripts/assets.py [part ...]      (or `make assets`; no parts builds all)

assets.json is the one list of the assets the game uses: the code reads their names from it
(`src/app/assets.ts`, `src/audio/sounds.ts`) and this script builds exactly those, so nothing
else reaches the build. Parts:

- each of `atlases`: packs the PNGs its `frames` name. A name matches NAME.png, or a frame
  sequence NAME_00391.png, NAME_00392.png, ... which also becomes a Pixi `animations` entry.
- `images`: photographic backgrounds (JPEG, not worth packing) are copied as they are, and any
  file in that folder the manifest no longer lists is removed.
- `sounds`: the WAVs `sprite` names become one MP3 sound sprite plus a Howler sprite map
  (`[offset ms, duration ms]` by name). Each sound is trimmed of silence at both ends, brought
  to `peakDb` and sits after a gap of silence, so MP3 encoder padding never clips a start.

Packing downscales by `scale` and writes meta.scale, so Pixi keeps the original logical sizes
(a 748px card is still 748 units wide in code). It trims transparent borders, packs with
MaxRects with 2px padding and a 1px extrude, shares one rect between identical frames, and
quantizes the PNG with pngquant when it is installed (about half the bytes).

Needs Pillow (`pip3 install pillow`) and, for sounds, ffmpeg with libmp3lame.
"""
import argparse, array, json, math, os, re, shutil, subprocess, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "src/assets/assets.json")
PAD, EXTRUDE = 2, 1
SEQUENCE = re.compile(r"(.+?)_?(\d{3,})")  # zero-padded frame numbers only


def load(src, wanted, scale):
    """The PNGs in `src` that `wanted` names, directly or as a sequence prefix."""
    available = sorted(os.path.splitext(f)[0] for f in os.listdir(src) if f.endswith(".png"))
    names = []
    for want in wanted:
        match = [n for n in available
                 if n == want or ((m := SEQUENCE.fullmatch(n)) and m.group(1) == want)]
        if not match:
            raise SystemExit(f"assets.json: no {want}.png (or {want}_NNN sequence) in {src}")
        names += [n for n in match if n not in names]
    items = []
    for name in names:
        im = Image.open(os.path.join(src, name + ".png")).convert("RGBA")
        sw, sh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
        if scale != 1:
            im = im.resize((sw, sh), Image.LANCZOS)
        bbox = im.getchannel("A").getbbox()
        if bbox is None:  # fully transparent: normalise the invisible RGB so duplicates merge
            bbox = (0, 0, 1, 1)
            im = Image.new("RGBA", im.size, (0, 0, 0, 0))
        crop = im.crop(bbox)
        items.append({"name": name, "img": crop, "off": bbox[:2], "src": (sw, sh),
                      "key": (crop.size, crop.tobytes())})
    return items, [n for n in available if n not in names]


class MaxRects:
    def __init__(self, w, h):
        self.free = [(0, 0, w, h)]

    def insert(self, w, h):
        best = None
        for fx, fy, fw, fh in self.free:
            if w <= fw and h <= fh:
                score = (min(fw - w, fh - h), max(fw - w, fh - h))
                if best is None or score < best[0]:
                    best = (score, fx, fy)
        if best is None:
            return None
        _, x, y = best
        self._split((x, y, w, h))
        return x, y

    def _split(self, r):
        rx, ry, rw, rh = r
        out = []
        for f in self.free:
            fx, fy, fw, fh = f
            if rx >= fx + fw or rx + rw <= fx or ry >= fy + fh or ry + rh <= fy:
                out.append(f)
                continue
            if rx > fx: out.append((fx, fy, rx - fx, fh))
            if rx + rw < fx + fw: out.append((rx + rw, fy, fx + fw - rx - rw, fh))
            if ry > fy: out.append((fx, fy, fw, ry - fy))
            if ry + rh < fy + fh: out.append((fx, ry + rh, fw, fy + fh - ry - rh))
        self.free = [a for i, a in enumerate(out) if not any(
            i != j and a[0] >= b[0] and a[1] >= b[1] and a[0] + a[2] <= b[0] + b[2]
            and a[1] + a[3] <= b[1] + b[3] and (a != b or i > j) for j, b in enumerate(out))]


def try_pack(items, W, H):
    mr, placed = MaxRects(W, H), {}
    for it in sorted(items, key=lambda i: -max(i["img"].size)):
        if it["key"] in placed:
            continue
        w, h = it["img"].size
        pos = mr.insert(w + PAD, h + PAD)
        if pos is None:
            return None
        placed[it["key"]] = pos
    return placed


def pack(items, max_size=2048):
    """The smallest sheet (by area, then squareness) that fits every unique frame."""
    sizes = sorted({(w, h) for w in range(128, max_size + 1, 64)
                    for h in range(128, max_size + 1, 64)},
                   key=lambda s: (s[0] * s[1], abs(s[0] - s[1])))
    for W, H in sizes:
        placed = try_pack(items, W - PAD, H - PAD)  # keep the extrude margin around the sheet
        if placed:
            return W, H, placed
    raise SystemExit(f"doesn't fit in {max_size}x{max_size}; lower the scale")


def animations(names):
    groups = {}
    for n in names:
        m = SEQUENCE.fullmatch(n)
        if m:
            groups.setdefault(m.group(1), []).append((int(m.group(2)), n))
    return {k: [n for _, n in sorted(v)] for k, v in groups.items() if len(v) > 1}


def extrude(atlas, im, x, y):
    w, h = im.size
    atlas.paste(im.crop((0, 0, w, 1)).resize((w, EXTRUDE)), (x, y - EXTRUDE))
    atlas.paste(im.crop((0, h - 1, w, h)).resize((w, EXTRUDE)), (x, y + h))
    atlas.paste(im.crop((0, 0, 1, h)).resize((EXTRUDE, h)), (x - EXTRUDE, y))
    atlas.paste(im.crop((w - 1, 0, w, h)).resize((EXTRUDE, h)), (x + w, y))
    atlas.paste(im, (x, y))


def build_atlas(name, cfg):
    src, out = os.path.join(ROOT, cfg["src"]), os.path.join(ROOT, cfg["out"])
    items, skipped = load(src, cfg["frames"].values(), cfg["scale"])
    W, H, placed = pack(items)

    atlas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    frames = {}
    for it in items:
        x, y = (p + PAD for p in placed[it["key"]])
        extrude(atlas, it["img"], x, y)
        w, h = it["img"].size
        frames[it["name"]] = {
            "frame": {"x": x, "y": y, "w": w, "h": h},
            "rotated": False,
            "trimmed": (w, h) != it["src"],
            "spriteSourceSize": {"x": it["off"][0], "y": it["off"][1], "w": w, "h": h},
            "sourceSize": {"w": it["src"][0], "h": it["src"][1]},
        }

    os.makedirs(out, exist_ok=True)
    png = os.path.join(out, "atlas.png")
    atlas.save(png, optimize=True)
    if shutil.which("pngquant"):
        subprocess.run(["pngquant", "--force", "--skip-if-larger", "--speed", "1",
                        "--quality", "70-95", "--strip", "--output", png, png], check=False)
    else:
        print("  pngquant not found: the PNG is unquantized (brew install pngquant)",
              file=sys.stderr)

    sheet = {"frames": frames, "meta": {"app": "scripts/atlas.py", "image": "atlas.png",
                                        "format": "RGBA8888", "size": {"w": W, "h": H},
                                        "scale": str(cfg["scale"])}}
    anims = animations(frames)
    if anims:
        sheet["animations"] = anims
    with open(os.path.join(out, "atlas.json"), "w") as f:
        json.dump(sheet, f, separators=(",", ":"))

    print(f"{name}: {len(frames)} frames ({len(placed)} unique) -> {W}x{H} @ {cfg['scale']}, "
          f"{os.path.getsize(png) / 1024:.0f} KB -> {cfg['out']}")
    for k, v in anims.items():
        print(f"  animation '{k}': {len(v)} frames")
    if skipped:
        print(f"  left out: {', '.join(skipped)}")


def copy_images(cfg):
    src, out = os.path.join(ROOT, cfg["src"]), os.path.join(ROOT, cfg["out"])
    os.makedirs(out, exist_ok=True)
    files = set(cfg["files"].values())
    for file in sorted(files):
        if not os.path.exists(os.path.join(src, file)):
            raise SystemExit(f"assets.json: no {file} in {cfg['src']}")
        shutil.copyfile(os.path.join(src, file), os.path.join(out, file))
        print(f"images: {file}, {os.path.getsize(os.path.join(out, file)) / 1024:.0f} KB "
              f"-> {cfg['out']}")
    for file in sorted(set(os.listdir(out)) - files):
        os.remove(os.path.join(out, file))
        print(f"  removed {file} (not in assets.json)")


RATE = 44100
GAP = 0.25  # seconds of silence before each sound in the sprite
SILENCE = 10 ** (-50 / 20)  # trim threshold, -50 dBFS


def decode_pcm(path):
    """A sound file as mono 16-bit samples at RATE, through ffmpeg."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(RATE),
                          "-f", "s16le", "-"], check=True, capture_output=True).stdout
    return array.array("h", raw)


def trim_and_level(samples, peak_db):
    limit = SILENCE * 32767
    loud = [i for i, v in enumerate(samples) if abs(v) > limit]
    if not loud:
        return array.array("h")
    clip = samples[max(0, loud[0] - 64):loud[-1] + 1]  # a few samples of lead-in
    gain = 10 ** (peak_db / 20) * 32767 / max(abs(v) for v in clip)
    return array.array("h", (max(-32768, min(32767, round(v * gain))) for v in clip))


def build_sounds(cfg):
    src, out = os.path.join(ROOT, cfg["src"]), os.path.join(ROOT, cfg["out"])
    os.makedirs(out, exist_ok=True)
    pcm, sprite = array.array("h"), {}
    for name, file in cfg["sprite"].items():
        path = next((os.path.join(src, file + ext) for ext in (".wav", ".mp3", ".ogg")
                     if os.path.exists(os.path.join(src, file + ext))), None)
        if path is None:
            raise SystemExit(f"assets.json: no sound {file} in {cfg['src']}")
        clip = trim_and_level(decode_pcm(path), cfg["peakDb"])
        pcm.extend([0] * round(GAP * RATE))
        start = len(pcm)
        pcm.extend(clip)
        sprite[name] = [math.floor(start * 1000 / RATE), math.ceil(len(clip) * 1000 / RATE)]
    pcm.extend([0] * round(GAP * RATE))

    mp3 = os.path.join(out, "sprite.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(RATE), "-ac", "1",
                    "-i", "-", "-codec:a", "libmp3lame", "-b:a", "64k", "-map_metadata", "-1",
                    "-fflags", "+bitexact", "-flags:a", "+bitexact", mp3],
                   input=pcm.tobytes(), check=True)
    with open(os.path.join(out, "sprite.json"), "w") as f:
        json.dump({"sprite": sprite}, f, separators=(",", ":"))
    for file in sorted(set(os.listdir(out)) - {"sprite.mp3", "sprite.json"}):
        os.remove(os.path.join(out, file))
    listed = {os.path.splitext(f)[0] for f in os.listdir(src)}
    skipped = sorted(listed - set(cfg["sprite"].values()))
    print(f"sounds: {len(sprite)} in a {len(pcm) / RATE:.1f} s sprite, "
          f"{os.path.getsize(mp3) / 1024:.0f} KB -> {cfg['out']}")
    if skipped:
        print(f"  left out: {', '.join(skipped)}")


def main():
    with open(MANIFEST) as f:
        manifest = json.load(f)
    parts = [*manifest["atlases"], "images", "sounds"]
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("parts", nargs="*", metavar="part",
                    help=f"what to build ({', '.join(parts)}); default all")
    chosen = ap.parse_args().parts or parts
    unknown = [p for p in chosen if p not in parts]
    if unknown:
        ap.error(f"unknown {', '.join(unknown)}; choose from {', '.join(parts)}")
    for part in chosen:
        if part == "images":
            copy_images(manifest["images"])
        elif part == "sounds":
            build_sounds(manifest["sounds"])
        else:
            build_atlas(part, manifest["atlases"][part])


if __name__ == "__main__":
    main()
