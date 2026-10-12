# Ready-to-paste CFO.ai / Ari prompt

Use in an active, authorized team workspace. Attach `bugreplay-financial-model.xlsx` and `scenario-assumptions.csv`. Do not upload `.env`, private billing pages or unreviewed runtime recordings.

---

Create a real CFO.ai model for **BugReplay**, an early prototype that turns a browser bug report into an independently verified Playwright reproduction. The MVP supports one controlled shop and one cart-preservation defect class. There are no measured paying customers or validated prices. The attached workbook is an assumption-based starting model, not actual financial statements.

Build one 12-month monthly operating cash forecast for November 2026 through October 2027. Use one Base/Downside selector and editable monthly drivers, preserving the attached scenario inputs. Opening cash is an assumed $10,000; opening teams are an assumed zero. Do not describe these as an actual bank balance or customer count.

Use these assumptions if an attachment cannot be imported:

- Price: $49/team/month, allowance 100 investigations in both cases. New teams start at the beginning of the month; churn applies to opening teams; closing teams are billed for the full month, with no proration.
- Base new teams by month: 5, 6, 8, 10, 12, 15, 18, 20, 22, 25, 28, 30. Downside: 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7.
- Monthly churn: Base 3%, Downside 8%. Allowance utilization: Base 60%, Downside 100%. Include unsuccessful/cancelled investigations in usage and costs.
- Illustrative cost per investigation, including all calls/retries: inference $0.06/$0.25, browser $0.015/$0.025, storage/export $0.005/$0.010 for Base/Downside. These are not quoted supplier prices or measured costs.
- Payment fees: assumed 3% of revenue + $0.30 per billed team per month in both cases. Fixed service hosting: $50/$100 monthly, additional to per-run costs.
- Monthly operating cash costs: founder/contractor pay $1,000/$2,000, marketing $200/$300, other $150/$200 for Base/Downside. Do not infer a measured CAC from acquisition and marketing assumptions.

Keep a separate empty actual-run input area for run ID, completion time, outcome, token usage, total inference cost, duration, Git SHA, trace link and the cost source. When costs are supplied, use the arithmetic mean of **every paid run**, including failures/cancellations. Missing cost/source or duplicate IDs must not silently become zero. Do not infer dollars from token counts without a verified rate. Show promotional credits separately from sustainable commercial costs.

Show closing teams, investigations, revenue, variable cost, fixed hosting, gross profit/margin, operating cash flow and closing cash. Revenue is collected in the same month. Exclude tax, debt, capex and working-capital timing explicitly. Flag the first month with negative closing cash; do not assume additional financing or negative cash is borrowable. If cash remains positive, report runway as at least the modeled 12-month horizon, not infinite.

Reconcile the initial Base output to revenue $42,966.41728626 and closing cash $30,405.40990727. Reconcile Downside to revenue $10,901.89530091, closing cash -$17,032.80614314 and first negative closing cash in month 5. Investigate mismatches rather than forcing an adjustment.

Include price/run-cost sensitivity and distinguish contribution margin before fixed hosting from gross margin including it. At a 70% contribution target, show that ($49 × (1 − 70% − 3%) − $0.30) / 100 = $0.1293 maximum variable cost per investigation before fixed hosting. Explain that the initial $0.285 Downside run cost would require about $106.67 for 100 investigations, or a smaller allowance, at that target.

Record one decision: keep the $49/100 offer as a hypothesis with an explicit allowance, measure all-run commercial cost, and reprice or reduce the allowance when full-usage contribution cannot meet the target. Do not claim this price or demand is validated.

Return an accessible model/export and views showing pricing, costs, revenue, runway and Base/Downside assumptions. This result will be used as genuine CFO.ai evidence in the final demo. Do not mark sponsor use complete until the model exists in this workspace.
