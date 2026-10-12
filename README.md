# BugReplay

Turn a browser bug report into a verified Playwright reproduction.

The runner investigates one defect class in a controlled Chromium shop: cart items disappearing after checkout/address changes. It receives the report, expected behavior, URL, and browser observations. A deterministic compiler saves the complete recorded setup and test; independent processes replay that file without an LLM.

## Current status

The integrated application has one verified autonomous live-model discovery: selected run `b8ffd757-6aed-405d-b7ac-ed3b1c4d9236` produced two intended assertion failures in independent clean processes, and the byte-identical saved test passed the corrected control with only its URL changed. The latest evaluation confirmed **1/3** buggy investigations; two did not reproduce the defect. All outcomes and original recordings are retained. See the [selected proof](docs/evidence/live-confirmed-2026-10-12/README.md) and [complete latest cohort](docs/evidence/live-fourth-series-2026-10-12/README.md). This is one controlled shop and one defect class.

The approved LiteLLM gateway ran `claude-sonnet-4.6`; Neatlogs Doctor, model smoke and finalized selected-trace hosted readback passed. The current engine suite passed **46/46** and root/web/shop typechecks passed. Genuine Entire checkpoints cover the actual engine changes. CFO.ai contains the editable 12-month planning model and a separate observed engineering-cost appendix. Private credentials are not in Git. Access checks and synthetic tests are distinct from the live discovery evidence.

See [engine handoff](scripts/ENGINE-STATUS.md), [access recovery and administrator requests](scripts/ACCESS-RECOVERY.md), [shared DOM contract](packages/contracts/DOM.md), [plan](plan.md), and B's [development log](hackathon.md). Synthetic tests are engineering checks, not live discovery evidence.

## Install and check

Use Node.js 24 LTS (`.nvmrc`) and npm.

```sh
npm ci
npx playwright install chromium
npm run typecheck
npm test
```

The suite checks API, budgets, browser isolation/refs, compiler, exact failure classification, unchanged negative control, inconsistent results, video completion, and provider transport failures. Tests use synthetic model/telemetry fixtures; production never silently substitutes those fixtures.

## Configure server access

Copy `.env.example` to `.env`, then privately set `OPENAI_API_KEY` and `NEATLOGS_API_KEY` server-side. The template uses the supplied LiteLLM `OPENAI_BASE_URL=https://litellm.vision.aivar.app/v1` and `MODEL=claude-sonnet-4.6`. Keep `.env` ignored and owner-readable only. Alternatively set `BUGREPLAY_ENV_FILE=/absolute/path/to/private.env`; process environment overrides file values. Never use `VITE_` variables for keys.

Existing `LLM_BASE_URL`, `LLM_API_KEY`, and `LLM_MODEL` variables remain supported; each nonblank `LLM_*` value takes precedence over its organizer alias. Avoid retaining settings from a previous provider. Use `LLM_PROVIDER=openai` for the hackathon gateway. Do not call Bedrock or request IAM/SCP changes for this event.

```sh
npm run doctor:neatlogs
npm run smoke:llm
```

For transport troubleshooting, `npm run doctor:network` checks certificate-verified TLS to the documented Neatlogs endpoints without reading or sending credentials. It saves a safe local diagnostic; it does not prove authenticated ingestion. The [access recovery guide](scripts/ACCESS-RECOVERY.md) records the approved gateway configuration and the observed hostname-dependent TLS failure.

Doctor must verify a finalized hosted readback. If it fails, real investigations stop with an honest blocker before opening the browser. Smoke makes one real request, checks an exact valid tool decision, and saves `artifacts/tooling/llm-smoke-*.json`; it does not evaluate investigation quality. SDK spans capture workflow, browser tools, model requests, compilation and verification; shutdown drains telemetry.

## Start

The product workspaces are named `@bugreplay/web` and `@bugreplay/demo-shop`:

```sh
npm run dev                 # runner :3001, web :5173, buggy shop :4173
npm run dev:control         # corrected shop :4174, separate terminal
```

To start only the runner use `npm run dev:runner`. It binds to loopback. The web's Vite `/api` proxy forwards to `http://localhost:3001`. Open `http://127.0.0.1:5173` for the investigation workspace. Missing access is shown explicitly; production has no mock mode.

Allowlisted origins default to `http://localhost:4173,http://localhost:4174`. `CONTROL_BASE_URL` defaults to 4174. Arbitrary websites, HTTP redirects, popups, external resources, authentication and payments are unsupported. Empty save-status and cart nodes must retain visible layout per the DOM contract.

## API

```sh
curl http://localhost:3001/api/health
curl -X POST http://localhost:3001/api/runs \
  -H 'Content-Type: application/json' \
  -d '{"targetUrl":"http://localhost:4173","complaint":"Sometimes the cart empties after I change my delivery address. Find the conditions.","expected":"Cart items and quantities must remain after saving a changed address.","oracleKind":"cart_preserved_after_checkout_change"}'
```

POST returns `202 {runId}`; another active run receives 409. Poll `/api/runs/<id>` once per second. POST `/api/runs/<id>/cancel` requests cancellation. Download only registered `/api/runs/<id>/artifacts/<name>` files. Runtime types and Zod schemas are exported by `@bugreplay/contracts`.

Results and events persist after every event under `artifacts/<id>/`. Interrupted runs become `inconclusive` after a restart. Outputs include screenshots, `report.md`, and, for a candidate, `reproduction.json`, `repro.spec.ts`, `verification.json`, before/after images and replay video. Corrected-control evidence is separate. Old candidate source/evidence is retained locally. Videos are exposed only after their browser context closes.

## Verify and replay

```sh
npm run test:acceptance
npm run eval                # 3 buggy investigations, then 1 fixed investigation
npm run repro -- --run <id> --base-url http://localhost:4173
npm run repro -- --run <id> --base-url http://localhost:4174
```

Acceptance needs real model/sponsor access and B's running buggy/fixed shops. It saves actual results under `artifacts/acceptance-*.json`; it is not B's independent acceptance audit.

The saved test asserts correct behavior. Replay exits **1** for the intended regression failure on the buggy shop, **0** for a passing corrected control, and **2** for an inconclusive automation/setup failure. Only two consistent intended `BUGREPLAY_CART_PRESERVATION` assertion failures plus an unchanged passing control produce `bug_confirmed`. One failure, missing setup, selector/navigation errors, stale save notifications or inconsistent results are inconclusive. An exhausted functioning investigation yields `not_reproduced` within its budget.

Defaults: 40 real browser actions, 40 model transport attempts (including retry), 4 declared hypotheses, 6 minutes investigation, 2 minutes verification, 8 minutes total. Configure `MAX_ACTIONS`, `MAX_MODEL_CALLS`, `MAX_HYPOTHESES`, `INVESTIGATION_MS`, `VERIFICATION_MS`, `TOTAL_MS`. Missing token/cost information remains absent; unknown cost is not zero.

Each real run saves `model-usage.json`, including every transport attempt and reported tokens even when decision parsing fails. `usageComplete` distinguishes complete reported usage from partial totals. When supplied, `x-litellm-response-cost` records gateway accounting cost before parsing; `costComplete` requires coverage of every attempt. Invoice charges, promotional credits, browser and storage costs remain separate and unknown without evidence. The parser accepts a strict JSON object, one unambiguous fenced JSON object, or a complete JSON suffix after prose with no competing objects. The same strict tool schema applies before any browser action. Ambiguous, truncated and non-object decisions remain rejected. One format-repair request may use the existing two-transport-attempt/30-second limit and remaining global call budget; it receives no prepared bug recipe or rejected-response reasoning. Exhausted format retries preserve browser state and may continue within those same global budgets, stopping after three consecutive exhausted decisions.

Browser observations explicitly identify visible disabled controls without providing action refs. This exposes actual UI availability, including inherited disabled state, without teaching the investigator a reproduction recipe.

Original investigation recordings are saved per clean browser episode as `investigation-episode-N.webm`, including failed episodes. They are finalized when the context closes and registered as API downloads; independent verification videos remain separate.

## Development and hackathon

Watch the reviewed [170-second final demo](demo/bugreplay-final-demo.mp4) or the [138-second X version](demo/bugreplay-final-demo-x.mp4). Both show actual live-investigation and replay footage, the unchanged passing control, and authentic Neatlogs, Entire and CFO.ai evidence. Export viewers and edited excerpts are explicitly labeled. [Montage source, captions and media audits](demo/final-cut/README.md) document provenance and limits. The older [52-second product preview](demo/bugreplay-product-preview.mp4) remains a scripted engineering preview.

Product-only checks and builds do not require private model or telemetry keys:

```sh
npm exec -- tsx --test evals/product.test.ts
node node_modules/tsx/dist/cli.mjs --test apps/web/test/browser.test.ts
npm run build --workspace @bugreplay/web
npm run build --workspace @bugreplay/demo-shop
```

The scripted product suite starts both shops itself. Its known fixture setup must not be supplied to the runtime model. The web tests use a separate explicit fixture API and real Chromium; they verify UI behavior, not discovery. See the [evidence index](docs/evidence/index.md) for actual results and outstanding external submission steps. Completed replay before/after PNGs are registered for API downloads alongside investigation screenshots and replay videos. Real investigations also save `trace.json` with the Neatlogs trace ID, run ID, model and source commit.

Agent A owns runner/contracts/root/scripts. Agent B owns web/shop/evals/evidence/demo/cfo.ai. Keep credentials and unreviewed recordings out of Git. Entire project hooks are configured; each coding environment must approve/verify its hooks and a real checkpoint. Imported transcript checkpoints do not prove automatic hooks worked.

The [plan](plan.md) defines neatHack sponsor/demo/submission gates. [Trace-guided changes and genuine Entire checkpoints](docs/evidence/live-improvement-2026-10-12/README.md) and the [editable CFO.ai model with measured-cost limits](docs/evidence/finance/README.md) are reviewed. The public quote-post, team/check-in verification, final submission confirmation and latest Discord cutoff remain pending. Prepared evidence and videos do not establish an accepted hackathon entry.
