export function sanitizeExtension(raw?: string | null): string | undefined {
  if (!raw) return undefined
  const value = raw.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
  return value || undefined
}

export function inferImageExtension(file: File): string {
  const nameExt = file.name.includes('.') ? file.name.split('.').pop() ?? null : null
  const fromName = sanitizeExtension(nameExt)
  if (fromName) return fromName === 'jpeg' ? 'jpg' : fromName

  const typeExt = file.type.includes('/') ? file.type.split('/').pop() ?? null : null
  const fromType = sanitizeExtension(typeExt)
  if (fromType) return fromType === 'jpeg' ? 'jpg' : fromType

  return 'jpg'
}

export function resolveImageContentType(file: File, extension: string): string {
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
