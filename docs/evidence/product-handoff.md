# Agent B product handoff

Date: October 12, 2026. Branch: `agent-b-product`. Shared engine baseline: `d892d7d`.

The product branch provides the real demo shop, corrected control, investigation UI, and independent scripted evaluation. Agent A retains ownership of the engine, shared contracts, root configuration, dependency lockfile, and branch integration. This handoff records verified engineering behavior; live-model acceptance remains a separate gate.

## Verified product checks

On Node.js 24.19.0, `npm exec -- tsx --test evals/product.test.ts` passed **5/5**, with no failures or skipped tests, in approximately 40.9 seconds. The evaluation starts real Vite shop instances on available loopback ports, drives Chromium, compiles the actual trusted `BrowserSession` log, and executes the saved test in separate Playwright processes.

- An ordinary address save, express delivery alone, and an applied promotion alone preserve product IDs and quantities.
- The scripted combined fixture conditions produce the intended `BUGREPLAY_CART_PRESERVATION` failure in **2/2** clean buggy replays.
- The **exact same saved file** passes on the corrected control in **1/1** replay. Only its base URL changes; steps and assertion remain unchanged.
- A deliberately corrupted selector in a separate copy of the saved test and an unavailable target both remain `inconclusive`.
- Cart/address state survives reload, new browser contexts start empty, and editing invalidates the previous saved notification while retaining a monotonic save sequence.

The saved source, actual process stdout/stderr, Playwright JSON reports, and stage evidence were inspected independently. The buggy stdout contains the intended marker and lost-cart diff; the control stdout reports a passing test. Completed replay videos and before/after PNGs exist and are nonempty. The buggy and control after screenshots were also inspected visually.

Evidence index: [product-checks.json](product-checks.json). Local artifact directory:

```text
artifacts/product-eval/2026-10-12T08-58-03.943Z-ef3e0210/
```

Saved test: `combined-conditions/repro.spec.ts` within that directory.

```text
SHA-256: 06f2d8aafbbd4f3c5f83c458fe89788b3fd4f14937540e04014089be85fdb3fa
```

Each replay has an `independent-file-audit.json`, original Playwright report, process streams, and media. The JSON evidence also records the evaluated source hashes. Raw artifacts stay ignored and local; they are not accessible to judges until selected evidence is intentionally published.

## Reproduce and build

From the repository root, use Node.js 24 or newer with the existing dependencies and Playwright Chromium:

```sh
npm run typecheck
npm test
npm exec -- tsx --test evals/product.test.ts
npm run build --workspace @bugreplay/web
npm run build --workspace @bugreplay/demo-shop
```

The two build commands above are reproducibility commands, not additional build claims made by the scripted evaluation. For the corrected production shop bundle, run `SHOP_VARIANT=fixed npm run build --workspace @bugreplay/demo-shop`; this replaces that workspace's local `dist` output. The scripted evaluation starts both variants independently and does not need production builds, model credentials, telemetry credentials, or the runner API.

For an interactive local integration check:

```sh
npm run dev
# In a separate terminal:
npm run dev:control
```

The expected local services are web `5173`, runner `3001`, buggy shop `4173`, and corrected control `4174`. Keep the runtime model's input limited to the ordinary complaint, expected behavior, URL, and browser observations. Evaluation source and known fixture conditions must not be supplied to the runtime model.

## Confirmed engine artifact limitation

`apps/runner/src/verifier.ts` writes completed `verification-<attempt>-before.png` and `verification-<attempt>-after.png` files. The current `apps/runner/src/investigate.ts` registers the verification JSON and replay videos, but does not register those dedicated PNGs through `store.artifact`. `apps/runner/src/api.ts` serves only registered artifacts. Therefore the dedicated verification before/after images exist on disk but are not available through the API or the UI's registered screenshot list; the report's references to them are insufficient. Ordinary investigation screenshots are registered separately and remain available.

Agent A should register existing completed replay PNGs as screenshot artifacts after verification. The product UI should continue honoring the shared artifact list. No engine files were changed for this handoff.

## Remaining evidence gates

1. Verify current real-model access and finalized hosted Neatlogs readback on the actual connection before an investigation. Historical sponsor access checks do not establish current access or discovery.
2. Start the actual services and run `npm run eval` (equivalently `npm run test:acceptance -- --repeat 3`). Record the observed outcomes of three independent buggy-shop investigations and one corrected-shop investigation. Independently audit saved files, replay outputs, control, and run identity. Also verify finished results and downloads after UI reload.
3. Preserve a genuine problematic investigation trace, fix an observed weakness, and repeat the same case. Link before/after Neatlogs evidence, actual metrics, the fix commit, and the corresponding reviewed Entire checkpoint. Do not manufacture a bad run or count the scripted suite as model discovery.
4. Create the real cfo.ai business model covering pricing, costs, revenue, and runway, with measurements separated from assumptions and one resulting decision. The [financial workbook and transfer package](finance/README.md) are complete; active CFO.ai workspace access and actual sponsor output remain pending.
5. Record a real demonstration of at most three minutes, explicitly showing the product, unchanged corrected-control replay, Neatlogs, Entire, and cfo.ai. The [2:50 recording kit](../../demo/final/README.md) provides the shot list, narration and packaging checks. Label edits or speed-up honestly, and publish only reviewed evidence. The final event submission is a separate team action.

[entire-readiness-checkpoint.json](entire-readiness-checkpoint.json) verifies the initial product-readiness documentation checkpoint from the new, correctly scoped Codex session. It demonstrates capture before product implementation; it is not the later checkpoint for a trace-driven fix. Automatic publication of unreviewed local checkpoint refs is disabled in this clone.
