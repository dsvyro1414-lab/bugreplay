# Evidence needed from Agent A

Agent B has prepared the UI/shop/evaluation branch, the assumption-based financial model, the CFO.ai transfer prompt and the final recording kit. A remains the integrator. Do not send credentials to B or commit `.env`.

## 1. Integrate and fix the artifact registration

Review PR #1 and integrate after your checks. Record the final commit SHA. Register existing completed `verification-<attempt>-before.png` and `verification-<attempt>-after.png` with `store.artifact` so the API/UI can serve them. Keep the shared contract and ordinary screenshots intact.

## 2. Run real acceptance in your configured environment

With private credentials available only in your environment, verify:

```sh
npm run doctor:neatlogs
npm run smoke:llm
npm run dev
# Separate terminal:
npm run dev:control
# Once all services are available, separate terminal:
npm run eval
```

`eval` requests three independent buggy-shop investigations and one fixed-shop investigation. Keep all outcomes, including unsuccessful attempts. A nonzero exit is evidence to investigate, not permission to relabel a failure. Do not provide the runtime model with product-evaluation source or trigger instructions.

Return a reviewed bundle for each run: run ID, commit SHA, model/provider, input, `RunView`, action/events log, reproduction JSON, saved `.spec.ts`, report, verification JSON, process reports, original videos and before/after images. Include the acceptance summary and genuine Neatlogs trace links or screenshots. Preserve the original files and their hash manifest.

For the chosen real confirmed run, audit the saved test's **two intended failures**. Replay that **same byte-identical test** on the fixed control, changing only the base URL. The existing `npm run repro` writes verification outputs in the original run directory: preserve the original run bundle before using it and save the control outputs separately. Return both the test hashes and the separate control evidence.

## 3. Supply a genuine improvement

Choose a weakness actually observed in a real Neatlogs trace, make the fix with Entire recording active, and repeat the same case. Return before/after trace links, run IDs, corresponding SHAs, compared metrics with denominators, the actual fix diff and its Entire checkpoint. Do not use the readiness-document checkpoint as proof of the later fix.

## 4. Supply cost data

For every investigation, including inconclusive/cancelled/failed ones, supply total input/output tokens when available, total inference spend with its billing/rate source, actual duration and action count. State the gateway's commercial rate separately from hackathon promotional credits. Leave unknown cost unknown; do not substitute zero. B will replace the financial model's illustrative inference costs with these measurements.

## 5. CFO.ai and final recording access

Say whether the team already has an active CFO.ai workspace. If so, provide the ordinary model link or an authorized collaboration route, not a password. B has the full [transfer prompt](../../docs/evidence/finance/cfo-transfer-prompt.md) and input files ready. If there is no active workspace, the account owner must handle the signup/billing step; B's current browser stops at plan selection. Do not claim sponsor use from the local workbook alone.

Capture the product, Neatlogs, Entire and CFO.ai according to the [recording plan](recording-plan.md), or provide a way to record the already-running project. Send reviewed original clips, not only screenshots of success badges. B will handle final assembly and narration after receiving them.

## 6. Team submission facts

Return the exact team name/member names, confirmation of registration/check-in, existing public `#neatHack` post links, and the current official submission post/final cutoff from Discord. B will complete the submission copy; the account owner publishes it. A draft, PR or demo link alone is not a submitted entry.
