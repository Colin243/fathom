import type { Prompt } from './match'
import { ROUNDS } from './tiers'

const modules = import.meta.glob<Prompt[]>('../data/bank-*.json', { eager: true, import: 'default' })

export const BANK: Prompt[] = Object.values(modules)
  .flat()
  .sort((a, b) => a.id.localeCompare(b.id))

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'
const CODE_LENGTH = 5

function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randomCode(): string {
  let s = ''
  const buf = new Uint32Array(CODE_LENGTH)
  crypto.getRandomValues(buf)
  for (const n of buf) s += CODE_ALPHABET[n % CODE_ALPHABET.length]
  return s
}

export function cleanCode(raw: string | null | undefined): string | null {
  if (!raw) return null
  const code = raw.toUpperCase().replace(/[^A-Z0-9-]/g, '')
  return code.length >= 3 && code.length <= 24 ? code : null
}

// Deterministic: the same code always gives the same prompts (for a given bank),
// so friends can share a code and play the identical dive.
export function promptsForCode(code: string): Prompt[] {
  const rand = mulberry32(hash(code))
  const pool = [...BANK]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  // Keep a dive varied: at most two prompts from one category when possible.
  const picked: Prompt[] = []
  const perCategory = new Map<string, number>()
  for (const p of pool) {
    if (picked.length === ROUNDS) break
    const n = perCategory.get(p.category) ?? 0
    if (n >= 2) continue
    picked.push(p)
    perCategory.set(p.category, n + 1)
  }
  for (const p of pool) {
    if (picked.length === ROUNDS) break
    if (!picked.includes(p)) picked.push(p)
  }
  return picked
}

// Pick a fresh code whose prompts overlap least with what this player has seen.
export function freshCode(seen: Set<string>): string {
  let best = randomCode()
  let bestSeen = Infinity
  for (let i = 0; i < 40; i++) {
    const code = randomCode()
    const overlap = promptsForCode(code).filter((p) => seen.has(p.id)).length
    if (overlap < bestSeen) {
      best = code
      bestSeen = overlap
      if (overlap === 0) break
    }
  }
  return best
}

const LAUNCH = Date.UTC(2026, 9, 8)

export function todayInfo(now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth()
  const d = now.getDate()
  const number = Math.floor((Date.UTC(y, m, d) - LAUNCH) / 86400000) + 1
  const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  return { number, code: `DAY-${iso}` }
}
