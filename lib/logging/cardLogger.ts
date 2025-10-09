import fs from 'node:fs'
import path from 'node:path'

const LOGS_DIR = path.join(process.cwd(), 'logs')
const CARD_PLACEHOLDER = '<unknown-card>'
const ENABLED = String(process.env.ENABLE_LOGS ?? '').toLowerCase() === 'true'

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

function formatTimestamp(date: Date): { date: string; timestamp: string } {
  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const hours = pad(date.getHours())
  const minutes = pad(date.getMinutes())
  const seconds = pad(date.getSeconds())

  return {
    date: `${year}-${month}-${day}`,
    timestamp: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
  }
}

async function ensureLogsDirectory() {
  if (!ENABLED) return
  await fs.promises.mkdir(LOGS_DIR, { recursive: true })
}

export type CardLogAction = 'READ' | 'VALIDATE'
export type CardLogStatus = 'OK' | 'VALIDATION_ERROR' | 'UNRECOGNIZED' | 'ERROR'

export async function logCardEvent(
  cardNumber: string | null | undefined,
  action: CardLogAction,
  status: CardLogStatus,
  details: string,
) {
  if (!ENABLED) return

  await ensureLogsDirectory()

  const now = new Date()
  const { date, timestamp } = formatTimestamp(now)
  const sanitizedCard = (cardNumber ?? '').trim() || CARD_PLACEHOLDER
  const sanitizedDetails = details.replace(/\s+/g, ' ').trim() || '-'
  const line = `[${timestamp}] ${sanitizedCard} ${action} ${status} ${sanitizedDetails}\n`

  const filePath = path.join(LOGS_DIR, `${date}.log`)
  await fs.promises.appendFile(filePath, line, 'utf8')
}

export function isLoggingEnabled() {
  return ENABLED
}
