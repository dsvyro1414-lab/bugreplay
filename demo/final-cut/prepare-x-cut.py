#!/usr/bin/env python3
"""Remove complete caption cues and pauses from the verified 170-second edit."""

import argparse
import hashlib
import json
from pathlib import Path
import subprocess


def seconds(text):
    hours, minutes, tail = text.split(":")
    return int(hours) * 3600 + int(minutes) * 60 + float(tail.replace(",", "."))


def stamp(value):
    millis = round(value * 1000)
    return f"{millis // 3600000:02}:{millis // 60000 % 60:02}:{millis // 1000 % 60:02},{millis % 1000:03}"


parser = argparse.ArgumentParser()
parser.add_argument("--input", type=Path, required=True)
parser.add_argument("--captions", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
source = args.input.resolve()
output = args.output.resolve()
if source == output:
    raise SystemExit("The short cut must not overwrite the full edit.")
blocks = args.captions.read_text().strip().split("\n\n")
cues = []
for block in blocks:
    number, timing, *text = block.splitlines()
    start, end = timing.split(" --> ")
    cues.append({"number": int(number), "start": seconds(start), "end": seconds(end), "text": "\n".join(text)})
if len(cues) != 30 or cues[0]["text"] != "BugReplay starts with a symptom and a URL.":
    raise SystemExit("This cut plan applies only to the reviewed 30-cue BugReplay final edit.")
cue = {row["number"]: row for row in cues}
removals = [
    (cue[6]["start"], cue[6]["end"], "Remove the redundant browser-guidance sentence."),
    (cue[8]["start"], cue[8]["end"], "Remove the original-recording retention sentence; the complete source remains preserved."),
    (cue[13]["start"], cue[13]["end"], "Remove the secondary inference-stoppage sentence."),
    (cue[20]["start"], 111.0, "Remove the redundant export-label sentence and following silence; the on-screen label remains."),
    (cue[24]["end"], 137.0, "Remove silence after the complete cost and unknown-billing disclosure."),
    (cue[28]["start"], cue[28]["end"], "Remove the repeated repository inventory; preserve the MVP limitation and closing invitation."),
    (cue[30]["end"], 170.0, "Remove closing silence."),
]
keeps = []
cursor = 0.0
for start, end, _ in removals:
    if start > cursor:
        keeps.append((cursor, start))
    cursor = end
if cursor < 170.0:
    keeps.append((cursor, 170.0))
duration = sum(end - start for start, end in keeps)
if duration > 139:
    raise SystemExit("Short-cut plan exceeds 139 seconds.")
# Retain both entire independent replay recordings and the full fixed-control scene.
for start, end in [(44.0, 48.48), (52.48, 56.96), (137.0, 154.0)]:
    if not any(begin <= start and stop >= end for begin, stop in keeps):
        raise SystemExit("The edit would truncate required replay/control evidence.")
filters = []
labels = []
for i, (start, end) in enumerate(keeps):
    filters.append(f"[0:v]trim=start={start:.6f}:end={end:.6f},setpts=PTS-STARTPTS[v{i}]")
    filters.append(f"[0:a]atrim=start={start:.6f}:end={end:.6f},asetpts=PTS-STARTPTS[a{i}]")
    labels.append(f"[v{i}][a{i}]")
filters.append("".join(labels) + f"concat=n={len(keeps)}:v=1:a=1[v][a]")
output.parent.mkdir(parents=True, exist_ok=True)
subprocess.run([
    "ffmpeg", "-hide_banner", "-loglevel", "warning", "-y", "-i", str(source),
    "-filter_complex", ";".join(filters), "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "fast", "-crf", "19", "-pix_fmt", "yuv420p", "-r", "30",
    "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(output),
], check=True)
short_cues = []
for row in cues:
    offset = 0.0
    for begin, end in keeps:
        if begin <= row["start"] and row["end"] <= end:
            short_cues.append({"start": offset + row["start"] - begin, "end": offset + row["end"] - begin, "text": row["text"]})
            break
        offset += end - begin
srt = "\n\n".join(f"{i}\n{stamp(row['start'])} --> {stamp(row['end'])}\n{row['text']}" for i, row in enumerate(short_cues, 1)) + "\n"
output.with_suffix(".srt").write_text(srt)
manifest = {
    "kind": "whole-cue-short-edit", "sourceFile": "demo/bugreplay-final-demo.mp4",
    "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
    "outputFile": "demo/bugreplay-final-demo-x.mp4",
    "outputSha256": hashlib.sha256(output.read_bytes()).hexdigest(),
    "plannedDurationSeconds": round(duration, 6), "speedFactor": 1,
    "retainedSourceIntervalsSeconds": [{"start": start, "end": end} for start, end in keeps],
    "removedSourceIntervalsSeconds": [{"start": start, "end": end, "reason": reason} for start, end, reason in removals],
    "retainedCaptionCues": len(short_cues), "bothCompleteIndependentReplaysRetained": True,
    "completeCorrectedControlSceneRetained": True,
    "note": "Hard cuts only; all retained footage and narration remain at 1x. Exact audio cue cuts use SRT millisecond boundaries; picture cuts quantize to 30 fps."
}
output.with_suffix(".edit.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps({"output": str(output), "plannedDurationSeconds": duration, "captionCues": len(short_cues)}))
