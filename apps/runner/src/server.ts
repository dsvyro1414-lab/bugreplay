import { createApp } from './api.js';
import { loadConfig } from './config.js';
import { shutdownTelemetry } from './telemetry.js';

const config = loadConfig(), { app } = await createApp({ config });
await app.listen({ port: config.port, host: '127.0.0.1' });
console.log(`BugReplay runner: http://localhost:${config.port}`);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await app.close();
  await shutdownTelemetry();
}
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { void stop().then(() => process.exit(0), error => { console.error(error instanceof Error ? error.message : 'Shutdown failed'); process.exit(1); }); });
