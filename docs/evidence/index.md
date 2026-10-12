# BugReplay evidence index

This index distinguishes engineering verification from live-model acceptance. All examples use the controlled synthetic shop. No real customer data or credentials belong here.

| Evidence | Verified result | Limits |
| --- | --- | --- |
| [Engine baseline](engine-baseline-check.json) | 32/32 local regression checks passed on the published engine baseline | Explicit model/telemetry fixtures; not autonomous discovery |
| [Product checks](product-checks.json) | 5/5 real-shop scripted checks; two intended buggy failures, unchanged control pass, setup failures inconclusive | Known fixture conditions; no model or hosted telemetry used |
| [Published replay artifacts](scripted-replay/README.md) | Original saved test, checked hashes, process evidence, and before/after images | Scripted engineering run; two stdout copies redact only the machine path |
| [Web UI checks](web-ui-checks.json) | 9/9 real-Chromium checks, including original downloads, reload, cancel, conflict, navigation and recovery | Explicit synthetic HTTP fixture; no production mock switch |
| [Product handoff](product-handoff.md) | Commands, saved-test hash, artifact audit, integration limitations | Remaining acceptance gates are listed explicitly |
| [Clean installation](clean-install-check.json) | Fresh `npm ci`, TypeScript, and both production builds passed in a separate source copy | Local controlled prototype; existing upstream dependency advisories remain |
| [Entire readiness checkpoint](entire-readiness-checkpoint.json) | Genuine capture from the correctly scoped new Codex session before product coding | Readiness documentation only; not a trace-driven fix checkpoint |
| [CFO model input](cfo-model-input.md) | Prepared pricing/cost/revenue/runway inputs with assumptions identified | Not a cfo.ai output or sponsor-completion claim |
| [HyperFrames product preview](../../demo/bugreplay-product-preview.mp4) | Reviewed 52-second 720p video using actual screenshots and the saved-test replay; [source and checks](../../demo/README.md) | Persistent scripted/no-live-model label; not the final sponsor demo |

The real UI/API access-gate check on October 12, 2026 created run `44dc0497-9015-4c17-a294-d7acac5ec60b`. It returned `inconclusive` with `NEATLOGS_API_KEY is required before starting a real investigation.`, zero browser actions, and unavailable cost. Its saved result survived page reload. This is honest missing-access handling, not an investigation result.

## Required before the final hackathon demo

1. Run from the environment with private model and Neatlogs credentials; recheck hosted telemetry on that connection.
2. Record three actual buggy-shop investigations and one fixed-shop investigation. Independently inspect the saved test, two exact assertion failures, unchanged passing control, videos, and reports.
3. Preserve a real before/after trace improvement and the reviewed Entire checkpoint for that change.
4. Create or supply the actual cfo.ai model and document the decision it informs.
5. Record the final video of at most three minutes showing the actual run and all required sponsor tools. A clearly labeled scripted product preview does not complete this gate.

Raw working artifacts remain ignored under `artifacts/`. Only deliberately selected, reviewed copies should be public. The runtime model must never receive these engineering test recipes or the shop's hidden conditions.
