import '../apps/runner/src/config.js';
import { resolve } from 'node:path';
import { loadConfig } from '../apps/runner/src/config.js';
import { verifyReproduction } from '../apps/runner/src/verifier.js';

const args = process.argv.slice(2), get = (name: string) => args[args.indexOf(name) + 1];
const id = get('--run'), baseUrl = get('--base-url');
if (!args.includes('--run') || !/^[\da-f-]{36}$/.test(id || '') || !args.includes('--base-url') || !baseUrl) throw new Error('Usage: npm run repro -- --run <id> --base-url http://localhost:4173');
const config = loadConfig();
if (!config.allowedOrigins.includes(new URL(baseUrl).origin)) throw new Error('Replay origin must be configured in ALLOWED_ORIGINS');
const result = await verifyReproduction({ dir: resolve(config.artifactRoot, id), baseUrl, attempts: 1, timeoutMs: config.verificationMs });
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.attempts[0]?.classification === 'passed' ? 0 : result.attempts[0]?.classification === 'matched_failure' ? 1 : 2;
