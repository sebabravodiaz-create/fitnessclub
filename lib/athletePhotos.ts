// lib/athletePhotos.ts
// Utilidades para gestionar las fotos de los deportistas en Supabase Storage
import { supabase } from './supabaseClient'

const BUCKET = 'athlete-photos'
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`

type UploadResult = { url: string; path: string }

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildPath(athleteId: string, file: File): string {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const base = sanitizeFileName(file.name.split('.').slice(0, -1).join('.') || 'foto')
  const stamp = Date.now()
  return `${athleteId}/${stamp}-${base}.${ext}`
}

function extractPathFromUrl(url?: string | null): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    const idx = parsed.pathname.indexOf(PUBLIC_PREFIX)
    if (idx === -1) return null
    const path = parsed.pathname.slice(idx + PUBLIC_PREFIX.length)
    return decodeURIComponent(path)
  } catch {
    const fallback = url.split(PUBLIC_PREFIX)[1]
    return fallback ? decodeURIComponent(fallback) : null
  }
}

export async function uploadAthletePhoto(athleteId: string, file: File): Promise<UploadResult> {
  const path = buildPath(athleteId, file)
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || undefined,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function deleteAthletePhoto(url?: string | null): Promise<void> {
  const path = extractPathFromUrl(url)
  if (!path) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}
