import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const child = spawn(process.execPath, [
  fileURLToPath(new URL('node_modules/wrangler/bin/wrangler.js', root)),
  'dev', '--config', 'dist/server/wrangler.json',
  '--env-file', fileURLToPath(new URL('00.secret/.dev.vars', root)),
  ...process.argv.slice(2),
], { cwd: fileURLToPath(root), stdio: 'inherit' });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
