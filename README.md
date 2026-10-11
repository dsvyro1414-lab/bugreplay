# BugReplay

Turn a browser bug report into a verified Playwright reproduction.

BugReplay will investigate a reported problem through the browser, discover a triggering sequence, and produce an executable regression test, a video, and a short evidence report. A separate deterministic verifier will replay the saved test without an LLM.

## Current status

Planning and repository setup only. The application, dependencies, agent, demo shop, and acceptance checks have not been implemented. Commands in the implementation plan are target interfaces, not working commands yet.

## MVP

- Input: a test application URL, a complaint, and the expected behavior.
- Initial scope: cart items disappearing after address or delivery changes in one controlled demo shop.
- Investigation: one agent uses browser observations to decide its next action.
- Confirmation: the saved Playwright test fails at the intended cart-preservation assertion in two independent clean runs.
- Negative control: the same test passes on the corrected shop with only the base URL changed.
- Output: `repro.spec.ts`, `reproduction.json`, `report.md`, verification evidence, and a replay video.

Navigation, selector, and setup failures are inconclusive results, never confirmed application bugs. Automated fixes and support for arbitrary websites are outside the MVP.

## Team ownership

| Agent | Ownership |
| --- | --- |
| A | Runner, browser tools, investigation loop, shared contracts, test compiler, verifier, API, root configuration, neatlogs, integration |
| B | Product UI, demo shop and corrected control, independent evaluation, evidence, demo video, cfo.ai business model |

Agent A publishes the shared contract first. Both agents integrate small working increments throughout development.

## Start here

1. Read [AGENTS.md](AGENTS.md) for repository instructions.
2. Read [plan.md](plan.md) for the full scope, interfaces, acceptance criteria, milestones, and role-specific tasks.
3. Check [hackathon.md](hackathon.md) for verified progress and remaining submission work.
4. Use `agent-a-engine` or `agent-b-product` for implementation; integrate through `main`.

All repository documentation and code should be written in English. Chat with the project owner in Russian unless they request otherwise.

## Hackathon

Built for [neatHack](https://neatlogs.com/hackathon). The plan includes meaningful use of neatlogs, Entire, and cfo.ai, plus a demo of no more than three minutes. Sponsor setup, credentials, traces, checkpoints, business-model evidence, and submission are still pending.

Keep claims tied to actual saved runs. Commit selected synthetic evidence; keep credentials and raw local recordings out of the public repository.
