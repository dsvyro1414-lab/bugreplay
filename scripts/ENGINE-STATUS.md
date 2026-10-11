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

On the original network, Neatlogs local Doctor passed but hosted readback failed. TLS failure followed both official ingest SNI names in Node/OpenSSL/curl/Chrome, while documentation controls worked. DNS agreed across resolvers; no explicit proxy or active listed VPN was found. An active third-party host network filter was found later. The owner disabled it and macOS reported `activated disabled`; repeated TLS/Doctor checks still failed identically. Its responsibility was not established. `npm run doctor:network` provides a credential-free repeatable check, verified on Node 24.21.0: docs TLS passed, both ingest hosts failed at that stage. Typecheck passed after adding this utility. No TLS bypass or undocumented endpoint substitution was used. Key validity was unverified until the successful hosted probe below.

Access recovery after switching to a personal hotspot, October 11: Node 24 verifies TLS 1.3/certificates for both official ingest hosts, using the same runtime and observed ingest IPs. Hosted Doctor now passes with the existing key/default US endpoint, trace `d8fc1cf3a0726f795610b560d6516746`, and finalized readback verified. Evidence: `artifacts/tooling/neatlogs-network-diagnostic-2026-10-11T15-30-43-284Z.json`, `artifacts/tooling/neatlogs-preflight-1791732645530-74087d6b.json`. The earlier network failures above are historical. The host filter remains reported `activated disabled`; success after restoring its original state has not been tested. Original-network repair and a specific culprit are unverified. This is genuine access recovery evidence, not autonomous discovery or an investigation trace.

One fresh post-hotspot SDK Converse check still returned HTTP 403 for the selected GPT OSS 120B model, with missing `bedrock:InvokeModel` identity permission (`artifacts/tooling/aws-hotspot-access-smoke-1791732879989.json`). AWS recovery still requires administrator action; no model investigation has run.

Entire provenance correction: the automatic checkpoint attached to commit `ec2a755` selected an unrelated Codex session sharing the workspace. Its exact local and remote checkpoint ref `refs/entire/checkpoints/RK/01M4NSHFZ6W6X733W3SR5BCHRK` was removed and remote absence verified. The commit trailer remains historical and must not be counted as BugReplay checkpoint evidence. All four remaining checkpoint metadata records identify the correct BugReplay session. Future A commits use per-command hook bypass until automatic session selection is fixed; the repository-wide hook configuration and other sessions were not changed. Do not publish a new full transcript without reviewing/redacting unrelated app/thread metadata. Automatic commit-linked provenance remains unverified.

The refreshed remote B branch still contains planning only and neither shop port is listening. Remaining P0 gates: working inference credentials/permissions, B's shop/UI integration, three live investigations with genuine neatlogs traces, a real observed trace-driven improvement, automatic Entire checkpoint evidence, and B's independent acceptance. cfo.ai/demo/submission/Discord belong to B/team and remain unverified by A.

## Integration for B

Integrate commits from `agent-a-engine` without replacing B-owned files. Use shared `@bugreplay/contracts`; do not duplicate schemas. Root pins React, ReactDOM, Vite, React plugin and React/Node types. Send additional dependency requests to A.

Expected workspace package names:

- `apps/web`: `@bugreplay/web`, `dev` on 5173; Vite `/api` proxy to `http://localhost:3001`.
- `apps/demo-shop`: `@bugreplay/demo-shop`, `dev` on 4173 and `dev:control` on 4174. Keep shop state browser-local.
- Implement `packages/contracts/DOM.md`, including a layout-visible empty save status and cart region. The hidden bug trigger stays in B's shop; never add it to runner input.

`POST /api/runs` starts background work; poll `GET /api/runs/:id`. Artifact and screenshot URLs are relative to runner/proxy. The run may honestly end inconclusive for missing access. No mock adapter exists in the production runner. Model/telemetry fixtures are restricted to tests through direct internal test injection; HTTP cannot choose them.

When access is fixed: run `npm run doctor:neatlogs`, `npm run smoke:llm`, start shops/runner/UI, then `npm run test:acceptance` and `npm run eval`. Keep `artifacts/acceptance-*.json` and inspect saved spec/stdout/verification/control/video independently. A 2/2 regression failure is an expected red test; `npm run repro` exits 1 on the buggy target and 0 on corrected target, 2 for automation/inconclusive failure.
