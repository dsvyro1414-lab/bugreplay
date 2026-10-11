# BugReplay

Turn a browser bug report into a verified Playwright reproduction.

The runner investigates one defect class in a controlled Chromium shop: cart items disappearing after checkout/address changes. It receives the report, expected behavior, URL, and browser observations. A deterministic compiler saves the complete recorded setup and test; independent processes replay that file without an LLM.

## Current status

Agent A's engine is implemented and tested on explicit synthetic fixtures with real Chromium and standalone replay processes. A real LLM client and neatlogs integration are implemented. Live discovery, sponsor ingestion, and acceptance of Agent B's shop have **not** passed: current AWS inference calls return 403, neatlogs hosted preflight fails TLS/connection checks, and B's application branch is not integrated in this checkout.

See [engine handoff](scripts/ENGINE-STATUS.md), [shared DOM contract](packages/contracts/DOM.md), [plan](plan.md), and B's [development log](hackathon.md). Synthetic tests are engineering checks, not live discovery evidence.

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

Copy `.env.example` to `.env`, then set `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL` and `NEATLOGS_API_KEY` server-side. Alternatively set `BUGREPLAY_ENV_FILE=/absolute/path/to/private.env`; process environment overrides file values. This file is read explicitly and is never copied into the repository. Never use `VITE_` variables for keys.

For AWS IAM, set `LLM_PROVIDER=bedrock`, `LLM_MODEL` to an accessible Bedrock model ID, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` (and temporary `AWS_SESSION_TOKEN` where applicable). The AWS SDK signs Converse requests. Console credentials or AWS credits alone do not prove inference permission. Do not put IAM secrets in `LLM_API_KEY`.

```sh
npm run doctor:neatlogs
npm run smoke:llm
```

Doctor must verify a finalized hosted readback. If it fails, real investigations stop with an honest blocker before opening the browser. Smoke checks API/JSON access only, not investigation quality. SDK spans capture workflow, browser tools, model requests, compilation and verification; shutdown drains telemetry.

## Start

After integrating Agent B's packages, named `@bugreplay/web` and `@bugreplay/demo-shop`:

```sh
npm run dev                 # runner :3001, web :5173, buggy shop :4173
npm run dev:control         # corrected shop :4174, separate terminal
```

Before B is integrated, `npm run dev` starts the available runner and reports the missing workspaces. To start only the runner use `npm run dev:runner`. It binds to loopback. Configure the web's Vite `/api` proxy to `http://localhost:3001`.

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

## Development and hackathon

Agent A owns runner/contracts/root/scripts. Agent B owns web/shop/evals/evidence/demo/cfo.ai. Keep credentials and unreviewed recordings out of Git. Entire project hooks are configured; each coding environment must approve/verify its hooks and a real checkpoint. Imported transcript checkpoints do not prove automatic hooks worked.

The [plan](plan.md) defines neatHack sponsor/demo/submission gates. No completed cfo.ai model, live benchmark, trace-driven improvement, submission or final Discord cutoff is claimed here.
