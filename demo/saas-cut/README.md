# BugReplay SaaS cut — silent revision 4

The current [64-second MP4](../bugreplay-saas-demo-v4.mp4) removes the 24px horizontal text entrance from the accepted [revision 3](../bugreplay-saas-demo-v3.mp4). Text fades at its final coordinates, with the same 0.22-second duration, easing and stagger. All scene timings, media assets, framing, fonts, wording and five quiet sound effects are preserved. It has no voice or narration. [Revision 4 audit](media-audit-v4.json).

The evidence, normalization and historical verification details below describe the preserved v3 baseline. Revision 4 changes only the text entrance and builds to a separate output directory.

## Evidence and preservation

The selected investigation is `b8ffd757-6aed-405d-b7ac-ed3b1c4d9236`, associated with engine SHA `2b541b20a97ef3df4261529bd48089792e01f2af`. Two independent clean replays fail the intended cart-preservation assertion; the byte-identical saved test passes on the corrected control with only the base URL changed. This differs from discovery: one of three final buggy investigations was confirmed.

Genuine official hosted Neatlogs screenshots show the baseline, selected replay and corrected control. Entire is explicitly a local CLI metadata export with its actual Git diff. Native CFO.ai views distinguish Planning assumptions from Observed gateway costs. The selected confirmed-run gateway accounting of $0.1563342 exceeds the hypothesized $0.1293 variable-cost ceiling; complete cash invoices and promotional credits remain unknown.

The original evidence is preserved in [`live-confirmed-2026-10-12`](../../docs/evidence/live-confirmed-2026-10-12/README.md), [`live-improvement-2026-10-12`](../../docs/evidence/live-improvement-2026-10-12/README.md), and [`finance`](../../docs/evidence/finance/README.md). Earlier [92.5-second narrated](../bugreplay-saas-demo.mp4), [170-second](../bugreplay-final-demo.mp4) and [138-second](../bugreplay-final-demo-x.mp4) films remain unchanged.

## Stable browser presentation

`normalized/` contains exactly three presentation MP4s and an original-to-derivative [manifest](normalized/manifest.json). Real viewport padding and the observed cart header determine the crop and scale. Authentic neighboring crops replace navigation, the isolated one-frame size flash, and intervals where source scrolling hides the cart header. No UI pixels are invented and no AI interpolation is used.

| Recording | Retained source duration | Authentic-frame presentation holds |
| --- | ---: | --- |
| Replay 1 | 4.480s | 0–0.080s; 0.440–0.480s; 1.320–3.120s |
| Replay 2 | 4.520s | 0–0.080s; 0.440–0.480s; 1.320–3.160s |
| Corrected control | 4.440s | 0–0.080s; 0.440–0.480s; 1.320–3.080s |

These are edited presentation derivatives. Source durations and final outcomes are retained; intermediate visual updates and their timing are not claimed unmodified. Original WebMs, assertion evidence, hashes and per-frame source mappings remain available. Both buggy replays end at zero items; the corrected control retains two. Each proof derivative is a single contiguous media clip. Capture pixels have no scale, translation or rotation entrance animations.

## Build

Use a full repository checkout containing revision 4. Revision 3 remains reproducible at commit `161ca84`. Install the pinned, hash-checked GSAP runtime before building. The examples use the locally staged licensed effects; for a portable owner bundle, add `--sfx-dir /absolute/path/to/bundle/narration/sfx` to the builder command.

From the repository root:

```bash
node demo/setup-runtime.mjs
node demo/saas-cut/build.mjs
HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_RUN_ID=bugreplay-saas-v4-20261012 npx --yes hyperframes@0.8.147 check artifacts/submission-2026-10-12/saas-cut-v4/project --snapshots --json
HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_RUN_ID=bugreplay-saas-v4-20261012 npx --yes hyperframes@0.8.147 render artifacts/submission-2026-10-12/saas-cut-v4/project --quality high --fps 30 --workers 4 --output artifacts/submission-2026-10-12/saas-cut-v4/BugReplay-saas-demo-v4.mp4
```

`build.mjs`, `index.template.html`, `styles.css` and `edit-plan.json` define the 1280 × 720 composition. The generated project and staged recordings stay under ignored `artifacts/`. `--audio-manifest` is rejected for this silent revision. A portable owner bundle supplies the licensed effects through `--sfx-dir narration/sfx`. `--normalized-dir` optionally selects another reviewed derivative directory.

`normalize-proof.py` can regenerate derivatives from the untouched source WebMs using Python with NumPy/Pillow and FFmpeg. Write its frame intermediates to an ignored directory, then point the builder there:

```bash
python3 demo/saas-cut/normalize-proof.py --out artifacts/submission-2026-10-12/saas-cut-v4/rebuilt-normalized
node demo/saas-cut/build.mjs --normalized-dir artifacts/submission-2026-10-12/saas-cut-v4/rebuilt-normalized
```

Use a Python environment containing NumPy and Pillow. The builder checks derivative hashes and the reviewed evidence contract. The manifest records original evidence hashes, independently checked during this release review. Codec versions may produce different derivative bytes on another machine, so regenerated outputs require a new review. Preview the generated project with `npx --yes hyperframes@0.8.147 preview --port 4182` from its directory.

## Verification and licensing

The final MP4 is 64.000 seconds, H.264/AAC, 1280 × 720 at 30 fps, with 1,920 frames. Full FFmpeg decode passed twice. An independent reviewer extracted and viewed 49 actual decoded samples across six sheets, including consecutive resize boundaries and the investigation's cart loss. Root and the composition author viewed those same sheets. All 336 original proof frames were independently decoded; the 192 genuine crops and 144 held-frame mappings matched exactly. Fixed screenshot pixels were compared at consecutive entrance times. These checks verify stable framing without claiming a continuous human playback review.

The decoded audio matches only the five allowlisted sound effects. The independent numerical comparison found 58.201 seconds of exact digital silence outside guarded effect intervals and no speech elements; no human listening review is claimed. [`media-audit.json`](media-audit.json) records hashes, mappings, audio metrics and limits. HyperFrames runtime, layout and contrast checks pass. Its motion assertion sidecar was not enabled; dedicated pixel comparisons and boundary inspection cover this revision's stability changes.

Montserrat and IBM Plex Mono are bundled from the official Google Fonts repository under their included OFL licenses. The whoosh and chime are bundled Pixabay-licensed assets used only on editorial transitions and the PASS reveal, with unchanged credits in the owner bundle. No new generation was performed for revision 3.

`SCRIPT.md`, `narration-plan.json`, `narration-cues.json`, `captions.srt`, `audio-production-accounting.json` and [`media-audit-v2.json`](media-audit-v2.json) describe the preserved narrated revision 2. Its six voices and captions are unused in this final silent revision. Eight quoted voice-production credits are historical; actual debit, cash billing and promotional allocation remain unknown.
