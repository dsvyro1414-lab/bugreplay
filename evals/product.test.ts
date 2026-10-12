import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createServer as createTcpServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, test } from 'node:test';
import { chromium, expect } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';
import type { BrowserObservation, CreateRun, Reproduction, VerificationResult } from '@bugreplay/contracts';
import { BrowserSession, type BrowserEvent } from '../apps/runner/src/browser.js';
import { ASSERTION_MARKER, compileCandidate, writeReproduction } from '../apps/runner/src/compiler.js';
import { verifyReproduction } from '../apps/runner/src/verifier.js';

// These are scripted engineering checks with known fixture conditions, not LLM discovery.
const root = fileURLToPath(new URL('../', import.meta.url));
const runDir = path.join(root, 'artifacts', 'product-eval', `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`);
const shopRoot = path.join(root, 'apps', 'demo-shop');
const servers: ViteDevServer[] = [];
let buggyUrl: string;
let controlUrl: string;
const initialAddress = '24 Market Street, Portland';
const changedAddress = '72 Orchard Lane, Portland';
const expectedCart = [
  { productId: 'canvas-pouch', quantity: 2 },
  { productId: 'desk-notebook', quantity: 1 },
];
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');

async function saveJson(file: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + '\n');
}

async function unusedPort(): Promise<number> {
  const server = createTcpServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}

async function startShop(variant: 'buggy' | 'fixed'): Promise<string> {
  const port = await unusedPort();
  const previousVariant = process.env.SHOP_VARIANT;
  process.env.SHOP_VARIANT = variant;
  try {
    const server = await createServer({
      configFile: path.join(shopRoot, 'vite.config.ts'),
      configLoader: 'runner',
      root: shopRoot,
      // Pin each instance independently; never let a cached config mix the two variants.
      define: { __SHOP_VARIANT__: JSON.stringify(variant) },
      cacheDir: path.join(runDir, 'vite-cache', variant),
      server: { host: '127.0.0.1', port, strictPort: true, hmr: false, watch: null },
      logLevel: 'error',
    });
    servers.push(server);
    await server.listen();
    return `http://127.0.0.1:${port}`;
  } finally {
    if (previousVariant === undefined) delete process.env.SHOP_VARIANT;
    else process.env.SHOP_VARIANT = previousVariant;
  }
}

before(async () => {
  assert.ok(Number(process.versions.node.split('.')[0]) >= 24, 'Use Node.js 24 or newer.');
  await mkdir(runDir, { recursive: true });
  buggyUrl = await startShop('buggy');
  controlUrl = await startShop('fixed');
  await saveJson(path.join(runDir, 'run.json'), {
    kind: 'scripted-product-engineering-evaluation',
    modelUsed: false,
    node: process.version,
    buggyUrl,
    controlUrl,
    note: 'Known conditions drive real browser actions. This does not measure autonomous LLM discovery.',
  });
  console.log(`Product evaluation artifacts: ${runDir}`);
});

after(async () => {
  await Promise.all(servers.map(server => server.close()));
});

function ref(observation: BrowserObservation, name: string): string {
  const matches = observation.elements.filter(element => element.locator.name === name);
  assert.equal(matches.length, 1, `Expected one available control named ${name}`);
  return matches[0].ref;
}

async function recordCase(name: string, options: { express?: boolean; promo?: boolean }): Promise<{ dir: string; reproduction: Reproduction }> {
  const dir = path.join(runDir, name);
  const events: BrowserEvent[] = [];
  const browser = new BrowserSession({
    targetUrl: buggyUrl,
    allowedOrigins: [buggyUrl],
    artifactDir: path.join(dir, 'investigation'),
    timeoutMs: 15_000,
    onEvent: event => { events.push(event); },
  });
  try {
    let observation = await browser.start();
    assert.deepEqual(observation.state.cart, [], 'Every recorded case must begin in a clean browser context.');
    assert.equal(observation.state.address, initialAddress);
    assert.equal(observation.state.saveSeq, 0);
    for (const name of ['Add Canvas pouch', 'Add Canvas pouch', 'Add Desk notebook']) {
      observation = await browser.act({ kind: 'click', ref: ref(observation, name) });
    }
    const checkpoint = await browser.checkpointCart();
    assert.deepEqual(checkpoint.state.cart, expectedCart);
    if (options.express) observation = await browser.act({ kind: 'select', ref: ref(observation, 'Delivery method'), value: 'express' });
    if (options.promo) {
      observation = await browser.act({ kind: 'fill', ref: ref(observation, 'Promo code'), value: 'FIELD10' });
      observation = await browser.act({ kind: 'click', ref: ref(observation, 'Apply promo code') });
    }
    observation = await browser.act({ kind: 'fill', ref: ref(observation, 'Delivery address'), value: changedAddress });
    assert.equal(observation.state.address, initialAddress, 'Editing alone must not commit the address.');
    observation = await browser.act({ kind: 'click', ref: ref(observation, 'Save delivery address') });
    assert.equal(observation.state.address, changedAddress);
    assert.equal(observation.state.saveSeq, 1);
    assert.equal(observation.state.saved, true);
    assert.equal(observation.state.busy, false);
    assert.deepEqual(observation.state.cart, options.express && options.promo ? [] : expectedCart);
    const input: CreateRun = {
      targetUrl: buggyUrl,
      complaint: 'Sometimes the cart becomes empty after I change the delivery address.',
      expected: 'Cart items and quantities must be preserved after saving a changed delivery address.',
      oracleKind: 'cart_preserved_after_checkout_change',
    };
    const reproduction = compileCandidate(input, browser.records, browser.checkpoints, {
      episodeId: browser.episodeId,
      checkpointId: checkpoint.id,
      endStepId: browser.records.at(-1)!.step.id,
      observed: observation.state.cart.length === 0 ? 'The cart became empty after the completed address save.' : 'The cart remained unchanged after the completed address save.',
    });
    await writeReproduction(dir, reproduction);
    await saveJson(path.join(dir, 'browser-log.json'), {
      evidenceKind: 'scripted-browser-actions',
      records: browser.records,
      checkpoints: browser.checkpoints,
      events,
    });
    return { dir, reproduction };
  } finally {
    await browser.close();
  }
}

for (const [name, options] of [
  ['ordinary-address', {}],
  ['express-only', { express: true }],
  ['promo-only', { promo: true }],
] as const) {
  test(`real shop: ${name} preserves product IDs and quantities`, { timeout: 60_000 }, async () => {
    await recordCase(name, options);
  });
}

function reporterTests(report: any): any[] {
  return (report.suites ?? []).flatMap((suite: any) => [
    ...(suite.specs ?? []).flatMap((spec: any) => spec.tests ?? []),
    ...reporterTests(suite),
  ]);
}

async function auditSavedExecution(dir: string, result: VerificationResult, expected: 'matched_failure' | 'passed' | 'inconclusive'): Promise<void> {
  const attempts = [];
  for (const outcome of result.attempts) {
    const prefix = `verification-attempt-${outcome.attempt}-`;
    const matching = (await readdir(dir)).filter(name => name.startsWith(prefix));
    assert.equal(matching.length, 1);
    const reportFile = path.join(dir, matching[0], 'results.json');
    const report = JSON.parse(await readFile(reportFile, 'utf8'));
    const cases = reporterTests(report);
    assert.equal(cases.length, 1);
    assert.equal(cases[0].results.length, 1, 'Retries must be disabled.');
    const execution = cases[0].results[0];
    const stdout = await readFile(path.join(dir, `verification-${outcome.attempt}-stdout.txt`), 'utf8');
    const stderr = await readFile(path.join(dir, `verification-${outcome.attempt}-stderr.txt`), 'utf8');
    assert.equal(outcome.classification, expected);
    if (expected === 'matched_failure') {
      assert.equal(outcome.exitCode, 1);
      assert.equal(execution.status, 'failed');
      assert.equal(execution.errors.length, 1);
      assert.ok(execution.errors[0].message.includes(ASSERTION_MARKER));
      assert.equal(outcome.stage, 'cart_assertion_failed');
      assert.deepEqual(outcome.initialCart, expectedCart);
      assert.deepEqual(outcome.actualCart, []);
    } else if (expected === 'passed') {
      assert.equal(outcome.exitCode, 0);
      assert.equal(execution.status, 'passed');
      assert.deepEqual(outcome.initialCart, expectedCart);
      assert.deepEqual(outcome.actualCart, expectedCart);
    } else {
      assert.equal(outcome.evidence?.assertionReached, false);
    }
    if (expected !== 'inconclusive') {
      assert.equal(outcome.evidence?.contextClosed, true);
      assert.ok(outcome.videoName, 'A completed replay must have a closed, saved recording.');
      for (const file of [outcome.videoName!, `verification-${outcome.attempt}-before.png`, `verification-${outcome.attempt}-after.png`]) {
        assert.ok((await stat(path.join(dir, file))).size > 0, `Expected nonempty artifact ${file}`);
      }
    }
    attempts.push({
      attempt: outcome.attempt,
      exitCode: outcome.exitCode,
      reporterStatus: execution.status,
      classification: outcome.classification,
      stage: outcome.stage,
      reportFile: path.relative(runDir, reportFile),
      stdout: { bytes: Buffer.byteLength(stdout), sha256: sha256(stdout) },
      stderr: { bytes: Buffer.byteLength(stderr), sha256: sha256(stderr) },
      video: outcome.videoName,
    });
  }
  await saveJson(path.join(dir, 'independent-file-audit.json'), { kind: 'saved-playwright-file-and-output-audit', attempts });
}

test('real compiled sequence: two intended buggy failures, unchanged control pass, and automation faults stay inconclusive', { timeout: 180_000 }, async () => {
  const { dir, reproduction } = await recordCase('combined-conditions', { express: true, promo: true });
  const specPath = path.join(dir, 'repro.spec.ts');
  const source = await readFile(specPath, 'utf8');
  const specHash = sha256(source);
  assert.match(source, /from '@playwright\/test'/);
  assert.doesNotMatch(source, /from ['"](?:@bugreplay|\.\.\/|\.\/)/, 'The standalone test must not import BugReplay internals.');
  assert.ok(source.includes(ASSERTION_MARKER));
  assert.equal(reproduction.steps[0].kind, 'goto');
  assert.equal(reproduction.steps.filter(step => step.kind === 'click' && step.locator.name.startsWith('Add ')).length, 3, 'The compiled prefix must retain the full nonempty-cart setup.');

  const buggyDir = path.join(dir, 'buggy-replay');
  const buggy = await verifyReproduction({ dir, outputDir: buggyDir, baseUrl: buggyUrl, attempts: 2, timeoutMs: 75_000 });
  assert.equal(buggy.verdict, 'confirmed', JSON.stringify(buggy, null, 2));
  assert.equal(buggy.matchedFailures, 2);
  assert.equal(buggy.attempts.length, 2);
  await auditSavedExecution(buggyDir, buggy, 'matched_failure');
  assert.notEqual(buggy.attempts[0].evidence?.nonce, buggy.attempts[1].evidence?.nonce);

  const controlDir = path.join(dir, 'control-replay');
  const control = await verifyReproduction({ dir, outputDir: controlDir, baseUrl: controlUrl, attempts: 1, timeoutMs: 40_000 });
  assert.equal(control.verdict, 'not_matched', JSON.stringify(control, null, 2));
  assert.equal(control.matchedFailures, 0);
  await auditSavedExecution(controlDir, control, 'passed');
  assert.equal(sha256(await readFile(specPath)), specHash, 'Buggy and control must execute the exact same saved file.');

  // Fault injection mutates a COPY of the saved test; it does not forge browser records.
  const selectorDir = path.join(dir, 'selector-fault');
  await mkdir(selectorDir, { recursive: true });
  const brokenSource = source.replaceAll('"name": "Add Canvas pouch"', '"name": "Missing product-eval control"');
  assert.notEqual(brokenSource, source);
  await writeFile(path.join(selectorDir, 'repro.spec.ts'), brokenSource);
  const selector = await verifyReproduction({ dir: selectorDir, baseUrl: buggyUrl, attempts: 1, timeoutMs: 18_000 });
  assert.equal(selector.verdict, 'inconclusive');
  assert.equal(selector.matchedFailures, 0);
  await auditSavedExecution(selectorDir, selector, 'inconclusive');

  const unavailableDir = path.join(dir, 'unavailable-target');
  const unavailable = await verifyReproduction({ dir, outputDir: unavailableDir, baseUrl: `http://127.0.0.1:${await unusedPort()}`, attempts: 1, timeoutMs: 18_000 });
  assert.equal(unavailable.verdict, 'inconclusive');
  assert.equal(unavailable.matchedFailures, 0);
  await auditSavedExecution(unavailableDir, unavailable, 'inconclusive');
  assert.match(unavailable.attempts[0].error ?? '', /page\.goto|ERR_CONNECTION_REFUSED|network request failed|ECONNREFUSED/);
  assert.equal(sha256(await readFile(specPath)), specHash);
  await saveJson(path.join(dir, 'summary.json'), {
    kind: 'scripted-product-engineering-evaluation', modelUsed: false,
    specPath: path.relative(runDir, specPath), specSha256: specHash,
    buggy: { verdict: buggy.verdict, matchedFailures: buggy.matchedFailures, attempts: buggy.attempts.length },
    control: { verdict: control.verdict, attempts: control.attempts.length, exactSameSavedFile: true },
    selectorFault: selector.verdict, unavailableTarget: unavailable.verdict,
  });
});

test('real shop: reload persists state, new contexts isolate it, and editing invalidates an old save signal', { timeout: 45_000 }, async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(buggyUrl);
    await page.getByRole('button', { name: 'Add Travel cup', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('region', { name: 'Cart', exact: true }).locator('[data-product-id="travel-cup"]')).toHaveAttribute('data-quantity', '1');
    await page.getByRole('textbox', { name: 'Delivery address', exact: true }).fill(changedAddress);
    await page.getByRole('button', { name: 'Save delivery address', exact: true }).click();
    const status = page.locator('[role="status"][data-save-seq]');
    await expect(status).toHaveText('Address saved');
    await expect(status).toHaveAttribute('data-save-seq', '1');
    await page.getByRole('textbox', { name: 'Delivery address', exact: true }).fill('93 River Lane, Portland');
    await expect(status).toBeEmpty();
    await expect(status).toHaveAttribute('data-save-seq', '1');
    await expect(page.locator('[data-checkout-address]')).toHaveText(changedAddress);
    await page.getByRole('button', { name: 'Save delivery address', exact: true }).click();
    await expect(status).toHaveText('Address saved');
    await expect(status).toHaveAttribute('data-save-seq', '2');
    await expect(page.getByRole('region', { name: 'Cart', exact: true })).toHaveAttribute('aria-busy', 'false');
    await page.reload();
    await expect(page.locator('[data-checkout-address]')).toHaveText('93 River Lane, Portland');
    await expect(status).toHaveAttribute('data-save-seq', '2');
    await expect(status).toBeEmpty();
    const clean = await browser.newContext();
    try {
      const cleanPage = await clean.newPage();
      await cleanPage.goto(buggyUrl);
      await expect(cleanPage.getByRole('region', { name: 'Cart', exact: true }).locator('[data-product-id]')).toHaveCount(0);
      await expect(cleanPage.locator('[data-checkout-address]')).toHaveText(initialAddress);
      await expect(cleanPage.locator('[role="status"][data-save-seq]')).toHaveAttribute('data-save-seq', '0');
    } finally { await clean.close(); }
    await saveJson(path.join(runDir, 'persistence-and-save-signal.json'), {
      kind: 'direct-browser-product-check', reloadPreservedCartAndAddress: true,
      newContextStartedEmpty: true, editingClearedOldStatus: true, saveSequence: [0, 1, 2],
    });
  } finally { await context.close(); await browser.close(); }
});
