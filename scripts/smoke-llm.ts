import '../apps/runner/src/config.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';
import { ModelClient } from '../apps/runner/src/llm.js';

const expected = z.object({ tool: z.literal('observe'), args: z.object({}).strict(), summary: z.literal('model-access-ok') }).strict();
let client: ModelClient | undefined;
try {
  client = new ModelClient();
  const response = await client.next([
    { role: 'system', content: 'This is a model transport and JSON parser access check only. No investigation is running and no browser tool will be executed. Return exactly {"tool":"observe","args":{},"summary":"model-access-ok"}. No Markdown or other keys.' },
    { role: 'user', content: 'Return the access-check decision.' },
  ], AbortSignal.timeout(30000), 1);
  if (!expected.safeParse(response.decision).success) throw new Error('Model access check returned an unexpected decision; no browser action was executed.');
  const report = {
    kind: 'model_api_access_check', at: new Date().toISOString(), status: 'pass',
    provider: client.config.provider, model: client.config.model,
    ...(client.config.baseUrl ? { endpointOrigin: new URL(client.config.baseUrl).origin } : {}),
    runtimeDecisionVerified: true, calls: client.calls,
    inputTokens: response.inputTokens, outputTokens: response.outputTokens,
    note: 'One real model request. No browser investigation or reproduction was performed.',
  };
  const root = resolve('artifacts', 'tooling');
  await mkdir(root, { recursive: true });
  const artifactPath = resolve(root, `llm-smoke-${Date.now()}.json`);
  await writeFile(artifactPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ ...report, artifactPath }, null, 2));
} catch (error) { console.error(error instanceof Error ? error.message : 'Model access check failed'); process.exitCode = 1; }
finally { client?.close(); }
