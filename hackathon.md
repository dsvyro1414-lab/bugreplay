# BugReplay development log

## Historical starting state

Repository setup date: October 10, 2026, America/Denver.

- The product scope and two-agent implementation plan are documented in `plan.md`.
- Repository instructions and the project README are present.
- No application code, workspace packages, dependency lockfile, or automated checks exist yet.
- No agent investigations, reproduction tests, videos, or benchmark results have been produced.
- The Entire CLI was not found on the initial machine. Setup and checkpoint verification are pending.
- LLM API access, neatlogs ingestion, cfo.ai access, and the teammate's development environment have not been verified.

## First implementation milestone

Publish the shared contracts and make a real browser action visible through the runner API, including a saved screenshot and a neatlogs trace. This is the first vertical slice, not completion of the MVP.

## Evidence to collect

- Actual baseline and improved agent traces for the same evaluation case.
- The corresponding code change and Entire checkpoint.
- Saved regression test, two clean verification runs, and replay video.
- The unchanged test passing on the corrected control.
- Independent evaluation results, including inconclusive and negative cases.
- A cfo.ai business model covering pricing, costs, revenue, and runway.
- Public development posts and the final demo/submission links.

## Current product status — October 12, 2026

Agent B's product branch now includes the investigation UI, real demo shop, corrected control, independent scripted product checks, and a prepared cfo.ai input brief. The engine baseline is `d892d7d`. This is implemented product work with verified engineering behavior; live-model P0 acceptance is still pending.

- Engine regression suite: **32/32 passed** locally on Node.js 24.19.0. It uses explicit test fixtures, not real model discovery. See [engine check](docs/evidence/engine-baseline-check.json).
- Product evaluation: **5/5 passed** using real Chromium and the actual shop. The saved test produces the intended failure twice on buggy and passes unchanged on fixed. Selector/navigation faults remain inconclusive. See [evidence](docs/evidence/product-checks.json) and [handoff](docs/evidence/product-handoff.md).
- The web uses the real runner API and shared schemas, including cancellation, polling, run recovery, screenshot history, registered downloads, saved-test inspection, and replay video. No mock runner is selectable in production.
- Web UI contract suite: **9/9 passed** in real Chromium against a separate explicit HTTP fixture. It verifies original downloaded bytes, reload without duplicate submission, conflict/cancellation, reconnection, error handling, and browser history. The terminal same-ID Back failure was reproduced, then fixed and checked. See [web checks](docs/evidence/web-ui-checks.json).
- A separate clean source copy passed ordinary `npm ci`, TypeScript, and both production builds. The four new workspace lock entries preserve all existing dependency metadata. See [clean-install check](docs/evidence/clean-install-check.json).
- Local interactive UI/API check created run `44dc0497-9015-4c17-a294-d7acac5ec60b` and recovered it after reload. It honestly stopped before browser/model activity because this checkout has no `NEATLOGS_API_KEY`: zero browser actions and unavailable model cost. This proves error/recovery behavior, not an investigation.
- Entire captured a genuine documentation checkpoint before product coding: `01M4QMYYBN005FN5PFMRB1XD5T`, commit `c1eba1ec4e99a33608942774f0fe6bc38659b3f5`, scoped to the correct new BugReplay session. See [reviewed metadata](docs/evidence/entire-readiness-checkpoint.json). It is not evidence of the later trace-driven improvement, which remains pending.
- [cfo-model-input.md](docs/evidence/cfo-model-input.md) separates pricing assumptions from unmeasured usage costs. It is input preparation, not a completed cfo.ai model.
- [HyperFrames product preview](demo/bugreplay-product-preview.mp4) rendered and reviewed: 52 seconds, 1280 × 720, 30 fps, 1.22 MB, no audio. It uses actual UI/shop screenshots and the original three-second saved-test replay at 1×. The persistent scripted/no-live-model label and final remaining-gates scene prevent it being mistaken for final acceptance. HyperFrames checks, full video decode, and scene/replay frame inspection passed; [reproducible source](demo/README.md) is included.

## Submission status

Not submitted. A final live-model demo and cfo.ai business-model evidence remain pending. The included product preview is visibly labeled as scripted engineering evidence. Confirm the final submission cutoff and official submission post before publishing the entry.

### October 12 follow-up: financial model and final recording materials

- Added a complete assumption-based [12-month financial workbook](docs/evidence/finance/README.md), with Base/Downside inputs, all-run measured-cost intake, contribution sensitivity, revenue, gross profit and monthly cash. The initial scenarios reconcile to independent calculations. Missing costs and duplicate run IDs remain visible; temporary QA rows were removed.
- At the assumed $49/100 offer, 70% contribution target and 3% + $0.30 payment fee, variable run cost must be at most $0.1293 before fixed hosting. The assumed Downside cost of $0.285 exceeds that threshold. This informs a pricing/allowance decision, not a measured profitability claim.
- The browser reached CFO.ai plan selection, not an active modeling workspace. No paid plan was activated. The workbook, scenario CSV and [Ari prompt](docs/evidence/finance/cfo-transfer-prompt.md) are ready for transfer; sponsor completion is still open.
- Added the [2:50 final-demo recording kit](demo/final/README.md): scene timing, English voiceover/captions, exact evidence request to Agent A, manifest validator and unpublished submission copy. It explicitly requires genuine run/trace/checkpoint/CFO.ai captures before final assembly.
- Rechecked the public event page on October 12: its planned submission window converts to 16:30–21:25 Moscow that day. The final Discord cutoff and official submission post still require confirmation.

## Development entries

Append entries with a timestamp, owner, change, actual verification, and evidence links. Do not mark planned work as completed.

### 2026-10-12 — Agent B product implementation

Integrated the published engine baseline without changing its runtime code or contracts. Added `apps/web`, `apps/demo-shop`, and `evals/product.test.ts`. Preserved Agent A's dependency versions and root scripts. The PR proposes four generated lockfile workspace registrations for Agent A's review: without them `npm ci --dry-run` reports the two missing product workspaces. No existing package metadata or dependency version changes are included.

Independent review checked shop/DOM/compiler/verifier compatibility and the product evaluation's assertion classification, control-file identity, and evidence. UI review prompted bounded API/artifact requests and corrected browser-history recovery. See the product handoff for the engine's missing registration of dedicated verification PNGs and the remaining live-model, trace-improvement, business-model, and final-demo gates.
