import assert from 'node:assert/strict';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { after, before, test } from 'node:test';
import { ModelClient, ModelConfigurationError, readModelConfig } from '../src/llm.js';

// These transport fixtures are deliberately synthetic; they do not evaluate a model or a shop.
let server: Server;
let baseUrl: string;
const counts = new Map<string, number>();
const messages = [{ role: 'user' as const, content: 'Choose one browser action.' }];

function reply(response: ServerResponse, content: string): void {
  response.writeHead(200, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({
    id: 'synthetic-completion', object: 'chat.completion', created: 0, model: 'synthetic',
    choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
    usage: { prompt_tokens: 19, completion_tokens: 11, total_tokens: 30 },
  }));
}

before(async () => {
  server = createServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    const input = JSON.parse(body) as { model: string; response_format: { type: string } };
    assert.equal(input.response_format.type, 'json_object');
    const count = (counts.get(input.model) || 0) + 1;
    counts.set(input.model, count);
    if ((input.model === 'retry' && count === 1) || input.model === 'one-call-budget') {
      response.writeHead(429, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'Synthetic temporary rate limit.', type: 'rate_limit_error', code: 'rate_limit_exceeded' } }));
    } else if (input.model === 'private-error') {
      response.writeHead(401, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'Synthetic secret must never escape: TEST-PRIVATE-CREDENTIAL', type: 'authentication_error', code: 'invalid_api_key' } }));
    } else if (input.model === 'cancel') {
      setTimeout(() => reply(response, '{"tool":"observe","args":{},"summary":"Inspect the page."}'), 500);
    } else if (input.model === 'malformed') {
      reply(response, '```json\n{"tool":"observe"}\n```');
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
});

test('remaining-call budget prevents a transient retry', async () => {
  const model = client('one-call-budget');
  await assert.rejects(model.next(messages, AbortSignal.timeout(5_000), 1), /status=429/);
  assert.equal(model.calls, 1);
  assert.equal(counts.get('one-call-budget'), 1);
  await assert.rejects(model.next(messages, AbortSignal.timeout(5_000), 0), /budget is exhausted/);
  assert.equal(model.calls, 1);
});

test('malformed JSON is not retried or returned as an executable decision', async () => {
  const model = client('malformed');
  await assert.rejects(model.next(messages, AbortSignal.timeout(5_000), 2), /not a JSON object/);
  assert.equal(model.calls, 1);
});

test('caller deadline aborts the transport without a retry', async () => {
  const model = client('cancel');
  const started = Date.now();
  await assert.rejects(model.next(messages, AbortSignal.timeout(50), 2), /cancelled/);
  assert.ok(Date.now() - started < 1_000);
  assert.equal(model.calls, 1);
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
});

test('missing and unsafe model configuration fails before transport', () => {
  assert.throws(() => readModelConfig({}), ModelConfigurationError);
  assert.throws(() => readModelConfig({ LLM_MODEL: 'example' }), /LLM_API_KEY/);
  assert.throws(() => readModelConfig({ LLM_MODEL: 'example', LLM_API_KEY: 'synthetic', LLM_BASE_URL: 'https://user:password@example.com/v1' }), /embedded credentials/);
  assert.throws(() => readModelConfig({ LLM_PROVIDER: 'bedrock', LLM_MODEL: 'example', AWS_ACCESS_KEY_ID: 'synthetic' }), /Set both/);
});
