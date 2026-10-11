# BugReplay — implementation plan for two agents

Date: October 10, 2026. Status: planning only; implementation and verification results do not exist yet.

## 1. What we are building

**A user bug report + a test website URL → discovered trigger conditions → an independently verified Playwright test, video, and report.**

The first version investigates one class of defects: **items unexpectedly disappear from the cart after changing the address or delivery settings**. We use one purpose-built shop in Chromium, without accounts or external payments. This MVP limitation must be visible in the README and demo.

Example input:

> Sometimes the cart becomes empty after I change the delivery address. Find the conditions that cause this. The items should remain in the cart.

The user provides a symptom, not the sequence that triggers the defect. The agent inspects the interface, tries conditions, uses the results of previous actions, and chooses its next step.

The task ends with a **confirmed reproduction**, rather than a fix to the shop. The intended outcome is an executable test that fails on the buggy version specifically because items are lost, and passes on the fixed control version.

### User flow

1. Enter the URL and bug report. For the MVP, the expected behavior is explicit: cart items must be preserved.
2. Click `Investigate`.
3. Follow a concise log showing what the agent is testing, what it observed, and what it chose to do next. Browser screenshots update alongside the log.
4. Receive `Bug confirmed`, `Not reproduced within budget`, or an explanation of the blocker.
5. Download `repro.spec.ts`, `report.md`, `reproduction.json`, and the reproduction video.

**Example outcome, not a predetermined solution:** “A normal address change works. The cart disappears only after a particular combination of promo code, delivery method, and address change. The discovered sequence reproduced the defect in 2/2 runs.”

### Why a separate product

Codex and Claude Code can also investigate websites and write tests. Our value is a complete process for one task: bounded investigation, consistent artifacts, separate verification without an LLM, and a distinction between an application defect and an automation failure. Claim superiority over stock Codex only after a fair comparison.

## 2. Required scope and deferred work

### P0 — must work before recording the demo

- A real LLM loop with browser tools; observations determine the next action.
- One test shop and one verifiable class of failure.
- An unsuccessful first hypothesis does not end the investigation: the agent changes the conditions.
- The saved test runs separately, without an LLM, twice from a clean state.
- Click, loading, and setup failures are never classified as a confirmed bug.
- The test, video, steps, expected/actual behavior, and verification results are available in the interface.
- The fixed shop serves as a negative control.
- neatlogs is connected from the first real runs; Entire is used during development; a financial model is created in cfo.ai.
- Reproducible startup instructions and submission evidence exist.

### P1 — only after P0

- Shorten the discovered sequence: remove one action at a time and keep a removal only after verification. Do not promise a mathematically minimal sequence.
- A second defect variant with a different trigger and a blind evaluation against it.
- A small comparison with stock Codex under equal conditions.
- SSE instead of simple status polling, if useful for the interface.
- Deploy the working interface if the local version is already reliable.

### Out of scope for this hackathon

Automatic fixes and PRs, Jira/Slack, payments, user accounts, complex authentication, arbitrary websites, multiple browsers, a mobile version, finding every type of bug, a team of LLM agents, browser video streaming, and full cloud infrastructure. One investigating agent and ordinary verification code are sufficient.

## 3. Responsibilities

**Agent A — the project owner's agent: execution and verification. Agent B — the teammate's agent: interface, shop, and independent evaluation.**

| Area | Owner | Deliverable |
| --- | --- | --- |
| Repository root, workspace, dependencies, shared types | A | Unified startup and a frozen contract |
| Browser tools, LLM loop, budgets, state log | A | Autonomous investigation |
| Test compilation, independent execution, error classification | A | Verified reproduction |
| HTTP API, events, artifact files, neatlogs | A | Working interface integration and traces |
| BugReplay interface | B | Form, progress, screenshots, results, downloads |
| Test shop, buggy and fixed versions | B | A realistic reproducible environment |
| Control cases and external result audit | B | False-positive and stability checks |
| Demo, cfo.ai, submission materials | B, with data from A | Video and business model |
| Entire | Each in their own environment; A collects evidence | Verifiable development history |
| Final integration and readiness decision | Both | Completed acceptance checklist |

### Avoiding conflicts

Use one Git repository with separate clones/branches: `agent-a-engine` and `agent-b-product`. A is the integrator. Do not rewrite history or overwrite another person's changes.

A creates the skeleton and contract first. B starts the interface with a local mock adapter and builds the shop in parallel. Once the contract is frozen, discuss changes in one short message explaining what changes and who must update their code. A owns `packages/contracts`, the root `package.json`, and the lockfile; B sends dependency requests to A.

Merge working increments every 2–3 hours. Connect the interface to the real API early in development. Clearly label mock mode and disable it in the final demo.

## 4. Minimal architecture

TypeScript, Node.js LTS, npm workspaces, Playwright + Chromium. Fastify for the API. Two simple Vite + React applications for the interface and shop. Shop state lives in localStorage, so a new browser context genuinely starts with an empty cart. No database is needed.

The LLM client uses a configurable OpenAI-compatible endpoint. Choose one available model provider that supports the required tool format; verify it with a small request in the first hour. Do not tie the project to one model name or confuse a coding-agent subscription with API access.

```text
apps/runner/          # A: API, agent, browser, compiler, verifier, neatlogs
apps/web/             # B: BugReplay interface
apps/demo-shop/       # B: test shop and its variants
packages/contracts/  # A: types + runtime validation for API/events/reproduction
scripts/              # A: unified startup, evaluation runner, replay CLI
evals/                # B: control cases and actual results
docs/evidence/        # B: selected evidence and links
artifacts/            # A: local run outputs; not all belong in Git
README.md             # A: startup; B adds demo and MVP limitations
hackathon.md          # B: development log, issues, links, submission
plan.md               # this document
```

Ports: web `5173`, runner `3001`, shop `4173`, fixed control `4174`. The Vite proxy forwards `/api` to the runner. All MVP services run locally. The runner permits only preconfigured test-shop origins.

### Commands to implement

```text
npm install
npx playwright install chromium
npm run dev                 # runner + web + buggy shop
npm run dev:control         # fixed shop on 4174
npm run typecheck
npm run test:acceptance
npm run eval
npm run repro -- --run <id> --base-url http://localhost:4173
```

These are target commands for the future implementation, not claims that they already exist. A nonzero `repro` exit code is expected on the buggy version because the test asserts correct behavior. Explain this in the README.

Keep secrets only in the runner environment: `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `NEATLOGS_API_KEY`. Add an `.env.example` without real values and a `.gitignore` for secrets and local recordings. A selects and pins root dependencies after checking the available environment.

## 5. Shared contract — freeze this first

The following types are the basis of `packages/contracts`. A adds Zod schemas. B must not create incompatible duplicates.

```ts
type RunStatus =
  | 'queued' | 'investigating' | 'verifying'
  | 'bug_confirmed' | 'not_reproduced'
  | 'inconclusive' | 'cancelled' | 'error';

interface CreateRun {
  targetUrl: string;
  complaint: string;
  expected: string;
  oracleKind: 'cart_preserved_after_checkout_change';
}

interface LocatorSpec {
  role: 'button' | 'link' | 'textbox' | 'combobox' | 'checkbox';
  name: string;
  exact: true;
  scope?: { role: 'region' | 'dialog' | 'listitem'; name: string };
}

type ReproStep =
  | { id: string; kind: 'goto'; path: string }
  | { id: string; kind: 'click'; locator: LocatorSpec }
  | { id: string; kind: 'fill'; locator: LocatorSpec; value: string }
  | { id: string; kind: 'select'; locator: LocatorSpec; value: string }
  | { id: string; kind: 'check'; locator: LocatorSpec; checked: boolean };

interface Reproduction {
  version: 1;
  complaint: string;
  expected: string;
  observed: string;
  steps: ReproStep[];
  oracle: {
    kind: 'cart_preserved_after_checkout_change';
    captureAfterStepId: string;
    compareAfterStepId: string;
  };
}

interface RunEvent {
  id: number; // monotonically increasing within a run
  runId: string;
  at: string; // ISO UTC
  type: 'status' | 'hypothesis' | 'action' | 'observation'
      | 'tool_error' | 'verification' | 'artifact' | 'completed';
  message: string;
  status?: RunStatus;
  screenshotUrl?: string;
  data?: Record<string, unknown>;
}

interface Artifact {
  kind: 'test' | 'report' | 'reproduction' | 'video'
      | 'screenshot' | 'verification';
  name: string;
  url: string;
  mimeType: string;
}

interface RunView {
  id: string;
  status: RunStatus;
  input: CreateRun;
  createdAt: string;
  updatedAt: string;
  events: RunEvent[];
  artifacts: Artifact[];
  verification?: {
    attempts: number;
    matchedFailures: number;
    verdict: 'confirmed' | 'not_matched' | 'inconclusive';
  };
  metrics: {
    actions: number;
    elapsedMs: number;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number; // omitted when cost has not been established
  };
}
```

| API | Response/action |
| --- | --- |
| `POST /api/runs` | `202 { runId }`; validate input and start a background task |
| `GET /api/runs/:id` | `RunView`, including accumulated events |
| `GET /api/runs/:id/events` | P1: SSE with `id`, `event: run_event`, `data: RunEvent` |
| `POST /api/runs/:id/cancel` | Request cancellation; close the browser and save the log |
| `GET /api/runs/:id/artifacts/:name` | A file belonging to this run |

In P0, the interface polls `RunView` once per second, receives the accumulated log, and removes duplicates by `event.id`. This is sufficient for progress and screenshot updates. SSE is P1; when adding it, use `Last-Event-ID` and preserve the same event contract.

Allow one active task per runner initially; a second run receives a clear `409`. Do not build a Redis queue. Persist JSON/JSONL after every event. After a server restart, an unfinished run becomes `inconclusive: runner restarted`; automatic browser-session recovery is outside P0.

## 6. Agent A: browser, investigation, and verification

### Runtime-agent tools

- `observe`: URL, visible text, available elements with `ref`, and a concise interface state.
- `click`, `fill`, `select`, `check`: act on a current `ref`.
- `readCart`: visible items and quantities through a DOM adapter.
- `checkpointCart`: save a nonempty cart and the current log position before testing conditions.
- `restart`: create a clean browser context and a new investigation episode.
- `submitCandidate`: identify the episode, cart checkpoint, and final action to verify; include all setup automatically.
- `finishWithoutRepro`: list the tested conditions and reason for stopping.

Every action returns a new observation; save a screenshot for the interface. The LLM receives compact DOM/text; sending images to the model is optional. References belong to a specific snapshot. A stale ref produces an understandable error and triggers a fresh inspection.

The handler saves a stable `LocatorSpec` when an action occurs. Prefer role + exact accessible name, with a scope where necessary. Do not use `nth(0)` for ambiguous elements. Check that the installed Playwright can provide the required roles and names in the first few hours. [Locator documentation](https://playwright.dev/docs/locators).

The runtime receives only the bug report, expected behavior, URL, and results of allowed tools. It has no filesystem access, shop source code, arbitrary JS/evaluate, fixture IDs, secret trigger conditions, or prepared solution. The internal adapter reads the DOM, not the React store or localStorage. The prompt must not contain a recipe for activating the defect.

### Investigation

1. Inspect the application; add items through the normal UI if the cart is empty.
2. Save the nonempty cart using `checkpointCart`.
3. State a short, testable hypothesis and perform actions.
4. If the address saves successfully and the items remain, record the negative result and try another condition.
5. If items disappear, send the recorded candidate to the separate verifier.
6. If verification does not confirm it, use that result and continue within the remaining budget.

P0 limits: at most 4 hypotheses, 40 browser actions, 40 LLM calls, and 6 minutes of investigation. Allow one LLM retry for a transient API error; do not repeat a broken click indefinitely. All verification attempts together receive at most another 2 minutes; the entire run is capped at 8 minutes. Make limits configurable and enforce them in the runner, not the model. Record costs and tokens when the provider supplies them; unknown values must not appear as zero.

Save the current hypothesis, tested conditions, and observations as structured state. Send the current snapshot, a short memory of hypotheses, and recent actions to the model rather than an endlessly growing copy of every DOM snapshot. Display concise decision explanations, not the model's private chain of thought.

### From recorded actions to a real test

The model selects a checkpoint and the candidate's end within the log of one clean episode. The compiler always includes the full prefix from the initial `goto`, including adding items: it must not remove the setup that created the required state. Arbitrarily shortening the prefix is P1 and requires verification. The runner validates the candidate and compiles `repro.spec.ts` using ordinary code. Do not execute arbitrary code generated by the LLM. The test contains the steps, DOM adapter, and a specific cart-preservation assertion; it imports only Playwright, not BugReplay internals.

Compare the normalized list of `{ productId, quantity }`, not the order total: delivery and discounts can legitimately change the price. Capture initial values before the operation under investigation. After the checkpoint, adding/removing items, clearing the cart, and completing a purchase are prohibited. Enforce this in code, not just the prompt: the shop marks action semantics using DOM `data-action`, and the runner records them in its trusted log. After the checkpoint, permit only navigation and editing/saving checkout; unknown semantics cannot be confirmed. The compiler/validator checks steps against that log. A candidate must include an actual save of a changed address; an initially empty cart does not qualify.

### Independent confirmation — the core of P0

1. Save the test to disk.
2. Run **that file** with standard Playwright Test in a separate process without an LLM, using `workers=1` and `retries=0`.
3. Start with a new browser context; the shop has no shared server state.
4. Verify a nonempty initial cart, a successful address change, and completion of the UI update.
5. Assert correct behavior: items and quantities match the initial values.
6. Repeat in another new context.

Set `bug_confirmed` only for **2/2 matching failures of the intended assertion**. The verifier report must include the initial/actual cart, the reached stage, the error type, and the marker `BUGREPLAY_CART_PRESERVATION`. The compiler creates the marker; the model cannot change the assertion or marker.

A locator timeout, failed navigation, unavailable site, exception before the assertion, invalid initial state, or inconsistent repeat results yields `inconclusive`. A functioning investigation that exhausts its budget without a candidate yields `not_reproduced`, explicitly “within budget,” not “there are no bugs.”

Before the change, save the visible address and completed-save sequence number. Wait for a new `Address saved` signal, an incremented save number, a changed visible address, and `aria-busy=false`, then a stable cart state. An old notification does not prove a new save. Do not mistake a briefly empty loading area for lost items. Attach before/after snapshots and both verification results to the report.

A new context isolates cookies/localStorage but does not reset a server database by itself; therefore, the P0 shop keeps user state only in the browser. [Playwright isolation](https://playwright.dev/docs/browser-contexts).

Record video of at least the verification run. Close the context with `await context.close()` before serving the file link: the recording may not be ready before closure. During investigation, the interface shows screenshots, not streaming video. [Playwright video documentation](https://playwright.dev/docs/videos).

## 7. Agent B: shop, interface, and external evaluation

### Shop

Build a small, polished shop: 2–3 products, a persistently available cart region, address, delivery method, promo code, and save buttons. Use English labels for the international demo. No real purchase takes place.

Provide a stable DOM contract: a `region` named `Cart`, product rows with `data-product-id` and `data-quantity`, `aria-busy`, visible address values, and an `Address saved` status with a monotonically increasing `data-save-seq`. Clear the old notification when editing. Mark actions with `data-action`: `navigation`, `cart-add`, `cart-remove`, `cart-clear`, `checkout-edit`, `checkout-save`, `checkout-submit`. These attributes describe ordinary interface state/actions; they do not disclose the trigger. Agree on the adapter with A before implementing the verifier.

In the buggy version, the cart is lost only after a combination of 2–3 ordinary actions; a single address change must work. The combination must be reachable and understandable from the application's features, without a secret password or dozens of random variants. If a promo code is needed, it must be visible to an ordinary user.

B chooses the exact trigger. Do not pass its recipe to the runtime model. The fixed version uses the same UI and initial data but preserves the items. Select the variant through the shop process environment, not an `Activate bug` button in the UI. Do not fabricate browser responses or present a prepared recording as the current run.

For an additional blind case, B changes the trigger after the prompt is frozen, preserving the UI and meaning of the report. Publish the outcome of this case as observed.

### BugReplay interface

One screen, without a complex dashboard:

- Input: URL, bug report, explicit expected behavior, and the selected supported verification type.
- During execution: status, timer, actions, concise hypotheses and observations, latest screenshot.
- Result: trigger conditions, steps, expected/actual behavior, `Verified 2/2`, files, and video playback.
- On failure: what was tested, what prevented completion, and where the agent stopped.

The test is red on the buggy site; explain this with `Bug confirmed: regression assertion failed in 2 clean runs`. Do not present it as an unexpected BugReplay crash. Show `Unavailable` for unknown cost.

## 8. Acceptance: what to verify

These are integration checks of meaningful behavior; tests for button colors and every wrapper are unnecessary.

| Case | Required result |
| --- | --- |
| Buggy shop | The agent finds a candidate; the saved test confirms the intended defect in 2/2 runs |
| Fixed control | The same saved test passes without editing steps/assertion; only the base URL changes |
| Investigation on the fixed shop | No `bug_confirmed`; an honest `not_reproduced` at the limit |
| Failed browser action | A visible error, a fresh observation, and a meaningful recovery attempt; no false confirmation |
| Unavailable target / incomplete setup | `inconclusive`, with an explanation of the blocker |
| Reopening the result page | The log and completed files remain available; a temporary connection loss does not lose the result |

Run 3 independent full investigations against the primary buggy case and record the actual success rate. This is a small smoke benchmark, not evidence of generality. The negative control remains mandatory even if time is short.

B runs acceptance independently of A and inspects `repro.spec.ts`, stdout, and artifacts. A green status from our own API alone is insufficient. Do not manually correct an inaccurate report for the demo.

For the P1 Codex comparison, use the same URL, bug report, browser access, time limit, source-code restriction, and success criterion. Compare outcome, human interventions, time, and cost where data is available. Do not artificially restrict the baseline's capabilities. If no comparison is performed, describe only BugReplay's implemented process.

## 9. Sponsors: useful integration and evidence

The [hackathon rules](https://neatlogs.com/hackathon) require neatlogs, Entire, cfo.ai, a public repository with code written during the event, and a video of at most 3 minutes showing all three tools. Submission is a published quote post of the official submission post on X. The planned October 12 window is **07:30–12:25 Denver (MDT)**; confirm the final cutoff in Discord.

### neatlogs — A

Connect it to the first real run, not just before submission. Use one workflow trace per run, with nested spans for the LLM, browser tools, errors/retries, compiler, and verifier. Metadata: run ID, agent version, git SHA, verdict, actions, duration, and available usage/cost. Keep internal case IDs in the evaluation log; do not give them to the model.

Use the `neatlogs` TypeScript SDK, await `init`, and wrap the client and custom functions. Flush/export correctly when the server stops. Do not assume the observability service implements agent recovery itself. [TypeScript SDK](https://docs.neatlogs.com/sdk/typescript).

Keep an actual problematic run. Find a specific BugReplay weakness in its trace, fix it, and repeat the same case. Example of a possible improvement: the agent repeatedly uses a stale ref → it takes a fresh snapshot after the error. Choose an observed problem rather than manufacturing a bad version for attractive numbers.

### Entire — both; A collects the final evidence

Enable it in both coding environments before substantive development: `entire enable -y --agent codex`. Check that a checkpoint actually appears and contains the change context. For the demo, use the checkpoint for the same fix shown in neatlogs and explain its rationale. Graph is optional for a small project. [Quickstart](https://docs.entire.io/quickstart), [Codex integration](https://docs.entire.io/agents/codex).

Entire records development context; our runner persists runtime-agent state. If a particular harness does not provide transcripts, check a supported configuration early rather than discovering an empty checkpoint in the final hour.

### cfo.ai — B

Check access first: signup has separate conditions on the official page, including a card and a subscription action. The account owner handles these. Then use Ari to create a real BugReplay model covering price, customer count, investigations per customer, inference/browser/storage costs, revenue, gross profit, and runway. Runtime MCP integration is unnecessary.

Initial pricing assumption for the model, not an established market fact: `$49/team/month` for 100 investigations. Evaluate base and downside scenarios, including all unsuccessful attempts. Separate measured costs from assumptions about customers, salaries, and budget. If API spending is unknown, state the basis of the estimate.

Save the cfo.ai result as an accessible Page/export or screenshots and explain at least one decision it informed, such as the investigation-length limit. The artifact must cover pricing, costs, revenue, and runway.

### Evidence directory

`docs/evidence/index.md` connects: case → before/after trace → original test/verification → commit/Entire checkpoint → cfo.ai → demo and posts. Save links or screenshots that judges can access. Publish selected synthetic data in the repository, not secrets or the entire local recordings directory.

## 10. Work sequence and checkpoints

H means working hours since the joint start; these are estimates, not timing guarantees. Target the core within 12–16 hours of parallel work, followed by evidence and the demo. Leave time for sleep and integration. Prefer a feature freeze on the evening of October 11 and target submission around **08:30 Denver on October 12**, after the submission window opens.

| Stage | A | B | Verifiable outcome |
| --- | --- | --- | --- |
| H0–1 | Skeleton, contract, API/LLM smoke test, neatlogs, Entire | Access, mock UI, shop DOM contract, Entire | Shared types and the first trace exist |
| H1–4 | Browser tools, log, event API | Working shop + control, form, API connection | A UI action causes a real browser action |
| H4–8 | Adaptive LLM loop, compiler, first replay | Results UI, video/downloads, external cases | First path from report → test → execution |
| H8–12 | Two clean replays, oracle, errors, budgets | Independent acceptance, fixed control, recovery evidence | No false confirmation; primary case reproduces 2/2 |
| H12–16 | Fix an observed weakness using a trace, repeat runs | cfo.ai, evidence index, clarity improvements | Before/after + checkpoint + business model |
| After P0 | Minimization only if time remains | Second/blind case; demo | Complete submission package |
| Final hours | Verify README from a clean clone, release commit | Video, public links, project post | Submission under the final Discord rules |

If no independent replay exists by H8, drop P1 and simplify the UI. Preserve trigger investigation, the intended assertion, the negative control, and all three sponsors. If the agent needs a fuller report, provide realistic context known to the user and show that input explicitly in the demo; do not give it the solution.

Prepare build-in-public posts around real milestones using `#neatHack`. The account owner publishes them. Link every claimed metric to saved runs.

## 11. Demo: at most three minutes

Record a real end-to-end run. If investigation takes longer, use clearly labeled editing/speed-up and show the actual elapsed time. Do not present a recording as live. There is no requirement for every run to test one predetermined wrong hypothesis first: show an actual decision change based on an observation.

| Time | What viewers see | What to explain |
| --- | --- | --- |
| 0:00–0:15 | Bug report + URL → `Investigate` | “Turn a bug report into a verified reproduction” |
| 0:15–0:55 | The agent inspects the shop, tests conditions, changes its hypothesis | The next choice depends on the result |
| 0:55–1:20 | Separate replays, `2/2`, cart before/after, video, and `.spec.ts` | The saved test runs without an LLM; the intended assertion fails |
| 1:20–1:45 | neatlogs: a real problematic run → fix → new run | Which weakness was removed and which metrics changed |
| 1:45–2:05 | Entire checkpoint, rationale, and diff for the same fix | How development context helped make the change |
| 2:05–2:30 | cfo.ai: pricing, costs, revenue, runway | Measurements, assumptions, and an economic decision |
| 2:30–2:50 | The same test passes on the fixed control | We verify an application defect rather than an automation crash |
| 2:50–3:00 | Repository, files, and version limitations | One defect class, real artifacts |

Closing line: **“BugReplay turns a browser bug report into a verified Playwright reproduction.”**

## 12. Submission readiness

- [ ] Both participants are registered on the same team and have completed the required check-in.
- [ ] The main run uses a real model and real browser tools.
- [ ] Observations change the next action, and an example shows recovery after a failed action.
- [ ] The saved test confirms the intended defect in 2/2 clean runs.
- [ ] The same test passes on the fixed control; setup/selector failures are not classified as bugs.
- [ ] The test, report, JSON, video, and verification are accessible and belong to the same run.
- [ ] The README enables startup and replay from a clean clone.
- [ ] neatlogs before/after evidence includes real metrics and the Entire checkpoint for the change.
- [ ] The cfo.ai business model covers pricing, costs, revenue, and runway.
- [ ] The public repository includes event-period commits and an evidence index.
- [ ] The video is ≤3 minutes and explicitly shows all three sponsor tools.
- [ ] Links to actual `#neatHack` posts exist.
- [ ] The final submission deadline and method have been checked in Discord.
- [ ] A quote post of the official submission post is published on X with team, project, repository, and demo; an open draft does not count as submission.

## 13. Starting task for Agent A

> Read plan.md in full. You are Agent A, responsible for apps/runner, packages/contracts, scripts, root configuration, startup README, neatlogs, and collecting Entire evidence. First check the environment and required SDK/API access, create the minimal workspace and shared contract, then communicate paths and API readiness to Agent B. Implement the vertical path from POST /api/runs to a real browser action as early as possible. Then add adaptive investigation, a compiler for the recorded sequence, and separate execution of the saved Playwright test without an LLM. Confirm only the intended assertion failure in two clean runs. Do not read shop source code through runtime tools or give the model the defect recipe. Do not edit apps/web, apps/demo-shop, or evals without coordinating with B. Report progress, actual problems, and checks; provide B with cost data, traces, and artifacts. Do not implement P1 before P0 passes.

## 14. Starting task for Agent B

> Read plan.md in full. You are Agent B, responsible for apps/web, apps/demo-shop, evals, docs/evidence, hackathon.md, the demo, and cfo.ai. First agree on the DOM contract with A and start the shop plus interface using a clearly labeled mock adapter. The shop must have buggy and fixed versions with the same interface and browser state. Choose a reachable combination of ordinary actions that loses the cart; the runtime agent must not receive that recipe. Connect the real API from A early. Independently verify the saved test: the intended defect in 2/2 runs on buggy, a pass on control, and no false confirmation for setup/selector errors. Record actual results, prepare the financial model in cfo.ai, and create a three-minute demo showing all sponsor tools. Do not edit apps/runner, packages/contracts, scripts, root package.json, or the lockfile without coordination. Send dependency requests to A. Do not present mocks as real runs, and do not implement P1 before P0 passes.
