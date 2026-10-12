import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map((arg, index, all) => arg.startsWith('--') ? [arg.slice(2), all[index + 1]] : []).filter(entry => entry.length));
for (const key of ['eval-dir', 'ui', 'shop']) {
  if (!args[key] || args[key].startsWith('--')) throw new Error(`Provide --${key} with a reviewed local file or directory.`);
}
const here = path.dirname(fileURLToPath(import.meta.url));
const destination = path.join(here, 'assets');
const source = path.join(path.resolve(args['eval-dir']), 'combined-conditions');
const summary = JSON.parse(await readFile(path.join(source, 'summary.json'), 'utf8'));
const spec = await readFile(path.join(source, 'repro.spec.ts'));
const specSha256 = createHash('sha256').update(spec).digest('hex');
if (summary.modelUsed !== false || summary.buggy?.matchedFailures !== 2 || summary.buggy?.attempts !== 2
  || summary.control?.verdict !== 'not_matched' || summary.control?.attempts !== 1
  || summary.control?.exactSameSavedFile !== true || summary.specSha256 !== specSha256) {
  throw new Error('This preview requires the verified scripted 2/2 buggy and 1/1 unchanged control evidence. Review a different result before changing its claims.');
}
const buggy = JSON.parse(await readFile(path.join(source, 'buggy-replay', 'verification.json'), 'utf8'));
const control = JSON.parse(await readFile(path.join(source, 'control-replay', 'verification.json'), 'utf8'));
if (buggy.attempts.length !== 2 || buggy.attempts.some(attempt => attempt.classification !== 'matched_failure')
  || control.attempts.length !== 1 || control.attempts[0].classification !== 'passed') throw new Error('Actual verification attempts do not support the summary.');
await mkdir(destination, { recursive: true });
for (const [input, output] of [
  [args.ui, 'ui.png'], [args.shop, 'shop.png'],
  [path.join(source, 'buggy-replay', 'verification-1.webm'), 'buggy-replay.webm'],
  [path.join(source, 'buggy-replay', 'verification-1-before.png'), 'before.png'],
  [path.join(source, 'buggy-replay', 'verification-1-after.png'), 'after.png'],
  [path.join(source, 'control-replay', 'verification-1-after.png'), 'control.png'],
]) await copyFile(input, path.join(destination, output));
await writeFile(path.join(destination, 'provenance.json'), JSON.stringify({
  kind: 'scripted-engineering-preview', modelUsed: false,
  evaluationDirectory: path.basename(path.resolve(args['eval-dir'])), specSha256,
  buggy: summary.buggy, control: summary.control,
  media: 'Original local screenshots and original closed-context verification recording. No fake browser activity.',
}, null, 2) + '\n');
console.log(`Staged reviewed media in demo/assets. Saved-test SHA-256: ${specSha256}`);
