# Web UI integration checks

From the repository root, with the pinned Node.js 24 runtime and Chromium installed:

```sh
node node_modules/tsx/dist/cli.mjs --test apps/web/test/browser.test.ts
```

The suite starts its own Vite server and an explicit synthetic HTTP fixture API on ephemeral loopback ports. A real headless Chromium browser exercises the production React application through that proxy. No fixture adapter is included in `apps/web/src`, and the application has no mock-mode switch.

These checks cover the UI contract: confirmed evidence, recorded steps and original downloads, a 409 resume, pending cancellation, same-ID recovery, browser Back (including duplicate history entries after terminal polling stops), network reconnection, bad artifact responses, and invalid reproduction JSON. They make no model requests, spend no API credits, and are **not** evidence of autonomous investigation, bug discovery, independent runner verification, or sponsor integration. Those require separate real-run acceptance.

Each scenario has a hard test deadline, browser actions are bounded, and synchronization uses visible state or network events rather than fixed sleeps. All servers and browser contexts are closed after the suite.
