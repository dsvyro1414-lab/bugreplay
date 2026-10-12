import { runViewSchema, type Artifact, type CreateRun, type RunView } from '@bugreplay/contracts';

export class ApiError extends Error {
  constructor(message: string, readonly status?: number, readonly runId?: string) { super(message); }
}

export function isRunId(value: unknown): value is string {
  return typeof value === 'string' && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);
}

export async function requestJson(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  const timeout = AbortSignal.timeout(15000);
  const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
  try {
    response = await fetch(path, { ...init, signal, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...init.headers } });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    if (timeout.aborted) throw new ApiError(init.method === 'POST' ? 'The runner response timed out. Check the active investigation before retrying.' : 'The runner response timed out. Reconnecting automatically.');
    throw new ApiError('Cannot reach the runner. Check that it is running and try again.');
  }
  let data: unknown;
  try { data = await response.json(); }
  catch (error) {
    if (init.signal?.aborted) throw error;
    if (timeout.aborted) throw new ApiError('The runner response timed out before it finished loading.');
    throw new ApiError(`The runner returned an unreadable response (HTTP ${response.status}).`, response.status);
  }
  if (!response.ok) {
    const body = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    throw new ApiError(typeof body.error === 'string' ? body.error : `Request failed (HTTP ${response.status}).`, response.status, isRunId(body.runId) ? body.runId : undefined);
  }
  return data;
}

export async function getRun(id: string, signal?: AbortSignal): Promise<RunView> {
  const result = runViewSchema.safeParse(await requestJson(`/api/runs/${encodeURIComponent(id)}`, { signal }));
  if (!result.success || result.data.id !== id) throw new ApiError('The runner returned an incompatible investigation. Refresh after checking the runner version.');
  return result.data;
}

export async function createRun(input: CreateRun): Promise<string> {
  const data = await requestJson('/api/runs', { method: 'POST', body: JSON.stringify(input) });
  if (!data || typeof data !== 'object' || !('runId' in data) || !isRunId(data.runId)) {
    throw new ApiError('The runner accepted the request without a valid run ID. Check the active investigation before starting another.');
  }
  return data.runId;
}

// A displayed or downloaded file must be registered for the current run.
export function artifactPath(run: RunView, artifact: Artifact): string | null {
  if (!/^[\w.-]+$/.test(artifact.name)) return null;
  const path = `/api/runs/${encodeURIComponent(run.id)}/artifacts/${encodeURIComponent(artifact.name)}`;
  return artifact.url === path ? path : null;
}

export async function getArtifact(run: RunView, artifact: Artifact, signal?: AbortSignal): Promise<Response> {
  const path = artifactPath(run, artifact);
  if (!path) throw new ApiError('This file has an invalid artifact address.');
  const timeout = AbortSignal.timeout(60000);
  const requestSignal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  let response: Response;
  try { response = await fetch(path, { cache: 'no-store', signal: requestSignal }); }
  catch (error) {
    if (signal?.aborted) throw error;
    if (timeout.aborted) throw new ApiError(`${artifact.name} took too long to respond. Please retry the download.`);
    throw new ApiError(`Could not reach ${artifact.name}. Try again when the runner reconnects.`);
  }
  if (!response.ok) throw new ApiError(`${artifact.name} is unavailable (HTTP ${response.status}).`, response.status);
  const contentType = response.headers.get('content-type')?.split(';')[0];
  if (contentType !== artifact.mimeType.split(';')[0]) throw new ApiError(`${artifact.name} returned an unexpected file type.`);
  return response;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed. Please try again.';
}
