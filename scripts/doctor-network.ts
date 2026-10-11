import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { dirname, resolve } from 'node:path';
import { connect } from 'node:tls';
import { fileURLToPath } from 'node:url';

const hosts = ['docs.neatlogs.com', 'ingest.neatlogs.com', 'eu.ingest.neatlogs.com'] as const;
const lookupTimeoutMs = 4_000;
const tlsTimeoutMs = 5_000;
const generatedAt = new Date().toISOString();
const outputPath = fileURLToPath(new URL(`../artifacts/tooling/neatlogs-network-diagnostic-${generatedAt.replace(/[:.]/g, '-')}.json`, import.meta.url));

type Address = { address: string; family: number };
type LookupResult = {
  status: 'resolved' | 'failed' | 'timeout';
  elapsedMs: number;
  addresses: Address[];
  code?: string;
};
type TlsResult = {
  servername: string;
  address: string;
  family: number;
  status: 'verified' | 'failed' | 'timeout';
  elapsedMs: number;
  certificateVerified: boolean;
  protocol?: string | null;
  cipher?: string;
  code?: string;
};

function safeCode(error: unknown, fallback: string): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^[A-Z0-9_]{1,100}$/.test(code) ? code : fallback;
}

const lookupSource = `
import { lookup } from 'node:dns/promises';
try {
  const addresses = await lookup(process.argv[1], { all: true });
  process.stdout.write(JSON.stringify({ addresses: addresses.slice(0, 8) }));
} catch (error) {
  const code = typeof error?.code === 'string' && /^[A-Z0-9_]{1,100}$/.test(error.code) ? error.code : 'DNS_LOOKUP_FAILED';
  process.stdout.write(JSON.stringify({ code }));
}
`;

function lookupHost(host: string): Promise<LookupResult> {
  return new Promise(resolveResult => {
    const start = performance.now();
    // Isolate the OS resolver so a stalled getaddrinfo can be killed at the deadline.
    // The child receives no environment variables and executes no shell.
    execFile(process.execPath, ['--input-type=module', '-e', lookupSource, host], {
      env: {}, timeout: lookupTimeoutMs, killSignal: 'SIGKILL', maxBuffer: 4_096, encoding: 'utf8',
    }, (error, stdout) => {
      const elapsedMs = Math.round(performance.now() - start);
      if (error) {
        const timedOut = error.killed && error.signal === 'SIGKILL' && error.code !== 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER';
        resolveResult({ status: timedOut ? 'timeout' : 'failed', elapsedMs, addresses: [], code: timedOut ? 'DNS_LOOKUP_TIMEOUT' : safeCode(error, 'DNS_PROCESS_FAILED') });
        return;
      }
      try {
        const result = JSON.parse(stdout) as { addresses?: Address[]; code?: string };
        const valid = Array.isArray(result.addresses) ? result.addresses.filter(item => typeof item.address === 'string' && isIP(item.address) === item.family && [4, 6].includes(item.family)) : [];
        const addresses = valid.filter((item, index, all) => all.findIndex(other => other.address === item.address && other.family === item.family) === index).slice(0, 8);
        resolveResult(addresses.length ? { status: 'resolved', elapsedMs, addresses } : { status: 'failed', elapsedMs, addresses: [], code: safeCode(result, 'DNS_NO_ADDRESSES') });
      } catch {
        resolveResult({ status: 'failed', elapsedMs, addresses: [], code: 'DNS_INVALID_RESULT' });
      }
    });
  });
}

function tlsHandshake(servername: string, address: Address): Promise<TlsResult> {
  return new Promise(resolveResult => {
    const start = performance.now();
    let finished = false;
    // Connect to the observed address but validate the certificate against the official hostname.
    // No HTTP request, credential, or application data is sent.
    const socket = connect({
      host: address.address,
      port: 443,
      servername,
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
      ALPNProtocols: ['http/1.1'],
    });
    const timer = setTimeout(() => finish('timeout', 'TLS_HANDSHAKE_TIMEOUT'), tlsTimeoutMs);
    function finish(status: TlsResult['status'], code?: string): void {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      const result: TlsResult = {
        servername,
        ...address,
        status,
        elapsedMs: Math.round(performance.now() - start),
        certificateVerified: status === 'verified' && socket.authorized,
        ...(status === 'verified' ? { protocol: socket.getProtocol(), cipher: socket.getCipher()?.name } : {}),
        ...(code ? { code } : {}),
      };
      socket.destroy();
      resolveResult(result);
    }
    socket.once('secureConnect', () => {
      if (socket.authorized) finish('verified');
      else finish('failed', 'TLS_CERTIFICATE_NOT_AUTHORIZED');
    });
    socket.once('error', error => finish('failed', safeCode(error, 'TLS_HANDSHAKE_FAILED')));
    socket.once('close', () => finish('failed', 'TLS_CONNECTION_CLOSED'));
  });
}

const checks = await Promise.all(hosts.map(async host => {
  const dns = await lookupHost(host);
  // Prefer both families, then another observed address, with at most two handshakes.
  const preferred = [dns.addresses.find(item => item.family === 4), dns.addresses.find(item => item.family === 6)].filter((item): item is Address => item !== undefined);
  const addresses = [...preferred, ...dns.addresses.filter(item => !preferred.includes(item))].slice(0, 2);
  const tls = await Promise.all(addresses.map(address => tlsHandshake(host, address)));
  return { host, dns, tls };
}));

const docsAddress = checks[0].dns.addresses.find(item => item.family === 4) ?? checks[0].dns.addresses[0];
const sniComparison = docsAddress ? await Promise.all(hosts.slice(1).map(host => tlsHandshake(host, docsAddress))) : [];
const allHostsVerified = checks.every(check => check.tls.some(result => result.status === 'verified'));
const report = {
  formatVersion: 'bugreplay.network-diagnostic/v1',
  generatedAt,
  scope: 'Transport only: OS DNS lookup and certificate-verified TLS handshakes. No HTTP requests or credentials.',
  dnsMethod: 'OS getaddrinfo in a bounded child Node process with an empty environment; the child is killed if resolution times out.',
  conclusion: allHostsVerified ? 'all_requested_hosts_tls_verified' : 'transport_inconclusive',
  authentication: 'not_tested',
  serviceAvailability: 'not_determined',
  runtime: { node: process.version, openssl: process.versions.openssl, tlsMinimum: 'TLSv1.2' },
  limits: { lookupTimeoutMs, tlsTimeoutMs, tlsAddressesPerHost: 2 },
  checks,
  sniComparison: {
    scope: 'Diagnostic only: use the docs DNS address with each ingest hostname as SNI and certificate identity. This does not establish endpoint availability or authentication.',
    addressSource: 'docs.neatlogs.com',
    results: sniComparison,
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
console.log(JSON.stringify({ ...report, artifactPath: resolve(outputPath) }, null, 2));
if (!allHostsVerified) process.exitCode = 1;
