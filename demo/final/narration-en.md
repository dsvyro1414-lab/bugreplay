# English narration draft

Read the claim beside its corresponding footage. Bracketed items must be replaced from actual evidence before recording. If evidence is missing, omit the claim and keep the final-demo gate open. Approximately 270 words before substitutions, designed for a calm delivery with time to inspect each screen.

## 00:00–00:12

“BugReplay turns a browser bug report into a verified Playwright reproduction. Here, a shopper reports that their cart sometimes disappears after changing their delivery address.”

Caption: **A symptom and a URL. An executable reproduction.**

## 00:12–00:44

“The investigator receives the report, expected behavior and browser observations. It does not receive the shop source or the hidden trigger. Watch this observation: [describe the actual negative result]. The agent then [describe its actual next decision]. This is an edited recording of a real run lasting [elapsed time], under explicit action and time limits.”

Caption: **Recorded investigation. [Actual elapsed time]. [Speed factor where applied].**

## 00:44–01:04

“The candidate becomes a test compiled from the trusted browser log, including its setup. Separate Playwright processes execute that saved file twice from clean contexts. Both runs fail on the cart-preservation assertion. A selector or loading failure would remain inconclusive.”

Caption only after verification: **Same saved test. Two clean replays. Two intended assertion failures.**

## 01:04–01:31

“Neatlogs exposed [actual weakness] in this run. We changed [specific behavior], then repeated the same case. These traces show [actual before metric] and [actual after metric], with the same [relevant conditions]. That is the evidence behind this change.”

Caption: **[Before run ID] → [After run ID]. [Metric and denominator].**

## 01:31–01:51

“Entire preserves the coding context for that fix. This checkpoint links the rationale to the exact code change, so we can inspect what changed and why.”

Caption: **[Actual checkpoint ID]. [Fix commit SHA].**

## 01:51–02:17

“In CFO.ai, our pricing hypothesis is forty-nine dollars per team for one hundred investigations. At a seventy-percent contribution target, the assumed payment fees leave about thirteen cents per investigation, before fixed hosting. We include unsuccessful runs in costs. The downside scenario shows when we must reprice or reduce the allowance.”

Caption: **Planning assumptions. Replace inference cost with measured all-run cost.**

## 02:17–02:34

“Now the identical test passes against the corrected control. Only the base URL changes. The saved test and its hash show that this result concerns the application defect.”

Caption only after verification: **Unchanged test. Fixed control. Preservation assertion passes.**

## 02:34–02:50

“The repository contains the code and reviewed evidence. This MVP supports one controlled shop and one defect class. BugReplay turns a browser bug report into a verified Playwright reproduction.”

Caption: **Code, original test, report and evidence: [public repository URL].**
