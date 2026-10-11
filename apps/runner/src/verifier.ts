import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { CartItem, VerificationAttempt, VerificationResult } from '@bugreplay/contracts';
import { ASSERTION_MARKER } from './compiler.js';

export interface VerifyOptions {
  /** Directory containing the exact saved repro.spec.ts. */
  dir: string;
  /** Separate evidence destination; never changes or copies the saved test. */
  outputDir?: string;
  baseUrl: string;
  attempts?: number;
  /** Total wall-clock limit across all independent processes. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

const require = createRequire(import.meta.url);
const playwrightCli = require.resolve('@playwright/test/cli');

function isolatedEnvironment(extra: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const name of ['PATH', 'HOME', 'TMPDIR', 'TMP', 'TEMP', 'SystemRoot', 'USERPROFILE', 'XDG_CACHE_HOME', 'PLAYWRIGHT_BROWSERS_PATH']) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  return { ...env, CI: '1', FORCE_COLOR: '0', ...extra };
}

async function execute(config: string, env: NodeJS.ProcessEnv, timeoutMs: number, signal?: AbortSignal): Promise<{ exitCode: number | null; stdout: string; stderr: string; interrupted?: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [playwrightCli, 'test', '--config', config, '--workers=1', '--retries=0'], {
      cwd: path.dirname(config), env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32',
    });
    let stdout = '';
    let stderr = '';
    let interrupted: string | undefined;
    let killTimer: NodeJS.Timeout | undefined;
    const stop = (reason: string) => {
      if (interrupted) return;
      interrupted = reason;
      const kill = (kind: NodeJS.Signals) => {
        try {
          if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, kind);
          else child.kill(kind);
        } catch { /* The process may already have closed. */ }
      };
      kill('SIGTERM');
      killTimer = setTimeout(() => kill('SIGKILL'), 1000);
      killTimer.unref();
    };
    const onAbort = () => stop('cancelled');
    const timer = setTimeout(() => stop('verification_timeout'), Math.max(1, timeoutMs));
    signal?.addEventListener('abort', onAbort, { once: true });
    if (signal?.aborted) stop('cancelled');
    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
    child.on('error', (error) => { stderr += error.message; interrupted ??= 'process_error'; });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      if (killTimer) clearTimeout(killTimer);
      signal?.removeEventListener('abort', onAbort);
      resolve({ exitCode, stdout, stderr, interrupted });
    });
  });
}

async function readJson(file: string): Promise<any | undefined> {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return undefined; }
}

function testsFrom(report: any): any[] {
  const tests: any[] = [];
  function walk(suite: any) {
    for (const spec of suite.specs ?? []) tests.push(...(spec.tests ?? []));
    for (const child of suite.suites ?? []) walk(child);
  }
  for (const suite of report?.suites ?? []) walk(suite);
  return tests;
}

function validCart(value: unknown): value is CartItem[] {
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item.productId !== 'string' || !item.productId || ids.has(item.productId) || !Number.isSafeInteger(item.quantity) || item.quantity < 1) return false;
    ids.add(item.productId);
  }
  return true;
}

function classify(report: any, evidence: any, nonce: string, exitCode: number | null, interrupted?: string): Pick<VerificationAttempt, 'classification' | 'errorType' | 'error'> {
  if (interrupted) return { classification: 'inconclusive', errorType: interrupted, error: 'Independent Playwright process did not complete' };
  const tests = testsFrom(report);
  if (!report || (report.errors?.length ?? 0) !== 0 || tests.length !== 1 || tests[0].results?.length !== 1 || evidence?.nonce !== nonce || evidence?.contextClosed !== true) {
    return { classification: 'inconclusive', errorType: 'incomplete_verification', error: 'Missing clean completed execution, reporter result, or matching stage evidence' };
  }
  const result = tests[0].results[0];
  const errors = result.errors ?? (result.error ? [result.error] : []);
  const validOracle = evidence.assertionReached === true && validCart(evidence.initialCart) && evidence.initialCart.length > 0 && validCart(evidence.actualCart) &&
    evidence.initialState?.busy === false && evidence.actualState?.busy === false && evidence.actualState?.saved === true &&
    evidence.actualState.saveSeq > evidence.initialState.saveSeq && evidence.actualState.address !== evidence.initialState.address &&
    evidence.beforeSaveState?.busy === false && evidence.actualState.saveSeq > evidence.beforeSaveState.saveSeq &&
    evidence.actualState.address !== evidence.beforeSaveState.address;
  if (exitCode === 0 && tests[0].status === 'expected' && result.status === 'passed' && errors.length === 0 && evidence.stage === 'passed' && validOracle &&
      JSON.stringify(evidence.initialCart) === JSON.stringify(evidence.actualCart)) {
    return { classification: 'passed' };
  }
  if (exitCode === 1 && tests[0].status === 'unexpected' && result.status === 'failed' && errors.length === 1 &&
      typeof errors[0].message === 'string' && errors[0].message.includes(ASSERTION_MARKER) && validOracle &&
      evidence.stage === 'cart_assertion_failed' && evidence.errorType === 'cart_assertion_failed' &&
      JSON.stringify(evidence.initialCart) !== JSON.stringify(evidence.actualCart) && !evidence.cleanupError) {
    return { classification: 'matched_failure', errorType: ASSERTION_MARKER, error: errors[0].message };
  }
  return { classification: 'inconclusive', errorType: evidence.errorType ?? result.status ?? 'automation_or_setup_error', error: evidence.error ?? errors[0]?.message ?? 'The intended regression assertion did not produce a matching result' };
}

async function publishFile(source: unknown, attemptDir: string, destination: string): Promise<boolean> {
  if (typeof source !== 'string') return false;
  const resolved = path.resolve(source);
  if (!resolved.startsWith(path.resolve(attemptDir) + path.sep)) return false;
  try { await copyFile(resolved, destination); return true; } catch { return false; }
}

/** Replays the saved file using standard Playwright, with no model client or credentials. */
export async function verifyReproduction(options: VerifyOptions): Promise<VerificationResult> {
  const attempts = options.attempts ?? 2;
  if (!Number.isSafeInteger(attempts) || attempts < 1 || attempts > 10) throw new Error('Verification attempts must be between 1 and 10');
  const url = new URL(options.baseUrl);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Verification requires a credential-free HTTP target');
  const sourceDir = path.resolve(options.dir);
  const dir = path.resolve(options.outputDir ?? options.dir);
  await readFile(path.join(sourceDir, 'repro.spec.ts'), 'utf8');
  await mkdir(dir, { recursive: true });
  const timeoutMs = options.timeoutMs ?? 120000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Verification timeout must be positive');
  const deadline = Date.now() + timeoutMs;
  const outcomes: VerificationAttempt[] = [];
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 1000 || options.signal?.aborted) {
      outcomes.push({ attempt, classification: 'inconclusive', stage: 'not_started', errorType: options.signal?.aborted ? 'cancelled' : 'verification_timeout', exitCode: null });
      break;
    }
    const nonce = randomUUID();
    const attemptDir = path.join(dir, `verification-attempt-${attempt}-${nonce.slice(0, 8)}`);
    await mkdir(attemptDir, { recursive: true });
    const evidencePath = path.join(attemptDir, 'evidence.json');
    const reportPath = path.join(attemptDir, 'results.json');
    const configPath = path.join(attemptDir, 'playwright.config.mjs');
    const processBudget = Math.floor(remaining / (attempts - attempt + 1));
    const testTimeout = Math.max(1, processBudget - 1500);
    await writeFile(configPath, `export default ${JSON.stringify({
      testDir: sourceDir, testMatch: 'repro.spec.ts', outputDir: path.join(attemptDir, 'test-results'),
      workers: 1, retries: 0, fullyParallel: false, forbidOnly: true, timeout: testTimeout,
      globalTimeout: Math.max(1, processBudget - 500), reporter: [['json', { outputFile: reportPath }]],
      use: { browserName: 'chromium', headless: true },
    }, null, 2)};\n`);
    const execution = await execute(configPath, isolatedEnvironment({
      BASE_URL: url.href, BUGREPLAY_EVIDENCE_PATH: evidencePath, BUGREPLAY_ATTEMPT_NONCE: nonce,
      BUGREPLAY_TEST_TIMEOUT_MS: String(testTimeout),
    }), processBudget, options.signal);
    await writeFile(path.join(dir, `verification-${attempt}-stdout.txt`), execution.stdout);
    await writeFile(path.join(dir, `verification-${attempt}-stderr.txt`), execution.stderr);
    const [report, evidence] = await Promise.all([readJson(reportPath), readJson(evidencePath)]);
    const classification = classify(report, evidence, nonce, execution.exitCode, execution.interrupted);
    const outcome: VerificationAttempt = {
      attempt, ...classification, stage: evidence?.stage ?? 'process_start', exitCode: execution.exitCode,
      ...(validCart(evidence?.initialCart) ? { initialCart: evidence.initialCart } : {}),
      ...(validCart(evidence?.actualCart) ? { actualCart: evidence.actualCart } : {}),
      ...(evidence ? { evidence } : {}),
    };
    if (evidence?.contextClosed === true && await publishFile(evidence.videoPath, attemptDir, path.join(dir, `verification-${attempt}.webm`))) {
      outcome.videoName = `verification-${attempt}.webm`;
    }
    for (const [field, suffix] of [['beforeScreenshot', 'before'], ['afterScreenshot', 'after']] as const) {
      await publishFile(evidence?.[field], attemptDir, path.join(dir, `verification-${attempt}-${suffix}.png`));
    }
    outcomes.push(outcome);
    await writeFile(path.join(dir, `verification-${attempt}.json`), JSON.stringify(outcome, null, 2) + '\n');
  }
  const matchedFailures = outcomes.filter((outcome) => outcome.classification === 'matched_failure').length;
  const allCompleted = outcomes.length === attempts;
  const verdict = allCompleted && attempts >= 2 && matchedFailures === attempts ? 'confirmed' :
    allCompleted && outcomes.every((outcome) => outcome.classification === 'passed') ? 'not_matched' : 'inconclusive';
  const result: VerificationResult = { attempts: outcomes, matchedFailures, verdict };
  await writeFile(path.join(dir, 'verification.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}
