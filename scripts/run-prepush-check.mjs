import { existsSync } from 'node:fs';
import { platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = join(repoRoot, 'scripts', 'prepush-check.sh');

const windowsCandidates = [
  process.env.BASH_PATH,
  'C:\\Program Files\\Git\\bin\\bash.exe',
  'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
  'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
].filter(Boolean);

function canRun(command) {
  const result = spawnSync(command, ['--version'], {
    stdio: 'ignore',
    shell: false,
  });

  return result.status === 0;
}

function findBash() {
  if (canRun('bash')) {
    return 'bash';
  }

  if (platform() === 'win32') {
    return windowsCandidates.find((candidate) => existsSync(candidate));
  }

  return null;
}

const bash = findBash();

if (!bash) {
  console.error('Unable to find bash.');
  console.error('Install Git for Windows, add bash to PATH, or set BASH_PATH.');
  process.exit(1);
}

const result = spawnSync(bash, [scriptPath], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
