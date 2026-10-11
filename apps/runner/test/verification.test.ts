import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import type { ActionRecord, CartCheckpoint, CreateRun, ShopState } from '@bugreplay/contracts';
import { compileCandidate, writeReproduction } from '../src/compiler.js';
import { verifyReproduction } from '../src/verifier.js';

// These deliberately simple HTTP fixtures test the verifier, not Agent B's shop
// or the real model's ability to discover its undisclosed trigger conditions.
function fixtureHtml(mode: 'buggy' | 'fixed' | 'old-signal' | 'invalid-setup' | 'prohibited'): string {
  return `<!doctype html><html lang="en"><head><title>Synthetic verifier fixture</title></head><body>
  <button data-action="cart-add" id="add">Add sample</button>
  <div role="region" aria-label="Cart" aria-busy="false" id="cart" style="min-height:20px"></div>
  <label>Delivery address <input id="address" data-action="${mode === 'prohibited' ? 'cart-clear' : 'checkout-edit'}"></label>
  <button data-action="checkout-save" id="save">Save address</button>
  <p data-checkout-address id="committed" style="min-height:20px"></p>
  <p role="status" data-save-seq="${mode === 'old-signal' ? 1 : 0}" id="status" style="min-height:20px">${mode === 'old-signal' ? 'Address saved' : ''}</p>
  <script>
  const mode = ${JSON.stringify(mode)};
  const cart = document.getElementById('cart');
  const status = document.getElementById('status');
  document.getElementById('add').onclick = () => {
    if (mode !== 'invalid-setup') cart.innerHTML = '<p data-product-id="sample" data-quantity="1">Sample product, quantity 1</p>';
  };
  document.getElementById('address').oninput = () => { if (mode !== 'old-signal') status.textContent = ''; };
  document.getElementById('save').onclick = () => {
    cart.setAttribute('aria-busy', 'true');
    setTimeout(() => {
      document.getElementById('committed').textContent = document.getElementById('address').value;
      if (mode !== 'old-signal') status.dataset.saveSeq = String(Number(status.dataset.saveSeq) + 1);
      status.textContent = 'Address saved';
      if (mode === 'buggy' || mode === 'old-signal') cart.innerHTML = '';
      cart.setAttribute('aria-busy', 'false');
    }, 75);
  };
  </script></body></html>`;
}

async function fixture(mode: Parameters<typeof fixtureHtml>[0]): Promise<{ server: Server; url: string }> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(fixtureHtml(mode));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return { server, url: `http://127.0.0.1:${address.port}` };
}

const initial: ShopState = { cart: [], address: '', saveSeq: 0, saved: false, busy: false };
const withCart: ShopState = { ...initial, cart: [{ productId: 'sample', quantity: 1 }] };
const afterSave: ShopState = { ...initial, address: '15 Test Street', saveSeq: 1, saved: true };
const input: CreateRun = {
  targetUrl: 'http://127.0.0.1:4173', complaint: 'Cart items disappear after changing my delivery address.',
  expected: 'The same cart products and quantities remain after saving the address.', oracleKind: 'cart_preserved_after_checkout_change',
};
function log(): ActionRecord[] {
  return [
    { episodeId: 'episode-1', step: { id: 's1', kind: 'goto', path: '/' }, semantic: 'navigation', after: initial },
    { episodeId: 'episode-1', step: { id: 's2', kind: 'click', locator: { role: 'button', name: 'Add sample', exact: true } }, semantic: 'cart-add', before: initial, after: withCart },
    { episodeId: 'episode-1', step: { id: 's3', kind: 'fill', locator: { role: 'textbox', name: 'Delivery address', exact: true }, value: '15 Test Street' }, semantic: 'checkout-edit', before: withCart, after: withCart },
    { episodeId: 'episode-1', step: { id: 's4', kind: 'click', locator: { role: 'button', name: 'Save address', exact: true } }, semantic: 'checkout-save', before: withCart, after: afterSave },
  ];
}
function checkpoint(): CartCheckpoint[] {
  return [{ id: 'cart-1', episodeId: 'episode-1', afterStepId: 's2', state: withCart }];
}
const candidate = { episodeId: 'episode-1', checkpointId: 'cart-1', endStepId: 's4', observed: 'The cart became empty after saving a changed address.' };
async function directory(): Promise<string> {
  const base = path.resolve(import.meta.dirname, '../../..', 'artifacts', 'synthetic-tests');
  await mkdir(base, { recursive: true });
  return mkdtemp(path.join(base, 'verification-'));
}

test('compiler preserves the entire trusted setup and rejects unqualified candidates', () => {
  const reproduction = compileCandidate(input, log(), checkpoint(), candidate);
  assert.deepEqual(reproduction.steps.map((step) => step.id), ['s1', 's2', 's3', 's4']);
  assert.equal(reproduction.oracle.captureAfterStepId, 's2');
  const prohibited = log();
  prohibited[2].semantic = 'cart-clear';
  assert.throws(() => compileCandidate(input, prohibited, checkpoint(), candidate), /prohibited or unknown/);
  const unknown = log(); unknown[2].semantic = 'unknown';
  assert.throws(() => compileCandidate(input, unknown, checkpoint(), candidate), /prohibited or unknown/);
  assert.throws(() => compileCandidate(input, log().slice(1), checkpoint(), candidate), /complete clean-episode/);
  assert.throws(() => compileCandidate(input, log(), [{ ...checkpoint()[0], state: initial }], candidate), /nonempty trusted cart/);
  const oldSave = log(); oldSave[3].after = { ...afterSave, saveSeq: 0 };
  assert.throws(() => compileCandidate(input, oldSave, checkpoint(), candidate), /completed new save/);
  const unchanged = log(); unchanged[3].after = { ...afterSave, address: '' };
  assert.throws(() => compileCandidate(input, unchanged, checkpoint(), candidate), /completed new save/);
  const escape = log(); escape[0].step = { id: 's1', kind: 'goto', path: '/\\example.com' };
  assert.throws(() => compileCandidate(input, escape, checkpoint(), candidate), /escapes the target origin/);
});

test('saved standalone test confirms only 2 independent intended failures and passes unchanged on fixed control', { timeout: 120000 }, async () => {
  const dir = await directory();
  const buggy = await fixture('buggy');
  const fixed = await fixture('fixed');
  try {
    await writeReproduction(dir, compileCandidate(input, log(), checkpoint(), candidate));
    const originalSpec = await readFile(path.join(dir, 'repro.spec.ts'), 'utf8');
    assert.equal((originalSpec.match(/^import /gm) ?? []).length, 1);
    assert.ok(originalSpec.startsWith("import { test, expect, type Page, type Locator } from '@playwright/test';"));
    const failed = await verifyReproduction({ dir, baseUrl: buggy.url, timeoutMs: 55000 });
    assert.equal(failed.verdict, 'confirmed', JSON.stringify(failed, null, 2));
    assert.equal(failed.matchedFailures, 2);
    assert.equal(failed.attempts.length, 2);
    assert.ok(failed.attempts.every((attempt) => attempt.stage === 'cart_assertion_failed' && attempt.videoName && attempt.evidence?.contextClosed));
    assert.ok(failed.attempts.every((attempt) => attempt.initialCart?.length === 1 && attempt.actualCart?.length === 0));
    const primaryEvidence = await readFile(path.join(dir, 'verification.json'), 'utf8');
    const primaryVideo = await readFile(path.join(dir, failed.attempts[0].videoName!));
    const once = await verifyReproduction({ dir, outputDir: path.join(dir, 'single'), baseUrl: buggy.url, attempts: 1, timeoutMs: 25000 });
    assert.equal(once.matchedFailures, 1);
    assert.equal(once.verdict, 'inconclusive');
    // The exact saved file is reused; only BASE_URL differs.
    const passed = await verifyReproduction({ dir, outputDir: path.join(dir, 'control'), baseUrl: fixed.url, timeoutMs: 55000 });
    assert.equal(passed.verdict, 'not_matched', JSON.stringify(passed, null, 2));
    assert.ok(passed.attempts.every((attempt) => attempt.classification === 'passed'));
    assert.equal(await readFile(path.join(dir, 'repro.spec.ts'), 'utf8'), originalSpec);
    assert.equal(await readFile(path.join(dir, 'verification.json'), 'utf8'), primaryEvidence);
    assert.deepEqual(await readFile(path.join(dir, failed.attempts[0].videoName!)), primaryVideo);
    assert.equal(JSON.parse(await readFile(path.join(dir, 'control', 'verification.json'), 'utf8')).verdict, 'not_matched');
  } finally {
    await Promise.all([new Promise<void>((resolve) => buggy.server.close(() => resolve())), new Promise<void>((resolve) => fixed.server.close(() => resolve()))]);
    await rm(dir, { recursive: true, force: true });
  }
});

for (const mode of ['old-signal', 'invalid-setup', 'prohibited'] as const) {
  test(`${mode} cannot be mistaken for the intended cart-preservation failure`, { timeout: 45000 }, async () => {
    const dir = await directory();
    const app = await fixture(mode);
    try {
      await writeReproduction(dir, compileCandidate(input, log(), checkpoint(), candidate));
      const result = await verifyReproduction({ dir, baseUrl: app.url, attempts: 1, timeoutMs: 30000 });
      assert.equal(result.verdict, 'inconclusive', JSON.stringify(result, null, 2));
      assert.equal(result.matchedFailures, 0);
      assert.equal(result.attempts[0].classification, 'inconclusive');
      assert.equal(result.attempts[0].evidence?.assertionReached, false);
      assert.match(result.attempts[0].error ?? '', mode === 'old-signal' ? /new changed-address save/ : mode === 'invalid-setup' ? /cart checkpoint is empty/ : /prohibited action/);
    } finally {
      await new Promise<void>((resolve) => app.server.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  });
}

test('locator and navigation failures remain inconclusive', { timeout: 60000 }, async () => {
  const dir = await directory();
  const app = await fixture('fixed');
  try {
    const missing = log();
    missing[1].step = { id: 's2', kind: 'click', locator: { role: 'button', name: 'Missing control', exact: true } };
    await writeReproduction(dir, compileCandidate(input, missing, checkpoint(), candidate));
    const selector = await verifyReproduction({ dir, baseUrl: app.url, attempts: 1, timeoutMs: 25000 });
    assert.equal(selector.verdict, 'inconclusive');
    assert.equal(selector.matchedFailures, 0);
    assert.match(selector.attempts[0].error ?? '', /locator\.waitFor|Timeout/);
    await new Promise<void>((resolve) => app.server.close(() => resolve()));
    await writeReproduction(dir, compileCandidate(input, log(), checkpoint(), candidate));
    const navigation = await verifyReproduction({ dir, baseUrl: app.url, attempts: 1, timeoutMs: 25000 });
    assert.equal(navigation.verdict, 'inconclusive');
    assert.equal(navigation.matchedFailures, 0);
    assert.match(navigation.attempts[0].error ?? '', /page\.goto|ERR_CONNECTION_REFUSED|network request failed|ECONNREFUSED/);
  } finally {
    if (app.server.listening) await new Promise<void>((resolve) => app.server.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  }
});

test('standalone replay blocks third-party resources, redirects and websocket connections before contact', { timeout: 60000 }, async () => {
  let thirdPartyRequests = 0;
  const thirdParty = createServer((_request, response) => { thirdPartyRequests++; response.end('Unexpected contact'); });
  thirdParty.on('upgrade', (_request, socket) => { thirdPartyRequests++; socket.destroy(); });
  await new Promise<void>((resolve) => thirdParty.listen(0, '127.0.0.1', resolve));
  const destination = thirdParty.address();
  assert.ok(destination && typeof destination !== 'string');
  const thirdPartyUrl = `http://127.0.0.1:${destination.port}`;
  try {
    for (const mode of ['resource', 'redirect', 'websocket'] as const) {
      const dir = await directory();
      const app = createServer((_request, response) => {
        if (mode === 'redirect') {
          response.writeHead(302, { Location: thirdPartyUrl + '/redirect-target' }); response.end(); return;
        }
        const extra = mode === 'resource' ? `<img src="${thirdPartyUrl}/external.png">` : `<script>new WebSocket(${JSON.stringify(thirdPartyUrl.replace('http:', 'ws:') + '/socket')});</script>`;
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(fixtureHtml('buggy').replace('</body>', extra + '</body>'));
      });
      await new Promise<void>((resolve) => app.listen(0, '127.0.0.1', resolve));
      const address = app.address();
      assert.ok(address && typeof address !== 'string');
      try {
        await writeReproduction(dir, compileCandidate(input, log(), checkpoint(), candidate));
        const result = await verifyReproduction({ dir, baseUrl: `http://127.0.0.1:${address.port}`, attempts: 1, timeoutMs: 18000 });
        assert.equal(result.verdict, 'inconclusive', JSON.stringify(result, null, 2));
        assert.equal(result.matchedFailures, 0);
        assert.equal(result.attempts[0].errorType, 'network_origin_guard');
        assert.equal(thirdPartyRequests, 0, `${mode} must be blocked before the external server receives traffic`);
      } finally {
        await new Promise<void>((resolve) => app.close(() => resolve()));
        await rm(dir, { recursive: true, force: true });
      }
    }
  } finally {
    await new Promise<void>((resolve) => thirdParty.close(() => resolve()));
  }
});
