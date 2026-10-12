import { flush, init, shutdown, trace, type MaskFunction, type TraceSpanKind } from 'neatlogs';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve, sep } from 'node:path';

let initialization: Promise<void> | undefined;
let ready = false;
let verifiedProbe: { identity: string; result: NeatlogsPreflight } | undefined;
let pendingProbe: { identity: string; promise: Promise<NeatlogsPreflight> } | undefined;

export interface NeatlogsPreflight {
  traceId: string;
  artifactPath: string;
  sdkVersion: string;
}

type ProbeExecution = { stdout: string; exitCode: number | null; failure?: string };

async function executeProbe(apiKey: string, endpoint: string, signal?: AbortSignal): Promise<ProbeExecution & { sdkVersion: string }> {
  const entry = createRequire(import.meta.url).resolve('neatlogs');
  const packageRoot = dirname(dirname(entry));
  const pkg = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8')) as { version: string; bin?: { neatlogs?: string } };
  if (!pkg.bin?.neatlogs) throw new Error('SDK_CLI_UNAVAILABLE');
  const cli = resolve(packageRoot, pkg.bin.neatlogs);
  if (!cli.startsWith(packageRoot + sep)) throw new Error('SDK_CLI_UNAVAILABLE');
  // Only the Neatlogs credential is needed by this controlled child process.
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/API_KEY|SECRET|SESSION_TOKEN|PASSWORD|ACCESS_KEY_ID/.test(name)));
  env.NEATLOGS_API_KEY = apiKey;
  env.NEATLOGS_ENDPOINT = endpoint;
  return new Promise(resolveResult => {
    const child = spawn(process.execPath, [cli, 'doctor', '--probe', '--json'], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let bytes = 0;
    let failure: string | undefined;
    const timer = setTimeout(() => { failure = 'PROBE_TIMEOUT'; child.kill('SIGKILL'); }, 20_000);
    const onAbort = () => { failure = 'PROBE_CANCELLED'; child.kill('SIGKILL'); };
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) onAbort();
    const capture = (chunk: Buffer, isOutput: boolean) => {
      bytes += chunk.length;
      if (bytes > 256 * 1024) { failure = 'PROBE_OUTPUT_LIMIT'; child.kill('SIGKILL'); return; }
      if (isOutput) stdout += chunk.toString('utf8');
    };
    child.stdout.on('data', chunk => capture(chunk, true));
    // Stderr is bounded but never persisted or shown: diagnostics can contain arbitrary provider text.
    child.stderr.on('data', chunk => capture(chunk, false));
    child.on('error', () => { failure = 'PROBE_PROCESS_FAILED'; });
    child.on('close', exitCode => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolveResult({ stdout, exitCode, ...(failure ? { failure } : {}), sdkVersion: pkg.version });
    });
  });
}

/** Prove finalized hosted write/readback before a real browser investigation may start. */
export async function preflightNeatlogs(signal?: AbortSignal): Promise<NeatlogsPreflight> {
  signal?.throwIfAborted();
  const apiKey = process.env.NEATLOGS_API_KEY?.trim();
  if (!apiKey) throw new Error('NEATLOGS_API_KEY is required before starting a real investigation.');
  const endpoint = process.env.NEATLOGS_ENDPOINT?.trim() || 'https://ingest.neatlogs.com';
  let url: URL;
  try { url = new URL(endpoint); } catch { throw new Error('Neatlogs delivery probe failed (ENDPOINT_INVALID).'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Neatlogs delivery probe failed (ENDPOINT_INVALID).');
  }
  const identity = createHash('sha256').update(apiKey).update('\0').update(endpoint).digest('hex');
  if (verifiedProbe?.identity === identity) return verifiedProbe.result;
  if (pendingProbe?.identity === identity) return pendingProbe.promise;

  const promise = (async (): Promise<NeatlogsPreflight> => {
    let execution: Awaited<ReturnType<typeof executeProbe>>;
    try { execution = await executeProbe(apiKey, endpoint, signal); } catch {
      execution = { stdout: '', exitCode: null, failure: 'SDK_CLI_UNAVAILABLE', sdkVersion: 'unknown' };
    }
    let diagnostic: Record<string, any> = {};
    try { diagnostic = JSON.parse(execution.stdout); } catch { /* Invalid output remains a failed probe. */ }
    if (!diagnostic || typeof diagnostic !== 'object' || Array.isArray(diagnostic)) diagnostic = {};
    const safeCode = (value: unknown): string | undefined => typeof value === 'string' && /^[A-Za-z0-9_.-]{1,100}$/.test(value) && !value.includes(apiKey) ? value : undefined;
    const reasons = [execution.failure, safeCode(diagnostic.first_failure),
      ...(Array.isArray(diagnostic.checks) ? diagnostic.checks.filter(check => check?.status === 'fail').map(check => safeCode(check.reason_code)) : [])
    ].filter((value): value is string => Boolean(value));
    const contractMatches = diagnostic.format_version === 'neatlogs.doctor/v2'
      && diagnostic.runtime?.language === 'typescript'
      && diagnostic.runtime?.schema_version === '2'
      && diagnostic.runtime?.sdk_version === execution.sdkVersion;
    const traceId = typeof diagnostic.capture?.trace_id === 'string' && /^[0-9a-f]{32}$/.test(diagnostic.capture.trace_id) ? diagnostic.capture.trace_id : undefined;
    const verified = execution.exitCode === 0 && !execution.failure && diagnostic.status === 'pass'
      && contractMatches && Boolean(traceId) && diagnostic.probe?.readback_trace_id === traceId
      && diagnostic.probe?.visible === true && diagnostic.probe?.finalized === true
      && diagnostic.probe?.readback_span_count === 4 && diagnostic.probe?.meaningful_root_count === 1
      && diagnostic.probe?.duplicate_span_count === 0 && diagnostic.probe?.hierarchy_valid === true
      && diagnostic.probe?.attributes_valid === true && diagnostic.probe?.input_output_valid === true
      && diagnostic.probe?.metadata_valid === true && diagnostic.probe?.typed_tokens_valid === true;
    if (!verified && reasons.length === 0) reasons.push(contractMatches ? 'PROBE_NOT_VERIFIED' : 'PROBE_CONTRACT_INVALID');
    const summary = {
      kind: 'neatlogs_delivery_preflight',
      at: new Date().toISOString(),
      status: verified ? 'pass' : 'fail',
      sdkVersion: execution.sdkVersion,
      exitCode: execution.exitCode,
      reasonCodes: [...new Set(reasons)],
      ...(traceId ? { traceId } : {}),
      finalizedReadbackVerified: verified,
    };
    const toolingRoot = resolve(process.env.ARTIFACT_ROOT || 'artifacts', 'tooling');
    await mkdir(toolingRoot, { recursive: true });
    const artifactPath = resolve(toolingRoot, `neatlogs-preflight-${Date.now()}-${randomUUID().slice(0, 8)}.json`);
    await writeFile(artifactPath, JSON.stringify(summary, null, 2) + '\n');
    if (!verified) throw new Error(`Neatlogs delivery probe failed (${summary.reasonCodes.join(', ')}). Diagnostic: ${artifactPath}`);
    const result: NeatlogsPreflight = { traceId: traceId!, artifactPath, sdkVersion: execution.sdkVersion };
    verifiedProbe = { identity, result };
    return result;
  })();
  pendingProbe = { identity, promise };
  try { return await promise; } finally { if (pendingProbe?.promise === promise) pendingProbe = undefined; }
}

/** Redact known environment secrets at the exporter boundary, including serialized error text. */
function telemetryMask(): MaskFunction {
  const secrets = Object.entries(process.env)
    .filter(([name, value]) => /API_KEY|SECRET|SESSION_TOKEN|PASSWORD|ACCESS_KEY_ID/.test(name) && value && value.length >= 8)
    .map(([, value]) => value!);
  const secretField = /^(?:authorization|proxy-authorization|api[-_]?key|x-api-key|access[-_]?key(?:[-_]?id)?|secret(?:[-_]?access)?[-_]?key|password|session[-_]?token|credentials)$/i;
  function redact(value: unknown, key = ''): unknown {
    if (secretField.test(key)) return '[REDACTED]';
    if (typeof value === 'string') {
      let result = value;
      for (const secret of secrets) result = result.replaceAll(secret, '[REDACTED]');
      return result.replace(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, '[REDACTED_AWS_KEY]')
        .replace(/arn:aws[a-zA-Z-]*:iam:[^\s"\\]+/g, '[REDACTED_IAM_ARN]');
    }
    if (Array.isArray(value)) return value.map(item => redact(item));
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, redact(child, childKey)]));
    }
    return value;
  }
  return signal => redact(signal) as Record<string, unknown>;
}

export async function initTelemetry(signal?: AbortSignal): Promise<void> {
  signal?.throwIfAborted();
  if (ready) return;
  const apiKey = process.env.NEATLOGS_API_KEY?.trim();
  if (!apiKey) throw new Error('NEATLOGS_API_KEY is required before starting a real investigation.');
  if (!initialization) {
    initialization = (async () => {
      await preflightNeatlogs(signal);
      signal?.throwIfAborted();
      try {
        await init({
          apiKey,
          workflowName: 'bugreplay',
          ...(process.env.NEATLOGS_ENDPOINT ? { endpoint: process.env.NEATLOGS_ENDPOINT } : {}),
          registerShutdownHandlers: false,
          sampleRate: 1,
          mask: telemetryMask(),
        });
      } catch {
        throw new Error('Neatlogs initialization failed. Check the server-side project key and endpoint.');
      }
      ready = true;
    })().catch(error => {
      initialization = undefined;
      throw error;
    });
  }
  await initialization;
}

export function isTelemetryReady(): boolean { return ready; }

export async function withTrace<T>(
  name: string,
  attributes: Record<string, unknown>,
  fn: (traceId?: string) => Promise<T>,
  finalAttributes?: () => Record<string, unknown>,
): Promise<T> {
  if (!ready) throw new Error('Neatlogs is not initialized; the investigation cannot start.');
  return trace({ name, kind: 'WORKFLOW', attributes }, async activeSpan => {
    try {
      const result = await fn(activeSpan.spanContext().traceId);
      if (result && typeof result === 'object' && 'status' in result && typeof result.status === 'string') {
        activeSpan.setAttribute('bugreplay.verdict', result.status);
      }
      return result;
    } finally {
      try {
        for (const [key, value] of Object.entries(finalAttributes?.() || {})) {
          if (value === undefined || value === null) continue;
          activeSpan.setAttribute(key, typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : JSON.stringify(value));
        }
      } catch {
        // Metadata must not hide the original run outcome or interrupt browser cleanup.
        activeSpan.setAttribute('bugreplay.final_metadata_error', true);
      }
    }
  });
}

export async function withSpan<T>(name: string, fn: () => Promise<T>, kind: TraceSpanKind = 'TOOL'): Promise<T> {
  if (!ready) throw new Error('Neatlogs is not initialized; the investigation cannot start.');
  return trace({ name, kind, ...(kind === 'TOOL' ? { attributes: { 'neatlogs.tool.name': name } } : {}) }, fn);
}

export async function shutdownTelemetry(): Promise<void> {
  if (initialization) await initialization;
  if (!ready) return;
  try {
    let flushed = false;
    let stopped = false;
    try { flushed = await flush(); } finally { stopped = await shutdown('server_shutdown', 10_000); }
    if (!flushed || !stopped) throw new Error('Neatlogs could not confirm telemetry drain before shutdown.');
  } finally {
    ready = false;
    initialization = undefined;
  }
}
