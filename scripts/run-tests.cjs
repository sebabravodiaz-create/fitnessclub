#!/usr/bin/env node
const { spawnSync } = require('node:child_process')
const { rmSync, existsSync } = require('node:fs')
const path = require('node:path')

const rootDir = path.join(__dirname, '..')
const distDir = path.join(rootDir, '.test-dist')

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true })
}

const isWindows = process.platform === 'win32'
const tscBin = path.join(rootDir, 'node_modules', '.bin', isWindows ? 'tsc.cmd' : 'tsc')

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

run(tscBin, ['--project', 'tsconfig.test.json'])
run(process.execPath, ['--test', '.test-dist/tests/**/*.test.js'])
