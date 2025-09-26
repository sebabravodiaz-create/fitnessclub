const GLOBAL_KEY = Symbol.for('fitnessclub.chileTimeConfig')

type ChileTimeStore = {
  offsetMinutes: number | null
}

function getStore(): ChileTimeStore {
  const globalAny = globalThis as Record<PropertyKey, unknown>
  if (!globalAny[GLOBAL_KEY]) {
    globalAny[GLOBAL_KEY] = { offsetMinutes: null } satisfies ChileTimeStore
  }
  return globalAny[GLOBAL_KEY] as ChileTimeStore
}

export function getChileTimeOverride(): number | null {
  if (typeof window !== 'undefined') {
    const win = window as Record<string, unknown>
    if ('__CHILE_TIME_OFFSET__' in win) {
      const raw = win.__CHILE_TIME_OFFSET__
      if (typeof raw === 'number' && Number.isFinite(raw)) {
        const rounded = Math.trunc(raw)
        setChileTimeOverride(rounded)
      } else if (raw === null) {
        setChileTimeOverride(null)
      }
    }
  }
  return getStore().offsetMinutes
}

export function setChileTimeOverride(offsetMinutes: number | null) {
  const store = getStore()
  if (typeof offsetMinutes === 'number' && Number.isFinite(offsetMinutes)) {
    store.offsetMinutes = Math.trunc(offsetMinutes)
  } else {
    store.offsetMinutes = null
  }
  if (typeof window !== 'undefined') {
    ;(window as Record<string, unknown>).__CHILE_TIME_OFFSET__ = store.offsetMinutes
  }
}
