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

async function waitForIdle(deadline: number): Promise<void> {
  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Acceptance cleanup deadline exceeded; terminal outcomes have been preserved');
    const response = await fetch(`${origin}/api/health`, { signal: AbortSignal.timeout(Math.min(5_000, remaining)) });
    if (!response.ok) throw new Error(`Runner health check failed: ${response.status}`);
    const health = await response.json() as { status?: unknown; activeRunId?: unknown } | null;
    if (!health || health.status !== 'ok' || (health.activeRunId !== undefined && typeof health.activeRunId !== 'string')) {
      throw new Error('Runner returned an invalid health response');
    }
    if (health.activeRunId === undefined) return;
    await new Promise(resolve => setTimeout(resolve, Math.min(100, remaining)));
  }
}

try {
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
      const result = { targetUrl, attempt, runId, status: run.status, verification: run.verification, metrics: run.metrics };
      results.push(result);
      if (targetUrl === config.controlBaseUrl ? run.status !== 'not_reproduced' : run.status !== 'bug_confirmed') process.exitCode = 1;
      // The terminal verdict can precede asynchronous recording and task cleanup.
      await waitForIdle(deadline);
      const finalized = runViewSchema.parse(await (await fetch(`${origin}/api/runs/${runId}`, {
        signal: AbortSignal.timeout(Math.max(1, Math.min(5_000, deadline - Date.now()))),
      })).json());
      if (finalized.id !== runId || finalized.status !== result.status) throw new Error('The terminal outcome changed during cleanup');
      result.metrics = finalized.metrics;
      result.verification = finalized.verification;
      console.log(JSON.stringify(result));
    }
  }
} finally {
  // A failed cleanup or later request must not erase completed attempts.
  mkdirSync(config.artifactRoot, { recursive: true });
  writeFileSync(join(config.artifactRoot, `acceptance-${Date.now()}.json`), JSON.stringify({ note: 'Agent A smoke benchmark; independent B audit is still required.', results }, null, 2));
}
