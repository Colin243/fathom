// Per-browser conveniences only. Every access is guarded: private windows and
// blocked storage must never break the game.

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

export interface Logbook {
  dives: number
  total: number
  best: number
  leviathans: number
}

const EMPTY_LOG: Logbook = { dives: 0, total: 0, best: 0, leviathans: 0 }

export const storage = {
  muted: () => read('fathom:muted', false),
  setMuted: (v: boolean) => write('fathom:muted', v),

  seen: () => new Set(read<string[]>('fathom:seen', [])),
  markSeen(ids: string[]) {
    const all = [...new Set([...read<string[]>('fathom:seen', []), ...ids])]
    write('fathom:seen', all.slice(-400))
  },
  clearSeen: () => write('fathom:seen', []),

  logbook: () => ({ ...EMPTY_LOG, ...read<Partial<Logbook>>('fathom:log', {}) }),
  recordDive(score: number, leviathans: number) {
    const log = storage.logbook()
    const next: Logbook = {
      dives: log.dives + 1,
      total: log.total + score,
      best: Math.max(log.best, score),
      leviathans: log.leviathans + leviathans,
    }
    write('fathom:log', next)
    return next
  },
}
