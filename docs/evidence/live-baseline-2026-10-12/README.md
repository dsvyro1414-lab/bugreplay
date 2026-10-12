# Real-model baseline, October 12, 2026

Status: **live acceptance did not pass**. This is an independent audit of the original saved outputs, not a rerun. All four real investigations are preserved, including every unsuccessful outcome.

Historical first-series snapshot. Subsequent [selected real confirmation](../live-confirmed-2026-10-12/README.md), [fourth-cohort outcomes](../live-fourth-series-2026-10-12/README.md) and [CFO.ai evidence](../finance/cfo-workspace-review.md) are recorded separately. Later [finance reconciliation](../finance/actual-attempt-cost-ledger.md) recovers the four omitted terminal token spans; archived RunView counters remain unchanged, and complete historical billing remains unknown.

PR #1 was merged as `1e24e42786dad283913b6612078a5437c21cef9f`. The baseline ran at `60d22946616664235546ed81817f60ded57957db`, which registers completed verification screenshots and persists trace identity. The model was `claude-sonnet-4.6` through the configured OpenAI-compatible gateway. The model smoke check and finalized Neatlogs delivery preflight passed immediately before these investigations.

## Observed outcomes

| Target / attempt | Run ID | Result | Actions | Elapsed | Recorded input / output tokens |
| --- | --- | --- | ---: | ---: | ---: |
| Buggy / 1 | `e07bdfa3-c839-4e68-b784-640244403b2c` | inconclusive | 5 | 15.818 s | 8,887 / 288 |
| Buggy / 2 | `6992fe74-3395-430a-95ab-d73c207d70b6` | inconclusive | 4 | 10.446 s | 6,571 / 207 |
| Buggy / 3 | `7e60e53a-1a02-4f81-918d-24649030fae0` | inconclusive | 4 | 10.590 s | 6,502 / 204 |
| Fixed / 1 | `39b9bed4-fca9-4884-a7b9-3035fc860685` | inconclusive | 4 | 10.073 s | 6,546 / 194 |

Each browser action log starts with a clean empty cart. Each run added items and saved an ordinary changed address with the cart preserved, then stopped with `Model response was not a JSON object; no browser action was executed.` This error concerns the final model response; earlier logged browser actions did execute. No run produced `repro.spec.ts`, `reproduction.json`, verification JSON, or replay video. There are no intended assertion failures or unchanged-test control passes to claim from this baseline. The fixed-shop model investigation is not a passing replay control.

## Genuine Neatlogs before evidence

[First investigation trace](https://app.neatlogs.com/traces/17af3d753892ebeeff61afa08ee24492), provider span `3a84b1fc98334277`, was inspected in the hosted UI. Three original screenshots are retained locally under `artifacts/submission-2026-10-12/screens/`:

- `neatlogs-before-parser.jpg`: the final provider span sits below a failed `model.next` wrapper.
- `neatlogs-before-tokens.jpg`: the provider span is `SUCCESS`, with 2,372 prompt tokens and 103 completion tokens.
- `neatlogs-before-response.jpg`: the provider output contains prose followed by a JSON-formatted `readCart` decision with empty arguments.

The last screenshot uses Pretty mode. Its `json` presentation label does not prove that the raw response contained a Markdown code fence. These first-series screenshots support only the displayed prose plus JSON-formatted decision. The later [second-series Raw screenshot](../live-second-series-2026-10-12/README.md) is a different trace and explicitly establishes an unfenced JSON suffix for that later run.

This establishes a concrete response-format handling problem. It does not establish an improvement yet. The fix commit, its authentic Entire checkpoint, comparable after trace and after results must be linked separately. These authenticated screenshots/trace links are not anonymous public evidence links; review and publish the selected material before submission.

## Costs and preservation

The four RunViews record 28,506 input tokens, 893 output tokens, 17 browser actions and 46.927 seconds in total. **Token totals are incomplete**: at this SHA, parsing happens before usage is returned to the investigation, so the final malformed response in every run is omitted from RunView counters. The first trace alone confirms an additional 2,372 input and 103 output tokens. Do not convert the recorded totals into complete spending figures. Commercial price, total inference dollars and promotional credits remain unknown until verified from provider/gateway rates or billing.

The local original archive is `artifacts/archives/baseline-real-acceptance-20261012T150528Z.tar.gz` (2,010,601 bytes; 45 original files). Its SHA-256 is:

```text
61f4c0bc41f8724313fdabb64544adf77fdbf2c7bc5ef340c1ebb7c2438a63ab
```

The archive preserves all four original run directories, the acceptance summary, the two relevant delivery preflights and the model smoke output. It includes its own manifest and `SHA256SUMS`. Every original file hash was rechecked from the compressed archive. No source run file was changed. Environment files, credentials, account exports and older unrelated tooling diagnostics were excluded. The 28 selected text files had no common credential-pattern matches; PNG signatures/dimensions were checked and the final shop screenshot from every run was visually reviewed. The archive remains local and ignored by Git; it is not a public download yet.

[audit.json](audit.json) contains run/trace identities, consistency checks, original file hashes and the archive checksum. Original evidence stays separate from later runs or replays.

## Remaining acceptance and submission gaps

1. Rerun the same ordinary complaint and controlled shop after the observed parser/accounting fix; preserve all results and compare with this baseline under the same budgets.
2. Independently audit a real discovered reproduction: two intended cart-preservation assertion failures and a passing byte-identical test on the corrected control, with only the base URL changed.
3. Link before/after Neatlogs evidence, the actual diff and fix SHA, and the genuine Entire checkpoint for that fix.
4. Reconcile all attempt costs, including malformed, failed and cancelled calls; keep unknown commercial costs and credits explicit.
5. Finish the actual CFO.ai model and reviewed export/decision. Creating a page or reaching a `Building` state alone does not establish completion.
6. Record and publish the final video of at most three minutes, review public evidence/download access, and complete the official event submission. This baseline does not establish a final video or published entry.
