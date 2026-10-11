import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';
import type { BrowserObservation, CartCheckpoint, ReproStep, VerificationResult } from '@bugreplay/contracts';
import { investigate, type InvestigationServices } from '../src/investigate.js';
import type { RunnerConfig } from '../src/config.js';
import type { ModelMessage, ModelResult } from '../src/llm.js';
import { RunStore } from '../src/store.js';

// Explicit synthetic orchestration tests: model and telemetry are fixtures.
// Chromium, DOM reads, compilation, saved-file processes, videos, and the oracle are real.
// These results do not establish live-model discovery or acceptance of Agent B's shop.
const sourceOnlySentinel = 'SYNTHETIC_INTERNAL_SOURCE_MUST_NOT_REACH_THE_MODEL';
function fixtureHtml(buggy: boolean): string {
  return `<!doctype html><html lang="en"><body><h1>Synthetic investigation fixture</h1>
  <button data-action="cart-add" id="add">Add sample</button>
  <section role="region" aria-label="Cart" aria-busy="false" id="cart" style="min-height:20px">Cart is empty</section>
  <label>Delivery address<input id="address" data-action="checkout-edit" value="12 Initial Way"></label>
  <button data-action="checkout-save" id="save">Save address</button>
  <p data-checkout-address id="committed">12 Initial Way</p>
  <p role="status" data-save-seq="0" id="status" style="min-height:20px"></p>
  <script>
  const sourceOnlySentinel = '${sourceOnlySentinel}';
  const cart = document.querySelector('#cart'), status = document.querySelector('#status');
  document.querySelector('#add').onclick = () => cart.innerHTML = '<div data-product-id="sample" data-quantity="1">Sample product × 1</div>';
  document.querySelector('#address').oninput = () => status.textContent = '';
  document.querySelector('#save').onclick = () => {
    cart.setAttribute('aria-busy', 'true');
    setTimeout(() => {
      document.querySelector('#committed').textContent = document.querySelector('#address').value;
      status.dataset.saveSeq = String(Number(status.dataset.saveSeq) + 1); status.textContent = 'Address saved';
      ${buggy ? "cart.innerHTML = 'Cart is empty';" : ''}
      cart.setAttribute('aria-busy', 'false');
    }, 80);
  };
  </script></body></html>`;
}

async function fixture(buggy: boolean): Promise<{ origin: string; server: Server; close: () => Promise<void> }> {
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(fixtureHtml(buggy));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return { server, origin: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) };
}

interface ModelInput {
  observation: BrowserObservation;
  checkpoints: CartCheckpoint[];
  recentActions: ReproStep[];
  recentResults: Array<{ tool?: string; error?: string }>;
  remaining: { actions: number; calls: number; hypotheses: number; ms: number };
}
interface Decision { tool: string; summary: string; args: Record<string, unknown>; hypothesis?: string }
class SyntheticModel {
  calls = 0;
  closed = false;
  inputs: ModelInput[] = [];
  constructor(private readonly decide: (input: ModelInput, call: number) => Decision) {}
  async next(messages: ModelMessage[], signal: AbortSignal, remainingCalls = Infinity): Promise<ModelResult> {
    signal.throwIfAborted();
    assert.ok(remainingCalls > 0, 'The loop must not dispatch calls after its call budget.');
    const user = messages.find(message => message.role === 'user');
    assert.ok(user);
    assert.ok(!user.content.includes(sourceOnlySentinel), 'Only visible browser observations may reach the model fixture.');
    const input = JSON.parse(user.content) as ModelInput;
    this.inputs.push(input);
    this.calls++;
    return { decision: this.decide(input, this.calls), inputTokens: 10, outputTokens: 5, callsUsed: 1 };
  }
  close(): void { this.closed = true; }
}

function controlRef(observation: BrowserObservation, name: string): string {
  const element = observation.elements.find(element => element.locator.name === name);
  assert.ok(element, `Missing synthetic control ${name}`);
  return element.ref;
}
function decision(tool: string, args: Record<string, unknown>, summary = `Synthetic fixture selected ${tool}.`): Decision {
  return { tool, args, summary };
}
function injectedServices(model: SyntheticModel) {
  let initialized = 0;
  const spans: Array<{ name: string; kind?: string }> = [];
  const traces: Array<{ name: string; initial: Record<string, unknown>; final?: Record<string, unknown> }> = [];
  const services: InvestigationServices = {
    makeModel: () => model,
    initTelemetry: async () => { initialized++; },
    withTrace: async (name, attributes, fn, finalAttributes) => {
      const trace: typeof traces[number] = { name, initial: attributes };
      traces.push(trace);
      try { return await fn(); } finally { trace.final = finalAttributes?.(); }
    },
    withSpan: async (name, fn, kind) => { spans.push({ name, kind }); return fn(); },
  };
  return { services, spans, traces, initialized: () => initialized };
}

async function runEnvironment(target: string, control: string, limits: Partial<RunnerConfig> = {}) {
  // Keep saved standalone tests below the repository so their sole Playwright import resolves normally.
  const base = path.resolve(import.meta.dirname, '../../..', 'artifacts', 'synthetic-tests');
  await mkdir(base, { recursive: true });
  const root = await mkdtemp(path.join(base, 'investigation-'));
  const config: RunnerConfig = {
    port: 3001, artifactRoot: root, allowedOrigins: [target, control], controlBaseUrl: control,
    maxActions: 20, maxCalls: 12, maxHypotheses: 4, investigationMs: 20_000, verificationMs: 30_000, totalMs: 50_000,
    ...limits,
  };
  const store = new RunStore(root);
  const run = store.create({
    targetUrl: `${target}/shop`, complaint: 'Items disappear after saving a changed delivery address.',
    expected: 'The same cart items and quantities remain after the address change.', oracleKind: 'cart_preserved_after_checkout_change',
  });
  return { root, config, store, run, dir: store.directory(run.id), close: () => rm(root, { recursive: true, force: true }) };
}

test('synthetic model drives the real loop to 2 intended failures and an unchanged passing control', { timeout: 55_000 }, async () => {
  const buggy = await fixture(true), fixed = await fixture(false);
  const environment = await runEnvironment(buggy.origin, fixed.origin);
  const { store, run, config, dir } = environment;
  const model = new SyntheticModel(input => {
    const { observation, checkpoints, recentActions } = input;
    if (input.recentResults.some(result => result.tool === 'submitCandidate')) return decision('finishWithoutRepro', {
      reason: 'Synthetic replay failed its confirmation contract; stopping this fixture rather than repeating it.', testedConditions: ['Synthetic address save'],
    });
    if (observation.state.cart.length === 0 && observation.state.saveSeq === 0) return {
      ...decision('click', { ref: controlRef(observation, 'Add sample') }), hypothesis: 'Synthetic address-save cart-preservation probe.',
    };
    if (!checkpoints.length) return decision('checkpointCart', {});
    const address = observation.elements.find(element => element.locator.name === 'Delivery address');
    if (address?.value !== '24 Changed Street') return decision('fill', { ref: controlRef(observation, 'Delivery address'), value: '24 Changed Street' });
    if (observation.state.saveSeq === 0) return decision('click', { ref: controlRef(observation, 'Save address') });
    assert.deepEqual(observation.state.cart, []);
    return decision('submitCandidate', {
      episodeId: observation.episodeId, checkpointId: checkpoints[0].id, endStepId: recentActions.at(-1)!.id,
      observed: 'The synthetic cart emptied after the visible address save completed.',
    });
  });
  const injected = injectedServices(model);
  try {
    await investigate(store, run.id, config, new AbortController().signal, injected.services);
    assert.equal(run.status, 'bug_confirmed', JSON.stringify(run.events.filter(event => ['verification', 'tool_error', 'completed'].includes(event.type)).map(event => ({
      type: event.type, message: event.message, result: event.data?.result && (event.data.result as VerificationResult).attempts.map(attempt => ({ classification: attempt.classification, errorType: attempt.errorType, stage: attempt.stage })),
    }))));
    assert.deepEqual(run.verification, { attempts: 2, matchedFailures: 2, verdict: 'confirmed' });
    assert.equal(model.calls, 5);
    assert.equal(model.closed, true);
    assert.equal(run.metrics.actions, 4);
    assert.equal(run.metrics.inputTokens, 50);
    assert.equal(run.metrics.outputTokens, 25);
    assert.equal(run.metrics.costUsd, undefined);
    assert.equal(injected.initialized(), 1);
    assert.ok(injected.spans.some(span => span.name === 'model.next' && span.kind === 'LLM'));
    assert.ok(injected.spans.some(span => span.name === 'verifier.replay'));
    assert.ok(injected.spans.some(span => span.name === 'verifier.control'));
    assert.equal(injected.traces[0].initial['bugreplay.run_id'], run.id);
    const final = injected.traces[0].final!;
    assert.equal(final['bugreplay.verdict'], 'bug_confirmed');
    assert.equal(final['bugreplay.actions'], 4);
    assert.equal(final['bugreplay.model_calls'], 5);
    assert.equal(final['bugreplay.input_tokens'], 50);
    assert.equal(final['bugreplay.output_tokens'], 25);
    assert.ok(Number(final['bugreplay.elapsed_ms']) > 0);

    for (const kind of ['test', 'reproduction', 'report', 'video', 'verification', 'screenshot']) {
      assert.ok(run.artifacts.some(artifact => artifact.kind === kind), `Missing ${kind} artifact`);
    }
    for (const artifact of run.artifacts) assert.ok((await stat(path.join(dir, artifact.name))).size > 0);
    const primary = JSON.parse(await readFile(path.join(dir, 'verification.json'), 'utf8')) as VerificationResult;
    const control = JSON.parse(await readFile(path.join(dir, 'control-verification.json'), 'utf8')) as VerificationResult;
    assert.equal(primary.matchedFailures, 2);
    assert.ok(primary.attempts.every(attempt => attempt.stage === 'cart_assertion_failed' && attempt.initialCart?.length === 1 && attempt.actualCart?.length === 0));
    assert.equal(control.attempts.length, 1);
    assert.equal(control.attempts[0].classification, 'passed');
    assert.equal(await readFile(path.join(dir, 'verification.json'), 'utf8'), await readFile(path.join(dir, 'candidate-1', 'verification.json'), 'utf8'));
    assert.equal(await readFile(path.join(dir, 'repro.spec.ts'), 'utf8'), await readFile(path.join(dir, 'candidate-1', 'repro.spec.ts'), 'utf8'));
    const primaryAttempt = JSON.parse(await readFile(path.join(dir, 'verification-1.json'), 'utf8'));
    const controlAttempt = JSON.parse(await readFile(path.join(dir, 'candidate-1', 'control', 'verification-1.json'), 'utf8'));
    assert.equal(primaryAttempt.classification, 'matched_failure', 'Control must not overwrite primary verification evidence.');
    assert.equal(controlAttempt.classification, 'passed');
    assert.deepEqual(primaryAttempt.evidence.actualCart, []);
    assert.deepEqual(controlAttempt.evidence.actualCart, [{ productId: 'sample', quantity: 1 }]);
    const reproduction = JSON.parse(await readFile(path.join(dir, 'reproduction.json'), 'utf8'));
    assert.deepEqual(reproduction.steps.map((step: ReproStep) => step.kind), ['goto', 'click', 'fill', 'click']);
    assert.equal(reproduction.steps[0].path, '/shop');
    assert.ok((await readFile(path.join(dir, 'report.md'), 'utf8')).includes('2/2 clean runs'));
    const reloaded = new RunStore(environment.root).runs.get(run.id)!;
    assert.equal(reloaded.status, 'bug_confirmed');
    assert.equal(reloaded.events.length, run.events.length);
  } finally { await environment.close(); await Promise.all([buggy.close(), fixed.close()]); }
});

test('synthetic stale-ref decision yields a fresh snapshot, meaningful recovery, and no false confirmation', { timeout: 15_000 }, async () => {
  const fixed = await fixture(false);
  const environment = await runEnvironment(fixed.origin, fixed.origin);
  let staleRef = '';
  let recoveredRef = '';
  const model = new SyntheticModel((input, call) => {
    if (call === 1) {
      staleRef = controlRef(input.observation, 'Add sample');
      return decision('click', { ref: staleRef });
    }
    if (call === 2) return decision('click', { ref: staleRef }, 'Synthetic fixture deliberately exercises stale-reference recovery.');
    if (call === 3) {
      assert.ok(input.recentResults.some(result => result.error?.includes('stale ref')));
      recoveredRef = controlRef(input.observation, 'Delivery address');
      assert.notEqual(recoveredRef.split('-')[0], staleRef.split('-')[0]);
      return decision('fill', { ref: recoveredRef, value: '36 Recovery Road' });
    }
    assert.equal(input.observation.elements.find(element => element.ref.includes('-') && element.locator.name === 'Delivery address')?.value, '36 Recovery Road');
    return decision('finishWithoutRepro', { reason: 'Synthetic recovery completed; no cart-preservation violation was observed.', testedConditions: ['Fresh-snapshot address edit'] });
  });
  const injected = injectedServices(model);
  try {
    await investigate(environment.store, environment.run.id, environment.config, new AbortController().signal, injected.services);
    const run = environment.run;
    assert.equal(run.status, 'not_reproduced');
    assert.equal(run.verification, undefined);
    assert.equal(run.metrics.actions, 3, 'Stale-ref rejection must not count as a real browser action.');
    const errorIndex = run.events.findIndex(event => event.type === 'tool_error' && event.message.includes('stale ref'));
    assert.ok(errorIndex >= 0);
    assert.ok(run.events.slice(errorIndex + 1).some(event => event.type === 'observation' && event.screenshotUrl));
    assert.ok(run.events.slice(errorIndex + 1).some(event => event.type === 'action' && event.message.includes('fill textbox')));
    assert.ok(injected.spans.some(span => span.name === 'browser.recover_observe'));
    assert.ok(!injected.spans.some(span => span.name.startsWith('verifier.')));
    assert.equal(injected.traces[0].final?.['bugreplay.verdict'], 'not_reproduced');
    assert.equal(model.closed, true);
  } finally { await environment.close(); await fixed.close(); }
});

test('synthetic investigation respects small model-call and real-action budgets without confirming a bug', { timeout: 15_000 }, async () => {
  const fixed = await fixture(false);
  try {
    for (const limits of [{ maxCalls: 1, maxActions: 10 }, { maxCalls: 10, maxActions: 1 }]) {
      const environment = await runEnvironment(fixed.origin, fixed.origin, limits);
      const model = new SyntheticModel(input => decision('click', { ref: controlRef(input.observation, 'Add sample') }));
      const injected = injectedServices(model);
      try {
        await investigate(environment.store, environment.run.id, environment.config, new AbortController().signal, injected.services);
        assert.ok(['not_reproduced', 'inconclusive'].includes(environment.run.status));
        assert.ok(model.calls <= limits.maxCalls);
        assert.ok(environment.run.metrics.actions <= limits.maxActions);
        assert.equal(model.calls, limits.maxCalls === 1 ? 1 : 0);
        assert.equal(environment.run.metrics.actions, limits.maxActions === 1 ? 1 : 2);
        assert.equal(environment.run.verification, undefined);
        assert.equal(injected.traces[0].final?.['bugreplay.actions'], environment.run.metrics.actions);
        assert.equal(injected.traces[0].final?.['bugreplay.model_calls'], model.calls);
      } finally { await environment.close(); }
    }
  } finally { await fixed.close(); }
});
