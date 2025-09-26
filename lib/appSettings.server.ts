// lib/appSettings.server.ts
import type { PostgrestError } from '@supabase/supabase-js'

import type { Database } from './supabase/types'
import { getServiceRoleClient } from './supabase/service-role'

export const SETTINGS_KEY = 'app:default'

export type AppSettingsRow = Database['public']['Tables']['app_settings']['Row']
export type AppSettingsValue = AppSettingsRow['value']

export async function getAppSettings(): Promise<AppSettingsRow | null> {
  const client = getServiceRoleClient()

  const { data, error } = await client
    .from('app_settings')
    .select('*')
    .eq('key', SETTINGS_KEY)
    .maybeSingle()

  if (error && !isNoRowsError(error)) {
    throw error
  }

  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error('Failed to fetch app settings')
  }

  return (data as AppSettingsRow | null) ?? null
}

export async function updateAppSettings(next: AppSettingsValue): Promise<void> {
  const client = getServiceRoleClient()
  const nowIso = new Date().toISOString()

  const payload: Database['public']['Tables']['app_settings']['Insert'] = {
    key: SETTINGS_KEY,
    value: next,
    updated_at: nowIso,
  }

  const { error } = await client.from('app_settings').upsert([payload])

  if (error) {
    throw error
  }
}

function isNoRowsError(error: PostgrestError): boolean {
  return error.code === 'PGRST116'
}
