# Actual attempt cost ledger

Snapshot: 2026-10-12T15:35:25.478Z. Regenerate with `node docs/evidence/finance/build-cost-ledger.mjs` after further runs.

**The total actual invoice cost is unknown.** All 17 saved runtime investigations are included, including unsuccessful attempts, plus 2 successful model smoke checks and 5 rejected Bedrock access probes. Acceptance-summary copies and archived copies are not counted again.

## Runtime investigations

| Run ID | Git SHA | Outcome / target | Transport calls | Accounted input / output tokens | Duration seconds | Complete header-accounted gateway cost | Configured gateway non-cache estimate | Published list reference |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 66349e06-fc57-4de9-836f-b0a0d7ca0584 | Unknown | inconclusive / buggy | 0 | Unknown / Unknown | 3.430 | Unknown | Unknown | Unknown |
| e07bdfa3-c839-4e68-b784-640244403b2c | 60d2294 | inconclusive / buggy | 6 | 11259 / 391 | 15.818 | Unknown | $0.043606 | $0.039642 |
| 6992fe74-3395-430a-95ab-d73c207d70b6 | 60d2294 | inconclusive / buggy | 5 | 8635 / 328 | 10.446 | Unknown | $0.033908 | $0.030825 |
| 7e60e53a-1a02-4f81-918d-24649030fae0 | 60d2294 | inconclusive / buggy | 5 | 8530 / 310 | 10.590 | Unknown | $0.033264 | $0.030240 |
| 39b9bed4-fca9-4884-a7b9-3035fc860685 | 60d2294 | inconclusive / fixed | 5 | 8592 / 268 | 10.073 | Unknown | $0.032776 | $0.029796 |
| 70582bba-ec4a-4d46-9846-ecc305ec36fb | b8e9f7c | inconclusive / buggy | 6 | 11250 / 323 | 17.465 | Unknown | $0.042454 | $0.038595 |
| 6348e730-4d90-4e40-a3e7-6186a2825ca6 | b8e9f7c | inconclusive / buggy | 6 | 11322 / 293 | 12.773 | Unknown | $0.042197 | $0.038361 |
| 88928c9e-85d5-4806-a8e0-69d59f27790d | b8e9f7c | inconclusive / buggy | 6 | 11276 / 339 | 12.749 | Unknown | $0.042804 | $0.038913 |
| 9bf6f448-a6f3-43a7-9378-93602e6c7dbb | b8e9f7c | inconclusive / fixed | 6 | 11208 / 261 | 12.679 | Unknown | $0.041293 | $0.037539 |
| 5a3547da-c82d-4847-b67e-3985407c7fe3 | f7bee47 | inconclusive / buggy | 12 | 26994 / 767 | 25.978 | Unknown | $0.101736 | $0.092487 |
| 5e7c759d-aedf-4102-b17c-a5f3ecff5104 | f7bee47 | not_reproduced / buggy | 24 | 65169 / 2195 | 60.974 | Unknown | $0.251275 | $0.228432 |
| 19ecc208-aa4c-47ce-bc92-5e3523dfae59 | f7bee47 | not_reproduced / buggy | 40 | 115544 / 2605 | 86.806 | Unknown | $0.424278 | $0.385707 |
| c4010a11-3341-416c-a863-52aff89893a5 | f7bee47 | inconclusive / fixed | 9 | 18847 / 599 | 19.171 | Unknown | $0.072079 | $0.065526 |
| 247e9123-b7aa-46d6-9f36-936a6531960e | 2b541b2 | not_reproduced / buggy | 22 | 60315 / 2220 | 63.924 | $0.235670 | $0.235670 | $0.214245 |
| b8ffd757-6aed-405d-b7ac-ed3b1c4d9236 | 2b541b2 | bug_confirmed / buggy | 16 | 41069 / 1261 | 51.651 | $0.156334 | $0.156334 | $0.142122 |
| 7c259071-2c8c-45ee-8c65-5fafa1395ae7 | 2b541b2 | not_reproduced / buggy | 24 | 64690 / 2245 | 64.727 | $0.250520 | $0.250520 | $0.227745 |
| 6d85b46a-df25-42a9-abe9-54978f07d964 | 2b541b2 | not_reproduced / fixed | 30 | 82219 / 2476 | 73.639 | $0.312177 | $0.312177 | $0.283797 |

Runtime accounted-token subtotal: **556919 input / 16881 output**, with a configured gateway non-cache estimate of **$2.116369**. 0 runtime run(s) still have incomplete token coverage. The original October 12 baseline had lost terminal-response usage because token accounting followed response parsing. Terminal usage for 4 run(s) has been recovered from authenticated Neatlogs UI screenshots and preserved separately without editing original artifacts. The October 11 preflight-blocked run records zero model calls in its report; its missing token and billing fields remain unknown.

## Model smoke checks and rejected probes

- 2026-10-11T18:07:47.476Z: llm-smoke-1791742067478, pass, claude-sonnet-4.6, 1 call, 133/20 accounted input/output tokens, $0.000769 configured gateway non-cache estimate ($0.000699 published list reference); duration and actual bill unknown.
- 2026-10-12T15:00:41.009Z: llm-smoke-1791817241011, pass, claude-sonnet-4.6, 1 call, 133/20 accounted input/output tokens, $0.000769 configured gateway non-cache estimate ($0.000699 published list reference); duration and actual bill unknown.

The 5 rejected Bedrock entries and their observed durations are retained individually in the JSON ledger. They provide no token usage or invoice evidence. A 403 is not substituted with a measured zero cost. Non-inference DNS/TLS, policy and Neatlogs diagnostics are not model requests.

## Price sources and interpretation

Authenticated read-only gateway `/model/info` reported Sonnet 4.6 configured prices of **$3.30 input / $16.50 output per million tokens**, cache read **$0.33/M**, and cache write **$4.125/M**, observed 2026-10-12T15:16:59.061Z. The source is [the public rate extract](gateway-rate-reference.json). The non-cache estimate is `(accounted input × 3.30 + accounted output × 16.50) / 1,000,000`. It applies the currently observed rates to historical aggregate usage. The historical rate for each attempt and cache token categories are unverified, so this is a conditional estimate rather than a measured accounting debit or cash invoice.

[Official Anthropic Sonnet 4.6 model documentation](https://platform.claude.com/docs/en/models/sonnet-4-6/overview), checked October 12, 2026, separately lists standard input/output prices of $3/$15 per million. This alternative published list reference is 10% below the configured gateway rates. It is retained for comparison, not substituted for gateway rates.

Across investigations and 2 successful smokes, the configured gateway non-cache estimate is **$2.117907** and the alternative list reference is **$1.925370**. Complete original baseline token usage is recovered from local metrics plus the four Neatlogs terminal spans. The complete actual bill remains **Unknown**. Cache categories, historical debits, actual credit deductions, hosted browser compute and storage charges remain unknown.

Account-wide totals are not allocated; project billing remains unknown. The latest response-header accounting is recorded below, with historical missing values preserved.

## Gateway accounting headers

New `model-usage.json` records may preserve `x-litellm-response-cost` for each transport attempt, including invalid responses. The current snapshot has **4 investigation(s) with complete header cost coverage**, and the known header-accounted subtotal is **$0.954700**. A complete project accounting total remains **Unknown**. Missing headers remain unknown. Gateway-accounted cost is kept separate from both conditional token estimates and cash invoices/promotional credits.

## Use in the financial model

Keep both finance workbooks in **Planning** mode. Do not paste a conditional token estimate into measured inference cost as an actual all-calls bill. Base $0.06 inference and $0.08 total run costs remain assumptions. Preserve all outcomes when complete accounting records become available.

At the hypothetical $49/100 allowance and a 70% contribution target, the variable-cost ceiling remains $0.1293 per investigation before fixed hosting. This snapshot does not establish successful-investigation cost, hosted browser/storage cost, or commercial viability. Obtain per-attempt debit/cache details and the billing/credit ledger, then retain token and duration distributions before selecting a production budget.

The JSON ledger records source paths and SHA-256 hashes for reproducibility. Raw artifacts are local; publishing selected reviewed evidence is a separate release step. This scope excludes coding-agent costs, CFO.ai fees and unrecorded requests; those costs remain unknown.
