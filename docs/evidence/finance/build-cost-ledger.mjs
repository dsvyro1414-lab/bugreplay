import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Read only explicit, non-secret fields from local runtime evidence. No provider calls.
const root = path.resolve(process.argv[2] ?? '.');
const output = path.join(root, 'docs/evidence/finance');
const read = async relative => JSON.parse(await fs.readFile(path.join(root, relative), 'utf8'));
const optional = async relative => { try { return await read(relative); } catch { return null; } };
const optionalText = async relative => { try { return await fs.readFile(path.join(root, relative), 'utf8'); } catch { return ''; } };
const rounded = value => Math.round(value * 1e9) / 1e9;
const price = {
  model: 'Claude Sonnet 4.6',
  inputUsdPerMillion: 3,
  outputUsdPerMillion: 15,
  source: 'https://platform.claude.com/docs/en/models/sonnet-4-6/overview',
  verifiedOn: '2026-10-12',
  sourceType: 'Official Anthropic list-price reference, not organizer gateway billing',
  limitations: 'Alternative published reference. Configured gateway rates are recorded separately. Cache breakdown, historical rates, credit deductions and invoices remain unverified.',
};
const gatewayCostFile = 'artifacts/tooling/litellm-cost-source-1791818219062.json';
const gatewayCost = await optional(gatewayCostFile);
const gatewayRate = gatewayCost?.modelInfo?.rates?.find(rate => rate.model === 'claude-sonnet-4.6');
const publicGatewayRateFile = 'docs/evidence/finance/gateway-rate-reference.json';
if (gatewayRate) {
  await fs.mkdir(output,{recursive:true});
  await fs.writeFile(path.join(root,publicGatewayRateFile),JSON.stringify({retrievedAtUtc:gatewayCost.retrievedAt,model:gatewayRate.model,sourceType:'Authenticated read-only gateway /model/info',rates:gatewayRate,historicalRatesVerified:false,note:'Selected public model pricing fields only. Account-wide totals are not allocated; project billing remains unknown.'},null,2)+'\n');
}
const configuredGatewayRates = gatewayRate ? {
  model: gatewayRate.model,
  inputUsdPerMillion: gatewayRate.inputCostPerTokenUsd * 1e6,
  outputUsdPerMillion: gatewayRate.outputCostPerTokenUsd * 1e6,
  cacheReadUsdPerMillion: gatewayRate.cacheReadInputCostPerTokenUsd * 1e6,
  cacheCreationUsdPerMillion: gatewayRate.cacheCreationInputCostPerTokenUsd * 1e6,
  observedAtUtc: gatewayCost.retrievedAt, sourceFile: publicGatewayRateFile,
  sourceType: 'Authenticated read-only gateway /model/info configured rates',
  historicalRateVerified: false,
  note: 'Non-cache estimate applies the currently observed configured rates to recorded historical aggregate tokens. Per-attempt cache categories, historical debits and cash billing remain unverified.',
} : null;
const sources = new Map();
const recoveriesFile = 'docs/evidence/finance/neatlogs-usage-recoveries.json';
const recoveredUsage = (await optional(recoveriesFile))?.recoveries ?? [];
async function cite(relative) {
  if (!sources.has(relative)) {
    const bytes = await fs.readFile(path.join(root, relative));
    sources.set(relative, { path: relative, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  }
  return relative;
}
function subtotal(model, inputTokens, outputTokens) {
  return model === 'claude-sonnet-4.6' && Number.isFinite(inputTokens) && Number.isFinite(outputTokens)
    ? rounded((inputTokens * price.inputUsdPerMillion + outputTokens * price.outputUsdPerMillion) / 1e6)
    : null;
}
function configuredEstimate(model, inputTokens, outputTokens) {
  return gatewayRate && model === gatewayRate.model && Number.isFinite(inputTokens) && Number.isFinite(outputTokens)
    ? rounded(inputTokens * gatewayRate.inputCostPerTokenUsd + outputTokens * gatewayRate.outputCostPerTokenUsd)
    : null;
}
if (gatewayRate) await cite(publicGatewayRateFile);
const investigations = [];
for (const entry of await fs.readdir(path.join(root, 'artifacts'), { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const file = `artifacts/${entry.name}/run.json`;
  const run = await optional(file);
  if (!run?.id || !/^2026-10-(11|12)T/.test(run.createdAt ?? '')) continue;
  const traceFile = `artifacts/${entry.name}/trace.json`, reportFile = `artifacts/${entry.name}/report.md`;
  const usageFile = `artifacts/${entry.name}/model-usage.json`, usage = await optional(usageFile);
  const trace = await optional(traceFile), report = await optionalText(reportFile);
  const modelCalls = usage?.attempts ? String(usage.attempts.length) : report.match(/model calls: (\d+)/)?.[1];
  const recovered = usage ? [] : recoveredUsage.filter(item => item.runId === run.id);
  const recoveredInputTokens = recovered.reduce((sum, item) => sum + item.inputTokens, 0);
  const recoveredOutputTokens = recovered.reduce((sum, item) => sum + item.outputTokens, 0);
  const sumKnown = key => {
    const known = (usage?.attempts ?? []).filter(attempt => Number.isFinite(attempt[key]));
    return known.length ? known.reduce((sum, attempt) => sum + attempt[key], 0) : null;
  };
  const accountedInputTokens = usage ? sumKnown('inputTokens') : run.metrics?.inputTokens === undefined ? null : run.metrics.inputTokens + recoveredInputTokens;
  const accountedOutputTokens = usage ? sumKnown('outputTokens') : run.metrics?.outputTokens === undefined ? null : run.metrics.outputTokens + recoveredOutputTokens;
  const model = usage?.model ?? trace?.model ?? null;
  const gatewayHeaderCosts = usage?.attempts?.filter(attempt => Number.isFinite(attempt.costUsd) && attempt.costSource === 'x-litellm-response-cost') ?? [];
  const gatewayHeaderKnownCostUsd = gatewayHeaderCosts.length ? rounded(gatewayHeaderCosts.reduce((sum, attempt) => sum + attempt.costUsd, 0)) : null;
  const gatewayHeaderCostComplete = Boolean(usage?.attempts?.length && gatewayHeaderCosts.length === usage.attempts.length);
  const completed = [...(run.events ?? [])].reverse().find(event => event.type === 'completed');
  const malformedResponse = completed?.message?.startsWith('Model response');
  const coverage = usage && usage.usageComplete && usage.attempts.every(attempt => Number.isFinite(attempt.inputTokens) && Number.isFinite(attempt.outputTokens)) ? 'complete per-transport token ledger; actual invoice unknown'
    : usage ? 'partial: at least one transport attempt has unknown usage'
    : malformedResponse && !recovered.length ? 'partial: final malformed response usage was not persisted'
    : malformedResponse && recovered.length ? 'local aggregate plus terminal provider-response tokens recovered from Neatlogs; invoice unknown'
    : Number(modelCalls) === 0 ? 'no model calls recorded; blocked before investigation'
    : run.metrics?.inputTokens === undefined || run.metrics?.outputTokens === undefined ? 'unknown: aggregate tokens missing'
    : 'aggregate response tokens recorded; per-call billing completeness unverified';
  const refs = [await cite(file)];
  if (trace) refs.push(await cite(traceFile));
  if (report) refs.push(await cite(reportFile));
  if (usage) refs.push(await cite(usageFile));
  if (recovered.length) {
    refs.push(await cite(recoveriesFile));
    for (const recovery of recovered) refs.push(await cite(recovery.screenshot));
  }
  investigations.push({
    runId: run.id, createdAtUtc: run.createdAt, completedAtUtc: run.updatedAt,
    status: run.status, target: new URL(run.input.targetUrl).port === '4174' ? 'fixed' : 'buggy',
    model, gitSha: trace?.gitSha ?? null, traceId: trace?.traceId ?? null,
    actions: run.metrics?.actions ?? null, elapsedMs: run.metrics?.elapsedMs ?? null,
    modelTransportAttempts: modelCalls === undefined ? null : Number(modelCalls),
    recordedInputTokens: run.metrics?.inputTokens ?? null, recordedOutputTokens: run.metrics?.outputTokens ?? null,
    recoveredInputTokens: recovered.length ? recoveredInputTokens : null,
    recoveredOutputTokens: recovered.length ? recoveredOutputTokens : null,
    accountedInputTokens, accountedOutputTokens,
    recoveredTerminalSpans: recovered,
    perCallUsage: usage?.attempts?.map(attempt => ({
      attempt: attempt.attempt, startedAtUtc: attempt.startedAt, durationMs: attempt.durationMs ?? null,
      status: attempt.status, inputTokens: attempt.inputTokens ?? null, outputTokens: attempt.outputTokens ?? null,
      normalized: attempt.normalized ?? null, errorCode: attempt.errorCode ?? null,
      gatewayAccountingCostUsd: Number.isFinite(attempt.costUsd) && attempt.costSource === 'x-litellm-response-cost' ? attempt.costUsd : null,
      gatewayAccountingCostSource: attempt.costSource === 'x-litellm-response-cost' ? attempt.costSource : null,
      referencePricedRecordedTokenSubtotalUsd: subtotal(model, attempt.inputTokens, attempt.outputTokens),
      configuredGatewayNonCacheEstimateUsd: configuredEstimate(model, attempt.inputTokens, attempt.outputTokens),
      actualInferenceCostUsd: null,
    })) ?? null,
    usageCoverage: coverage,
    referencePricedRecordedTokenSubtotalUsd: subtotal(model, accountedInputTokens, accountedOutputTokens),
    configuredGatewayNonCacheEstimateUsd: configuredEstimate(model, accountedInputTokens, accountedOutputTokens),
    cacheReadInputTokens: null, cacheCreationInputTokens: null,
    gatewayAccountingKnownSubtotalUsd: gatewayHeaderKnownCostUsd,
    gatewayAccountingCoveredCalls: gatewayHeaderCosts.length,
    gatewayAccountingCostComplete: gatewayHeaderCostComplete,
    gatewayAccountingCostUsd: gatewayHeaderCostComplete ? gatewayHeaderKnownCostUsd : null,
    gatewayAccountingCostSource: gatewayHeaderCosts.length ? 'x-litellm-response-cost response header, preserved in model-usage.json' : null,
    actualInferenceCostUsd: null, actualBillingSource: null, promotionalCreditUsd: null,
    browserCostUsd: null, storageCostUsd: null,
    blocker: malformedResponse ? 'Model response parsing failed.' : Number(modelCalls) === 0 ? 'Neatlogs preflight blocked investigation before model calls.' : null,
    sources: refs,
  });
}
investigations.sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc));
const smokes = [];
for (const filename of await fs.readdir(path.join(root, 'artifacts/tooling'))) {
  if (!/^llm-smoke-\d+\.json$/.test(filename)) continue;
  const file = `artifacts/tooling/${filename}`, smoke = await read(file);
  smokes.push({
    attemptId: filename.slice(0, -5), atUtc: smoke.at ?? null, outcome: smoke.status,
    model: smoke.model ?? null, gitSha: smoke.gitSha ?? null,
    modelTransportAttempts: smoke.calls ?? null, elapsedMs: smoke.elapsedMs ?? null,
    recordedInputTokens: smoke.inputTokens ?? null, recordedOutputTokens: smoke.outputTokens ?? null,
    accountedInputTokens: smoke.inputTokens ?? null, accountedOutputTokens: smoke.outputTokens ?? null,
    usageCoverage: 'single successful response tokens recorded; bill not supplied',
    referencePricedRecordedTokenSubtotalUsd: subtotal(smoke.model, smoke.inputTokens, smoke.outputTokens),
    configuredGatewayNonCacheEstimateUsd: configuredEstimate(smoke.model, smoke.inputTokens, smoke.outputTokens),
    cacheReadInputTokens: null, cacheCreationInputTokens: null,
    actualInferenceCostUsd: null, actualBillingSource: null, promotionalCreditUsd: null,
    sources: [await cite(file)],
  });
}
smokes.sort((a, b) => (a.atUtc ?? '').localeCompare(b.atUtc ?? ''));
const rejectedModelProbes = [];
const accessFile = 'artifacts/tooling/aws-model-access-check.json';
for (const [index, probe] of (await optional(accessFile) ?? []).entries()) {
  rejectedModelProbes.push({ attemptId: `aws-model-access-check:${index + 1}`, atUtc: null, outcome: 'rejected_403',
    model: probe.model, modelTransportAttempts: probe.calls ?? null, elapsedMs: probe.elapsedMs ?? null,
    recordedInputTokens: null, recordedOutputTokens: null, actualInferenceCostUsd: null,
    referencePricedRecordedTokenSubtotalUsd: null, actualBillingSource: null,
    note: 'No token usage or billing record supplied. Rejection is not used to assert a zero bill.', sources: [await cite(accessFile)] });
}
const directFile = 'artifacts/tooling/aws-direct-converse-diagnosis-1791731995631.json';
const direct = await optional(directFile);
for (const [index, probe] of (direct?.results ?? []).entries()) {
  rejectedModelProbes.push({ attemptId: `aws-direct-converse:${index + 1}`, atUtc: direct.at ?? null, outcome: 'rejected_403',
    model: probe.modelId, modelTransportAttempts: null, observedConverseOperations: 1, elapsedMs: probe.elapsedMs ?? null,
    recordedInputTokens: null, recordedOutputTokens: null, actualInferenceCostUsd: null,
    referencePricedRecordedTokenSubtotalUsd: null, actualBillingSource: null,
    note: 'One recorded Converse operation; transport retries are not independently recorded. No usage or bill supplied.', sources: [await cite(directFile)] });
}
const hotspotFile = 'artifacts/tooling/aws-hotspot-access-smoke-1791732879989.json', hotspot = await optional(hotspotFile);
if (hotspot) rejectedModelProbes.push({ attemptId: 'aws-hotspot-access-smoke', atUtc: hotspot.timestamp ?? null,
  outcome: 'rejected_403', model: hotspot.modelId, modelTransportAttempts: hotspot.transportAttempts ?? null,
  elapsedMs: hotspot.elapsedMs ?? null, recordedInputTokens: null, recordedOutputTokens: null,
  actualInferenceCostUsd: null, referencePricedRecordedTokenSubtotalUsd: null, actualBillingSource: null,
  note: 'No token usage or billing record supplied. Rejection is not used to assert a zero bill.', sources: [await cite(hotspotFile)] });
const knownSubtotal = (rows, key) => {
  const known = rows.filter(row => Number.isFinite(row[key]));
  return known.length ? rounded(known.reduce((sum, row) => sum + row[key], 0)) : null;
};
const total = rows => ({
  attempts: rows.length,
  recordedInputTokensSubtotal: knownSubtotal(rows, 'accountedInputTokens'),
  recordedOutputTokensSubtotal: knownSubtotal(rows, 'accountedOutputTokens'),
  rowsWithBothTokenCounts: rows.filter(row => row.accountedInputTokens !== null && row.accountedOutputTokens !== null).length,
  referencePricedRecordedTokenSubtotalUsd: knownSubtotal(rows, 'referencePricedRecordedTokenSubtotalUsd'),
  configuredGatewayNonCacheEstimateUsd: knownSubtotal(rows, 'configuredGatewayNonCacheEstimateUsd'),
  gatewayAccountingKnownSubtotalUsd: knownSubtotal(rows, 'gatewayAccountingKnownSubtotalUsd'),
  gatewayAccountingRowsWithCompleteCost: rows.filter(row => row.gatewayAccountingCostComplete === true).length,
  gatewayAccountingCostTotalUsd: rows.length && rows.every(row => row.gatewayAccountingCostComplete === true) ? knownSubtotal(rows, 'gatewayAccountingCostUsd') : null,
  actualInferenceCostTotalUsd: null,
  note: 'Subtotal covers recorded token values only. Missing values remain null in detail and make the complete actual cost unknown.',
});
const versions = [...new Set(investigations.map(row => row.gitSha))].map(gitSha => {
  const rows = investigations.filter(row => row.gitSha === gitSha);
  return { gitSha, ...total(rows),
    statuses: rows.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] ?? 0) + 1 }), {}),
    modelTransportAttempts: rows.every(row => row.modelTransportAttempts !== null) ? rows.reduce((sum, row) => sum + row.modelTransportAttempts, 0) : null,
    elapsedMsTotal: rows.every(row => row.elapsedMs !== null) ? rows.reduce((sum, row) => sum + row.elapsedMs, 0) : null,
  };
});
const ledger = { formatVersion: 1, generatedAtUtc: new Date().toISOString(), scope: 'All saved runtime investigations on October 11-12 UTC and available model smoke/access probes; excludes coding-assistant usage and CFO.ai subscription usage, which are not recorded here.',
  snapshot: 'Regenerate after every additional investigation or smoke. Copies of acceptance summaries are not counted again.',
  currency: 'USD', missingValue: 'null means unknown, not zero', listPriceReference: price, configuredGatewayRates,
  totalActualInferenceCostUsd: null, actualOrganizerBilling: `Configured gateway unit rates verified; ${investigations.filter(row=>row.gatewayAccountingCostComplete).length} investigations have complete response-header gateway accounting, ${investigations.filter(row=>!row.gatewayAccountingCostComplete).length} historical investigations have unknown complete accounting. Cash invoices and promotional credit treatment remain unknown for all attempts. Account-wide totals are not allocated.`,
  promotionalCredits: { amountUsd: null, source: null, note: 'No verified credit allocation or deduction ledger supplied. Credits must remain separate from commercial cost.' },
  investigationSummary: total(investigations), smokeSummary: total(smokes), rejectedProbeCount: rejectedModelProbes.length,
  versionSummaries: versions,
  recordedReferenceSubtotalAllUsd: knownSubtotal([...investigations, ...smokes], 'referencePricedRecordedTokenSubtotalUsd'),
  configuredGatewayNonCacheEstimateAllUsd: knownSubtotal([...investigations, ...smokes], 'configuredGatewayNonCacheEstimateUsd'),
  investigations, smokes, rejectedModelProbes, sources: [...sources.values()],
};
await fs.mkdir(output, { recursive: true });
await fs.writeFile(path.join(output, 'actual-attempt-cost-ledger.json'), JSON.stringify(ledger, null, 2) + '\n');
const money = value => value === null ? 'Unknown' : `$${value.toFixed(6)}`;
const val = value => value === null ? 'Unknown' : String(value);
const incompleteMalformed = investigations.filter(row => row.usageCoverage.startsWith('partial:')).length;
const recoveredMalformed = investigations.filter(row => row.recoveredTerminalSpans.length).length;
const table = investigations.map(row => `| ${row.runId} | ${row.gitSha?.slice(0, 7) ?? 'Unknown'} | ${row.status} / ${row.target} | ${val(row.modelTransportAttempts)} | ${val(row.accountedInputTokens)} / ${val(row.accountedOutputTokens)} | ${row.elapsedMs === null ? 'Unknown' : (row.elapsedMs / 1000).toFixed(3)} | ${money(row.gatewayAccountingCostUsd)} | ${money(row.configuredGatewayNonCacheEstimateUsd)} | ${money(row.referencePricedRecordedTokenSubtotalUsd)} |`).join('\n');
const markdown = `# Actual attempt cost ledger

Snapshot: ${ledger.generatedAtUtc}. Regenerate with \`node docs/evidence/finance/build-cost-ledger.mjs\` after further runs.

**The total actual invoice cost is unknown.** All ${investigations.length} saved runtime investigations are included, including unsuccessful attempts, plus ${smokes.length} successful model smoke checks and ${rejectedModelProbes.length} rejected Bedrock access probes. Acceptance-summary copies and archived copies are not counted again.

## Runtime investigations

| Run ID | Git SHA | Outcome / target | Transport calls | Accounted input / output tokens | Duration seconds | Complete header-accounted gateway cost | Configured gateway non-cache estimate | Published list reference |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
${table}

Runtime accounted-token subtotal: **${ledger.investigationSummary.recordedInputTokensSubtotal} input / ${ledger.investigationSummary.recordedOutputTokensSubtotal} output**, with a configured gateway non-cache estimate of **${money(ledger.investigationSummary.configuredGatewayNonCacheEstimateUsd)}**. ${incompleteMalformed} runtime run(s) still have incomplete token coverage. The original October 12 baseline had lost terminal-response usage because token accounting followed response parsing. Terminal usage for ${recoveredMalformed} run(s) has been recovered from authenticated Neatlogs UI screenshots and preserved separately without editing original artifacts. The October 11 preflight-blocked run records zero model calls in its report; its missing token and billing fields remain unknown.

## Model smoke checks and rejected probes

${smokes.map(row => `- ${row.atUtc}: ${row.attemptId}, ${row.outcome}, ${row.model}, ${row.modelTransportAttempts} call, ${row.recordedInputTokens}/${row.recordedOutputTokens} accounted input/output tokens, ${money(row.configuredGatewayNonCacheEstimateUsd)} configured gateway non-cache estimate (${money(row.referencePricedRecordedTokenSubtotalUsd)} published list reference); duration and actual bill unknown.`).join('\n')}

The ${rejectedModelProbes.length} rejected Bedrock entries and their observed durations are retained individually in the JSON ledger. They provide no token usage or invoice evidence. A 403 is not substituted with a measured zero cost. Non-inference DNS/TLS, policy and Neatlogs diagnostics are not model requests.

## Price sources and interpretation

Authenticated read-only gateway \`/model/info\` reported Sonnet 4.6 configured prices of **$3.30 input / $16.50 output per million tokens**, cache read **$0.33/M**, and cache write **$4.125/M**, observed ${configuredGatewayRates?.observedAtUtc ?? 'Unknown'}. The source is [the public rate extract](gateway-rate-reference.json). The non-cache estimate is \`(accounted input × 3.30 + accounted output × 16.50) / 1,000,000\`. It applies the currently observed rates to historical aggregate usage. The historical rate for each attempt and cache token categories are unverified, so this is a conditional estimate rather than a measured accounting debit or cash invoice.

[Official Anthropic Sonnet 4.6 model documentation](${price.source}), checked October 12, 2026, separately lists standard input/output prices of $3/$15 per million. This alternative published list reference is 10% below the configured gateway rates. It is retained for comparison, not substituted for gateway rates.

Across investigations and ${smokes.length} successful smokes, the configured gateway non-cache estimate is **${money(ledger.configuredGatewayNonCacheEstimateAllUsd)}** and the alternative list reference is **${money(ledger.recordedReferenceSubtotalAllUsd)}**. Complete original baseline token usage is recovered from local metrics plus the four Neatlogs terminal spans. The complete actual bill remains **Unknown**. Cache categories, historical debits, actual credit deductions, hosted browser compute and storage charges remain unknown.

Account-wide totals are not allocated; project billing remains unknown. The latest response-header accounting is recorded below, with historical missing values preserved.

## Gateway accounting headers

New \`model-usage.json\` records may preserve \`x-litellm-response-cost\` for each transport attempt, including invalid responses. The current snapshot has **${ledger.investigationSummary.gatewayAccountingRowsWithCompleteCost} investigation(s) with complete header cost coverage**, and the known header-accounted subtotal is **${money(ledger.investigationSummary.gatewayAccountingKnownSubtotalUsd)}**. A complete project accounting total remains **${money(ledger.investigationSummary.gatewayAccountingCostTotalUsd)}**. Missing headers remain unknown. Gateway-accounted cost is kept separate from both conditional token estimates and cash invoices/promotional credits.

## Use in the financial model

Keep both finance workbooks in **Planning** mode. Do not paste a conditional token estimate into measured inference cost as an actual all-calls bill. Base $0.06 inference and $0.08 total run costs remain assumptions. Preserve all outcomes when complete accounting records become available.

At the hypothetical $49/100 allowance and a 70% contribution target, the variable-cost ceiling remains $0.1293 per investigation before fixed hosting. This snapshot does not establish successful-investigation cost, hosted browser/storage cost, or commercial viability. Obtain per-attempt debit/cache details and the billing/credit ledger, then retain token and duration distributions before selecting a production budget.

The JSON ledger records source paths and SHA-256 hashes for reproducibility. Raw artifacts are local; publishing selected reviewed evidence is a separate release step. This scope excludes coding-agent costs, CFO.ai fees and unrecorded requests; those costs remain unknown.
`;
await fs.writeFile(path.join(output, 'actual-attempt-cost-ledger.md'), markdown);
const supplement = `Please supplement the saved BugReplay financial model with this evidence snapshot as of ${ledger.generatedAtUtc}. Keep the existing Base/Downside forecast assumptions and Planning mode.

All ${investigations.length} saved runtime investigations, ${smokes.length} successful LLM smoke checks, and ${rejectedModelProbes.length} rejected Bedrock access probes are retained. Runtime status counts: ${JSON.stringify(investigations.reduce((counts, row) => ({ ...counts, [row.status]: (counts[row.status] ?? 0) + 1 }), {}))}. Copies in acceptance summaries or archives are not additional attempts.

Accounted investigation tokens: ${ledger.investigationSummary.recordedInputTokensSubtotal} input / ${ledger.investigationSummary.recordedOutputTokensSubtotal} output. Smokes separately account for ${ledger.smokeSummary.recordedInputTokensSubtotal} input / ${ledger.smokeSummary.recordedOutputTokensSubtotal} output. Authenticated read-only gateway /model/info at ${configuredGatewayRates?.observedAtUtc ?? 'Unknown'} reported Sonnet 4.6 configured prices $3.30 input/$16.50 output per million, cache read $0.33/M and cache write $4.125/M. Applying the currently observed ordinary input/output rates to aggregate historical tokens gives a CONDITIONAL NON-CACHE ESTIMATE of ${money(ledger.investigationSummary.configuredGatewayNonCacheEstimateUsd)} for investigations and ${money(ledger.configuredGatewayNonCacheEstimateAllUsd)} including smokes. Historical per-attempt rates and cache categories remain unknown, so these are not measured accounting debits or cash invoices. Source: ${publicGatewayRateFile}.

Alternative official published list prices are $3 input/$15 output per million (source: ${price.source}, checked 2026-10-12). At those prices the investigation reference is ${money(ledger.investigationSummary.referencePricedRecordedTokenSubtotalUsd)} and investigations plus smokes ${money(ledger.recordedReferenceSubtotalAllUsd)}. Retain this only as a comparison to the 10% higher configured gateway rates.

The four original October 12 baseline investigations had malformed JSON. Their terminal-response usage was absent locally but recovered for ${recoveredMalformed} run(s) from Neatlogs and included. ${incompleteMalformed} runtime run(s) have incomplete token coverage. Newer per-transport model-usage.json records include failed and invalid responses. Smoke durations were not saved. The October 11 preflight-blocked run records zero model calls but has no billing record. Rejected Bedrock probes supply no token/billing data. Do not convert missing values to zero.

Account-wide totals are not allocated; project billing remains unknown. Complete actual cash cost, browser/storage costs and promotional credit deductions remain Unknown. Header accounting is separated below from historical missing accounting and from cash/credits. Do not infer commercial cost averages or pricing validation from this snapshot.

When response headers are preserved, x-litellm-response-cost supplies a separate gateway accounting amount per transport attempt. Current coverage: ${ledger.investigationSummary.gatewayAccountingRowsWithCompleteCost} fully covered investigations; known header subtotal ${money(ledger.investigationSummary.gatewayAccountingKnownSubtotalUsd)}; complete project header accounting total ${money(ledger.investigationSummary.gatewayAccountingCostTotalUsd)}. Missing headers remain Unknown. Do not equate gateway accounting with cash paid or a credit deduction.

Add a labeled Observed evidence/Unknowns section. Keep actual all-calls cost input empty until usage categories, per-attempt debits and billing/credit treatment are reconciled. The decision remains: preserve Planning assumptions, measure successful/failed/cancelled attempts, and compare complete variable cost with the $0.1293/run ceiling before approving $49/100 at 70% contribution margin.

Version summaries:
${versions.map(version => `${val(version.gitSha)}: ${version.attempts} investigations, ${JSON.stringify(version.statuses)}, ${val(version.modelTransportAttempts)} calls, ${version.recordedInputTokensSubtotal}/${version.recordedOutputTokensSubtotal} accounted input/output tokens, configured gateway non-cache estimate ${money(version.configuredGatewayNonCacheEstimateUsd)}, alternative list reference ${money(version.referencePricedRecordedTokenSubtotalUsd)}, actual invoice Unknown.`).join('\n')}

Exact run IDs and values:
${investigations.map(row => `${row.runId}: ${row.status}, ${row.target}, calls ${val(row.modelTransportAttempts)}, input ${val(row.accountedInputTokens)}, output ${val(row.accountedOutputTokens)}, duration ${val(row.elapsedMs)} ms, configured gateway non-cache estimate ${money(row.configuredGatewayNonCacheEstimateUsd)}, full actual inference USD Unknown, SHA ${val(row.gitSha)}.`).join('\n')}
`;
await fs.writeFile(path.join(output, 'cfo-actual-cost-supplement.txt'), supplement);
const observedPrompt = `Append a dated "Observed engineering evidence — 2026-10-12" page or section to the saved BugReplay CFO.ai model. Use only the public project evidence below. Preserve the forecast assumptions and keep Planning selected. Do not fill the actual all-in commercial-cost input, net credits, or overwrite the saved forecast. This is engineering usage evidence, not revenue or paying-customer validation.

Scope: all ${investigations.length} saved investigations (including the October 11 preflight-blocked run), ${smokes.length} successful model smoke calls, and ${rejectedModelProbes.length} rejected Bedrock access probes. Earlier failed/inconclusive versions are retained. Unknown means unknown, never zero.

Investigation table: elapsed duration includes the run workflow; token counts include every recorded transport response, including invalid responses. The first October 12 cohort's missing terminal-response tokens were recovered from reviewed Neatlogs screenshots. Inference model for the 16 October 12 investigations: Claude Sonnet 4.6; October 11 model unknown.

Run ID | Target | Outcome | Input/output tokens | Elapsed seconds | Complete response-header gateway accounting USD
${investigations.map(row=>`${row.runId} | ${row.target} | ${row.status} | ${val(row.accountedInputTokens)}/${val(row.accountedOutputTokens)} | ${row.elapsedMs===null?'Unknown':(row.elapsedMs/1000).toFixed(3)} | ${row.gatewayAccountingCostUsd===null?'Unknown':row.gatewayAccountingCostUsd.toFixed(7)}`).join('\n')}

All-investigation accounted-token subtotal: ${ledger.investigationSummary.recordedInputTokensSubtotal} input/${ledger.investigationSummary.recordedOutputTokensSubtotal} output. This does not make complete all-attempt billing known.

The four latest investigations at SHA 2b541b20a97ef3df4261529bd48089792e01f2af have complete x-litellm-response-cost header coverage. Their gateway accounting sums to $0.9546999, or $0.238674975 per attempt across these four cases. Outcomes: one of three buggy investigations confirmed; two buggy investigations did not reproduce; the separate fixed-shop investigation did not reproduce. The selected confirmed run b8ffd757-6aed-405d-b7ac-ed3b1c4d9236 has two clean intended assertion failures and a passing byte-identical test against the fixed URL. Its gateway accounting alone is $0.1563342, exceeding the assumed $0.1293 full-variable-cost ceiling before browser/storage costs. These four cases do not estimate a general success rate or commercial cost distribution.

Gateway accounting for the earlier 13 investigations is Unknown. Current read-only gateway metadata verified $3.30 input/$16.50 output per million tokens, $0.33 cache read and $4.125 cache write. Historical rates/cache categories are not known. Applying current ordinary rates to all recorded investigation tokens gives a CONDITIONAL NON-CACHE estimate of $${ledger.investigationSummary.configuredGatewayNonCacheEstimateUsd.toFixed(7)}; including the two smokes, $${ledger.configuredGatewayNonCacheEstimateAllUsd.toFixed(7)}. Do not add this estimate to header costs: they overlap. Source: docs/evidence/finance/gateway-rate-reference.json, observed 2026-10-12T15:16:59.061Z.

Smokes: ${smokes.map(row=>`${row.atUtc}, ${row.model}, ${row.recordedInputTokens}/${row.recordedOutputTokens} input/output tokens, configured non-cache estimate $${row.configuredGatewayNonCacheEstimateUsd.toFixed(7)}, header accounting/duration/cash bill Unknown`).join('; ')}. Five rejected Bedrock probes have unknown tokens and billing; a 403 does not establish zero cost.

Complete project gateway accounting, cash invoice charges, promotional credit deductions, hosted browser/storage costs and coding/CFO subscription costs remain Unknown. Keep credits separate. Account-wide totals are not allocated; project billing remains unknown.

Decision: keep $49/100 as an unvalidated hypothesis, retain every outcome, and evaluate pricing/allowance against complete variable cost. Show the measured latest-cohort accounting separately from conditional historical estimates and missing cash/credit inputs. Retain the original Base/Downside revenue, cash and margin assumptions.

Evidence: docs/evidence/finance/actual-attempt-cost-ledger.json and .md, each original run's model-usage.json, verification.json, control-verification.json and report.md. Add the selected run ID and source SHA beside the observed costs. Return the new page/section link and identify any unsupported cost field as Unknown.
`;
await fs.writeFile(path.join(output,'cfo-observed-evidence-prompt.txt'),observedPrompt);
console.log(JSON.stringify({ investigations: investigations.length, smokes: smokes.length, rejectedProbes: rejectedModelProbes.length, investigationSummary: ledger.investigationSummary, configuredGatewayNonCacheEstimateAllUsd: ledger.configuredGatewayNonCacheEstimateAllUsd, allRecordedReferenceSubtotalUsd: ledger.recordedReferenceSubtotalAllUsd, actualTotalUsd: null }));
