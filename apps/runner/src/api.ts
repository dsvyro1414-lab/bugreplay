import Fastify from 'fastify';
import { createReadStream } from 'node:fs';
import { join, basename } from 'node:path';
import { createRunSchema, terminalStatuses } from '@bugreplay/contracts';
import { loadConfig, type RunnerConfig } from './config.js';
import { RunStore } from './store.js';
import { investigate } from './investigate.js';

export async function createApp(options: {
  config?: RunnerConfig;
  execute?: typeof investigate;
} = {}) {
  const config = options.config || loadConfig(), store = new RunStore(config.artifactRoot);
  const app = Fastify({ logger: false, bodyLimit: 16000 });
  let active: { id: string; controller: AbortController; task: Promise<void> } | undefined;
  app.get('/api/health', async () => ({ status: 'ok', activeRunId: active?.id, configured: { model: Boolean(process.env.LLM_MODEL?.trim() || process.env.MODEL?.trim()), neatlogs: Boolean(process.env.NEATLOGS_API_KEY) } }));
  app.post('/api/runs', async (request, reply) => {
    const parsed = createRunSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid run input', issues: parsed.error.issues });
    const target = new URL(parsed.data.targetUrl);
    if (!config.allowedOrigins.includes(target.origin) || target.username || target.password) return reply.code(400).send({ error: 'Target origin is not an allowed controlled shop' });
    if (active) return reply.code(409).send({ error: 'One investigation is already active', runId: active.id });
    const run = store.create(parsed.data), controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('Total run budget exhausted')), config.totalMs);
    const execution = options.execute || investigate;
    const task = Promise.resolve().then(() => execution(store, run.id, config, controller.signal)).catch(error => {
      if (!terminalStatuses.includes(run.status)) store.status(run.id, 'inconclusive', error instanceof Error ? error.message : 'Runner task failed');
    }).finally(() => { clearTimeout(timer); if (active?.id === run.id) active = undefined; });
    active = { id: run.id, controller, task };
    return reply.code(202).send({ runId: run.id });
  });
  app.get<{ Params: { id: string } }>('/api/runs/:id', async (request, reply) => {
    const run = store.runs.get(request.params.id);
    if (!run) return reply.code(404).send({ error: 'Run not found' });
    return run;
  });
  app.post<{ Params: { id: string } }>('/api/runs/:id/cancel', async (request, reply) => {
    const run = store.runs.get(request.params.id);
    if (!run) return reply.code(404).send({ error: 'Run not found' });
    if (active?.id === run.id) { active.controller.abort(new Error('User requested cancellation')); return reply.code(202).send({ runId: run.id, cancellationRequested: true }); }
    return { runId: run.id, status: run.status };
  });
  app.get<{ Params: { id: string; name: string } }>('/api/runs/:id/artifacts/:name', async (request, reply) => {
    const { id, name } = request.params, run = store.runs.get(id);
    if (!run || basename(name) !== name) return reply.code(404).send({ error: 'Artifact not found' });
    const artifact = run.artifacts.find(item => item.name === name);
    if (!artifact) return reply.code(404).send({ error: 'Artifact not found' });
    reply.type(artifact.mimeType).header('X-Content-Type-Options', 'nosniff');
    if (!['video', 'screenshot'].includes(artifact.kind)) reply.header('Content-Disposition', `attachment; filename="${name}"`);
    return reply.send(createReadStream(join(store.directory(id), name)));
  });
  app.addHook('onClose', async () => {
    if (active) { active.controller.abort(new Error('Runner shutting down')); await active.task; }
  });
  return { app, store };
}
