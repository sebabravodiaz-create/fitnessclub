export type RoleLike = string | string[] | undefined | null

type RoleSource = Record<string, unknown> | null | undefined

const ROLE_KEY_PATTERN = /role|permission|claim/i

function addRole(collected: Set<string>, role: string) {
  const normalized = role.trim().toLowerCase()
  if (normalized.length > 0) {
    collected.add(normalized)
  }
}

function deriveRoleFromKey(key: string): string {
  const normalized = key.trim().toLowerCase()
  const parts = normalized.split(/[_\-\s]+/).filter(Boolean)
  const filtered = parts.filter((part) => !ROLE_KEY_PATTERN.test(part))

  if (filtered.length > 0) {
    return filtered[filtered.length - 1]
  }

  const stripped = normalized.replace(ROLE_KEY_PATTERN, '').replace(/[_\-\s]+/g, '')
  return stripped || normalized
}

function parsePotentialJson(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch (_err) {
    return undefined
  }
}

function extractFromValue(
  collected: Set<string>,
  value: unknown,
  contextKey?: string,
) {
  if (value == null) {
    return
  }

  if (typeof value === 'string') {
    if (!contextKey || !ROLE_KEY_PATTERN.test(contextKey) || value.trim().length === 0) {
      return
    }

    const trimmed = value.trim()
    const parsed = parsePotentialJson(trimmed)

    if (parsed !== undefined) {
      extractFromValue(collected, parsed, contextKey)
      return
    }

    const byComma = trimmed
      .split(/[,;]/)
      .map((part) => part.trim())
      .filter(Boolean)

    if (byComma.length > 1) {
      byComma.forEach((role) => addRole(collected, role))
      return
    }

    const byWhitespace = trimmed
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean)

    if (byWhitespace.length > 1) {
      byWhitespace.forEach((role) => addRole(collected, role))
      return
    }

    addRole(collected, trimmed)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item) => extractFromValue(collected, item, contextKey))
    return
  }

  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
      if (typeof nested === 'boolean') {
        if (nested && (ROLE_KEY_PATTERN.test(key) || (contextKey && ROLE_KEY_PATTERN.test(contextKey)))) {
          addRole(collected, deriveRoleFromKey(key))
        }
        return
      }

      const nextContext = ROLE_KEY_PATTERN.test(key) ? key : contextKey
      extractFromValue(collected, nested, nextContext)
    })
  }
}

function collectRoles(source: RoleSource): Set<string> {
  const collected = new Set<string>()

  if (!source) {
    return collected
  }

  const record = source as Record<string, unknown>
  extractFromValue(collected, record)

  return collected
}

export function getUserRoles(
  user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null | undefined,
): Set<string> {
  const roles = new Set<string>()

  if (!user) {
    return roles
  }

  const appRoles = collectRoles(user.app_metadata)
  const userRoles = collectRoles(user.user_metadata)

  appRoles.forEach((role) => roles.add(role))
  userRoles.forEach((role) => roles.add(role))

  return roles
}

export function userHasRole(
  user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null | undefined,
  required: string | string[],
): boolean {
  const roles = getUserRoles(user)
  const requiredRoles = Array.isArray(required) ? required : [required]

  return requiredRoles
    .map((role) => role.toLowerCase())
    .some((role) => roles.has(role))
}
