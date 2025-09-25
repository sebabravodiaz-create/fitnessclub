export type RoleLike = string | string[] | undefined | null

function collectRoles(source: Record<string, unknown> | null | undefined): Set<string> {
  const collected = new Set<string>()

  if (!source) {
    return collected
  }

  const rawRole = source as { role?: RoleLike; roles?: RoleLike; permissions?: RoleLike }

  const pushValue = (value: RoleLike) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      collected.add(value.trim().toLowerCase())
    }
    if (Array.isArray(value)) {
      value
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .forEach((item) => collected.add(item.trim().toLowerCase()))
    }
  }

  pushValue(rawRole.role)
  pushValue(rawRole.roles)
  pushValue(rawRole.permissions)

  return collected
}

export function getUserRoles(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null | undefined): Set<string> {
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
