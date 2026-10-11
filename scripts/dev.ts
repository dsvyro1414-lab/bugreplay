import { existsSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';

const children: ChildProcess[] = [];
for (const [name, args] of [
  ['runner', ['run', 'dev:runner']],
  ['web', ['run', 'dev', '--workspace', '@bugreplay/web']],
  ['demo-shop', ['run', 'dev', '--workspace', '@bugreplay/demo-shop']],
] as const) {
  if (name !== 'runner' && !existsSync(`apps/${name}/package.json`)) {
    console.error(`Agent B workspace apps/${name} is not integrated yet. Integrate agent-b-product before the complete demo.`);
    continue;
  }
  const child = spawn('npm', [...args], { stdio: 'inherit', env: process.env });
  children.push(child);
  child.on('exit', code => { if (code && !stopping) { console.error(`${name} exited with ${code}`); stop(code); } });
}
let stopping = false;
function stop(code = 0) { stopping = true; for (const child of children) child.kill('SIGTERM'); process.exitCode = code; }
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
