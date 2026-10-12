import assert from 'node:assert/strict';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { after, before, test } from 'node:test';
import { ModelClient, ModelConfigurationError, readModelConfig } from '../src/llm.js';

// These transport fixtures are deliberately synthetic; they do not evaluate a model or a shop.
let server: Server;
let baseUrl: string;
const counts = new Map<string, number>();
const receivedMessages = new Map<string, { role: string; content: string }[][]>();
const messages = [{ role: 'user' as const, content: 'Choose one browser action.' }];

function reply(response: ServerResponse, content: string, usage: unknown = { prompt_tokens: 19, completion_tokens: 11, total_tokens: 30 }): void {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({
    id: 'synthetic-completion', object: 'chat.completion', created: 0, model: 'synthetic',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage,
  }));
}

before(async () => {
  server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body) as { model: string; response_format: { type: string }; messages: { role: string; content: string }[] };
    assert.equal(input.response_format.type, 'json_object');
    const count = (counts.get(input.model) || 0) + 1;
    counts.set(input.model, count);
    receivedMessages.set(input.model, [...(receivedMessages.get(input.model) || []), input.messages]);
    if ((['retry', 'retry-then-malformed'].includes(input.model) && count === 1) || input.model === 'one-call-budget' || (input.model === 'malformed-then-rate-limit' && count === 2)) {
      response.writeHead(429, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'Synthetic temporary rate limit.', type: 'rate_limit_error', code: 'rate_limit_exceeded' } }));
    } else if (input.model === 'private-error') {
      response.writeHead(401, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'Synthetic secret must never escape: TEST-PRIVATE-CREDENTIAL', type: 'authentication_error', code: 'invalid_api_key' } }));
    } else if (input.model === 'cancel' || (input.model === 'repair-cancel' && count === 2)) {
      setTimeout(() => reply(response, '{"tool":"observe","args":{},"summary":"Inspect the page."}'), 500);
    } else if (input.model === 'malformed' || input.model === 'retry-then-malformed') {
      reply(response, '```json\n{"tool":"observe"\n```');
    } else if ((['format-repair', 'repair-cancel', 'malformed-then-rate-limit'].includes(input.model) && count === 1) || input.model === 'repair-one-call') {
      reply(response, 'SYNTHETIC-REJECTED-PROSE with no JSON decision.');
    } else if (input.model === 'observed-fence') {
      reply(response, 'The cart was preserved after saving a new address. Let me read the cart.\n\n```json\n{"summary":"Cart preserved after the changed address saved.","tool":"readCart","args":{}}\n```');
    } else if (input.model === 'observed-suffix') {
      reply(response, 'The cart was preserved after saving a new address. Let me read the cart.\n\n{"summary":"Cart preserved after the changed address saved.","tool":"readCart","args":{}}');
    } else if (input.model === 'multiple-fences') {
      reply(response, '```json\n{"tool":"observe","args":{},"summary":"First."}\n```\n```json\n{"tool":"restart","args":{},"summary":"Second."}\n```');
    } else if (input.model === 'competing-object') {
      reply(response, '{"tool":"restart"}\n```json\n{"tool":"observe","args":{},"summary":"Inspect."}\n```');
    } else if (input.model === 'truncated-fence') {
      reply(response, '```json\n{"tool":"observe","args":{},"summary":"Inspect."}');
    } else if (input.model === 'fenced-array') {
      reply(response, '```json\n[{"tool":"observe"}]\n```');
    } else if (input.model === 'competing-suffix-objects') {
      reply(response, 'Here are decisions.\n{"tool":"observe"}\n{"tool":"restart"}');
    } else if (input.model === 'suffix-trailing-text') {
      reply(response, 'Inspect first.\n{"tool":"observe","args":{},"summary":"Inspect."}\nExtra text.');
    } else if (input.model === 'suffix-prefix-array') {
      reply(response, 'Options [one].\n{"tool":"observe","args":{},"summary":"Inspect."}');
    } else if (input.model === 'malformed-usage') {
      reply(response, '{"tool":"observe","args":{},"summary":"Inspect."}', { prompt_tokens: '19', completion_tokens: -11 });
    } else if (input.model === 'zero-and-fractional-usage') {
      reply(response, '{"tool":"observe","args":{},"summary":"Inspect."}', { prompt_tokens: 0, completion_tokens: 1.5 });
    } else {
      reply(response, '{"tool":"observe","args":{},"summary":"Inspect the page."}');
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  baseUrl = `http://127.0.0.1:${address.port}/v1`;
});

after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });

function client(model: string): ModelClient {
  return new ModelClient({ provider: 'openai', apiKey: 'synthetic-fixture-key', baseUrl, model });
}

test('one transient retry counts both HTTP attempts and preserves reported usage', async () => {
  const model = client('retry');
  const result = await model.next(messages, AbortSignal.timeout(5_000), 2);
  assert.equal(model.calls, 2);
  assert.equal(result.callsUsed, 2);
  assert.equal(counts.get('retry'), 2);
  assert.deepEqual(result.decision, { tool: 'observe', args: {}, summary: 'Inspect the page.' });
  assert.equal(result.inputTokens, 19);
  assert.equal(result.outputTokens, 11);
  assert.equal(result.normalized, undefined);
  const ledger = model.attemptLedger;
  assert.equal(ledger.length, 2);
  assert.equal(ledger[0].status, 'failed');
  assert.equal(ledger[0].inputTokens, undefined);
  assert.equal(ledger[1].status, 'completed');
  assert.equal(ledger[1].inputTokens, 19);
  assert.equal(ledger[1].outputTokens, 11);
  assert.ok(ledger.every(entry => Number.isFinite(Date.parse(entry.startedAt)) && entry.durationMs >= 0));
  ledger[1].inputTokens = 123;
  assert.equal(model.attemptLedger[1].inputTokens, 19);
});

test('remaining-call budget prevents a transient retry', async () => {
  const model = client('one-call-budget');
  await assert.rejects(model.next(messages, AbortSignal.timeout(5_000), 1), /status=429/);
  assert.equal(model.calls, 1);
  assert.equal(counts.get('one-call-budget'), 1);
  await assert.rejects(model.next(messages, AbortSignal.timeout(5_000), 0), /budget is exhausted/);
  assert.equal(model.calls, 1);
});

test('two malformed replies exhaust the shared attempt budget and retain all reported usage', async () => {
  const model = client('malformed');
  await assert.rejects(model.next(messages, AbortSignal.timeout(5_000), 2), /not a JSON object/);
  assert.equal(model.calls, 2);
  assert.deepEqual(model.attemptLedger.map(({ status, inputTokens, outputTokens }) => ({ status, inputTokens, outputTokens })), [
    { status: 'invalid_response', inputTokens: 19, outputTokens: 11 },
    { status: 'invalid_response', inputTokens: 19, outputTokens: 11 },
  ]);
});

test('prose plus one complete JSON suffix or fence normalizes without another model call', async () => {
  for (const name of ['observed-suffix', 'observed-fence']) {
    const model = client(name);
    const result = await model.next(messages, AbortSignal.timeout(5_000), 2);
    assert.deepEqual(result.decision, { summary: 'Cart preserved after the changed address saved.', tool: 'readCart', args: {} });
    assert.equal(result.normalized, true);
    assert.equal(model.calls, 1);
    assert.equal(model.attemptLedger[0].normalized, true);
    assert.equal(model.attemptLedger[0].status, 'completed');
  }
});

test('ambiguous, truncated or trailing output cannot become an executable decision', async () => {
  for (const name of ['multiple-fences', 'competing-object', 'truncated-fence', 'fenced-array', 'competing-suffix-objects', 'suffix-trailing-text', 'suffix-prefix-array']) {
    const model = client(name);
    await assert.rejects(model.next(messages, AbortSignal.timeout(5_000), 1), /JSON object/);
    assert.equal(model.calls, 1);
    assert.equal(model.attemptLedger[0].status, 'invalid_response');
    assert.equal(model.attemptLedger[0].inputTokens, 19);
  }
});

test('one format repair shares the transport budget and never echoes rejected prose', async () => {
  const model = client('format-repair');
  const originalMessages = structuredClone(messages);
  const result = await model.next(messages, AbortSignal.timeout(5_000), 2);
  assert.deepEqual(result.decision, { tool: 'observe', args: {}, summary: 'Inspect the page.' });
  assert.equal(result.callsUsed, 2);
  assert.equal(model.calls, 2);
  assert.deepEqual(model.attemptLedger.map(entry => entry.status), ['invalid_response', 'completed']);
  assert.equal(model.attemptLedger.reduce((sum, entry) => sum + (entry.inputTokens ?? 0), 0), 38);
  assert.deepEqual(messages, originalMessages);
  const requests = receivedMessages.get('format-repair')!;
  assert.equal(requests[1].length, requests[0].length + 1);
  assert.match(requests[1].at(-1)!.content, /No browser action was executed/);
  assert.doesNotMatch(JSON.stringify(requests[1]), /SYNTHETIC-REJECTED-PROSE/);
});

test('one remaining call prevents format repair', async () => {
  const model = client('repair-one-call');
  await assert.rejects(model.next(messages, AbortSignal.timeout(5_000), 1), /JSON object/);
  assert.equal(model.calls, 1);
  assert.equal(counts.get('repair-one-call'), 1);
});

test('mixed format and transient failures never create a third transport attempt', async () => {
  for (const name of ['retry-then-malformed', 'malformed-then-rate-limit']) {
    const model = client(name);
    await assert.rejects(model.next(messages, AbortSignal.timeout(5_000), 3), /JSON object|status=429/);
    assert.equal(model.calls, 2);
    assert.equal(counts.get(name), 2);
    assert.deepEqual(model.attemptLedger.map(entry => entry.status), name === 'retry-then-malformed'
      ? ['failed', 'invalid_response'] : ['invalid_response', 'failed']);
  }
});

test('caller cancellation during format repair preserves both attempts and unknown cancelled usage', async () => {
  const model = client('repair-cancel');
  const started = Date.now();
  await assert.rejects(model.next(messages, AbortSignal.timeout(100), 2), /cancelled/);
  assert.ok(Date.now() - started < 1_000);
  assert.equal(model.calls, 2);
  assert.deepEqual(model.attemptLedger.map(entry => entry.status), ['invalid_response', 'failed']);
  assert.equal(model.attemptLedger[1].errorCode, 'CANCELLED');
  assert.equal(model.attemptLedger[1].inputTokens, undefined);
});

test('malformed provider usage stays unknown and valid zero usage is retained', async () => {
  const malformed = client('malformed-usage');
  const result = await malformed.next(messages, AbortSignal.timeout(5_000), 1);
  assert.equal(result.inputTokens, undefined);
  assert.equal(result.outputTokens, undefined);
  assert.equal(malformed.attemptLedger[0].inputTokens, undefined);
  assert.equal(malformed.attemptLedger[0].outputTokens, undefined);
  const partial = client('zero-and-fractional-usage');
  const zero = await partial.next(messages, AbortSignal.timeout(5_000), 1);
  assert.equal(zero.inputTokens, 0);
  assert.equal(zero.outputTokens, undefined);
  assert.equal(partial.attemptLedger[0].inputTokens, 0);
  assert.equal(partial.attemptLedger[0].outputTokens, undefined);
});

test('caller deadline aborts the transport without a retry', async () => {
  const model = client('cancel');
  const started = Date.now();
  await assert.rejects(model.next(messages, AbortSignal.timeout(50), 2), /cancelled/);
  assert.ok(Date.now() - started < 1_000);
  assert.equal(model.calls, 1);
  assert.equal(model.attemptLedger[0].status, 'failed');
  assert.equal(model.attemptLedger[0].errorCode, 'CANCELLED');
  assert.equal(model.attemptLedger[0].inputTokens, undefined);
  assert.equal(model.attemptLedger[0].outputTokens, undefined);
});

test('provider error bodies cannot leak credentials through API errors', async () => {
  const model = client('private-error');
  await assert.rejects(model.next(messages, AbortSignal.timeout(5_000), 2), error => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /status=401/);
    assert.doesNotMatch(error.message, /TEST-PRIVATE-CREDENTIAL/);
    return true;
  });
  assert.equal(model.calls, 1);
  assert.equal(model.attemptLedger[0].status, 'failed');
  assert.doesNotMatch(JSON.stringify(model.attemptLedger), /TEST-PRIVATE-CREDENTIAL/);
});

test('missing and unsafe model configuration fails before transport', () => {
  assert.throws(() => readModelConfig({}), ModelConfigurationError);
  assert.throws(() => readModelConfig({ LLM_MODEL: 'example' }), /LLM_API_KEY/);
  assert.throws(() => readModelConfig({ LLM_MODEL: 'example', LLM_API_KEY: 'synthetic', LLM_BASE_URL: 'https://user:password@example.com/v1' }), /embedded credentials/);
  assert.throws(() => readModelConfig({ LLM_PROVIDER: 'bedrock', LLM_MODEL: 'example', AWS_ACCESS_KEY_ID: 'synthetic' }), /Set both/);
});

test('organizer OpenAI-compatible aliases are trimmed and reach the configured transport', async () => {
  const config = readModelConfig({
    OPENAI_BASE_URL: ` ${baseUrl} \n`, OPENAI_API_KEY: ' synthetic-alias-key \t', MODEL: ' aliases \n',
  });
  assert.deepEqual(config, { provider: 'openai', baseUrl, apiKey: 'synthetic-alias-key', model: 'aliases' });
  const model = new ModelClient(config);
  const result = await model.next(messages, AbortSignal.timeout(5_000), 1);
  assert.equal(counts.get('aliases'), 1);
  assert.deepEqual(result.decision, { tool: 'observe', args: {}, summary: 'Inspect the page.' });
});

test('explicit nonblank LLM values take precedence over the organizer aliases', () => {
  assert.deepEqual(readModelConfig({
    LLM_PROVIDER: ' openai ',
    LLM_BASE_URL: ' https://explicit.example/v1 ', OPENAI_BASE_URL: 'https://alias.example/v1',
    LLM_API_KEY: ' synthetic-explicit-key ', OPENAI_API_KEY: 'synthetic-alias-key',
    LLM_MODEL: ' explicit-model ', MODEL: 'alias-model',
  }), {
    provider: 'openai', baseUrl: 'https://explicit.example/v1', apiKey: 'synthetic-explicit-key', model: 'explicit-model',
  });
});

test('blank LLM values fall back to aliases and blank base URLs retain the default', () => {
  assert.deepEqual(readModelConfig({
    LLM_PROVIDER: ' \t', LLM_BASE_URL: ' \n', LLM_API_KEY: ' \t', LLM_MODEL: ' ',
    OPENAI_BASE_URL: ' https://alias.example/v1 ', OPENAI_API_KEY: ' synthetic-alias-key ', MODEL: ' alias-model ',
  }), {
    provider: 'openai', baseUrl: 'https://alias.example/v1', apiKey: 'synthetic-alias-key', model: 'alias-model',
  });
  assert.equal(readModelConfig({ LLM_BASE_URL: ' ', OPENAI_BASE_URL: ' \t', OPENAI_API_KEY: 'synthetic', MODEL: 'alias-model' }).baseUrl, 'https://api.openai.com/v1');
  assert.throws(() => readModelConfig({ LLM_MODEL: ' ', MODEL: ' \n' }), /LLM_MODEL or MODEL/);
  assert.throws(() => readModelConfig({ MODEL: 'alias-model', LLM_API_KEY: ' ', OPENAI_API_KEY: ' \n' }), /LLM_API_KEY or OPENAI_API_KEY/);
});

test('unsafe alias URLs fail validation and an unsafe explicit URL is not replaced by an alias', () => {
  for (const OPENAI_BASE_URL of ['file:///tmp/synthetic', 'https://user:password@example.com/v1', 'not-an-absolute-url']) {
    assert.throws(() => readModelConfig({ MODEL: 'alias-model', OPENAI_API_KEY: 'synthetic', OPENAI_BASE_URL }), ModelConfigurationError);
  }
  assert.throws(() => readModelConfig({
    MODEL: 'alias-model', OPENAI_API_KEY: 'synthetic', OPENAI_BASE_URL: 'https://alias.example/v1', LLM_BASE_URL: 'ftp://explicit.example',
  }), /HTTP\(S\) URL without embedded credentials/);
});
