import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { initTelemetry, isTelemetryReady, preflightNeatlogs, withTrace } from '../src/telemetry.js';

// An intentionally rejecting local collector checks failure handling, not real hosted delivery.
let server: Server;
let root: string;
let requests = 0;
const key = 'synthetic-neatlogs-project-credential';
const original = {
  NEATLOGS_API_KEY: process.env.NEATLOGS_API_KEY,
  NEATLOGS_ENDPOINT: process.env.NEATLOGS_ENDPOINT,
  ARTIFACT_ROOT: process.env.ARTIFACT_ROOT,
};

before(async () => {
  root = await mkdtemp(join(tmpdir(), 'bugreplay-telemetry-test-'));
  server = createServer((request, response) => {
    requests++;
    request.resume();
    response.writeHead(403, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: `Synthetic rejection: ${key}` }));
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  process.env.NEATLOGS_API_KEY = key;
  process.env.NEATLOGS_ENDPOINT = `http://127.0.0.1:${address.port}`;
  process.env.ARTIFACT_ROOT = root;
});

after(async () => {
  for (const [name, value] of Object.entries(original)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  server.closeAllConnections();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await rm(root, { recursive: true, force: true });
});

test('failed SDK delivery probes are not cached and diagnostics contain no credential', async () => {
  await assert.rejects(preflightNeatlogs(), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /Neatlogs delivery probe failed/);
    assert.ok(!error.message.includes(key));
    return true;
  });
  const firstRequests = requests;
  assert.ok(firstRequests > 0);
  await assert.rejects(preflightNeatlogs(), /Neatlogs delivery probe failed/);
  assert.ok(requests > firstRequests);
  const files = await readdir(join(root, 'tooling'));
  assert.equal(files.length, 2);
  for (const file of files) {
    const text = await readFile(join(root, 'tooling', file), 'utf8');
    assert.ok(!text.includes(key));
    const evidence = JSON.parse(text);
    assert.equal(evidence.status, 'fail');
    assert.equal(evidence.finalizedReadbackVerified, false);
    assert.ok(evidence.reasonCodes.length > 0);
  }
});

test('initialization and real workflow remain blocked after delivery verification fails', async () => {
  await assert.rejects(initTelemetry(), /Neatlogs delivery probe failed/);
  assert.equal(isTelemetryReady(), false);
  let executed = false;
  await assert.rejects(withTrace('synthetic-blocked-workflow', {}, async () => { executed = true; }), /not initialized/);
  assert.equal(executed, false);
});

test('missing credentials and invalid endpoints fail before spawning the probe', async () => {
  const priorRequests = requests;
  delete process.env.NEATLOGS_API_KEY;
  await assert.rejects(preflightNeatlogs(), /NEATLOGS_API_KEY is required/);
  process.env.NEATLOGS_API_KEY = key;
  const endpoint = process.env.NEATLOGS_ENDPOINT;
  process.env.NEATLOGS_ENDPOINT = 'https://user:password@example.com';
  await assert.rejects(preflightNeatlogs(), /ENDPOINT_INVALID/);
  process.env.NEATLOGS_ENDPOINT = endpoint;
  assert.equal(requests, priorRequests);
});
