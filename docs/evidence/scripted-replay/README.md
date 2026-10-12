# Scripted replay evidence

This is a curated copy of real local artifacts from `npm exec -- tsx --test evals/product.test.ts`, executed on Node 24.19.0 on 2026-10-12. The source run is `artifacts/product-eval/2026-10-12T08-58-03.943Z-ef3e0210/`; it remains ignored. The complete suite passed **5/5** checks. See [product-checks.json](../product-checks.json) for the wider suite and source hashes.

**`modelUsed: false`; `neatlogsUsed: false`.** These are scripted engineering checks with known fixture conditions, not autonomous model discovery, a model success rate, or hackathon completion. The known sequence adds Canvas pouch twice and Desk notebook once, selects express delivery, applies `FIELD10`, then saves a changed address. Real `BrowserSession` actions produced the trusted records consumed by `compileCandidate`; the saved test was subsequently executed in separate Playwright processes.

## What the outcomes mean

- The two buggy runs intentionally exit with code 1 at `BUGREPLAY_CART_PRESERVATION`. Both reach the cart assertion after a new completed save: expected quantities are Canvas pouch 2 and Desk notebook 1, while the actual cart is empty. These are intended red regression tests and successful evaluation outcomes.
- The corrected control runs the **exact same saved file** with only the target base URL changed. It exits with code 0 and reports one passed test.
- The suite separately classifies an intentionally corrupted selector and an unavailable target as inconclusive. The compact summary retains those outcomes; their detailed diagnostics are omitted from this package.

The unchanged [saved specification](combined-conditions/repro.spec.ts) has SHA-256:

```text
06f2d8aafbbd4f3c5f83c458fe89788b3fd4f14937540e04014089be85fdb3fa
```

[Summary](combined-conditions/summary.json), [buggy audit](combined-conditions/buggy-replay/independent-file-audit.json), and [control audit](combined-conditions/control-replay/independent-file-audit.json) are byte-for-byte copies. Their paths still refer to the original run layout. Each audit's stdout/stderr hashes describe the **raw source process output**. The Playwright reports and videos referenced by the audits remain in the ignored source run; they are deliberately omitted here.

## Publication transformations

[manifest.json](manifest.json) maps every included file to its original relative path and records both the raw and published SHA-256 hashes. The only content modification is replacing the absolute local checkout prefix in the two buggy stdout files with `<repository>/`. Their published filenames end in `.sanitized.txt`; all assertion text, line numbers, and results are preserved. The original raw stdout hashes remain in both the manifest and unchanged audits. Control stdout, all three empty stderr files, and all six before/after PNG files are unchanged. No image editing or compression was applied.

## Reproduce and review

From the repository root, after installing dependencies and Playwright Chromium:

```sh
npm exec -- tsx --test evals/product.test.ts
```

This starts fresh buggy/control shops on loopback ports and writes a new ignored artifact directory. Review the independently executed file, process streams, reporter JSON, stage evidence, and replay media from that new run. Before/after images are snapshots of the completed real browser replay, not proof of model reasoning. Real model investigations, neatlogs improvement evidence, cfo.ai work, and the final demo remain separate acceptance gates.
