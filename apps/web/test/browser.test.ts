// UI integration checks against an explicit fixture API, not live-model evidence.
import assert from 'node:assert/strict';
import { after, before, beforeEach, test, type TestContext } from 'node:test';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { createServer, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { chromium, type Browser, type Page } from 'playwright';
import { expect } from '@playwright/test';
import { FixtureApi, confirmedRun, fixtureRunId, fixtureTestSource, runningRun } from './fixture-api.js';

const fixture = new FixtureApi();
let vite: ViteDevServer, browser: Browser, webUrl: string;

before(async () => {
  const fixtureUrl = await fixture.start();
  vite = await createServer({
    configFile: false, root: fileURLToPath(new URL('..', import.meta.url)), plugins: [react()], logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, proxy: { '/api': fixtureUrl } },
  });
  await vite.listen();
  webUrl = `http://127.0.0.1:${(vite.httpServer!.address() as AddressInfo).port}`;
  browser = await chromium.launch({ headless: true });
}, { timeout: 30000 });

beforeEach(() => fixture.reset());

after(async () => {
  await browser?.close();
  await vite?.close();
  await fixture.close();
});

async function openPage(t: TestContext, path = ''): Promise<Page> {
  const context = await browser.newContext({ acceptDownloads: true });
  t.after(() => context.close());
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.setDefaultNavigationTimeout(10000);
  await page.goto(`${webUrl}/${path}`);
  return page;
}

test('confirmed fixture exposes recorded steps, matching evidence, source and the original download', { timeout: 20000 }, async t => {
  const page = await openPage(t);
  await page.getByRole('button', { name: 'Investigate', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bug confirmed', exact: true })).toBeVisible();
  assert.equal(fixture.postedInputs.length, 1);
  assert.equal(fixture.postedInputs[0].oracleKind, 'cart_preserved_after_checkout_change');
  await expect(page.getByText('Verified 2/2', { exact: true })).toBeVisible();
  await expect(page.getByText('Unchanged test passed', { exact: true })).toBeVisible();
  await expect(page.getByText('2/2 intended failures', { exact: true })).toBeVisible();
  await expect(page.getByText('Unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('Click “Add to cart”', { exact: true })).toBeVisible();
  await expect(page.getByText('Fill “Delivery address” with “42 Test Street”', { exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Browser screenshot: verification-1-after.png', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Inspect saved Playwright test', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Investigation results' }).locator('pre')).toHaveText(fixtureTestSource);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: /repro\.spec\.ts Executable Playwright test/ }).click();
  const download = await downloadEvent;
  assert.equal(download.suggestedFilename(), 'repro.spec.ts');
  assert.equal(await readFile((await download.path())!, 'utf8'), fixtureTestSource);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Bug confirmed', exact: true })).toBeVisible();
  assert.equal(new URL(page.url()).searchParams.get('run'), fixtureRunId);
  assert.equal(fixture.postedInputs.length, 1, 'Reload must not submit another investigation');
});

test('409 identifies and resumes the existing investigation without claiming a new one', { timeout: 15000 }, async t => {
  fixture.postMode = 'conflict'; fixture.run = runningRun();
  const page = await openPage(t);
  await page.getByRole('button', { name: 'Investigate', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('One investigation is already active');
  await page.getByRole('button', { name: 'Open active investigation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Investigating', exact: true })).toBeVisible();
  assert.equal(new URL(page.url()).searchParams.get('run'), fixtureRunId);
  assert.equal(fixture.postedInputs.length, 1);
});

test('cancel stays pending until the runner confirms a terminal cancelled result', { timeout: 15000 }, async t => {
  fixture.run = runningRun();
  const page = await openPage(t, `?run=${fixtureRunId}`);
  await expect(page.getByRole('heading', { name: 'Investigating', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel run', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Cancelling…', exact: true })).toBeDisabled();
  assert.equal(fixture.cancellationRequests, 1);
  await expect(page.getByRole('heading', { name: 'Investigation cancelled', exact: true })).toHaveCount(0);
  fixture.cancelComplete();
  await expect(page.getByRole('heading', { name: 'Investigation cancelled', exact: true })).toBeVisible();
  await expect(page.getByText('Synthetic fixture: user requested cancellation.', { exact: true })).toHaveCount(2);
  assert.equal(fixture.run!.metrics.actions, 4, 'Cancellation must retain collected evidence');
});

test('reopening the same run ID after a 404 starts a new poll', { timeout: 15000 }, async t => {
  fixture.run = runningRun(); fixture.postMode = 'conflict'; fixture.readStatus = 404;
  const page = await openPage(t, `?run=${fixtureRunId}`);
  await expect(page.getByRole('alert')).toContainText('Run not found');
  await page.getByRole('button', { name: 'Investigate', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open active investigation', exact: true })).toBeVisible();
  const readsBeforeResume = fixture.runReads;
  fixture.readStatus = 200;
  await page.getByRole('button', { name: 'Open active investigation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Investigating', exact: true })).toBeVisible();
  assert.ok(fixture.runReads > readsBeforeResume, 'Selecting the same ID must restart a stopped poll');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Investigating', exact: true })).toBeVisible();
  assert.equal(new URL(page.url()).searchParams.get('run'), fixtureRunId, 'Back can select another history entry for the same ID');
});

test('Back restores the blank workspace even when localStorage contains the last run', { timeout: 15000 }, async t => {
  const page = await openPage(t);
  await page.getByRole('button', { name: 'Investigate', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bug confirmed', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Ready when you are.', exact: true })).toBeVisible();
  assert.equal(new URL(page.url()).searchParams.get('run'), null);
  assert.equal(await page.evaluate(() => localStorage.getItem('bugreplay.lastRunId')), fixtureRunId);
  await expect(page.getByRole('heading', { name: 'Bug confirmed', exact: true })).toHaveCount(0);
});

test('Back between identical terminal run IDs restores evidence after polling has stopped', { timeout: 15000 }, async t => {
  fixture.run = runningRun(); fixture.postMode = 'conflict'; fixture.readStatus = 404;
  const page = await openPage(t, `?run=${fixtureRunId}`);
  await expect(page.getByRole('alert')).toContainText('Run not found');
  await page.getByRole('button', { name: 'Investigate', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open active investigation', exact: true })).toBeVisible();
  fixture.run = confirmedRun(); fixture.readStatus = 200;
  const readsBeforeResume = fixture.runReads;
  await page.getByRole('button', { name: 'Open active investigation', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bug confirmed', exact: true })).toBeVisible();
  await expect.poll(() => fixture.runReads, { timeout: 5000 }).toBeGreaterThanOrEqual(readsBeforeResume + 2);
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Bug confirmed', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recorded reproduction steps', exact: true })).toBeVisible();
  assert.equal(new URL(page.url()).searchParams.get('run'), fixtureRunId);
});

test('failed polling preserves the previous evidence and reconnects to the same run', { timeout: 15000 }, async t => {
  fixture.run = runningRun();
  const page = await openPage(t, `?run=${fixtureRunId}`);
  await expect(page.getByRole('heading', { name: 'Investigating', exact: true })).toBeVisible();
  fixture.readStatus = 503;
  await expect(page.getByRole('alert')).toContainText('Your last received evidence is still shown.');
  await expect(page.getByRole('img', { name: 'Browser screenshot: observation-1.png', exact: true })).toBeVisible();
  fixture.run = confirmedRun(); fixture.readStatus = 200;
  await page.getByRole('button', { name: 'Reconnect', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bug confirmed', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  assert.equal(fixture.postedInputs.length, 0);
});

test('HTTP and file-type failures produce a retryable error, never a successful file download', { timeout: 20000 }, async t => {
  fixture.run = confirmedRun();
  fixture.files.set('repro.spec.ts', { status: 503, mimeType: 'application/json', body: '{"error":"Fixture artifact offline"}' });
  const page = await openPage(t, `?run=${fixtureRunId}`);
  await expect(page.getByRole('heading', { name: 'Bug confirmed', exact: true })).toBeVisible();
  let downloads = 0; page.on('download', () => downloads++);
  const button = page.getByRole('button', { name: /repro\.spec\.ts Executable Playwright test/ });
  await button.click();
  await expect(page.getByRole('alert')).toContainText('repro.spec.ts is unavailable (HTTP 503)');
  await expect(button).toBeEnabled();
  assert.equal(downloads, 0);
  fixture.files.set('repro.spec.ts', { status: 200, mimeType: 'text/html', body: '<html>Unexpected proxy page</html>' });
  await page.getByRole('alert').getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('repro.spec.ts returned an unexpected file type.');
  assert.equal(downloads, 0);
  fixture.files.set('repro.spec.ts', { status: 200, mimeType: 'text/plain', body: fixtureTestSource });
  const downloaded = page.waitForEvent('download');
  await page.getByRole('alert').getByRole('button', { name: 'Retry', exact: true }).click();
  await downloaded;
  await expect(page.getByRole('alert')).toHaveCount(0);
  assert.equal(downloads, 1);
});

test('invalid reproduction data stays visible as a schema error until a successful explicit retry', { timeout: 15000 }, async t => {
  fixture.run = confirmedRun();
  const correct = fixture.files.get('reproduction.json')!;
  fixture.files.set('reproduction.json', { status: 200, mimeType: 'application/json', body: '{"steps":[]}' });
  const page = await openPage(t, `?run=${fixtureRunId}`);
  await expect(page.getByRole('alert')).toContainText('The saved reproduction does not match the shared format.');
  await expect(page.getByRole('heading', { name: 'Recorded reproduction steps', exact: true })).toHaveCount(0);
  fixture.files.set('reproduction.json', correct);
  await page.getByRole('button', { name: 'Retry reproduction', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recorded reproduction steps', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
