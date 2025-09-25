#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

let hasNextConfig = true;
try {
  require.resolve('eslint-config-next');
} catch (error) {
  hasNextConfig = false;
}

if (!hasNextConfig) {
  console.warn('eslint-config-next no disponible, omitiendo `next lint`.');
  process.exit(0);
}

const extraArgs = process.argv.slice(2);

const result = spawnSync('npx', ['next', 'lint', ...extraArgs], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
