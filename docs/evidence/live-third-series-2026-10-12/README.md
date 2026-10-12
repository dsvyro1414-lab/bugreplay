# Third real-model series, October 12, 2026

Status: **live acceptance did not pass**. The four original investigations at `f7bee47c254afc38683b87ad6d30899f16180a47` were independently audited without rerunning them. The model remained `claude-sonnet-4.6`. The fix commit references Entire checkpoint `01M4RAVKR1DWCDKTJ3ZH5AZAY3`.

**Exact third-series outcomes: two `inconclusive` and two `not_reproduced`; zero `bug_confirmed`.** This is a historical series snapshot. The later [fourth cohort](../live-fourth-series-2026-10-12/README.md) and [selected confirmed proof](../live-confirmed-2026-10-12/README.md) are separate and do not change these originals.

| Target / attempt | Run ID | Outcome | Model attempts | Normalized responses | Invalid responses | Input / output tokens | Elapsed |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| Buggy / 1 | `5a3547da-c82d-4847-b67e-3985407c7fe3` | inconclusive | 12 | 1 | 3 | 26,994 / 767 | 25.978 s |
| Buggy / 2 | `5e7c759d-aedf-4102-b17c-a5f3ecff5104` | not_reproduced | 24 | 13 | 1 | 65,169 / 2,195 | 60.974 s |
| Buggy / 3 | `19ecc208-aa4c-47ce-bc92-5e3523dfae59` | not_reproduced | 40 | 17 | 2 | 115,544 / 2,605 | 86.806 s |
| Fixed / 1 | `c4010a11-3341-416c-a863-52aff89893a5` | inconclusive | 9 | 2 | 2 | 18,847 / 599 | 19.171 s |

The per-call ledgers record 33 successfully normalized responses out of 85 model attempts. Compared with the [second series](../live-second-series-2026-10-12/README.md), investigations can progress further after some prose-prefixed responses. Two buggy investigations finished honestly without reproduction; two runs still stopped on invalid responses. This is partial response-format handling progress, not a verified product success or a confirmed defect. The first buggy run also recorded a blocked cart-add after a checkpoint; its original tool error is preserved.

No run created `repro.spec.ts`, `reproduction.json`, verification JSON or a corrected-control replay. `not_reproduced` means the investigation stopped without a confirmed reproduction within its limits, not that the buggy shop is proven correct. The fixed-shop run remains inconclusive. No `bug_confirmed` result exists in this series.

## Independent checks and original media

Run/trace/usage identities, sequential event streams, registered artifacts and the acceptance summary were checked against the original files. All 85 recorded attempts retain input/output usage, including all eight invalid responses, and the per-call sums exactly equal the final RunViews. Totals: **226,554 input tokens, 6,166 output tokens, 47 browser actions and 192.929 seconds**. Every ledger leaves commercial billing dollars null; historical per-call accounting and promotional credits remain unknown. The later [all-attempt finance ledger](../finance/actual-attempt-cost-ledger.md) documents current configured rate references and conditional estimates separately from bills.

Five original investigation episode videos exist and are registered: one for each run, plus a second clean episode in `19ecc208-aa4c-47ce-bc92-5e3523dfae59`. Every video passed full FFmpeg decoding. These are original investigating-browser videos, not independent reproduction replay videos. Media integrity does not replace a full privacy/claim review before publication.

The local archive `artifacts/archives/third-series-originals-20261012T152114Z.tar.gz` contains 101 original files (29 text files, 67 PNGs, five videos), plus its audit manifest and checksums. Size: 30,905,488 bytes. SHA-256:

```text
ee9710f7fd6c79bc9981c4398ffe2fc78941f0dfc41a6d499ce9f0078b5ec72a
```

Every original hash was rechecked from the compressed archive; source files were not modified. Selected text files had no common credential-pattern matches; PNG signatures/dimensions were valid. The archive remains local and ignored by Git, not a public evidence download. [audit.json](audit.json) lists exact trace IDs, file hashes, per-run media checks and limits.

At this historical stopping point, the next series still needed two intended assertion failures and an unchanged passing control. That proof was subsequently established in the selected fourth-series case linked above. This third archive remains unchanged. The [third-stage submission checklist](submission-checklist.md) retains its dated snapshot; current gates are in the [evidence index](../index.md).
