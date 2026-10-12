# Recorded final cut source

The [full recorded demonstration](../bugreplay-final-demo.mp4) is rendered and reviewed: **170.000 seconds**, 1280×720, 30 fps, H.264/AAC. Its SHA-256 is `b10877646b2faf01d2ae8384c5de1f3bef5c13b202a6d7c74316251b77237e30`. The [short version](../bugreplay-final-demo-x.mp4) is **138.208 seconds**, with SHA-256 `a698307af37ff7a8790570e893591507a422fd09cb5872e80461b0cceeb81818`. It removes whole optional spoken cues and pauses while preserving both complete independent replays, the corrected control, all three sponsors, the 1/3 outcome and the cost limitations. Retained footage and narration play at 1×.

The [full media audit](media-audit.json), [short media audit](x-media-audit.json), [full captions](captions.srt), [short captions](captions-x.srt) and [short edit intervals](x-cut-manifest.json) describe the delivered files. Both videos passed a complete FFmpeg decode. Agent review covered 28 decoded full-version frames and 38 short-version frames, including all six interior cuts. Script, timing, non-silence and peak levels were checked; human auditory playback review is not claimed. External upload and accepted hackathon submission are separate, unverified states in these media audits.

This source assembles the existing recording plan from actual confirmed run `b8ffd757-6aed-405d-b7ac-ed3b1c4d9236`, its original replays/control and reviewed sponsor evidence. Original local media and the generated source project remain in the ignored submission directory. Publish only the reviewed rendered videos and safe evidence exports: the staged source-assets folder retains complete screenshots outside their visible privacy crops. The older `demo/bugreplay-product-preview.mp4` remains a separate scripted preview.

Copy `editorial-manifest.template.json` to an ignored evidence directory and fill its actual paths. The `mediaEntrySchema`, `segmentSchema` and `captionSchema` objects explain row shape; they are not entries. The builder resolves paths against the manifest containing them.

1. `evidenceManifest` points to the actual evidence manifest using `demo/final/evidence-manifest.template.json` fields. Add `control.testFile`, identifying the exact file executed against the corrected control. `runViewFile` points to the selected real run's original `run.json`.
2. Each `sceneMedia` entry supplies a reviewed image or original video, its local scene start, displayed duration, source trim offset and label. The eight evidence scenes must each have complete visual coverage; `close` can remain empty because its repository card is generated from the verified manifest.
3. Use ordinary 1× footage or a reviewed preprocessed clip. A `speedFactor` other than 1 requires `preprocessed: true` and an existing `originalFile`; HyperFrames plays that prepared clip at 1× and displays its original speed factor. The builder does not retime or fabricate footage. Supply actual still captures to hold after a short replay instead of looping it.

Optional `sourceRect: {"x": 0, "y": 120, "width": 1280, "height": 600}` selects a readable rectangle in original source pixels. The builder verifies it against actual media dimensions and applies a CSS crop; the staged source file and its hash are unchanged. The media label discloses the crop. Use `sourceOrigin: "artifact_export_capture"` for the local Entire checkpoint metadata viewer or hosted Neatlogs trace-data viewer and supply its actual `sourceEvidenceFile`; it is labeled as an authentic data export, with the source JSON hash recorded in provenance. Its item label must specify the actual source. The default `application_capture` is a genuine application screenshot or recording.

4. Supply one reviewed narration segment per scene, starting at its first frame and fitting its window. Alternatively supply one synchronized `narration.fullFile`, set `fullFileReviewed: true`, and leave `segments` empty. Supply reviewed, synchronized caption cues with global start/duration values; every scene needs captions. No TTS or paid generation runs in this builder.
5. Set the three top-level editing/privacy/claims flags and the caption-review flag only after reviewing the evidence. Original recordings remain outside the source folder.

The builder checks the actual run status, intended regression failures, unchanged test hash/control pass, sponsor IDs/links, original file availability and media trim bounds. Its evidence input uses `evidenceReview` (legacy `humanReview` is accepted); agent review does not imply a human reviewed the result. The historical `finalGitSha` field identifies the verified engine version and appears as **Engine SHA**; later evidence/media commits may follow. These are packaging checks; the parent agent must still inspect actual assertion evidence, sponsor screens and spoken claims.

```sh
node demo/setup-runtime.mjs
node demo/final-cut/build.mjs \
  --manifest /absolute/path/editorial-manifest.json \
  --out /absolute/path/reviewed-final-project
```

With missing evidence this command fails before emitting `index.html`. It never creates placeholder footage. A successful build stages original reviewed files, the pinned GSAP runtime, provenance and a complete source project at the supplied output path. The source media is preserved. Build output belongs in an ignored local evidence directory until privacy review is complete.

After real media is supplied, use the existing pinned CLI and perform the final checks and full preview review before rendering:

```sh
HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.147 check /absolute/path/reviewed-final-project --snapshots
HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.147 preview /absolute/path/reviewed-final-project --background
```

Inspect all scene boundaries, every actual video panel, caption synchronization, readable screenshot crops and narration. A source build does not establish successful checks, final video completion or hackathon submission. Rendering is controlled by the parent agent after verified inputs are available.

`narration-plan.json` records the actual nine-chapter English script and claim sources. The explicitly authorized offline `prepare-local-narration.mjs` uses macOS `say` and FFmpeg to synthesize individual cues, measure their PCM durations and create nine scene tracks with synchronized SRT cues. It fails if any scene's narration exceeds its fixed window; it does not stretch speech. Technical audio checks and script review are distinct from auditory playback review.

The selected investigation recording is 49.640 seconds at 25 fps; its complete workflow took 51.651 seconds. The edit uses labeled original excerpts at 1× and delivers a 30 fps composition. The hosted Neatlogs before screen identifies first-baseline trace `17af3d753892ebeeff61afa08ee24492`; the after view is an authentic hosted API data export. It is not the official hosted application UI. Entire footage is an authentic CLI checkpoint metadata export, with no cryptographic-signature claim. Agent evidence review does not imply human review.

`prepare-x-cut.py` reproduces the short edit from this exact full cut and its 30-cue SRT. It checks that the complete replay/control intervals survive, performs hard cuts without changing speed, and rebases the 25 retained caption cues. Picture cut boundaries quantize to 30 fps; the complete measured output remains below 139 seconds.

```sh
python3 demo/final-cut/prepare-x-cut.py \
  --input demo/bugreplay-final-demo.mp4 \
  --captions demo/final-cut/captions.srt \
  --output /absolute/path/bugreplay-final-demo-x.mp4
```
