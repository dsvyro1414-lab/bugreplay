import { test, expect, type Page, type Locator } from '@playwright/test';

const reproduction = {
  "version": 1,
  "complaint": "Sometimes the cart becomes empty after I change the delivery address.",
  "expected": "Cart items and quantities must be preserved after saving a changed delivery address.",
  "observed": "The cart became empty after the completed address save.",
  "steps": [
    {
      "id": "step-1",
      "kind": "goto",
      "path": "/"
    },
    {
      "id": "step-2",
      "kind": "click",
      "locator": {
        "role": "button",
        "name": "Add Canvas pouch",
        "exact": true
      }
    },
    {
      "id": "step-3",
      "kind": "click",
      "locator": {
        "role": "button",
        "name": "Add Canvas pouch",
        "exact": true
      }
    },
    {
      "id": "step-4",
      "kind": "click",
      "locator": {
        "role": "button",
        "name": "Add Desk notebook",
        "exact": true
      }
    },
    {
      "id": "step-5",
      "kind": "select",
      "locator": {
        "role": "combobox",
        "name": "Delivery method",
        "exact": true
      },
      "value": "express"
    },
    {
      "id": "step-6",
      "kind": "fill",
      "locator": {
        "role": "textbox",
        "name": "Promo code",
        "exact": true
      },
      "value": "FIELD10"
    },
    {
      "id": "step-7",
      "kind": "click",
      "locator": {
        "role": "button",
        "name": "Apply promo code",
        "exact": true
      }
    },
    {
      "id": "step-8",
      "kind": "fill",
      "locator": {
        "role": "textbox",
        "name": "Delivery address",
        "exact": true
      },
      "value": "72 Orchard Lane, Portland"
    },
    {
      "id": "step-9",
      "kind": "click",
      "locator": {
        "role": "button",
        "name": "Save delivery address",
        "exact": true
      }
    }
  ],
  "oracle": {
    "kind": "cart_preserved_after_checkout_change",
    "captureAfterStepId": "step-4",
    "compareAfterStepId": "step-9"
  }
} as const;
const fs = process.getBuiltinModule('node:fs');
const evidencePath = process.env.BUGREPLAY_EVIDENCE_PATH;
const evidence: Record<string, any> = { version: 1, nonce: process.env.BUGREPLAY_ATTEMPT_NONCE, stage: 'starting', assertionReached: false, contextClosed: false };
function saveEvidence() {
  if (evidencePath) fs.writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
}
function stage(value: string) { evidence.stage = value; saveEvidence(); }
let networkError: string | undefined;
let allowedOrigin: string | undefined;
function blockNetwork(message: string) {
  networkError ??= message;
  evidence.networkError = networkError; saveEvidence();
}
function assertAllowedNetwork() {
  if (networkError) throw new Error(networkError);
}
function target(page: Page, spec: { role: any; name: string; exact: true; scope?: { role: any; name: string } }): Locator {
  const scope = spec.scope ? page.getByRole(spec.scope.role, { name: spec.scope.name, exact: true }) : page;
  return scope.getByRole(spec.role, { name: spec.name, exact: true });
}
async function readState(page: Page) {
  assertAllowedNetwork();
  if (allowedOrigin && new URL(page.url()).origin !== allowedOrigin) throw new Error('Setup: page left BASE_URL origin');
  const cart = page.getByRole('region', { name: 'Cart', exact: true });
  if (await cart.count() !== 1 || !await cart.isVisible()) throw new Error('Setup: expected one visible Cart region');
  const busy = await cart.getAttribute('aria-busy');
  if (busy !== 'false' && busy !== 'true') throw new Error('Setup: Cart aria-busy is missing');
  const rows = cart.locator('[data-product-id]');
  const items: Array<{ productId: string; quantity: number }> = [];
  const seen = new Set<string>();
  for (const row of await rows.all()) {
    if (!await row.isVisible()) continue;
    const productId = await row.getAttribute('data-product-id');
    const rawQuantity = await row.getAttribute('data-quantity');
    const quantity = Number(rawQuantity);
    if (!productId || seen.has(productId) || !rawQuantity || !/^\d+$/.test(rawQuantity) || !Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Setup: invalid visible cart row');
    seen.add(productId); items.push({ productId, quantity });
  }
  const addresses = page.locator('[data-checkout-address]:visible');
  const statuses = page.locator('[role="status"][data-save-seq]:visible');
  if (await addresses.count() !== 1 || await statuses.count() !== 1) throw new Error('Setup: missing or ambiguous visible checkout state');
  const address = (await addresses.innerText()).trim();
  const status = (await statuses.innerText()).trim();
  const rawSequence = await statuses.getAttribute('data-save-seq');
  const saveSeq = Number(rawSequence);
  if (!rawSequence || !/^\d+$/.test(rawSequence) || !Number.isSafeInteger(saveSeq)) throw new Error('Setup: invalid completed-save sequence');
  return { cart: items.sort((a, b) => a.productId.localeCompare(b.productId)), address, saveSeq, saved: status === 'Address saved', busy: busy === 'true' };
}
async function stableState(page: Page, predicate: (state: Awaited<ReturnType<typeof readState>>) => boolean = () => true) {
  const until = Date.now() + 5000;
  let previous = '';
  let stableSince = 0;
  while (Date.now() < until) {
    const value = await readState(page);
    const serialized = JSON.stringify(value);
    if (!value.busy && predicate(value)) {
      if (serialized !== previous) { previous = serialized; stableSince = Date.now(); }
      if (Date.now() - stableSince >= 250) return value;
    } else { previous = ''; stableSince = 0; }
    await page.waitForTimeout(50);
  }
  throw new Error('Setup: UI did not reach a stable completed state with a new changed-address save');
}

test('cart survives a completed checkout address change', async ({ browser }, testInfo) => {
  test.setTimeout(Number(process.env.BUGREPLAY_TEST_TIMEOUT_MS || 55000));
  const base = new URL(process.env.BASE_URL || 'http://localhost:4173');
  allowedOrigin = base.origin;
  const context = await browser.newContext({ serviceWorkers: 'block', recordVideo: { dir: testInfo.outputPath('video'), size: { width: 1280, height: 720 } }, viewport: { width: 1280, height: 720 } });
  await context.route(/.*/, async (route) => {
    const requested = new URL(route.request().url());
    if (requested.origin !== base.origin || !['http:', 'https:'].includes(requested.protocol)) {
      blockNetwork('Setup: blocked request outside BASE_URL origin');
      await route.abort('blockedbyclient'); return;
    }
    try {
      // Fetch the actual response without following redirects; route.continue
      // alone does not reliably intercept subsequent redirect destinations.
      const response = await route.fetch({ maxRedirects: 0, timeout: 10000 });
      if (response.status() >= 300 && response.status() < 400) {
        blockNetwork('Setup: redirects are prohibited during independent replay');
        await route.abort('blockedbyclient'); return;
      }
      await route.fulfill({ response });
    } catch (error) {
      if (!context.pages().length) return;
      blockNetwork('Setup: allowed-origin network request failed: ' + (error instanceof Error ? error.message : String(error)));
      await route.abort('failed').catch(() => {});
    }
  });
  await context.routeWebSocket(/.*/, async (socket) => {
    const requested = new URL(socket.url());
    requested.protocol = requested.protocol === 'wss:' ? 'https:' : 'http:';
    if (requested.origin !== base.origin) {
      blockNetwork('Setup: blocked websocket outside BASE_URL origin');
      await socket.close(); return;
    }
    socket.connectToServer();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.setDefaultNavigationTimeout(10000);
  let initial: Awaited<ReturnType<typeof readState>> | undefined;
  let beforeFinal: Awaited<ReturnType<typeof readState>> | undefined;
  let operationState: Awaited<ReturnType<typeof readState>> | undefined;
  let thrown: unknown;
  try {
    stage('setup');
    for (const step of reproduction.steps) {
      assertAllowedNetwork();
      evidence.stepId = step.id; saveEvidence();
      if (step.id === reproduction.oracle.compareAfterStepId) {
        beforeFinal = await stableState(page);
        evidence.beforeSaveState = beforeFinal; saveEvidence();
      }
      if (step.kind === 'goto') {
        const destination = new URL(step.path, base);
        if (destination.origin !== base.origin) throw new Error('Setup: navigation escapes BASE_URL origin');
        await page.goto(destination.href, { waitUntil: 'domcontentloaded' });
      } else {
        const locator = target(page, step.locator);
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        if (await locator.count() !== 1) throw new Error('Setup: locator is missing or ambiguous');
        const semantic = await locator.evaluate((element) => element.closest('[data-action]')?.getAttribute('data-action') ?? 'unknown');
        if (initial && !['navigation', 'checkout-edit', 'checkout-save'].includes(semantic)) throw new Error('Setup: prohibited action after checkpoint');
        if (step.id === reproduction.oracle.compareAfterStepId && semantic !== 'checkout-save') throw new Error('Setup: final action is not a checkout save');
        if (step.kind === 'click') await locator.click();
        else if (step.kind === 'fill') await locator.fill(step.value);
        else if (step.kind === 'select') await locator.selectOption(step.value);
        else if (step.kind === 'check') await locator.setChecked(step.checked);
      }
      if (step.id === reproduction.oracle.captureAfterStepId) {
        initial = await stableState(page);
        if (!initial.cart.length) throw new Error('Setup: cart checkpoint is empty');
        evidence.initialCart = initial.cart; evidence.initialState = initial;
        evidence.beforeScreenshot = testInfo.outputPath('before.png');
        await page.screenshot({ path: evidence.beforeScreenshot, fullPage: true });
        stage('checkpoint_captured');
      }
      if (step.id === reproduction.oracle.compareAfterStepId) {
        if (!initial || !beforeFinal) throw new Error('Setup: missing initial checkpoint');
        stage('waiting_for_changed_address_save');
        operationState = await stableState(page, (value) => value.saved && value.saveSeq > initial!.saveSeq && value.saveSeq > beforeFinal!.saveSeq && value.address.length > 0 && value.address !== initial!.address && value.address !== beforeFinal!.address);
      }
    }
    if (!initial || !operationState) throw new Error('Setup: incomplete reproduction');
    evidence.actualCart = operationState.cart; evidence.actualState = operationState;
    evidence.afterScreenshot = testInfo.outputPath('after.png');
    await page.screenshot({ path: evidence.afterScreenshot, fullPage: true });
    evidence.assertionReached = true;
    assertAllowedNetwork();
    stage('cart_assertion');
    expect(operationState.cart, 'BUGREPLAY_CART_PRESERVATION').toEqual(initial.cart);
    stage('passed');
  } catch (error) {
    thrown = error;
    evidence.error = error instanceof Error ? error.message : String(error);
    evidence.errorType = evidence.stage === 'cart_assertion' && evidence.error.includes('BUGREPLAY_CART_PRESERVATION') ? 'cart_assertion_failed' : 'automation_or_setup_error';
    stage(evidence.errorType === 'cart_assertion_failed' ? 'cart_assertion_failed' : 'inconclusive');
  } finally {
    try {
      await context.close();
      evidence.contextClosed = true;
      evidence.videoPath = await page.video()?.path();
    } catch (error) {
      evidence.cleanupError = error instanceof Error ? error.message : String(error);
      evidence.stage = 'inconclusive'; evidence.errorType = 'cleanup_error';
      thrown = error;
    }
    if (networkError) {
      evidence.stage = 'inconclusive'; evidence.errorType = 'network_origin_guard'; evidence.error = networkError;
      thrown = new Error(networkError);
    }
    saveEvidence();
    await testInfo.attach('verification-evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  }
  if (thrown) throw thrown;
});
