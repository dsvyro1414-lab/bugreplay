import '../apps/runner/src/config.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../apps/runner/src/config.js';
import { runViewSchema, terminalStatuses } from '@bugreplay/contracts';

const config = loadConfig(), origin = `http://localhost:${config.port}`;
const index = process.argv.indexOf('--repeat'), repeats = index >= 0 ? Number(process.argv[index + 1]) : 1;
if (!Number.isSafeInteger(repeats) || repeats < 1 || repeats > 3) throw new Error('Repeat must be 1..3');
const complaint = 'Sometimes the cart becomes empty after I change the delivery address. Find the conditions that cause this.';
const results: unknown[] = [];
for (const targetUrl of [config.allowedOrigins[0], config.controlBaseUrl]) {
  for (let attempt = 1; attempt <= (targetUrl === config.controlBaseUrl ? 1 : repeats); attempt++) {
    const response = await fetch(`${origin}/api/runs`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ targetUrl, complaint, expected: 'Cart items and quantities must be preserved after saving a changed delivery address.', oracleKind: 'cart_preserved_after_checkout_change' }) });
    if (response.status !== 202) throw new Error(`Runner refused acceptance run: ${response.status} ${await response.text()}`);
    const { runId } = await response.json() as { runId: string };
    const deadline = Date.now() + config.totalMs + 15000;
    let run;
    do {
      if (Date.now() > deadline) throw new Error('Acceptance polling deadline exceeded');
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = runViewSchema.parse(await (await fetch(`${origin}/api/runs/${runId}`)).json());
    } while (!terminalStatuses.includes(run.status));
    results.push({ targetUrl, attempt, runId, status: run.status, verification: run.verification, metrics: run.metrics });
    console.log(JSON.stringify(results.at(-1)));
    if (targetUrl === config.controlBaseUrl ? run.status !== 'not_reproduced' : run.status !== 'bug_confirmed') process.exitCode = 1;
  }
}
mkdirSync(config.artifactRoot, { recursive: true });
writeFileSync(join(config.artifactRoot, `acceptance-${Date.now()}.json`), JSON.stringify({ note: 'Agent A smoke benchmark; independent B audit is still required.', results }, null, 2));
