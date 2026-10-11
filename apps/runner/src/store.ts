import { appendFileSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { randomUUID } from 'node:crypto';
import { runViewSchema, terminalStatuses, type Artifact, type CreateRun, type RunEvent, type RunStatus, type RunView } from '@bugreplay/contracts';

export class RunStore {
  readonly runs = new Map<string, RunView>();
  constructor(readonly root: string) {
    mkdirSync(root, { recursive: true });
    for (const id of readdirSync(root)) {
      if (!/^[\da-f-]{36}$/.test(id)) continue;
      try {
        const run = runViewSchema.parse(JSON.parse(readFileSync(join(root, id, 'run.json'), 'utf8')));
        if (run.id !== id) continue;
        this.runs.set(id, run);
        if (!terminalStatuses.includes(run.status)) this.event(id, { type: 'completed', message: 'Runner restarted; the interrupted browser session cannot be recovered.', status: 'inconclusive' });
      } catch { /* Ignore incomplete/corrupt directories, never invent a result. */ }
    }
  }
  directory(id: string) { if (!this.runs.has(id)) throw new Error('Unknown run'); return join(this.root, id); }
  create(input: CreateRun): RunView {
    const at = new Date().toISOString();
    const run: RunView = { id: randomUUID(), status: 'queued', input, createdAt: at, updatedAt: at, events: [], artifacts: [], metrics: { actions: 0, elapsedMs: 0 } };
    this.runs.set(run.id, run);
    mkdirSync(this.directory(run.id), { recursive: true });
    this.event(run.id, { type: 'status', message: 'Investigation queued.', status: 'queued' });
    return run;
  }
  save(id: string) {
    const dir = this.directory(id), run = this.runs.get(id)!;
    writeFileSync(join(dir, 'run.json.tmp'), JSON.stringify(run, null, 2));
    renameSync(join(dir, 'run.json.tmp'), join(dir, 'run.json'));
  }
  event(id: string, event: Omit<RunEvent, 'id' | 'runId' | 'at'>) {
    const run = this.runs.get(id)!;
    const item: RunEvent = { ...event, id: run.events.length + 1, runId: id, at: new Date().toISOString() };
    if (event.status) run.status = event.status;
    run.updatedAt = item.at;
    run.events.push(item);
    appendFileSync(join(this.directory(id), 'events.jsonl'), JSON.stringify(item) + '\n');
    this.save(id);
    return item;
  }
  artifact(id: string, kind: Artifact['kind'], name: string, mimeType: string): Artifact {
    if (basename(name) !== name || !/^[\w.-]+$/.test(name) || !existsSync(join(this.directory(id), name))) throw new Error('Artifact must be a completed file in this run');
    const run = this.runs.get(id)!;
    const artifact: Artifact = { kind, name, mimeType, url: `/api/runs/${id}/artifacts/${name}` };
    if (!run.artifacts.some(a => a.name === name)) {
      run.artifacts.push(artifact);
      this.event(id, { type: 'artifact', message: `Saved ${name}`, data: { artifact } });
    }
    return artifact;
  }
  status(id: string, status: RunStatus, message: string) { this.event(id, { type: terminalStatuses.includes(status) ? 'completed' : 'status', status, message }); }
}
