# Fourth real investigation series — 12 October 2026

**One of three real buggy investigations discovered and independently confirmed the defect (1/3); the fixed negative-control investigation returned `not_reproduced`.** Preserve and show all four outcomes. This completes a real selected-case proof, not a 100% discovery-rate claim.

Source SHA `2b541b20a97ef3df4261529bd48089792e01f2af`; model `claude-sonnet-4.6`.

| Target | Run ID | Status | Actions | Time, s | Input/output tokens | Gateway USD |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| Buggy | `247e9123-b7aa-46d6-9f36-936a6531960e` | `not_reproduced` | 14 | 63.924 | 60,315 / 2,220 | 0.2356695 |
| Buggy | `b8ffd757-6aed-405d-b7ac-ed3b1c4d9236` | `bug_confirmed` | 13 | 51.651 | 41,069 / 1,261 | 0.1563342 |
| Buggy | `7c259071-2c8c-45ee-8c65-5fafa1395ae7` | `not_reproduced` | 20 | 64.727 | 64,690 / 2,245 | 0.2505195 |
| Fixed | `6d85b46a-df25-42a9-abe9-54978f07d964` | `not_reproduced` | 21 | 73.639 | 82,219 / 2,476 | 0.3121767 |

Whole-cohort totals: 68 browser actions; 92 model calls, including 4 invalid responses; 44 normalized responses; 253.941 s summed terminal elapsed; 248,293 input + 8,202 output tokens; **$0.9546999 gateway accounting**. Each complete ledger sums exactly to its RunView counters and gateway cost, including failed response attempts. Live API RunViews matched all original JSON files.

[Acceptance output](acceptance.json) · [Independent audit and trace IDs](audit.json) · [Original file hashes](original-manifest.json) · [All four complete cost/token ledgers](model-usage) · [Selected 2/2 assertion failures + unchanged fixed pass](../live-confirmed-2026-10-12/README.md).

Original archive: `artifacts/archives/fourth-series-originals-20261012T153512Z.tar.gz`; 43,430,562 bytes; 159 original files. SHA-256 `8e0582f58648da72f38c34a7f227631cc79e934a72e394341f0270058c336f5d`. Source/staging/archive streams were independently hash-checked and original source files were unchanged. All 9 unique original videos decode fully with FFmpeg. No source bundle was replayed or overwritten by this auditor.

`npm run eval` exited 1 according to the integrator because its strict script expects all three buggy cases confirmed. Retain that outcome; do not relabel the command as passing. The recorded selected case independently satisfies the two intended failures plus same-test fixed-pass contract, and the fixed investigation supplies the mandatory negative control.

Cost source is `x-litellm-response-cost`, with every fourth-series invocation present. It does not establish invoiced cash charges or promotional-credit usage (`billingCostUsd=null`). Costs from the three earlier cohorts and smoke/preflight calls must still be included in final all-attempt finance; unknown older costs must stay unknown.

Earlier originals remain preserved in [first baseline](../live-baseline-2026-10-12/README.md), [second series](../live-second-series-2026-10-12/README.md), and [third series](../live-third-series-2026-10-12/README.md). The fourth-series archive is private; the reviewed selected synthetic proof/media are published separately.
