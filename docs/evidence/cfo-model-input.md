# BugReplay model brief for cfo.ai

Status: prepared input, **not a cfo.ai output or evidence of sponsor use**.

Create a business model for BugReplay, a tool that converts a browser bug report into an independently verified Playwright reproduction. The MVP supports one controlled shop and one class of cart-preservation defect. It has no paying customers or verified market demand recorded in this repository.

## Inputs and provenance

| Input | Initial value | Basis |
| --- | --- | --- |
| Price per team per month | USD 49 | Hypothesis in `plan.md`; not validated pricing |
| Included investigations per team | 100 per month | Product assumption in `plan.md` |
| Model calls per investigation | Maximum 40 | Configured runner budget; not observed average |
| Investigation time | Maximum 6 minutes | Configured runner budget |
| Verification time | Maximum 2 minutes | Configured runner budget |
| Input/output tokens | Import from actual completed runs | Unknown until measured; include unsuccessful runs |
| Inference cost | Import provider billing or documented gateway rates | Unknown; a token count alone does not establish cost |
| Browser and storage cost | Explicit assumptions for a hosted version | The current MVP runs locally |
| Customers, growth, churn | Separate base and downside assumptions | No actual customer data is available |
| Fixed expenses and opening cash | Explicit team assumptions | No actual company financial data is required |

## Required model

Build a monthly model for 12 months with editable inputs for opening customers, new customers, churn, price, investigations per team, cost per investigation, payment fees, browser/storage expenses, salaries/other fixed expenses, and opening cash. Provide base and downside scenarios. Do not fill missing measurements with zero or describe assumed customers as actual customers.

Calculate customers, revenue, variable costs, gross profit/margin, total expenses, cash burn, and ending cash. Report runway only when the cash-flow assumptions support it. Include failed and cancelled investigations in cost per investigation.

Useful formulas:

- Closing customers = opening customers + new customers - churned customers.
- Revenue = billed teams × monthly price.
- Investigations = teams × investigations per team, including failed attempts.
- Variable costs = investigations × measured/assumed cost per investigation + payment fees.
- Gross profit = revenue - variable costs.
- Ending cash = opening cash + revenue - all cash expenses.

At USD 49 for 100 investigations, revenue per included investigation is USD 0.49 before any expenses. Use sensitivity analysis to determine how much of that can cover inference, browser time, and storage at the selected gross-margin target. Decide whether the existing action/time limits fit the economics after actual usage is measured.

## Evidence required before marking cfo.ai complete

Save the real cfo.ai model/export or accessible screenshots. Link it from `index.md`, label assumptions and measured inputs, and document one decision informed by the model. A Markdown brief or local spreadsheet by itself does not satisfy the cfo.ai requirement. Account signup and billing setup remain with the account owner.
