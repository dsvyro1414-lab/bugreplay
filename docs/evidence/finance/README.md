# BugReplay financial model

Status: **complete assumption-based workbook, created in the active CFO.ai workspace on October 12, 2026**. The native model, editable assumptions, monthly forecast, unit economics and actuals view were reviewed. Paying customers, complete provider bills and commercial viability remain unmeasured.

Open [bugreplay-financial-model.xlsx](bugreplay-financial-model.xlsx). It includes a 12-month cash operating forecast, one Base/Downside selector, contribution economics, price/run-cost sensitivity, and an empty input table for actual run costs. The hypothetical launch horizon is November 2026–October 2027.

## Use the model

1. In **Assumptions**, choose `Base` or `Downside` in `E4`. Blue cells are editable. Each driver has an Active row followed by the two case rows, with a separate value for each month.
2. Keep `E8 = Planning` until actual inference costs are available. The default costs are illustrative assumptions, not provider quotes. The remaining browser/storage/overhead costs are also assumptions.
3. To use measurements, enter every investigation in **Measured usage**, including unsuccessful and cancelled attempts. Supply its total inference cost and source, not just token counts. Choose `Measured` in `Assumptions!E8`. Missing cost, missing source or a duplicate run ID makes measured cost unavailable. An explicit zero is preserved as a valid number and still needs a source.
4. Inspect **Forecast** for revenue, gross profit, cash flow, closing cash and the first month with negative closing cash. Negative cash is an unfunded requirement, not automatic financing.
5. Inspect **Unit economics** for contribution at expected and full allowance usage. Its sensitivity grid uses transparent formulas, not Excel's native What-If Data Table.

## Initial results, all based on assumptions

| Measure | Base | Downside |
| --- | ---: | ---: |
| Opening cash | $10,000 | $10,000 |
| Price / included runs per team | $49 / 100 | $49 / 100 |
| Allowance utilization | 60% | 100% |
| Inference + browser + storage per run | $0.080 | $0.285 |
| 12-month revenue | $42,966.42 | $10,901.90 |
| 12-month gross profit, after fixed hosting | $36,605.41 | $2,967.19 |
| Ending cash | $30,405.41 | ($17,032.81) |
| First month with negative closing cash | None in the 12-month horizon | Month 5, March 2027 |

The downside changes acquisition, churn, run cost, usage and fixed spending together. It is a scenario, not a causal estimate. `scenario-results.csv` is a **saved initial snapshot** for transfer/reconciliation and does not automatically update when the workbook is edited. Regenerate it or export fresh results before using it with changed inputs.

## Decision informed by the model

Keep `$49 / 100 investigations` as an unvalidated pricing hypothesis, with an explicit usage allowance. At a 70% contribution target and the assumed 3% + $0.30 monthly payment fee, the maximum variable cost at full allowance is:

```text
($49 × (1 − 70% − 3%) − $0.30) / 100 = $0.1293 per investigation
```

This covers inference, browser time and incremental storage/export, **before fixed hosting**. With Base browser/storage assumptions of $0.0200, inference has $0.1093 of headroom. The initial Downside all-in run cost is $0.2850, which exceeds the target. It calls for repricing or a smaller allowance before launch. At that cost, the minimum price for 100 investigations at the stated contribution target is about **$106.67**, before fixed hosting. These thresholds are calculations from assumptions, not a market-price recommendation.

Measure average commercial inference cost over **all paid investigations**, including failures and cancellations. Hackathon credits are a financing benefit; they do not establish sustainable zero inference cost. Token counts require a verified rate or invoice before conversion to dollars. Measure and retain token/duration distributions as well as means before selecting a production budget.

## Runtime cost evidence

The [actual-attempt ledger](actual-attempt-cost-ledger.md) and [machine-readable source ledger](actual-attempt-cost-ledger.json) retain all saved October 11–12 runtime investigations, successful model smoke checks and rejected model-access probes. The four original baseline failures include terminal-response token usage recovered from Neatlogs. Authenticated gateway metadata verified the currently configured Sonnet 4.6 rates: $3.30 input/$16.50 output, $0.33 cache read and $4.125 cache write per million tokens. Historical rates and cache categories remain unknown. Conditional estimates using those rates are separate from the alternative Anthropic $3/$15 list reference, per-response gateway accounting headers, cash invoices and credits. Actual billed cash, promotional credit deductions and hosted browser/storage costs remain unknown.

Use the [CFO.ai evidence supplement](cfo-actual-cost-supplement.txt) to update the workspace with the latest runtime snapshot. Keep both workbooks in `Planning`: conditional token estimates do not establish complete actual bills. Rebuild the ledger after more runs with `node docs/evidence/finance/build-cost-ledger.mjs`; new `model-usage.json` files contribute per-transport outcomes, tokens, duration and gateway accounting headers when present. Acceptance-summary and archived copies are not counted again.

The [dated observed-evidence prompt](cfo-observed-evidence-prompt.txt) is the concise transfer for the final 17-investigation snapshot. It includes exact per-run outcomes/tokens/durations and the four latest investigations' complete $0.9546999 response-header accounting. The selected confirmed investigation alone accounts for $0.1563342, above the hypothetical $0.1293 variable-cost ceiling before browser/storage. Earlier accounting and complete cash/credit totals remain unknown.

## Accounting and timing

Opening teams start at zero as a forecast assumption. Churn applies to opening teams; new teams start at the beginning of the month and do not churn in their first month. Closing teams are billed for a full month with no proration. Fractional teams represent expected cohorts. Revenue equals same-month collections. Inference/browser/storage, payment fees and fixed hosting form cost of revenue. Cash pay, marketing and other operating spend are separate operating expenses. The model excludes tax, debt, capex and working-capital timing; it is not a three-statement model. Runway is assessed at monthly closing balances, not intra-month payment dates.

## CFO.ai transfer and evidence

The [ready-to-paste Ari prompt](cfo-transfer-prompt.md), [scenario inputs](scenario-assumptions.csv) and teammate workbook supplied the forecast inputs. Ari created a saved native model in the owner's active CFO.ai workspace. The reviewed native export is [BugReplay-CFO-Planning.xlsx](BugReplay-CFO-Planning.xlsx), copied byte for byte after checking metadata, strings and external relationships for personal data. Workspace access follows the owner's current permissions; owner-specific URLs remain in the local handoff.

Ari also created a separate dated observed-engineering page and [native workbook export](BugReplay-CFO-Observed-Engineering.xlsx). Its [independent audit](cfo-observed-export-audit.json) reconciles all 17 run rows and ten numerical summary values to the project ledger. The [reviewed native screenshot](screens/cfo-observed-costs.jpg) displays latest-four gateway accounting and explicitly unknown complete project billing. This page preserves observed engineering evidence without replacing the forecast's unvalidated assumptions.

[CFO.ai workspace review](cfo-workspace-review.md) links the reviewed screenshots and records the decision: retain $49/100 as an unvalidated hypothesis with a $0.1293 variable-cost ceiling, collect every paid attempt, and reprice or reduce the allowance if the full cost approaches the $0.285 downside assumption. The simulation changes visibly lowered full-allowance contribution to 38.2% and raised the required price to $106.67. The original $0.08 Base cost remains an assumption.

The [independent export audit](cfo-workbook-audit.json) reconciled all 12 monthly results in each case and all 20 sensitivity cells. The export keeps `Planning` selected and actual cost/credits unknown. It is a separate editable snapshot and needs a new export after native-model changes. Independent review of the [native edit and restoration screenshots](cfo-workspace-review.md) verifies that saved contribution-table values recalculated and returned to Base. The Canvas preview maintains independent simulation state; its preview cash must not be substituted for the saved forecast. No billing information or personal account identifier belongs in Git.

## Verification and reproducibility

[model-checks.json](model-checks.json) records independent reconciliation of all 12 revenue/cash values for both cases, later-period edits, zero versus missing costs, selected/unselected missing inputs, duplicate run IDs, and inclusion of cancelled investigations. All temporary QA rows were removed. The final formula scan found no Excel formula errors. All four worksheets were visually reviewed. Exported cell/formula/chart structure was also checked.

The model was calculated and rendered with the bundled `@oai/artifact-tool` runtime. Excel desktop behavior was not exercised. A native What-If attempt returned `#VALUE!` in this runtime; the delivered sensitivity grid uses ordinary formula cells and passed independent calculations. [build-model.mjs](build-model.mjs) regenerates the workbook using that package in a separate authoring environment, without changing repository dependencies:

```sh
node build-model.mjs /absolute/output/directory
```

The workbook itself is editable without that authoring package. Repository implementation/test suites are unaffected by this finance-only addition.
