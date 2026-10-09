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
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '')
  return code.length >= 3 && code.length <= 120 ? code : null
}

// A list code names its prompts outright ("P.FD-03.NS-11..."), so a shared
// link keeps working even after prompts are added to the bank.
const LIST_PREFIX = 'P.'
const byId = new Map(BANK.map((p) => [p.id.toUpperCase(), p]))

function shuffle<T>(list: T[], rand: () => number): T[] {
  const out = [...list]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// Deterministic: the same code always gives the same prompts, so friends can
// share a code and play the identical dive.
export function promptsForCode(code: string): Prompt[] {
  if (code.startsWith(LIST_PREFIX)) {
    const listed = code
      .slice(LIST_PREFIX.length)
      .split('.')
      .map((id) => byId.get(id))
      .filter((p): p is Prompt => !!p)
    if (listed.length === ROUNDS) return listed
    return pickVaried([...listed, ...shuffle(BANK, mulberry32(hash(code))).filter((p) => !listed.includes(p))])
  }
  return pickVaried(shuffle(BANK, mulberry32(hash(code))))
}

// Keep a dive varied: at most two prompts from one category when possible.
function pickVaried(pool: Prompt[]): Prompt[] {
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

function cryptoRand(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 4294967296
}

// A fresh dive drawn only from prompts this player hasn't seen. Returns
// exhausted=true when fewer than a full dive remain, so the caller can reset.
export function freshDive(seen: Set<string>): { code: string; exhausted: boolean } {
  const unseen = BANK.filter((p) => !seen.has(p.id))
  const exhausted = unseen.length < ROUNDS
  const pool = exhausted ? BANK : unseen
  const picked = pickVaried(shuffle(pool, cryptoRand))
  return { code: LIST_PREFIX + picked.map((p) => p.id.toUpperCase()).join('.'), exhausted }
}

// Short, readable tag for any code (list codes are long).
export function displayCode(code: string): string {
  if (code.startsWith('DAY-')) return `daily ${code.slice(4)}`
  if (!code.startsWith(LIST_PREFIX)) return code
  let h = hash(code)
  let s = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    s += CODE_ALPHABET[h % CODE_ALPHABET.length]
    h = Math.floor(h / CODE_ALPHABET.length)
  }
  return s
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
