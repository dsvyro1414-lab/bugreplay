import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import type { BrowserObservation } from '@bugreplay/contracts';
import { BrowserSession, type BrowserEvent } from '../src/browser.js';

// This is an explicit synthetic adapter fixture, not acceptance evidence for Agent B's demo shop.
const fixture = (outsideOrigin: string) => `<!doctype html><html><body>
<main><h1>Synthetic browser-adapter fixture</h1>
<section role="region" aria-label="Products"><button data-action="cart-add" id="add">Add item</button></section>
<section role="region" aria-label="Cart" aria-busy="false" id="cart"></section>
<p data-checkout-address id="committed">12 Initial Way</p><p role="status" data-save-seq="0" id="status" style="min-height:20px"></p>
<section role="region" aria-label="Delivery">
<span id="address-name">Delivery <b>address</b></span><input aria-labelledby="address-name" data-action="checkout-edit" id="address" value="12 Initial Way">
<label>Delivery method<select data-action="checkout-edit" id="method"><option value="standard">Standard</option><option value="express">Express</option></select></label>
<label><input type="checkbox" data-action="checkout-edit" id="gift">Gift wrapping</label>
<span id="save-name" hidden>Save delivery address</span><button aria-labelledby="save-name" data-action="checkout-save" id="save">Commit</button>
</section>
<section role="region" aria-label="Courier"><label>Note<input data-action="checkout-edit"></label></section>
<section role="region" aria-label="Billing"><label>Note<input data-action="checkout-edit"></label></section>
<button data-action="cart-remove" id="remove">Remove item</button><button id="unknown">Unclassified action</button>
<button data-action="checkout-submit" id="purchase">Place order</button>
<button data-action="checkout-edit" id="break">Break adapter</button>
<a data-action="navigation" href="${outsideOrigin}/direct">Outside page</a>
<a data-action="navigation" href="/redirect-outside">Redirect outside</a>
<button data-action="navigation" id="popup">Open outside popup</button>
<script>
let quantity = Number(localStorage.getItem('synthetic-quantity') || '0');
const cart = document.querySelector('#cart');
function draw() {
  cart.innerHTML = quantity ? '<div data-product-id="synthetic-item" data-quantity="' + quantity + '">Synthetic item × ' + quantity + '</div>' : 'Your cart is empty';
  cart.insertAdjacentHTML('beforeend', '<div hidden data-product-id="hidden-item" data-quantity="0">Hidden template</div>');
  localStorage.setItem('synthetic-quantity', String(quantity));
}
draw();
document.querySelector('#add').onclick = () => { quantity++; draw(); };
document.querySelector('#remove').onclick = () => { quantity = 0; draw(); };
document.querySelector('#address').oninput = () => { document.querySelector('#status').textContent = ''; };
document.querySelector('#save').onclick = () => {
  cart.setAttribute('aria-busy', 'true'); cart.innerHTML = '';
  setTimeout(() => {
    document.querySelector('#committed').textContent = document.querySelector('#address').value;
    const status = document.querySelector('#status');
    status.dataset.saveSeq = String(Number(status.dataset.saveSeq) + 1); status.textContent = 'Address saved';
    draw(); cart.setAttribute('aria-busy', 'false');
  }, 420);
};
document.querySelector('#break').onclick = () => cart.remove();
document.querySelector('#popup').onclick = () => window.open('${outsideOrigin}/popup');
</script></main></body></html>`;

let server: Server;
let outside: Server;
let origin: string;
let outsideOrigin: string;
let outsideRequests = 0;

async function listen(instance: Server): Promise<string> {
  await new Promise<void>(resolve => instance.listen(0, '127.0.0.1', resolve));
  const address = instance.address();
  if (!address || typeof address === 'string') throw new Error('Fixture server did not bind a TCP port.');
  return `http://127.0.0.1:${address.port}`;
}

before(async () => {
  outside = createServer((_request, response) => { outsideRequests++; response.end('Outside allowed origins'); });
  outsideOrigin = await listen(outside);
  server = createServer((request, response) => {
    if (request.url === '/redirect-outside') {
      response.writeHead(302, { location: `${outsideOrigin}/redirect-target` }); response.end();
    } else {
      response.writeHead(200, { 'content-type': 'text/html' }); response.end(fixture(outsideOrigin));
    }
  });
  origin = await listen(server);
});

after(async () => {
  await Promise.all([server, outside].map(instance => new Promise<void>((resolve, reject) => instance.close(error => error ? reject(error) : resolve()))));
});

async function session(options: { timeoutMs?: number; events?: BrowserEvent[]; maxActions?: number } = {}) {
  const artifactDir = await mkdtemp(join(tmpdir(), 'bugreplay-browser-synthetic-'));
  const browser = new BrowserSession({
    targetUrl: `${origin}/shop?synthetic=1`, allowedOrigins: [origin], artifactDir,
    timeoutMs: options.timeoutMs ?? 3_000, maxActions: options.maxActions, onEvent: event => { options.events?.push(event); },
  });
  return { browser, artifactDir, close: async () => { await browser.close(); await rm(artifactDir, { recursive: true, force: true }); } };
}

function ref(observation: BrowserObservation, name: string): string {
  const element = observation.elements.find(element => element.locator.name === name);
  assert.ok(element, `Expected an available control named ${name}`);
  return element.ref;
}

test('synthetic adapter records the complete setup, exact accessible names, stable save, and screenshots', async () => {
  const events: BrowserEvent[] = [];
  const fixtureSession = await session({ events });
  const { browser, artifactDir } = fixtureSession;
  try {
    let observation = await browser.start();
    assert.deepEqual(observation.state.cart, []);
    assert.deepEqual(browser.records[0].step, { id: 'step-1', kind: 'goto', path: '/shop?synthetic=1' });
    assert.ok(observation.elements.some(element => element.locator.name === 'Save delivery address'));
    assert.ok(!observation.elements.some(element => element.locator.name === 'Commit'));
    const noteLocators = observation.elements.filter(element => element.locator.name === 'Note');
    assert.equal(noteLocators.length, 2);
    assert.deepEqual(noteLocators.map(element => element.locator.scope?.name).sort(), ['Billing', 'Courier']);
    observation = await browser.act({ kind: 'click', ref: ref(observation, 'Add item') });
    assert.deepEqual(await browser.readCart(), [{ productId: 'synthetic-item', quantity: 1 }]);
    const checkpoint = await browser.checkpointCart();
    assert.equal(checkpoint.afterStepId, browser.records[1].step.id);
    observation = await browser.act({ kind: 'fill', ref: ref(observation, 'Delivery address'), value: '24 Changed Street' });
    assert.equal(observation.state.address, '12 Initial Way');
    observation = await browser.act({ kind: 'select', ref: ref(observation, 'Delivery method'), value: 'express' });
    observation = await browser.act({ kind: 'check', ref: ref(observation, 'Gift wrapping'), checked: true });
    const startedAt = Date.now();
    observation = await browser.act({ kind: 'click', ref: ref(observation, 'Save delivery address') });
    assert.ok(Date.now() - startedAt >= 420);
    assert.equal(observation.state.address, '24 Changed Street');
    assert.equal(observation.state.saveSeq, 1);
    assert.equal(observation.state.saved, true);
    assert.equal(observation.state.busy, false);
    assert.deepEqual(observation.state.cart, checkpoint.state.cart);
    assert.equal(browser.records.at(-1)?.semantic, 'checkout-save');
    assert.equal(new Set(browser.records.map(record => record.step.id)).size, browser.records.length);
    const screenshots = (await readdir(artifactDir)).filter(name => name.endsWith('.png'));
    assert.equal(screenshots.length, 6);
    assert.equal(new Set(screenshots).size, screenshots.length);
    assert.equal(events.filter(event => event.type === 'action').length, 6);
    assert.equal(events.filter(event => event.type === 'observation').length, 6);
  } finally { await fixtureSession.close(); }
});

test('synthetic adapter rejects stale refs and post-checkpoint mutation while allowing a fresh observation', async () => {
  const fixtureSession = await session();
  const { browser } = fixtureSession;
  try {
    let observation = await browser.start();
    const oldRef = ref(observation, 'Add item');
    observation = await browser.act({ kind: 'click', ref: oldRef });
    await assert.rejects(browser.act({ kind: 'click', ref: oldRef }), /stale ref/);
    assert.equal(browser.requiresRestart, false);
    observation = await browser.observe();
    await browser.checkpointCart();
    for (const name of ['Add item', 'Remove item', 'Unclassified action', 'Place order']) {
      await assert.rejects(browser.act({ kind: 'click', ref: ref(observation, name) }), /prohibited/);
      observation = await browser.observe();
    }
    assert.deepEqual(await browser.readCart(), [{ productId: 'synthetic-item', quantity: 1 }]);
    assert.equal(browser.records.length, 2);
    assert.equal(browser.actionCount, 2, 'Rejected stale and unsafe refs must not consume real-action budget.');
    const firstEpisode = browser.episodeId;
    observation = await browser.restart();
    assert.notEqual(browser.episodeId, firstEpisode);
    assert.deepEqual(observation.state.cart, []);
    assert.equal(browser.records.at(-1)?.step.kind, 'goto');
    await assert.rejects(browser.checkpointCart(), /at least one visible item/);
    // A checkpoint from a prior episode must not prohibit setting up a new clean episode.
    observation = await browser.act({ kind: 'click', ref: ref(observation, 'Add item') });
    assert.equal(observation.state.cart.length, 1);
  } finally { await fixtureSession.close(); }
});

test('synthetic adapter blocks direct, redirected, and popup requests before reaching an external origin', async () => {
  const fixtureSession = await session();
  const { browser } = fixtureSession;
  const initialOutsideRequests = outsideRequests;
  try {
    for (const name of ['Outside page', 'Redirect outside', 'Open outside popup']) {
      const observation = browser.episodeId ? await browser.restart() : await browser.start();
      await assert.rejects(browser.act({ kind: 'click', ref: ref(observation, name) }), /partially executed/);
      assert.equal(browser.requiresRestart, true);
      assert.equal(browser.actionCount, browser.records.length + (name === 'Outside page' ? 1 : name === 'Redirect outside' ? 2 : 3));
      assert.equal(outsideRequests, initialOutsideRequests, `${name} must not make a request outside allowed origins`);
    }
  } finally { await fixtureSession.close(); }
});

test('synthetic adapter requires restart after a possibly partial action and enforces an expired deadline', async () => {
  const fixtureSession = await session({ timeoutMs: 900 });
  const { browser } = fixtureSession;
  try {
    const observation = await browser.start();
    await assert.rejects(browser.act({ kind: 'click', ref: ref(observation, 'Break adapter') }), /partially executed/);
    assert.equal(browser.requiresRestart, true);
    await assert.rejects(browser.checkpointCart(), /restart/);
    const restarted = await browser.restart();
    assert.equal(browser.requiresRestart, false);
    assert.deepEqual(restarted.state.cart, []);
  } finally { await fixtureSession.close(); }
  const expired = new BrowserSession({ targetUrl: origin, allowedOrigins: [origin], artifactDir: tmpdir(), deadlineAt: Date.now() - 1 });
  await assert.rejects(expired.start(), /deadline/);
  await expired.close();
});

test('synthetic adapter rejects an unconfigured target before opening a browser', () => {
  assert.throws(() => new BrowserSession({ targetUrl: outsideOrigin, allowedOrigins: [origin], artifactDir: tmpdir() }), /configured/);
  assert.throws(() => new BrowserSession({ targetUrl: origin, allowedOrigins: [`${origin}/path`], artifactDir: tmpdir() }), /without paths/);
});

test('synthetic adapter caps goto, restart, and real execution attempts without overshooting', async () => {
  const fixtureSession = await session({ maxActions: 2 });
  const { browser } = fixtureSession;
  try {
    const observation = await browser.start();
    assert.equal(browser.actionCount, 1);
    await browser.act({ kind: 'click', ref: ref(observation, 'Add item') });
    assert.equal(browser.actionCount, 2);
    await assert.rejects(browser.restart(), /action budget/);
    const fresh = await browser.observe();
    await assert.rejects(browser.act({ kind: 'click', ref: ref(fresh, 'Add item') }), /action budget/);
    assert.equal(browser.actionCount, 2);
    assert.deepEqual(await browser.readCart(), [{ productId: 'synthetic-item', quantity: 1 }]);
  } finally { await fixtureSession.close(); }

  const failedSession = await session({ maxActions: 2 });
  try {
    const observation = await failedSession.browser.start();
    await assert.rejects(failedSession.browser.act({ kind: 'click', ref: ref(observation, 'Outside page') }), /partially executed/);
    assert.equal(failedSession.browser.actionCount, 2);
    assert.equal(failedSession.browser.records.length, 1);
    await assert.rejects(failedSession.browser.restart(), /action budget/);
    assert.equal(failedSession.browser.actionCount, 2);
  } finally { await failedSession.close(); }

  const restartSession = await session({ maxActions: 2 });
  try {
    await restartSession.browser.start();
    await restartSession.browser.restart();
    assert.equal(restartSession.browser.actionCount, 2);
    await assert.rejects(restartSession.browser.restart(), /action budget/);
    assert.equal(restartSession.browser.actionCount, 2);
  } finally { await restartSession.close(); }
});

test('synthetic adapter cannot create an episode after cancellation closes a pending startup', async () => {
  const fixtureSession = await session();
  try {
    const starting = fixtureSession.browser.start();
    await fixtureSession.browser.close();
    await assert.rejects(starting, /closed/);
    assert.equal(fixtureSession.browser.actionCount, 0);
    assert.equal(fixtureSession.browser.records.length, 0);
  } finally { await fixtureSession.close(); }
});
