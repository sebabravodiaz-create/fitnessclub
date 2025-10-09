import { beforeEach, afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { logApiAction, withApiLogging } from '../lib/logger'

type RequestContext = Record<string, unknown>

let tempDir: string

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
}

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'api-logger-'))
  process.env.LOGS_DIR = tempDir
  process.env.ENABLE_LOGS = 'true'
})

afterEach(async () => {
  delete process.env.LOGS_DIR
  delete process.env.ENABLE_LOGS
  if (tempDir) {
    await fs.rm(tempDir, { recursive: true, force: true })
  }
})

test('creates a daily log file when recording an entry', async () => {
  await logApiAction({ method: 'GET', path: '/api/example', statusCode: 200, details: 'Test entry' })
  const files = await fs.readdir(tempDir)
  assert.equal(files.length, 1)
  assert.match(files[0], /^\d{4}-\d{2}-\d{2}\.log$/)
})

test('writes entries with the expected format', async () => {
  const timestamp = new Date()
  await logApiAction({ method: 'POST', path: '/api/format', statusCode: 201, details: 'Formatted entry', timestamp })
  const filePath = path.join(tempDir, `${formatDate(timestamp)}.log`)
  const content = await fs.readFile(filePath, 'utf8')
  const line = content.trim()
  const expectedPrefix = `[${formatDate(timestamp)} ${formatTime(timestamp)}] POST /api/format 201`
  assert.ok(line.startsWith(expectedPrefix))
  assert.ok(line.endsWith('Formatted entry'))
})

test('separates log files by day', async () => {
  const dayOne = new Date()
  dayOne.setHours(10, 0, 0, 0)
  const dayTwo = new Date(dayOne.getTime() + 24 * 60 * 60 * 1000)

  await logApiAction({ method: 'GET', path: '/api/day-one', statusCode: 200, details: 'Day one', timestamp: dayOne })
  await logApiAction({ method: 'GET', path: '/api/day-two', statusCode: 200, details: 'Day two', timestamp: dayTwo })

  const files = (await fs.readdir(tempDir)).sort()
  assert.deepEqual(files, [`${formatDate(dayOne)}.log`, `${formatDate(dayTwo)}.log`].sort())
})

test('appends entries to the same file without overwriting existing logs', async () => {
  const timestamp = new Date()
  await logApiAction({ method: 'GET', path: '/api/multi', statusCode: 200, details: 'First line', timestamp })
  await logApiAction({ method: 'GET', path: '/api/multi', statusCode: 200, details: 'Second line', timestamp })

  const filePath = path.join(tempDir, `${formatDate(timestamp)}.log`)
  const content = await fs.readFile(filePath, 'utf8')
  const lines = content.trim().split('\n')
  assert.equal(lines.length, 2)
  assert.ok(lines[0].endsWith('First line'))
  assert.ok(lines[1].endsWith('Second line'))
})

test('withApiLogging logs simulated API requests', async () => {
  const handler = withApiLogging<RequestContext>(async () => new Response('ok', { status: 200 }), {
    successMessage: 'Simulated request completed',
  })

  const request = new Request('https://example.com/api/test', { method: 'GET' })
  await handler(request as any, {})

  const files = await fs.readdir(tempDir)
  assert.equal(files.length, 1)
  const content = await fs.readFile(path.join(tempDir, files[0]), 'utf8')
  assert.ok(content.includes('Simulated request completed'))
})

test('withApiLogging captures thrown errors', async () => {
  const handler = withApiLogging<RequestContext>(async () => {
    throw new Error('Boom')
  })

  const request = new Request('https://example.com/api/fail', { method: 'DELETE' })

  await assert.rejects(() => handler(request as any, {}), /Boom/)

  const files = await fs.readdir(tempDir)
  assert.equal(files.length, 1)
  const content = await fs.readFile(path.join(tempDir, files[0]), 'utf8')
  assert.ok(content.includes('Error after'))
  assert.ok(content.includes('Boom'))
  assert.ok(content.includes('DELETE /api/fail 500'))
})
