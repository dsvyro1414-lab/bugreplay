# BugReplay SaaS cut

A new 92.5-second HyperFrames composition for the controlled cart-preservation MVP. The earlier 170-second and 138-second films remain preserved. This revision uses genuine product evidence, six neural narration blocks, larger cropped interfaces, kinetic titles, and quiet licensed transition sounds.

## Source and evidence

- `build.mjs` assembles a deterministic, offline 1280 × 720 composition. `index.template.html` and `styles.css` define its animation and visual design.
- `SCRIPT.md` and `narration-plan.json` contain the 172 retained spoken words and the six picture windows. Speech is not stretched.
- Both independent buggy replays and the corrected control retain their complete original source time ranges at 1×, in consecutive order. Crops follow genuine recorded viewport changes and emphasize the cart.
- The hosted after captures are actual official Neatlogs UI. The before image identifies the first baseline trace. The Entire capture is explicitly a local viewer of authentic CLI checkpoint metadata and the associated Git diff. CFO.ai captures show the real native Planning and Observed evidence pages.
- The final buggy cohort confirmed one of three investigations. Two clean verification replays are a separate result. Selected-run gateway accounting exceeds the hypothesized variable-cost ceiling; complete cash billing and promotional credits remain unknown.

The selected investigation is `b8ffd757-6aed-405d-b7ac-ed3b1c4d9236`, associated with engine SHA `2b541b20a97ef3df4261529bd48089792e01f2af`. The engine SHA identifies the observed investigation, rather than subsequent media commits. Original evidence lives in [`live-confirmed-2026-10-12`](../../docs/evidence/live-confirmed-2026-10-12/README.md), [`live-improvement-2026-10-12`](../../docs/evidence/live-improvement-2026-10-12/README.md), and [`finance`](../../docs/evidence/finance/README.md).

## Build and review

From the repository root:

```bash
node demo/saas-cut/build.mjs --audio-manifest artifacts/submission-2026-10-12/saas-cut/audio-manifest.json
HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_RUN_ID=bugreplay-saas-20261012 npx --yes hyperframes@0.8.147 check artifacts/submission-2026-10-12/saas-cut/project --snapshots --json
HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_RUN_ID=bugreplay-saas-20261012 npx --yes hyperframes@0.8.147 render artifacts/submission-2026-10-12/saas-cut/project --quality high --fps 30 --workers 4 --output artifacts/submission-2026-10-12/saas-cut/BugReplay-saas-demo.mp4
```

The output project and staged recordings belong under ignored `artifacts/`. An audio manifest is `{ "blocks": [{ "id": "hook", "file": "edited/hook.wav", "durationSeconds": 8, "audioOffsetSeconds": 0.1 }] }` with all six IDs present. File paths are relative to the manifest. A portable owner bundle may provide `--sfx-dir narration/sfx`; otherwise the builder uses the prepared local sound directory. Explicit picture windows must fit their measured narration and the total must remain 80–95 seconds.

To open the editable Studio, run `npx --yes hyperframes@0.8.147 preview --port 4182` from the generated project directory and use `http://localhost:4182/#project/project`. Root review precedes publication. No browser UI, external calls, or new investigations are synthesized by the composition.

## Licensing and status

Montserrat and IBM Plex Mono are bundled from the official Google Fonts repository under their included OFL licenses. The whoosh and chime are bundled Pixabay-licensed skill assets, used only for editorial transitions and the fixed-control PASS reveal. Their unchanged credits accompany the private owner media bundle. Original provider narration and edited PCM files are retained separately; generated speech is identified as neural narration. Provider credits and complete cash billing are different measures.

Verified: [final MP4](../bugreplay-saas-demo.mp4), 92.500 seconds, H.264/AAC, 1280 × 720 at 30 fps. Full FFmpeg decode passed. Root reviewed 44 decoded samples; an independent reviewer separately extracted and reviewed 30 samples. The decoded mix has a −1.569 dBFS peak and no full-scale samples. See [`media-audit.json`](media-audit.json) for the SHA-256, automated checks, evidence limits, and review attribution. [`captions.srt`](captions.srt) is an optional separate caption track derived from sentence boundaries in the final edited narration; captions are not burned over the interface. [`audio-production-accounting.json`](audio-production-accounting.json) records six successful voice generations and eight quoted credits; actual debited credits, cash billing, and promotional allocation remain unknown.
