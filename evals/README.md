# Product evaluation

These checks exercise the real demo shop and the shared browser adapter, compiler, and independent verifier. They are **scripted engineering tests with known fixture conditions**, not evidence that an LLM discovered the defect. The tests never fabricate trusted browser records.

## Run the scripted checks

Use Node.js 24 or newer, install the repository dependencies and Playwright Chromium, then run from the repository root:

```sh
npm exec -- tsx --test evals/product.test.ts
```

The suite starts both Vite shop variants on available loopback ports and shuts them down afterward. It does not need model credentials, neatlogs credentials, the runner API, or an existing development server. It leaves evidence under ignored `artifacts/product-eval/<timestamp>-<id>/` and prints the exact directory.

The checks cover:

- Ordinary address save, express delivery alone, and an applied promotion alone preserve product IDs and quantities.
- The combined fixture conditions are driven through real `BrowserSession` controls; `compileCandidate` consumes those actual records and preserves the full setup prefix.
- The exact saved `repro.spec.ts` produces the intended cart-preservation failure in two independent Playwright processes, then passes on the corrected control with only the base URL changed. The file hash must remain unchanged.
- A deliberately corrupted **copy** of the saved selector and an unavailable target remain inconclusive; neither is a confirmed product defect.
- Reload preserves browser-local cart/address state, a new context starts clean, and editing clears an old saved notification without incrementing its sequence.

`combined-conditions/summary.json` records the file hash and outcomes. Each replay directory also contains `independent-file-audit.json`, the Playwright JSON report, stdout/stderr, stage evidence, and completed replay media. Stdout can be empty because the verifier uses Playwright's JSON reporter; the audit reads the report file as well as both process streams. Expected assertion failures on the buggy shop are successful evaluation outcomes.

## Separate model acceptance

Start the real runner, buggy shop, corrected control, and UI as described in the root README. Configure the actual model and neatlogs access on the server. Then run:

```sh
npm run eval
# Equivalent: npm run test:acceptance -- --repeat 3
```

This performs three independent model investigations on the primary buggy shop and one investigation on the corrected control. Keep the ordinary user complaint; do not feed the model this test's source, fixture conditions, or a prepared reproduction sequence. The acceptance command records its actual results under `artifacts/acceptance-*.json` (or the configured artifact root). Record the observed success rate out of three even when it is below 3/3. These three runs are a small smoke benchmark, not a claim of generality.

For each actual model run, independently inspect the saved test, both replay reports and stdout/stderr, stage evidence, screenshots/video, and the matching `run.json` and event log. Confirm that the cart assertion was reached only after a new completed save, the buggy attempts failed specifically with `BUGREPLAY_CART_PRESERVATION`, and the same unmodified test passed on control. Recheck a finished result after UI reload and inspect its downloads. A green API status or this scripted suite alone does not satisfy model acceptance.

Keep a genuine problematic model run and the later run of the same case after an observed improvement. Link those neatlogs traces, the matching fix and Entire checkpoint, and measured latency/token/cost data in the evidence index. Unknown cost remains unknown; do not substitute scripted timings, mocks, or reconstructed traces for real model evidence.
