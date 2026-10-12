# BugReplay development log

Latest verified progress is appended in the October 12 integration entry below. Historical snapshots retain the state known at that time.

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

## Historical product snapshot — October 12, before live integration

Agent B's product branch now includes the investigation UI, real demo shop, corrected control, independent scripted product checks, and a prepared cfo.ai input brief. The engine baseline is `d892d7d`. This is implemented product work with verified engineering behavior; live-model P0 acceptance was still pending at this stage.

- Engine regression suite: **32/32 passed** locally on Node.js 24.19.0. It uses explicit test fixtures, not real model discovery. See [engine check](docs/evidence/engine-baseline-check.json).
- Product evaluation: **5/5 passed** using real Chromium and the actual shop. The saved test produces the intended failure twice on buggy and passes unchanged on fixed. Selector/navigation faults remain inconclusive. See [evidence](docs/evidence/product-checks.json) and [handoff](docs/evidence/product-handoff.md).
- The web uses the real runner API and shared schemas, including cancellation, polling, run recovery, screenshot history, registered downloads, saved-test inspection, and replay video. No mock runner is selectable in production.
- Web UI contract suite: **9/9 passed** in real Chromium against a separate explicit HTTP fixture. It verifies original downloaded bytes, reload without duplicate submission, conflict/cancellation, reconnection, error handling, and browser history. The terminal same-ID Back failure was reproduced, then fixed and checked. See [web checks](docs/evidence/web-ui-checks.json).
- A separate clean source copy passed ordinary `npm ci`, TypeScript, and both production builds. The four new workspace lock entries preserve all existing dependency metadata. See [clean-install check](docs/evidence/clean-install-check.json).
- Local interactive UI/API check created run `44dc0497-9015-4c17-a294-d7acac5ec60b` and recovered it after reload. It honestly stopped before browser/model activity because this checkout has no `NEATLOGS_API_KEY`: zero browser actions and unavailable model cost. This proves error/recovery behavior, not an investigation.
- Entire captured a genuine documentation checkpoint before product coding: `01M4QMYYBN005FN5PFMRB1XD5T`, commit `c1eba1ec4e99a33608942774f0fe6bc38659b3f5`, scoped to the correct new BugReplay session. See [reviewed metadata](docs/evidence/entire-readiness-checkpoint.json). It is not evidence of the later trace-driven improvement, which remains pending.
- [cfo-model-input.md](docs/evidence/cfo-model-input.md) separates pricing assumptions from unmeasured usage costs. It is input preparation, not a completed cfo.ai model.
- [HyperFrames product preview](demo/bugreplay-product-preview.mp4) rendered and reviewed: 52 seconds, 1280 × 720, 30 fps, 1.22 MB, no audio. It uses actual UI/shop screenshots and the original three-second saved-test replay at 1×. The persistent scripted/no-live-model label and final remaining-gates scene prevent it being mistaken for final acceptance. HyperFrames checks, full video decode, and scene/replay frame inspection passed; [reproducible source](demo/README.md) is included.

## Historical submission snapshot — before live integration

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

### 2026-10-12 15:39 UTC — Agent A integration and independent Agent B evidence review

PR #1 was merged as `1e24e42786dad283913b6612078a5437c21cef9f`. Integration first reached `60d2294`; actual trace-driven runner improvements are recorded at `f7bee47c254afc38683b87ad6d30899f16180a47` and `2b541b20a97ef3df4261529bd48089792e01f2af`. Earlier dated failures remain preserved, rather than being overwritten by the selected success.

Historical cohort status reconciliation: first 4/4 inconclusive; second 4/4 inconclusive; **third 2 inconclusive + 2 not_reproduced, zero confirmed**; fourth 1 confirmed + 3 not_reproduced (three buggy cases plus one fixed). The third-stage non-discoveries must not be described as format-terminal failures.

- **Engineering verification:** the integrator reports **46/46 engine tests passed and full workspace TypeScript passed** after the latest engine changes. Earlier product evaluation 5/5 and web-contract checks 9/9 remain separately documented fixture-based engineering checks; no claim that those were autonomous discovery. Live RunView UI inspection, saved-test opening, original artifact downloads and an empty browser console were checked by the integrator. Independent B review fetched all 27 registered selected-run API artifacts, including all 4 verification PNGs and 3 top-level videos, with HTTP200, MIME and matching SHA-256.
- **Real access preflight:** `npm run doctor:neatlogs` passed finalized trace readback before the initial baseline and again at 15:26:19 UTC before the fourth series; `npm run smoke:llm` made a genuine one-call `claude-sonnet-4.6` request and verified a runtime decision. [Reviewed tooling summary](docs/evidence/live-confirmed-2026-10-12/tooling-summary.json) retains safe fields/hashes. Original `artifacts/tooling/` outputs remain ignored and local; these paths are provenance, not public download links. Keys/environment were not exported.
- **Selected real P0 proof:** run `b8ffd757-6aed-405d-b7ac-ed3b1c4d9236`, Neatlogs trace `9096d7e75454f94d4c9cd11011604e13`, model `claude-sonnet-4.6`, recorded source `2b541b2`. The complete trusted 13-action clean episode was compiled into `repro.spec.ts`; two separate clean Playwright processes reached exactly `BUGREPLAY_CART_PRESERVATION` (cart 2→0), not selector/setup failures. The same saved test passed on automatic fixed control (cart 2→2). Source test/candidate SHA-256 is `bd9c42ba5744e7ed47cec25dcc47dd0341f9c7da88d034a700014b4a169c208a`. [Independently reviewed proof, actual saved test, reports, PNGs and original videos](docs/evidence/live-confirmed-2026-10-12/README.md).
- **Preservation before manual control:** all 70 selected original files were archived and hash-checked before manual replay. The integrator then replayed a copied bundle with isolated `ARTIFACT_ROOT=artifacts/manual-control-2026-10-12` and only target `--base-url http://localhost:4174`. That separate replay passed with assertion/context completion; its test hash is identical. Independent audit verified all 70 originals remained unchanged and separately archived the 14 new/changed manual output files plus the saved test. [Manual evidence](docs/evidence/live-confirmed-2026-10-12/manual-control/audit.json).
- **Whole fourth evaluation, all outcomes:** three buggy investigations produced one `bug_confirmed` and two `not_reproduced`; fixed negative control produced `not_reproduced`. Discovery is **1/3 in this small stochastic buggy cohort**, not 3/3. `npm run eval` **exited 1**, because its stricter script expects all three buggy investigations confirmed. Preserve that command result. The [complete fourth-series audit](docs/evidence/live-fourth-series-2026-10-12/README.md) reconciles all 92 model calls, including 4 invalid responses, with RunViews: 248,293 input + 8,202 output tokens, 68 actions, 253.941s summed elapsed and $0.9546999 gateway-header accounting. All 159 original files are archived with hashes; all 9 unique videos fully decode.
- **Actual improvement evidence:** [stage history](docs/evidence/live-improvement-2026-10-12/README.md) retains genuine Neatlogs before and after trace IDs, actual diffs, and authentic Entire checkpoints `01M4RAVKR1DWCDKTJ3ZH5AZAY3` (response-suffix recovery) and `01M4RBGMN0JWSXDHD2TESXJ35A` (generic disabled-control observations, bounded format continuation and accounting). Both checkpoints were independently verified through live CLI metadata, saved metadata and commit footers. Latest cohort format-terminal failures are 0/4; a fixed-run bounded format error continued. Multiple generic changes/stochastic runs prevent isolated causal attribution; action/time/token increases are deeper exploration, not a cost/speed improvement. The reviewed Entire visual is explicitly a **local CLI metadata export viewer**, not the official Entire app UI. Hosted Neatlogs before screens were inspected; **hosted after screenshot/capture is still pending** following a locked Mac session, although the after trace identity and local evidence exist.
- **CFO.ai:** a saved native model now exists in the active owner's workspace. [Reviewed workspace evidence](docs/evidence/finance/cfo-workspace-review.md) and [workbook audit](docs/evidence/finance/cfo-workbook-audit.json) reconcile the Base/Downside 12-month forecasts and sensitivity, and review a saved driver edit, dependent native-grid recalculation and restoration. The independent Canvas preview state is explicitly distinguished from saved model values. Owner workspace links remain in local handoff; unauthenticated judge access is unverified. The [all-attempt cost ledger](docs/evidence/finance/actual-attempt-cost-ledger.md) retains all 17 saved runtime investigations, two successful smokes and five rejected access probes, distinguishes recovered token counts/conditional gateway-rate estimates/complete latest headers/cash invoices/credits, and leaves complete actual invoice cost unknown.
- **Pricing decision:** the selected confirmed run alone has $0.1563342 complete response-header accounting, exceeding the hypothetical $0.1293 per-investigation variable ceiling at $49/100 and 70% contribution before fixed hosting. Browser/storage costs and cash/credits remain unknown. Keep both finance models in Planning; do not present assumed $0.08 all-in run cost as measured profitability.

**Submission gates remain open:** the final ≤3-minute sponsor demo is not yet verified/published; team name/roster and per-member registration/check-in are not verified; public #neatHack and mandatory launch quote/demo post links are not verified; final Discord cutoff/official post is not verified; the leader's official form submission and confirmation are not verified. The official route requires both the launch quote with demo/tags and the verified-email form submission; see the [recorded official-entry checklist](docs/evidence/live-third-series-2026-10-12/submission-checklist.md). The 52-second engineering preview and a prepared draft do not complete these gates.
