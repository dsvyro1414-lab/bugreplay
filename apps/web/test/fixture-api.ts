// Explicit synthetic HTTP fixtures for UI contract tests only.
// Production code never imports this module; it does not call a model or the runner.
import { createServer, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRunSchema, type Artifact, type CreateRun, type RunView } from '@bugreplay/contracts';

export const fixtureRunId = '11111111-2222-4333-8444-555555555555';
export const fixtureTestSource = "// Synthetic UI fixture, not live discovery evidence.\nimport { test, expect } from '@playwright/test';\ntest('cart preservation', async () => { expect([1], 'BUGREPLAY_CART_PRESERVATION').toEqual([1, 2]); });\n";
const input: CreateRun = {
  targetUrl: 'http://localhost:4173',
  complaint: 'Sometimes the cart becomes empty after I change my delivery address. Find the conditions that cause this.',
  expected: 'Cart items and quantities must remain after saving a changed address.',
  oracleKind: 'cart_preserved_after_checkout_change',
};
const fixturePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jh1sAAAAASUVORK5CYII=', 'base64');

export interface FixtureFile { status: number; mimeType: string; body: string | Buffer }

export function confirmedRun(): RunView {
  const at = '2026-10-12T09:00:00.000Z';
  const names: Array<[Artifact['kind'], string, string]> = [
    ['screenshot', 'observation-1.png', 'image/png'],
    ['screenshot', 'verification-1-after.png', 'image/png'],
    ['test', 'repro.spec.ts', 'text/plain'],
    ['reproduction', 'reproduction.json', 'application/json'],
    ['verification', 'verification.json', 'application/json'],
    ['verification', 'control-verification.json', 'application/json'],
    ['report', 'report.md', 'text/markdown'],
  ];
  return {
    id: fixtureRunId, status: 'bug_confirmed', input: structuredClone(input), createdAt: at, updatedAt: at,
    metrics: { actions: 7, elapsedMs: 64000 }, verification: { attempts: 2, matchedFailures: 2, verdict: 'confirmed' },
    artifacts: names.map(([kind, name, mimeType]) => ({ kind, name, mimeType, url: `/api/runs/${fixtureRunId}/artifacts/${name}` })),
    events: [
      { id: 1, runId: fixtureRunId, at, type: 'hypothesis', message: 'Synthetic fixture: test an ordinary address change.' },
      { id: 2, runId: fixtureRunId, at, type: 'observation', message: 'Synthetic fixture: captured the cart.', screenshotUrl: `/api/runs/${fixtureRunId}/artifacts/observation-1.png` },
      { id: 3, runId: fixtureRunId, at, type: 'verification', message: 'Synthetic fixture: two matching assertion failures.', data: { result: { matchedFailures: 2 } } },
      { id: 4, runId: fixtureRunId, at, type: 'verification', message: 'Synthetic fixture: unchanged control passed.', data: { control: { attempts: [{ classification: 'passed' }] } } },
      { id: 5, runId: fixtureRunId, at, type: 'completed', status: 'bug_confirmed', message: 'Synthetic fixture result: regression assertion failed in 2/2 clean runs and control passed.' },
    ],
  };
}

export function runningRun(): RunView {
  const run = confirmedRun();
  run.status = 'investigating'; run.createdAt = new Date().toISOString(); run.updatedAt = run.createdAt;
  run.verification = undefined; run.metrics = { actions: 4, elapsedMs: 2000 };
  run.artifacts = run.artifacts.filter(item => item.name === 'observation-1.png');
  run.events = run.events.slice(0, 2).map(event => ({ ...event, at: run.createdAt }));
  return run;
}

function send(response: ServerResponse, status: number, data: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(data));
}

export class FixtureApi {
  run: RunView | null = null;
  files = new Map<string, FixtureFile>();
  postMode: 'confirm' | 'conflict' | 'running' = 'confirm';
  readStatus = 200;
  runReads = 0;
  cancellationRequests = 0;
  postedInputs: CreateRun[] = [];
  readonly server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', 'http://fixture.invalid');
      if (url.pathname === '/api/health') return send(response, 200, { status: 'ok', activeRunId: this.run?.status === 'investigating' ? this.run.id : undefined });
      if (url.pathname === '/api/runs' && request.method === 'POST') {
        let body = ''; for await (const chunk of request) body += chunk.toString();
        const parsed = createRunSchema.safeParse(JSON.parse(body));
        if (!parsed.success) return send(response, 400, { error: 'Invalid fixture input' });
        this.postedInputs.push(parsed.data);
        if (this.postMode === 'conflict') return send(response, 409, { error: 'One investigation is already active', runId: fixtureRunId });
        this.run = this.postMode === 'running' ? runningRun() : confirmedRun();
        this.run.input = parsed.data;
        return send(response, 202, { runId: fixtureRunId });
      }
      if (url.pathname === `/api/runs/${fixtureRunId}/cancel` && request.method === 'POST') {
        this.cancellationRequests++;
        return send(response, 202, { runId: fixtureRunId, cancellationRequested: true });
      }
      if (url.pathname === `/api/runs/${fixtureRunId}`) {
        this.runReads++;
        if (this.readStatus !== 200) return send(response, this.readStatus, { error: this.readStatus === 404 ? 'Run not found' : 'Synthetic fixture connection failure' });
        return this.run ? send(response, 200, this.run) : send(response, 404, { error: 'Run not found' });
      }
      const prefix = `/api/runs/${fixtureRunId}/artifacts/`;
      if (url.pathname.startsWith(prefix)) {
        const file = this.files.get(decodeURIComponent(url.pathname.slice(prefix.length)));
        if (!file) return send(response, 404, { error: 'Artifact not found' });
        response.writeHead(file.status, { 'Content-Type': file.mimeType }); response.end(file.body); return;
      }
      return send(response, 404, { error: 'Unknown fixture route' });
    } catch { if (!response.headersSent) send(response, 500, { error: 'Fixture handler failed' }); else response.end(); }
  });

  reset() {
    this.run = null; this.postMode = 'confirm'; this.readStatus = 200; this.runReads = 0; this.cancellationRequests = 0; this.postedInputs = [];
    this.files = new Map([
      ['observation-1.png', { status: 200, mimeType: 'image/png', body: fixturePng }],
      ['verification-1-after.png', { status: 200, mimeType: 'image/png', body: fixturePng }],
      ['repro.spec.ts', { status: 200, mimeType: 'text/plain', body: fixtureTestSource }],
      ['report.md', { status: 200, mimeType: 'text/markdown', body: '# Synthetic UI fixture\nNot live discovery evidence.\n' }],
      ['reproduction.json', { status: 200, mimeType: 'application/json', body: JSON.stringify({ version: 1, complaint: input.complaint, expected: input.expected, observed: 'Synthetic fixture: the cart changed after saving the address.', steps: [{ id: 's1', kind: 'goto', path: '/' }, { id: 's2', kind: 'click', locator: { role: 'button', name: 'Add to cart', exact: true } }, { id: 's3', kind: 'fill', locator: { role: 'textbox', name: 'Delivery address', exact: true }, value: '42 Test Street' }, { id: 's4', kind: 'click', locator: { role: 'button', name: 'Save address', exact: true } }], oracle: { kind: 'cart_preserved_after_checkout_change', captureAfterStepId: 's2', compareAfterStepId: 's4' } }) }],
      ['verification.json', { status: 200, mimeType: 'application/json', body: JSON.stringify({ attempts: [], verdict: 'confirmed', matchedFailures: 2 }) }],
      ['control-verification.json', { status: 200, mimeType: 'application/json', body: JSON.stringify({ attempts: [{ classification: 'passed' }] }) }],
    ]);
  }

  cancelComplete() {
    if (!this.run) throw new Error('No fixture run to cancel');
    this.run.status = 'cancelled'; this.run.updatedAt = new Date().toISOString();
    this.run.events.push({ id: this.run.events.length + 1, runId: fixtureRunId, at: this.run.updatedAt, type: 'completed', status: 'cancelled', message: 'Synthetic fixture: user requested cancellation.' });
  }

  async start(): Promise<string> {
    this.reset();
    await new Promise<void>((resolve, reject) => { this.server.once('error', reject); this.server.listen(0, '127.0.0.1', resolve); });
    return `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  async close() {
    this.server.closeAllConnections();
    await new Promise<void>((resolve, reject) => this.server.close(error => error ? reject(error) : resolve()));
  }
}
