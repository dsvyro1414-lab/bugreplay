# Agent A engine handoff

Scope: `agent-a-engine`; no Agent B application, shop, evaluation, development-log, demo, or cfo.ai files were edited.

## Implemented

- Frozen Zod API/types in `packages/contracts/src/index.ts`; stable shop adapter in `packages/contracts/DOM.md`.
- Fastify polling API, one active run/409, cancellation, allowlisted artifacts, JSON/JSONL persistence, interrupted-run recovery as inconclusive.
- Real Playwright browser adapter: accessible exact locators, fresh refs, screenshots, clean episodes, trusted full-prefix action log, nonempty checkpoints, semantic restrictions, origin restrictions.
- Configurable OpenAI JSON/Bedrock Converse model client. One transient retry, counted transport attempts, deadlines, reported token usage. Unknown cost stays absent.
- Bounded adaptive loop and concise structured state; no runtime source access, arbitrary evaluation, prepared trigger, model-generated code, or model-controlled assertion.
- Deterministic standalone test compiler. Independent Playwright processes, clean contexts, matching cart-preservation assertion, fresh address-save completion, two consistent failures, unchanged passing control, closed-context video.
- neatlogs workflow and nested spans, masked credentials, final metadata, lifecycle drain. A finalized hosted Doctor readback is required before the first real investigation.

## Verified evidence and limitations

Verified: `npm run typecheck` passed. The complete suite passed **28/28** on Node 24.21.0 (`npm exec --yes --package=node@24 -- node node_modules/tsx/dist/cli.mjs --test apps/runner/test/*.test.ts`). The automated suite uses explicitly synthetic DOM/model/telemetry transport fixtures. Chromium and saved-test verification processes are real. This does **not** establish autonomous live-model discovery or acceptance of B's shop.

Clean remote clone of `d22aa4a121c0d3895b2a79c8a9ac8db5aac073c0`: `npm ci`, `npm run typecheck`, and the same Node 24 suite all passed (28/28). `npm run dev` reached a healthy runner, explicitly reported the absent B workspaces, and shut down without leaving the runner alive. The temporary clone was used only for verification.

Verified cases include exact/scoped accessible names, full setup preservation, stale-ref recovery, action/call caps, clean context isolation, cancelled startup, prohibited cart mutations, origin/redirect/WebSocket restrictions, invalid setup, stale save signals, missing selectors, unavailable navigation, two intended failures, an unchanged passing control, inconsistent repeat rejection, durable API results, unknown cost, and credential-free verifier environments.

Actual access checks, October 10, 2026 (Denver):

- Provided IAM credentials accepted by STS. Bedrock model listing denied; direct Converse calls to GPT OSS 120B and Nova Pro both returned AccessDeniedException/403. No live model investigation ran.
- Supplied neatlogs key was loaded from an external env file without printing it. Local SDK Doctor passed. Authenticated hosted probe failed with FLUSH_TIMEOUT and BACKEND_CONNECTION_FAILED; official ingest hosts fail TLS from this environment. No exported investigation trace is claimed.
- Safe local diagnostics: `artifacts/tooling/aws-model-access-check.json`, `artifacts/tooling/neatlogs-doctor-probe.json`, `artifacts/tooling/neatlogs-preflight-*.json`. Raw artifacts are ignored, not public evidence links.
- Entire CLI 0.11.4 installed and enabled for Codex. Real imported session checkpoints verified. Current `entire status` reports enabled Codex hooks and synchronization to origin, with no pending-approval message. Imported transcript checkpoints are distinct from automatic commit-linked checkpoints. Dashboard synchronization/login remains unverified.
- Imported checkpoint `01M4MP86HFR7WS509A9XVRRD2G` contains actual runner/verifier change context and the engine commit command; checked via `entire checkpoint explain <id> --transcript` without publishing raw transcript text in project files.
- Live runner access-gate check: health HTTP200, create HTTP202, run `66349e06-fc57-4de9-836f-b0a0d7ca0584` ended inconclusive with the observed neatlogs failure, 0 browser actions, and a saved report. This is a preflight check, not a real investigation.
- npm audit reports upstream neatlogs/OpenTelemetry/protobuf dependencies. No forced incompatible downgrade or major override was applied. This local controlled MVP is not a production deployment.

Fresh access diagnosis, October 11, 2026: STS/GetUser succeed; direct Converse to GPT OSS 120B and 20B returns missing `bedrock:InvokeModel` identity permission. IAM simulation additionally returns `explicitDeny` and `AllowedByOrganizations=false` for those resources. Organization-level recovery and a minimal one-model identity policy are documented in [access recovery](ACCESS-RECOVERY.md); no policy changes were attempted.

Neatlogs local Doctor still passes; hosted readback still fails. Verified TLS failure follows both official ingest SNI names in Node/OpenSSL/curl/Chrome, while documentation controls work. DNS agrees across resolvers; no explicit proxy or active listed VPN was found. An active third-party host network filter was found later. The owner disabled it and macOS reported `activated disabled`; repeated TLS/Doctor checks still failed identically. Its responsibility is unproven; second-network/machine isolation is still needed. `npm run doctor:network` provides a credential-free repeatable check, verified on Node 24.21.0: docs TLS passes, both ingest hosts fail. Typecheck passes after adding this utility. No TLS bypass or undocumented endpoint substitution was used. The key's validity/region remains unverified.

The refreshed remote B branch still contains planning only and neither shop port is listening. Remaining P0 gates: working inference credentials/permissions, working neatlogs ingest/readback, B's shop/UI integration, three live investigations, a real observed trace-driven improvement, automatic Entire checkpoint evidence, and B's independent acceptance. cfo.ai/demo/submission/Discord belong to B/team and remain unverified by A.

## Integration for B

Integrate commits from `agent-a-engine` without replacing B-owned files. Use shared `@bugreplay/contracts`; do not duplicate schemas. Root pins React, ReactDOM, Vite, React plugin and React/Node types. Send additional dependency requests to A.

Expected workspace package names:

- `apps/web`: `@bugreplay/web`, `dev` on 5173; Vite `/api` proxy to `http://localhost:3001`.
- `apps/demo-shop`: `@bugreplay/demo-shop`, `dev` on 4173 and `dev:control` on 4174. Keep shop state browser-local.
- Implement `packages/contracts/DOM.md`, including a layout-visible empty save status and cart region. The hidden bug trigger stays in B's shop; never add it to runner input.

`POST /api/runs` starts background work; poll `GET /api/runs/:id`. Artifact and screenshot URLs are relative to runner/proxy. The run may honestly end inconclusive for missing access. No mock adapter exists in the production runner. Model/telemetry fixtures are restricted to tests through direct internal test injection; HTTP cannot choose them.

When access is fixed: run `npm run doctor:neatlogs`, `npm run smoke:llm`, start shops/runner/UI, then `npm run test:acceptance` and `npm run eval`. Keep `artifacts/acceptance-*.json` and inspect saved spec/stdout/verification/control/video independently. A 2/2 regression failure is an expected red test; `npm run repro` exits 1 on the buggy target and 0 on corrected target, 2 for automation/inconclusive failure.
