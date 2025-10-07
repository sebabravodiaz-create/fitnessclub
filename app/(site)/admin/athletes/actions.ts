'use server'

import { refreshMembershipStatuses } from '@/lib/memberships/status'
import { getSupabaseServer } from '@/lib/supabaseServer'
import { MissingServiceRoleConfigError } from '@/lib/supabase/service-role'
import type { RefreshMembershipStatusesResult } from '@/lib/memberships/status'

export type ManualRefreshResponse =
  | { ok: true; result: RefreshMembershipStatusesResult }
  | { ok: false; error: string }

export async function runMembershipStatusRefresh(): Promise<ManualRefreshResponse> {
  try {
    const supabase = getSupabaseServer()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return { ok: false, error: 'Debes iniciar sesión para actualizar el estado de las membresías.' }
    }

    const result = await refreshMembershipStatuses()
    return { ok: true, result }
  } catch (error: unknown) {
    if (error instanceof MissingServiceRoleConfigError) {
      return {
        ok: false,
        error:
          'Faltan las llaves service-role de Supabase. Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.',
      }
    }

    const message = error instanceof Error ? error.message : 'No fue posible completar la actualización.'
    return { ok: false, error: message }
  }
}
