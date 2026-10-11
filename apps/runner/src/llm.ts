import OpenAI from 'openai';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message as BedrockMessage,
} from '@aws-sdk/client-bedrock-runtime';
import { wrapBedrock, wrapOpenAI } from 'neatlogs';
import { setTimeout as delay } from 'node:timers/promises';

export type ModelMessage = { role: 'system' | 'user'; content: string };

export interface ModelConfig {
  provider: 'openai' | 'bedrock';
  model: string;
  baseUrl?: string;
  apiKey?: string;
  region?: string;
}

export interface ModelResult {
  decision: unknown;
  inputTokens?: number;
  outputTokens?: number;
  callsUsed: number;
}

export class ModelConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelConfigurationError';
  }
}

export function readModelConfig(env: NodeJS.ProcessEnv = process.env): ModelConfig {
  const provider = env.LLM_PROVIDER?.trim() || 'openai';
  if (provider !== 'openai' && provider !== 'bedrock') {
    throw new ModelConfigurationError('LLM_PROVIDER must be openai or bedrock.');
  }
  const model = env.LLM_MODEL?.trim() || env.MODEL?.trim();
  if (!model) throw new ModelConfigurationError('LLM_MODEL or MODEL is required.');
  if (provider === 'openai') {
    const apiKey = env.LLM_API_KEY?.trim() || env.OPENAI_API_KEY?.trim();
    if (!apiKey) throw new ModelConfigurationError('LLM_API_KEY or OPENAI_API_KEY is required for the OpenAI-compatible provider.');
    const baseUrl = env.LLM_BASE_URL?.trim() || env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1';
    let url: URL;
    try { url = new URL(baseUrl); } catch {
      throw new ModelConfigurationError('LLM_BASE_URL or OPENAI_BASE_URL must be an absolute HTTP(S) URL.');
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      throw new ModelConfigurationError('LLM_BASE_URL or OPENAI_BASE_URL must be an HTTP(S) URL without embedded credentials.');
    }
    return { provider, model, baseUrl, apiKey };
  }
  if (Boolean(env.AWS_ACCESS_KEY_ID) !== Boolean(env.AWS_SECRET_ACCESS_KEY)) {
    throw new ModelConfigurationError('Set both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY for Bedrock IAM authentication.');
  }
  return { provider, model, region: env.AWS_REGION?.trim() || env.AWS_DEFAULT_REGION?.trim() || 'us-east-1' };
}

const JSON_INSTRUCTION = [
  'Return exactly one JSON object and no Markdown or additional text.',
  'The object must have tool (string), args (object), summary (a concise string describing the decision),',
  'and optionally hypothesis (a short testable hypothesis string).',
  'Use only the tools described in the supplied instructions. Do not include private chain-of-thought.',
].join(' ');

function errorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UnknownError';
  const candidate = error as { name?: unknown; code?: unknown };
  const value = typeof candidate.code === 'string' ? candidate.code : candidate.name;
  return typeof value === 'string' && /^[A-Za-z0-9_.-]{1,80}$/.test(value) ? value : 'ProviderError';
}

function statusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { status?: unknown; $metadata?: { httpStatusCode?: unknown } };
  const status = candidate.status ?? candidate.$metadata?.httpStatusCode;
  return typeof status === 'number' ? status : undefined;
}

function transient(error: unknown): boolean {
  const status = statusCode(error);
  if (status === 408 || status === 409 || status === 429 || (status !== undefined && status >= 500)) return true;
  return new Set([
    'APIConnectionError', 'APIConnectionTimeoutError', 'ThrottlingException',
    'ServiceUnavailableException', 'InternalServerException', 'ModelNotReadyException',
    'ECONNRESET', 'ETIMEDOUT', 'EAI_AGAIN',
  ]).has(errorCode(error));
}

function parseDecision(text: string): unknown {
  let value: unknown;
  try { value = JSON.parse(text); } catch {
    throw new Error('Model response was not a JSON object; no browser action was executed.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Model response must be one JSON object; no browser action was executed.');
  }
  return value;
}

export class ModelClient {
  readonly config: ModelConfig;
  private readonly openai?: OpenAI;
  private readonly bedrock?: BedrockRuntimeClient;
  private attempts = 0;

  constructor(config: ModelConfig = readModelConfig()) {
    this.config = config;
    if (!config.model.trim()) throw new ModelConfigurationError('LLM_MODEL or MODEL is required.');
    if (config.provider === 'openai') {
      if (!config.apiKey) throw new ModelConfigurationError('LLM_API_KEY or OPENAI_API_KEY is required for the OpenAI-compatible provider.');
      this.openai = wrapOpenAI(new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
        maxRetries: 0,
        timeout: 30_000,
      }));
    } else {
      // The SDK signs Converse requests using the normal AWS credential chain.
      this.bedrock = wrapBedrock(new BedrockRuntimeClient({ region: config.region || 'us-east-1', maxAttempts: 1 }));
    }
  }

  /** Counts every transport attempt, including the single allowed retry. */
  get calls(): number { return this.attempts; }

  async next(messages: ModelMessage[], signal: AbortSignal, remainingCalls = Number.POSITIVE_INFINITY): Promise<ModelResult> {
    if (remainingCalls < 1) throw new Error('The model-call budget is exhausted.');
    const combinedSignal = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
    let callsUsed = 0;
    for (let attempt = 0; attempt < 2; attempt++) {
      combinedSignal.throwIfAborted();
      this.attempts++;
      callsUsed++;
      try {
        const result = await this.request(messages, combinedSignal);
        return { ...result, callsUsed };
      } catch (error) {
        if (combinedSignal.aborted) {
          if (signal.aborted) throw new Error('Model request cancelled.');
          throw new Error('Model request exceeded the 30-second total timeout.');
        }
        if (attempt === 0 && callsUsed < remainingCalls && transient(error)) {
          await delay(350, undefined, { signal: combinedSignal });
          continue;
        }
        if (error instanceof SyntaxError || (error instanceof Error && error.message.startsWith('Model response'))) throw error;
        const code = errorCode(error);
        if (code === 'CredentialsProviderError') {
          throw new ModelConfigurationError('Bedrock AWS credentials were not found. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY or configure a supported AWS credential provider.');
        }
        // Provider messages may include account IDs or request bodies; expose only safe diagnostic fields.
        const status = statusCode(error);
        throw new Error(`Model request failed (provider=${this.config.provider}, code=${code}${status ? `, status=${status}` : ''}).`);
      }
    }
    throw new Error('Model request failed after its retry.');
  }

  private async request(messages: ModelMessage[], signal: AbortSignal): Promise<Omit<ModelResult, 'callsUsed'>> {
    if (this.openai) {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'system', content: JSON_INSTRUCTION }, ...messages],
        response_format: { type: 'json_object' },
        max_completion_tokens: 1_500,
      }, { signal });
      const message = response.choices[0]?.message;
      if (!message?.content) throw new Error('Model response contained no JSON decision.');
      return {
        decision: parseDecision(message.content),
        ...(response.usage?.prompt_tokens !== undefined ? { inputTokens: response.usage.prompt_tokens } : {}),
        ...(response.usage?.completion_tokens !== undefined ? { outputTokens: response.usage.completion_tokens } : {}),
      };
    }
    const system = [{ text: JSON_INSTRUCTION }, ...messages.filter(message => message.role === 'system').map(message => ({ text: message.content }))];
    const userText = messages.filter(message => message.role === 'user').map(message => message.content).join('\n\n');
    const bedrockMessages: BedrockMessage[] = [{ role: 'user', content: [{ text: userText || 'Choose the next action.' }] }];
    const response = await this.bedrock!.send(new ConverseCommand({
      modelId: this.config.model,
      system,
      messages: bedrockMessages,
      inferenceConfig: { maxTokens: 1_500 },
    }), { abortSignal: signal });
    const text = response.output?.message?.content?.map(block => 'text' in block ? block.text : '').join('') || '';
    if (!text) throw new Error('Model response contained no JSON decision.');
    return {
      decision: parseDecision(text),
      ...(response.usage?.inputTokens !== undefined ? { inputTokens: response.usage.inputTokens } : {}),
      ...(response.usage?.outputTokens !== undefined ? { outputTokens: response.usage.outputTokens } : {}),
    };
  }

  close(): void { this.bedrock?.destroy(); }
}
