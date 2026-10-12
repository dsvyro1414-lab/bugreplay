# BugReplay evidence index

This index distinguishes engineering verification from live-model acceptance. All examples use the controlled synthetic shop. No real customer data or credentials belong here.

| Evidence | Verified result | Limits |
| --- | --- | --- |
| [Engine baseline](engine-baseline-check.json) | 32/32 local regression checks passed on the published engine baseline | Explicit model/telemetry fixtures; not autonomous discovery |
| [Real-model baseline, October 12](live-baseline-2026-10-12/README.md) | Three buggy and one fixed investigation at `60d2294`; all originals preserved and independently checked; genuine Neatlogs response-format failure inspected | All four inconclusive; no saved reproduction or replay; original RunView token totals omit final malformed calls (later recovered in finance ledger); this baseline alone establishes no improvement |
| [Second real-model series](live-second-series-2026-10-12/README.md) | Four original investigation videos decode; all 24 per-call usage entries, including invalid responses, exactly reconcile with final RunViews | All four still inconclusive at `b8e9f7c`; Raw trace proves prose plus unfenced JSON suffix; the fenced-response change did not solve it; dollar costs remain unknown |
| [Third real-model series](live-third-series-2026-10-12/README.md) | Five original videos decode; all 85 attempts reconcile; 33 response normalizations recorded; all 101 original files archived with hashes | At `f7bee47`, two inconclusive and two not_reproduced; no confirmed reproduction or replay; costs unknown; [remaining entry checklist](live-third-series-2026-10-12/submission-checklist.md) |
| [First real confirmed discovery](live-confirmed-2026-10-12/README.md) | Real model run at `2b541b2`; 2/2 intended assertion failures; byte-identical saved test passes automatic and separately isolated manual fixed controls; original videos/PNG reviewed and published | One selected controlled-shop case; original bundle preserved before manual replay; selected gateway cost $0.1563342, above unit-cost target |
| [Fourth complete real cohort](live-fourth-series-2026-10-12/README.md) | All four outcomes and 159 original files archived; all 92 model calls reconcile including invalid responses; nine unique videos fully decode | Buggy discovery1/3; two buggy non-discoveries; fixed negative control not_reproduced; strict npm eval exits 1; gateway $0.9546999, billing/credits unknown |
| [Trace-guided improvement history](live-improvement-2026-10-12/README.md) | Genuine before/after trace IDs, actual source diffs, authentic fix-linked Entire checkpoints and reviewed local CLI export | Multiple generic changes and stochastic small cohorts; hosted after UI screenshot still pending; no speed/cost reduction or isolated causal claim |
| [Product checks](product-checks.json) | 5/5 real-shop scripted checks; two intended buggy failures, unchanged control pass, setup failures inconclusive | Known fixture conditions; no model or hosted telemetry used |
| [Published replay artifacts](scripted-replay/README.md) | Original saved test, checked hashes, process evidence, and before/after images | Scripted engineering run; two stdout copies redact only the machine path |
| [Web UI checks](web-ui-checks.json) | 9/9 real-Chromium checks, including original downloads, reload, cancel, conflict, navigation and recovery | Explicit synthetic HTTP fixture; no production mock switch |
| [Product handoff](product-handoff.md) | Commands, saved-test hash, artifact audit, integration limitations | Remaining acceptance gates are listed explicitly |
| [Clean installation](clean-install-check.json) | Fresh `npm ci`, TypeScript, and both production builds passed in a separate source copy | Local controlled prototype; existing upstream dependency advisories remain |
| [Entire readiness checkpoint](entire-readiness-checkpoint.json) | Genuine capture from the correctly scoped new Codex session before product coding | Readiness documentation only; not a trace-driven fix checkpoint |
| [CFO model input](cfo-model-input.md) | Prepared pricing/cost/revenue/runway inputs with assumptions identified | Not a cfo.ai output or sponsor-completion claim |
| [Financial model and actual CFO.ai workspace](finance/cfo-workspace-review.md) | Saved native model, editable assumptions, 12-month Base/Downside forecasts, driver edit/recalculation/restoration and reviewed workbook export | Planning assumptions; independent Canvas state is separate; unauthenticated judge workspace access unverified |
| [All-attempt costs](finance/actual-attempt-cost-ledger.md) | All17 saved investigations, 2 model smokes and 5 rejected probes retained; latest 4 complete gateway-header ledgers total $0.9546999 | Full cash invoice/credits/browser/storage unknown; conditional gateway-rate estimates are not bills; selected run exceeds variable-cost target |
| [Real tooling preflight](live-confirmed-2026-10-12/tooling-summary.json) | Genuine model smoke and finalized Neatlogs trace readback passed before real cohorts | Whitelisted safe summary; original ignored files are local provenance only, not public download links |
| [Final demo recording kit](../../demo/final/README.md) | 2:50 shot list, English narration, evidence manifest/validator, exact Agent A request and submission draft | Materials only; genuine runtime/sponsor footage and final publication remain pending |
| [HyperFrames product preview](../../demo/bugreplay-product-preview.mp4) | Reviewed 52-second 720p video using actual screenshots and the saved-test replay; [source and checks](../../demo/README.md) | Persistent scripted/no-live-model label; not the final sponsor demo |

The real UI/API access-gate check on October 12, 2026 created run `44dc0497-9015-4c17-a294-d7acac5ec60b`. It returned `inconclusive` with `NEATLOGS_API_KEY is required before starting a real investigation.`, zero browser actions, and unavailable cost. Its saved result survived page reload. This is honest missing-access handling, not an investigation result.

Later that day, model API access and finalized Neatlogs delivery passed in the configured integration environment. The [first real four-run baseline](live-baseline-2026-10-12/README.md) still failed live acceptance because each run stopped on a malformed model response. Integration and access checks do not establish successful discovery. Subsequent fixes and independently confirmed selected proof are recorded in the latest stage/fourth-series rows above without replacing these original outcomes.

## Latest readiness and remaining submission gates

The selected controlled-shop real-model proof is independently verified: two intended failures, unchanged automatic fixed pass and separately isolated manual fixed pass. The complete latest evaluation retains 1/3 buggy discovery and the fixed negative control; strict `npm run eval` exited 1. Genuine fix-linked Entire metadata and the actual CFO.ai model have reviewed evidence. These technical results do not establish a published submission.

1. Capture/review the hosted Neatlogs after screen; before captures, after trace identity, metrics and local proof already exist.
2. Review and publish the final ≤3-minute video showing the real investigation and all required sponsor tools; the 52-second engineering preview remains historical.
3. Verify team name/members, each member's registration/check-in, build-in-public links, and final Discord cutoff/official submission post.
4. Publish the required launch quote with demo and tags, finish the leader's verified-email submission form, and save the actual confirmation. No submission/public-post gate is marked complete here.
5. Verify judge access to public repository/downloads, video and CFO.ai evidence; owner-only workspace access is not anonymous access. Keep complete invoices/credits unknown until supplied.

Raw working artifacts remain ignored under `artifacts/`. Only deliberately selected, reviewed copies should be public. The runtime model must never receive these engineering test recipes or the shop's hidden conditions.
