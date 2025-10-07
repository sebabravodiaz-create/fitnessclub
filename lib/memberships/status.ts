// lib/memberships/status.ts
import { getServiceRoleClient } from '@/lib/supabase/service-role'

type RefreshOptions = {
  referenceDate?: Date
  timeZone?: string
}

export type RefreshMembershipStatusesResult = {
  referenceDate: string
  effectiveDate: string
  timeZone: string
  markedExpired: number
  markedActive: number
}

function getEffectiveDate(options?: RefreshOptions): { today: string; timeZone: string; reference: Date } {
  const reference = options?.referenceDate ?? new Date()
  const timeZone = options?.timeZone ?? process.env.MEMBERSHIP_STATUS_TIMEZONE ?? 'UTC'

  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone })
  const today = formatter.format(reference)

  return { today, timeZone, reference }
}

export async function refreshMembershipStatuses(options?: RefreshOptions): Promise<RefreshMembershipStatusesResult> {
  const supabase = getServiceRoleClient()

  const { today, timeZone, reference } = getEffectiveDate(options)

  const { data: expired, error: expireErr } = await supabase
    .from('memberships')
    .update({ status: 'expired' })
    .lt('end_date', today)
    .in('status', ['active', 'sold'])
    .select('id')

  if (expireErr) {
    throw expireErr
  }

  const { data: activated, error: activateErr } = await supabase
    .from('memberships')
    .update({ status: 'active' })
    .lte('start_date', today)
    .gte('end_date', today)
    .in('status', ['expired', 'sold'])
    .select('id')

  if (activateErr) {
    throw activateErr
  }

  return {
    referenceDate: reference.toISOString(),
    effectiveDate: today,
    timeZone,
    markedExpired: expired?.length ?? 0,
    markedActive: activated?.length ?? 0,
  }
}
