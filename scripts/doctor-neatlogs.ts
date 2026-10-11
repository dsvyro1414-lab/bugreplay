import '../apps/runner/src/config.js';
import { preflightNeatlogs } from '../apps/runner/src/telemetry.js';

try { console.log(JSON.stringify(await preflightNeatlogs(), null, 2)); }
catch (error) { console.error(error instanceof Error ? error.message : 'Neatlogs preflight failed'); process.exitCode = 1; }
