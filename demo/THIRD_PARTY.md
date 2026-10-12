# Third-party runtime and font provenance

## GSAP

- Runtime version: **3.14.2**.
- Pinned published package: `https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js`.
- SHA-256: `c174bfce53a729418d57a8ad8625e7247c793a22fef8e2851e3cfa3de9cd8280`.
- License: [GSAP Standard License](https://gsap.com/standard-license), **not MIT**.
- Original runtime header: “Copyright 2025, GreenSock. All rights reserved. Subject to the terms at https://gsap.com/standard-license.”

The vendor runtime is not committed. `setup-runtime.mjs` downloads the pinned official published package into ignored `assets/gsap.min.js`, verifies its digest, and preserves its original license header. Review the applicable terms before redistributing or reusing the runtime.

## Inter

The composition requests HyperFrames' built-in **Inter** font; no standalone font binary is committed. The pinned HyperFrames renderer embeds the font for offline playback in the render. Inter is distributed under the SIL Open Font License 1.1; see the [upstream Inter license](https://github.com/rsms/inter/blob/master/LICENSE.txt).

## Product captures

`assets/ui.png`, `shop.png`, `before.png`, `after.png`, `control.png`, and `buggy-replay.webm` are local captures of this project's synthetic application. They contain no customer data, credentials, or personal browser session. `assets/provenance.json` links the selected engineering evidence to its evaluation directory and immutable saved-test digest.
