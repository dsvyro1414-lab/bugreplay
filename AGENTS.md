# Repository instructions

## Language and status

- Write code, comments, documentation, commit messages, and product UI copy in English.
- Communicate with the project owner in Russian unless they request another language. A copy-paste prompt for the owner may also be in Russian.
- Read `plan.md` before implementation. It is the agreed product and technical scope.
- At repository creation, only planning and handoff documentation exist. Do not claim the application or any acceptance check works until verified.
- Use `hackathon.md` for recorded progress and evidence; distinguish planned, implemented, and verified work.

## Two-agent ownership

- Agent A owns `apps/runner`, `packages/contracts`, `scripts`, root configuration, root `package.json`, lockfile, and run instructions. A integrates the team branches.
- Agent B owns `apps/web`, `apps/demo-shop`, `evals`, `docs/evidence`, the development log, demo, and cfo.ai work.
- Use branches `agent-a-engine` and `agent-b-product`. Check the current branch and remote before changing files.
- Do not overwrite another agent's changes. Request shared-contract or dependency changes from A and integrate small increments frequently.
- Establish the shared API and DOM contracts before building incompatible implementations. UI mocks must be visibly labeled and replaced by the real runner for the demo.

## Product requirements

- Keep the initial scope to cart preservation after checkout changes in the controlled demo shop.
- The runtime model receives the complaint, expected behavior, URL, and browser observations. Do not give it target source code, hidden fixture conditions, or a prepared reproduction recipe.
- Let browser results guide subsequent actions. Implement action, model-call, and wall-clock budgets in the runner.
- Compile reproduction steps from the trusted browser action log. Include the full setup prefix of the current clean episode.
- Execute the saved Playwright test separately without an LLM. Confirm only the intended assertion violation in two independent clean runs.
- Selector errors, failed navigation, incomplete setup, and inconsistent results are inconclusive. A failed test by itself does not prove a bug.
- Validate the same test on the corrected control. Keep the steps and assertion unchanged; change only the base URL.
- Do not expand optional scope before the P0 acceptance criteria pass.

## Development and evidence

- Set up Entire before substantial coding and verify a real checkpoint. The CLI was not found on the initial machine; setup is pending.
- Connect neatlogs before the first real agent investigation. Preserve genuine before/after evidence for an actual improvement.
- Use cfo.ai for a real business model; keep measured costs separate from assumptions.
- Keep API keys in server-side environment variables. Never commit credentials, personal account data, or unreviewed local recordings.
- Record actual commands, results, limitations, and artifact locations. Never fabricate a successful run or silently substitute a mock.
- Run relevant integration checks for the core behavior. Follow `plan.md` for demo and submission requirements, and verify the final cutoff in the event Discord.
