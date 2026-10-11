import { flush, init, shutdown, trace, type MaskFunction, type TraceSpanKind } from 'neatlogs';

let initialization: Promise<void> | undefined;
let ready = false;

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

export async function initTelemetry(): Promise<void> {
  if (ready) return;
  const apiKey = process.env.NEATLOGS_API_KEY?.trim();
  if (!apiKey) throw new Error('NEATLOGS_API_KEY is required before starting a real investigation.');
  if (!initialization) {
    initialization = init({
      apiKey,
      workflowName: 'bugreplay',
      ...(process.env.NEATLOGS_ENDPOINT ? { endpoint: process.env.NEATLOGS_ENDPOINT } : {}),
      registerShutdownHandlers: false,
      sampleRate: 1,
      mask: telemetryMask(),
    }).then(() => { ready = true; }).catch(() => {
      initialization = undefined;
      throw new Error('Neatlogs initialization failed. Check the server-side project key and endpoint.');
    });
  }
  await initialization;
}

export function isTelemetryReady(): boolean { return ready; }

export async function withTrace<T>(
  name: string,
  attributes: Record<string, unknown>,
  fn: () => Promise<T>,
  finalAttributes?: () => Record<string, unknown>,
): Promise<T> {
  if (!ready) throw new Error('Neatlogs is not initialized; the investigation cannot start.');
  return trace({ name, kind: 'WORKFLOW', attributes }, async activeSpan => {
    try {
      const result = await fn();
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
