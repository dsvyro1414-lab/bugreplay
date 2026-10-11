import '../apps/runner/src/config.js';
import { ModelClient } from '../apps/runner/src/llm.js';

const client = new ModelClient();
try {
  const response = await client.next([{ role: 'system', content: 'Return JSON only: {"ok":true}. This is an API access check, no investigation.' }, { role: 'user', content: 'Check JSON output.' }], AbortSignal.timeout(30000));
  console.log(JSON.stringify({ decision: response.decision, inputTokens: response.inputTokens, outputTokens: response.outputTokens }));
} catch (error) { console.error(error instanceof Error ? error.message : 'Model access check failed'); process.exitCode = 1; }
finally { client.close(); }
