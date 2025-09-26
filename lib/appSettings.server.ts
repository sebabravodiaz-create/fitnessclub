import 'server-only'

import { getServiceRoleClient } from '@/lib/supabase/service-role'
import { setChileTimeOverride } from '@/lib/timeSettings'

export type AppSettings = {
  timezoneOffsetMinutes: number | null
  updatedAt: string | null
}

const SETTINGS_KEY = 'general'
const DEFAULT_SETTINGS: AppSettings = {
  timezoneOffsetMinutes: -180,
  updatedAt: null,
}

let cached: AppSettings | null = null
let cachedAt = 0
const CACHE_WINDOW_MS = 30 * 1000

function normalizeSettings(row: { value?: unknown; updated_at?: string | null } | null): AppSettings {
  const base = { ...DEFAULT_SETTINGS }
  if (row?.value && typeof row.value === 'object') {
    const value = row.value as Record<string, unknown>
    if (typeof value.timezoneOffsetMinutes === 'number' && Number.isFinite(value.timezoneOffsetMinutes)) {
      base.timezoneOffsetMinutes = Math.trunc(value.timezoneOffsetMinutes)
    } else if (value.timezoneOffsetMinutes === null) {
      base.timezoneOffsetMinutes = null
    }
  }
  if (row?.updated_at) {
    base.updatedAt = row.updated_at
  }
  return base
}

async function fetchSettings(): Promise<AppSettings> {
  const supabase = getServiceRoleClient()
  const { data, error } = await supabase
    .from('app_settings')
    .select('value, updated_at')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()
  if (error) throw error
  const next = normalizeSettings(data ?? null)
  return next
}

function apply(settings: AppSettings) {
  setChileTimeOverride(settings.timezoneOffsetMinutes)
}

export async function loadAndApplyAppSettings(options?: { force?: boolean }): Promise<AppSettings> {
  const force = options?.force ?? false
  if (!force && cached && Date.now() - cachedAt < CACHE_WINDOW_MS) {
    apply(cached)
    return cached
  }
  const settings = await fetchSettings()
  cached = settings
  cachedAt = Date.now()
  apply(settings)
  return settings
}

export async function updateAppSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadAndApplyAppSettings({ force: true })
  const next: AppSettings = {
    ...current,
    ...patch,
  }
  if (typeof next.timezoneOffsetMinutes === 'number' && !Number.isFinite(next.timezoneOffsetMinutes)) {
    next.timezoneOffsetMinutes = null
  }
  if (typeof next.timezoneOffsetMinutes === 'number') {
    next.timezoneOffsetMinutes = Math.trunc(next.timezoneOffsetMinutes)
  }
  const supabase = getServiceRoleClient()
  const nowIso = new Date().toISOString()
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: SETTINGS_KEY, value: next, updated_at: nowIso })
  if (error) throw error
  cached = { ...next, updatedAt: nowIso }
  cachedAt = Date.now()
  apply(cached)
  return cached
}
