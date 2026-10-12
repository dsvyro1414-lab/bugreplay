import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const destination = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets', 'gsap.min.js');
const expectedHash = 'c174bfce53a729418d57a8ad8625e7247c793a22fef8e2851e3cfa3de9cd8280';
const source = 'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const existing = await readFile(destination).catch(() => undefined);
if (existing && digest(existing) === expectedHash) {
  console.log('GSAP 3.14.2 already present; SHA-256 verified.');
} else {
  const response = await fetch(source, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Official pinned GSAP download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (digest(bytes) !== expectedHash) throw new Error('GSAP content hash mismatch; refusing to install a different runtime.');
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  console.log('Installed GSAP 3.14.2 locally in demo/assets; SHA-256 verified.');
}
