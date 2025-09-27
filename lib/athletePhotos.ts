export const ATHLETE_PHOTO_BUCKET = 'athlete-photos'
export const ATHLETE_PHOTO_FOLDER = 'athletes'

const VALID_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const
export type AthletePhotoExtension = (typeof VALID_EXTENSIONS)[number]

type NullableString = string | null | undefined

export function sanitizePhotoExtension(raw: NullableString): AthletePhotoExtension | null {
  if (!raw) return null
  const cleaned = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!cleaned) return null
  const normalized = cleaned === 'jpeg' ? 'jpg' : cleaned
  return (VALID_EXTENSIONS as readonly string[]).includes(normalized)
    ? (normalized as AthletePhotoExtension)
    : null
}

export function inferPhotoExtension(file: File): AthletePhotoExtension {
  const namePart = file.name?.includes('.') ? file.name.split('.').pop() : null
  const fromName = sanitizePhotoExtension(namePart)
  if (fromName) return fromName

  const typePart = file.type?.includes('/') ? file.type.split('/').pop() : null
  const fromType = sanitizePhotoExtension(typePart)
  if (fromType) return fromType

  return 'jpg'
}

export function resolvePhotoContentType(file: File, extension: AthletePhotoExtension) {
  if (file.type) return file.type

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    case 'gif':
      return 'image/gif'
    default:
      return 'application/octet-stream'
  }
}

export function buildAthletePhotoPath(athleteId: string, extension: AthletePhotoExtension) {
  const safeExt = sanitizePhotoExtension(extension) ?? 'jpg'
  const timestamp = Date.now()
  return `${ATHLETE_PHOTO_FOLDER}/${athleteId}/${timestamp}.${safeExt}`
}

export function buildAthletePhotoPublicUrl(path?: NullableString) {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  const normalizedBase = base.replace(/\/+$/, '')
  return `${normalizedBase}/storage/v1/object/public/${ATHLETE_PHOTO_BUCKET}/${path}`
}
