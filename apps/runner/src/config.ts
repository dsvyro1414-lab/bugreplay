import { config as dotenv } from 'dotenv';
import { resolve } from 'node:path';

// The optional shared env path is explicit; no home-directory credential search.
dotenv({ path: process.env.BUGREPLAY_ENV_FILE || resolve('.env'), quiet: true });
export interface RunnerConfig {
  port: number; artifactRoot: string; allowedOrigins: string[]; controlBaseUrl: string;
  maxActions: number; maxCalls: number; maxHypotheses: number;
  investigationMs: number; verificationMs: number; totalMs: number;
}
export function loadConfig(): RunnerConfig {
  const number = (key: string, fallback: number) => {
    const value = Number(process.env[key] ?? fallback);
    if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`Invalid ${key}: expected a positive integer`);
    return value;
  };
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:4173,http://localhost:4174').split(',').map(value => {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('ALLOWED_ORIGINS must contain HTTP origins only');
    return url.origin;
  });
  const controlBaseUrl = process.env.CONTROL_BASE_URL || 'http://localhost:4174';
  if (!allowedOrigins.includes(new URL(controlBaseUrl).origin)) throw new Error('CONTROL_BASE_URL must be an allowed origin');
  return {
    port: number('RUNNER_PORT', 3001), artifactRoot: resolve(process.env.ARTIFACT_ROOT || 'artifacts'),
    allowedOrigins, controlBaseUrl, maxActions: number('MAX_ACTIONS', 40), maxCalls: number('MAX_MODEL_CALLS', 40),
    maxHypotheses: number('MAX_HYPOTHESES', 4), investigationMs: number('INVESTIGATION_MS', 360000),
    verificationMs: number('VERIFICATION_MS', 120000), totalMs: number('TOTAL_MS', 480000),
  };
}
