#!/usr/bin/env python3
"""Remove three isolated viewport-size flashes from genuine demo excerpts.

The source WebM is never modified. The v3 crop rectangles and source timing are
retained. Every ordinary frame is a direct crop of the corresponding source
frame; each reviewed one-frame scale flash holds the preceding authentic crop.
This is an edited presentation derivative, not an unmodified evidence video.
"""

import argparse
import hashlib
import json
import pathlib
import subprocess

import numpy as np
from PIL import Image


SOURCE_FPS = 25
OUTPUT_FPS = 50  # Duplicate source frames; this also represents the 2.66s trim exactly.
WIDTH, HEIGHT = 1280, 900
CLIPS = [
    {"id": "observe", "start": 3, "duration": 2.28,
     "rect": {"x": 780, "y": 120, "w": 450, "h": 360},
     "flash": 104, "flashWidth": 1100},
    {"id": "conditions", "start": 25, "duration": 2.28,
     "rect": {"x": 780, "y": 575, "w": 450, "h": 320},
     "flash": 649, "flashWidth": 1100},
    {"id": "cart-loss", "start": 32, "duration": 2.66,
     "rect": {"x": 780, "y": 120, "w": 450, "h": 350},
     "flash": 837, "flashWidth": 1134},
]


def run(command):
    return subprocess.run(command, check=True, capture_output=True, text=True)


def sha_file(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def darkness(image):
    result = (255 - np.asarray(image.convert("L"), dtype=np.float64)) / 255
    result[result < .25] = 0
    return result


def locate_header(image, template):
    """Check the observed cart-title anchor without changing normal frames."""
    area = darkness(image.crop((820, 80, 970, 230)))
    h, w = template.shape
    ah, aw = area.shape
    shape = (ah + h - 1, aw + w - 1)
    correlation = np.fft.irfftn(
        np.fft.rfftn(area, shape, axes=(0, 1)) *
        np.conj(np.fft.rfftn(template, shape, axes=(0, 1))),
        shape, axes=(0, 1),
    )[:ah - h + 1, :aw - w + 1]
    integral = np.pad(np.cumsum(np.cumsum(area * area, axis=0), axis=1),
                      ((1, 0), (1, 0)))
    sums = (integral[h:, w:] - integral[:-h, w:] -
            integral[h:, :-w] + integral[:-h, :-w])
    template_energy = float(np.sum(template * template))
    error = sums + template_energy - 2 * correlation
    y, x = np.unravel_index(np.argmin(error), error.shape)
    confidence = 1 - float(error[y, x]) / template_energy
    return [int(x) + 820, int(y) + 80], confidence


def content_width(image):
    pixels = np.asarray(image, dtype=np.int16)
    gray = np.max(np.abs(pixels - 128), axis=2) < 5
    fraction = gray.mean(axis=0)
    candidates = np.flatnonzero((fraction > .9) & (np.arange(WIDTH) > 700))
    return int(candidates[0]) if len(candidates) else WIDTH


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=str(pathlib.Path(__file__).resolve().parents[2]))
    parser.add_argument("--out", default="artifacts/video-jitter-review/investigation-stabilized")
    args = parser.parse_args()
    root = pathlib.Path(args.root).resolve()
    out = pathlib.Path(args.out)
    if not out.is_absolute():
        out = root / out
    out = out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    source = root / "docs/evidence/live-confirmed-2026-10-12/investigation-episode-1.webm"
    original_hash = sha_file(source)
    probe = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-of", "json",
                            str(source)]).stdout)
    stream = next(item for item in probe["streams"] if item["codec_type"] == "video")
    if (stream["width"], stream["height"], stream["r_frame_rate"]) != (WIDTH, HEIGHT, "25/1"):
        raise ValueError("The reviewed 1280x900, 25fps source recording is required.")

    decoded = out / "decoded-source-frames"
    decoded.mkdir(exist_ok=True)
    for path in decoded.glob("*.png"):
        path.unlink()
    terms = []
    for clip in CLIPS:
        first = int(clip["start"] * SOURCE_FPS)
        last = int(np.ceil((clip["start"] + clip["duration"]) * SOURCE_FPS)) - 1
        terms.append(f"between(n,{first},{last})")
    run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(source),
         "-vf", "select='" + "+".join(terms) + "'", "-fps_mode", "passthrough",
         "-frame_pts", "1", "-y", str(decoded / "%06d.png")])
    template = darkness(Image.open(decoded / "000075.png").crop((862, 150, 950, 176)))
    originals = {}
    inspections = {}
    for path in sorted(decoded.glob("*.png")):
        index = int(path.stem)
        image = Image.open(path).convert("RGB")
        width = content_width(image)
        normalized = image
        if width != WIDTH:
            normalized = image.crop((0, 0, width, HEIGHT)).resize(
                (WIDTH, round(HEIGHT * WIDTH / width)), Image.Resampling.LANCZOS)
        anchor, confidence = locate_header(normalized, template)
        if width == WIDTH and (anchor != [862, 150] or confidence < .99):
            raise ValueError(f"Unreviewed spatial change in source frame {index}.")
        originals[index] = image
        inspections[index] = {"sourceFrameIndex": index, "sourceTimeSeconds": index / SOURCE_FPS,
                              "viewportContentWidth": width,
                              "normalizedHeaderAnchor": anchor,
                              "headerMatchConfidence": round(confidence, 6)}

    rows = []
    for clip in CLIPS:
        slug = clip["id"]
        first = int(clip["start"] * SOURCE_FPS)
        count = round(clip["duration"] * OUTPUT_FPS)
        rect = clip["rect"]
        rectangle = (rect["x"], rect["y"], rect["x"] + rect["w"], rect["y"] + rect["h"])
        source_indices = sorted({first + n // 2 for n in range(count)})
        flashes = [index for index in source_indices
                   if inspections[index]["viewportContentWidth"] != WIDTH]
        if flashes != [clip["flash"]] or inspections[clip["flash"]]["viewportContentWidth"] != clip["flashWidth"]:
            raise ValueError(f"The source scale flashes changed for {slug}; review required.")
        flash = clip["flash"]
        if any(inspections[index]["viewportContentWidth"] != WIDTH for index in (flash - 1, flash + 1)):
            raise ValueError(f"The {slug} flash is no longer isolated.")
        frame_dir = out / f"{slug}-frames"
        frame_dir.mkdir(exist_ok=True)
        for path in frame_dir.glob("*.png"):
            path.unlink()
        mappings = []
        for n in range(count):
            source_index = first + n // 2
            used_index = source_index - 1 if source_index == flash else source_index
            crop = originals[used_index].crop(rectangle)
            crop.save(frame_dir / f"{n + 1:04d}.png")
            mappings.append({
                "derivativeFrameIndex": n,
                "derivativeTimeSeconds": n / OUTPUT_FPS,
                "sourceFrameIndex": source_index,
                "sourceTimeSeconds": source_index / SOURCE_FPS,
                "usedSourceFrameIndex": used_index,
                "usedSourceTimeSeconds": used_index / SOURCE_FPS,
                "sourceRect": rect,
                "viewportContentWidth": inspections[source_index]["viewportContentWidth"],
                "heldFromSourceFrameIndex": used_index if source_index == flash else None,
                "holdReason": (
                    "Isolated 40ms viewport-size capture flash; preceding authentic crop held. "
                    "The reviewed adjacent frames show the same cart/promo state."
                ) if source_index == flash else None,
                "cropRgbSha256": hashlib.sha256(crop.tobytes()).hexdigest(),
            })
        derivative = out / f"{slug}-stabilized.mp4"
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-framerate", str(OUTPUT_FPS),
             "-i", str(frame_dir / "%04d.png"), "-frames:v", str(count),
             "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", "-an", "-y", str(derivative)])
        run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(derivative),
             "-f", "null", "-"])
        metadata = json.loads(run(["ffprobe", "-v", "error", "-show_streams", "-show_format",
                                   "-of", "json", str(derivative)]).stdout)
        actual_stream = next(item for item in metadata["streams"] if item["codec_type"] == "video")
        actual_duration = float(metadata["format"]["duration"])
        if abs(actual_duration - clip["duration"]) > .0001 or int(actual_stream["nb_frames"]) != count:
            raise ValueError(f"Unexpected derivative timing for {slug}.")
        rows.append({
            "id": slug, "originalFile": str(source.relative_to(root)),
            "originalSha256": original_hash,
            "derivativeFile": derivative.name, "derivativeSha256": sha_file(derivative),
            "sourceStartSeconds": clip["start"], "sourceDurationSeconds": clip["duration"],
            "durationSeconds": actual_duration,
            "sourceFramesPerSecond": SOURCE_FPS,
            "sourceFrameCount": len(source_indices), "frameCount": count,
            "framesPerSecond": OUTPUT_FPS, "width": rect["w"], "height": rect["h"],
            "sourceRect": rect, "sourceSpeedFactor": 1,
            "headerAnchorForNormalSourceFrames": [862, 150],
            "heldRanges": [{"sourceStartSeconds": flash / SOURCE_FPS,
                            "sourceEndSeconds": (flash + 1) / SOURCE_FPS,
                            "derivativeStartSeconds": (flash - first) / SOURCE_FPS,
                            "derivativeEndSeconds": (flash + 1 - first) / SOURCE_FPS,
                            "heldFromSourceFrameIndex": flash - 1}],
            "sourceFrameInspection": [inspections[index] for index in source_indices],
            "frames": mappings,
        })
        print(f"{slug}: {count} output frames, {actual_duration:.3f}s, "
              f"held source frame {flash} from {flash - 1}", flush=True)

    if sha_file(source) != original_hash:
        raise ValueError("Original evidence unexpectedly changed.")
    manifest = {
        "version": 1,
        "kind": "Edited presentation derivatives of genuine investigation excerpts",
        "originalRecordingsUntouched": True, "notAnUnmodifiedRecording": True,
        "outcomesNotModified": True, "sourceSpeedFactor": 1,
        "method": "Keep original v3 crops fixed. Replace only three reviewed, isolated 40ms "
                  "viewport-size capture flashes with preceding authentic crops. Duplicate 25fps "
                  "source frames at 50fps so all three excerpt durations remain exact.",
        "limitations": [
            "These presentation derivatives contain three 40ms authentic-neighbor holds.",
            "No synthesized UI, optical-flow interpolation, or generated frames are used.",
            "All non-flash frames and action outcomes retain their original source times.",
            "The original WebM and independent assertion evidence remain the source of truth.",
            "The cart-loss excerpt ends halfway through the original final 40ms frame.",
        ],
        "clips": rows,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(out / "manifest.json")


if __name__ == "__main__":
    main()
