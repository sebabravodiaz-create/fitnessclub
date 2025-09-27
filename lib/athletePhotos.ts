import type { SupabaseClient } from '@supabase/supabase-js'
import { inferImageExtension, resolveImageContentType } from './imageHelpers'

export const ATHLETE_PHOTOS_BUCKET = 'athlete-photos'

export function buildAthletePhotoPath(athleteId: string, extension: string) {
  const safeExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg'
  const version = Date.now()
  return `${athleteId}/profile-${version}.${safeExt}`
}

export async function uploadAthletePhoto(
  client: SupabaseClient,
  athleteId: string,
  file: File,
): Promise<string> {
  const extension = inferImageExtension(file)
  const path = buildAthletePhotoPath(athleteId, extension)
  const contentType = resolveImageContentType(file, extension)

  const { error } = await client.storage.from(ATHLETE_PHOTOS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType,
  })

  if (error) {
    throw error
  }

  return path
}

export async function removeAthletePhoto(client: SupabaseClient, path?: string | null) {
  if (!path) return
  await client.storage.from(ATHLETE_PHOTOS_BUCKET).remove([path])
}

export function getAthletePhotoPublicUrl(client: SupabaseClient, path?: string | null): string {
  if (!path) return ''
  const { data } = client.storage.from(ATHLETE_PHOTOS_BUCKET).getPublicUrl(path)
  return data?.publicUrl ?? ''
}
