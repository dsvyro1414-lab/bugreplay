import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../src/api.js';
import { loadConfig } from '../src/config.js';
import { RunStore } from '../src/store.js';

const input = { targetUrl: 'http://localhost:4173', complaint: 'Cart disappears after checkout changes.', expected: 'Items should remain in the cart.', oracleKind: 'cart_preserved_after_checkout_change' };
test('API validates target, serializes runs, cancellation and durable artifacts (test executor)', async () => {
  const root = mkdtempSync(join(tmpdir(), 'bugreplay-api-'));
  const { app, store } = await createApp({ config: { ...loadConfig(), artifactRoot: root }, execute: async (s, id, c, signal) => {
    await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }));
    s.status(id, 'cancelled', 'Test executor cancelled.');
  } });
  try {
    assert.equal((await app.inject({ method: 'POST', url: '/api/runs', payload: { ...input, targetUrl: 'http://example.com' } })).statusCode, 400);
    assert.equal((await app.inject({ method: 'POST', url: '/api/runs', payload: { ...input, oracleKind: 'anything' } })).statusCode, 400);
    const created = await app.inject({ method: 'POST', url: '/api/runs', payload: input });
    assert.equal(created.statusCode, 202); const { runId } = created.json();
    assert.equal((await app.inject({ method: 'POST', url: '/api/runs', payload: input })).statusCode, 409);
    assert.equal((await app.inject({ method: 'POST', url: `/api/runs/${runId}/cancel` })).statusCode, 202);
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal((await app.inject(`/api/runs/${runId}`)).json().status, 'cancelled');
    writeFileSync(join(store.directory(runId), 'report.md'), 'Synthetic test artifact');
    store.artifact(runId, 'report', 'report.md', 'text/markdown');
    assert.equal((await app.inject(`/api/runs/${runId}/artifacts/report.md`)).body, 'Synthetic test artifact');
    assert.equal((await app.inject(`/api/runs/${runId}/artifacts/run.json`)).statusCode, 404);
    const reloaded = new RunStore(root);
    assert.equal(reloaded.runs.get(runId)?.status, 'cancelled');
    assert.ok(reloaded.runs.get(runId)!.events.every((event, i) => event.id === i + 1));
    const interrupted = store.create(input as never);
    assert.equal(new RunStore(root).runs.get(interrupted.id)?.status, 'inconclusive');
  } finally { await app.close(); rmSync(root, { recursive: true, force: true }); }
});
