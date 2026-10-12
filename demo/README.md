# Scripted engineering product preview

This 52-second HyperFrames composition shows real UI/shop screenshots and a real deterministic Playwright replay. A persistent badge identifies it as **Scripted engineering preview · no live model run**. It is not the final hackathon demo or evidence of autonomous discovery, real sponsor usage, or a live benchmark.

The source uses local assets, six seekable sub-compositions, deliberate silence, and hard cuts. The original replay is 3.00 seconds at 1×. No cursor or browser interaction is fabricated.

## Render from a clean clone

Reviewed screenshots, the small original replay clip, and the provenance record are included in `demo/assets/`. No personal path or raw evaluation folder is needed to render them. Use Node.js 24+ and the pinned HyperFrames version:

```sh
node demo/setup-runtime.mjs
HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.147 check demo
HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.147 preview demo --background
HYPERFRAMES_NO_TELEMETRY=1 npx --yes hyperframes@0.8.147 render demo \
  --output /absolute/path/bugreplay-product-preview.mp4 \
  --quality delivery --fps 30 --workers 1 --no-browser-gpu \
  --experimental-fast-capture=false
```

`setup-runtime.mjs` downloads only the published GSAP 3.14.2 file into the demo folder and verifies its pinned SHA-256. The vendor file remains ignored. HyperFrames supplies the built-in Inter font. See [third-party provenance](THIRD_PARTY.md); GSAP is not MIT-licensed.

## Replace selected evidence after a new verified run

Use Node.js 24+. Supply explicit local paths; do not commit credentials or entire raw recordings directories.

```sh
node demo/bundle.mjs \
  --eval-dir artifacts/product-eval/<verified-evaluation-directory> \
  --ui /path/to/reviewed-clean-ui.png \
  --shop /path/to/reviewed-shop.png
```

The bundler validates the scripted result, 2/2 intended buggy failures, 1/1 fixed pass, and the exact saved-test SHA-256. It copies selected original media to `demo/assets/` and writes a nonsecret provenance record there. Source screenshots must be visually reviewed first; update the displayed hash and rerender when replacing evidence. The evaluation used for the initial preview is `2026-10-12T08-58-03.943Z-ef3e0210`, saved-test SHA-256 `06f2d8aafbbd4f3c5f83c458fe89788b3fd4f14937540e04014089be85fdb3fa`.

Verify the rendered duration/dimensions with `ffprobe` and inspect scene midpoints and the replay interval. CLI usage was unavailable (`status: unknown`, `usage_request_failed`) during the initial creation; no paid service was used. Unselected raw evidence remains under the repository's ignored `artifacts/`; runtime copies, caches and local preview state remain ignored.

## Included preview verification

[`bugreplay-product-preview.mp4`](bugreplay-product-preview.mp4) is the rendered preview: 52.000 seconds, 1280 × 720, H.264/yuv420p, 30 fps, 1,560 frames, 1,218,018 bytes, and no audio track. HyperFrames check passed with zero lint, runtime, motion, or layout issues; all 63 contrast samples passed. The final MP4's six scene midpoints and four replay frames were visually inspected. The original replay includes the browser's brief initial loading frame and its final viewport change; the footage is unaltered and plays at 1×.

The local render used one worker, screenshot capture and software GPU, and completed in 63.6 seconds. This validates the video artifact, not the outstanding live-model or sponsor gates shown in its final scene.
