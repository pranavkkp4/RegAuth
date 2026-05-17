import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gitDir = join(repoRoot, '.git');
const hooksDir = join(gitDir, 'hooks');
const hookPath = join(hooksDir, 'pre-push');

if (!existsSync(gitDir)) {
  console.error('No .git directory found. Run this from a cloned Git repository.');
  process.exit(1);
}

mkdirSync(hooksDir, { recursive: true });

writeFileSync(
  hookPath,
  [
    '#!/usr/bin/env sh',
    'set -eu',
    '',
    'echo "Running RegAuth pre-push review gate..."',
    'npm run prepush:check',
    '',
  ].join('\n'),
  { mode: 0o755 }
);

chmodSync(hookPath, 0o755);

console.log(`Installed Git pre-push hook at ${hookPath}`);
console.log('Future git push attempts will run npm run prepush:check first.');
