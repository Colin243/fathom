// Answer matching shared by the game and the bank validator. No imports, so
// Node can run it directly via scripts/validate-bank.ts.

export const TIER_ORDER = ['seafoam', 'bait', 'shoal', 'rare', 'deep', 'leviathan'] as const
export type TierId = (typeof TIER_ORDER)[number]

export interface Prompt {
  id: string
  text: string
  category: string
  // Each entry is "Canonical|alias|alias". The first form is what we display.
  tiers: Record<TierId, string[]>
}

export interface MatchResult {
  canonical: string
  tier: TierId
  exact: boolean
}

const LEADING_ARTICLE = /^(a|an|the)\s+/

export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(LEADING_ARTICLE, '')
}

// Collapse spacing and simple plurals so "ice creams" ~ "icecream".
function squash(norm: string): string {
  return norm
    .split(' ')
    .map((w) => (w.length > 3 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w))
    .map((w) => (w.length > 3 && /(ch|sh|x|ss)es$/.test(w) ? w.slice(0, -2) : w))
    .map((w) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w))
    .join('')
}

// Optimal string alignment distance, capped for speed.
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const prev2 = new Array(b.length + 1).fill(0)
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  let cur = new Array(b.length + 1).fill(0)
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i
    let rowMin = cur[0]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1)
      }
      cur[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > max) return max + 1
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j]
    ;[prev, cur] = [cur, prev]
  }
  return prev[b.length]
}

function allowedTypos(len: number): number {
  if (len >= 8) return 2
  if (len >= 5) return 1
  return 0
}

interface IndexEntry {
  key: string
  canonical: string
  tier: TierId
}

const indexCache = new WeakMap<Prompt, IndexEntry[]>()

export function buildIndex(prompt: Prompt): IndexEntry[] {
  const cached = indexCache.get(prompt)
  if (cached) return cached
  const entries: IndexEntry[] = []
  for (const tier of TIER_ORDER) {
    for (const raw of prompt.tiers[tier] ?? []) {
      const forms = raw.split('|').map((s) => s.trim()).filter(Boolean)
      const canonical = forms[0]
      for (const form of forms) {
        const key = squash(normalize(form))
        if (key) entries.push({ key, canonical, tier })
      }
    }
  }
  indexCache.set(prompt, entries)
  return entries
}

export function matchAnswer(prompt: Prompt, input: string): MatchResult | null {
  const key = squash(normalize(input))
  if (!key) return null
  const index = buildIndex(prompt)

  const exact = index.find((e) => e.key === key)
  if (exact) return { canonical: exact.canonical, tier: exact.tier, exact: true }

  const max = allowedTypos(key.length)
  if (max === 0) return null
  let best: IndexEntry | null = null
  let bestDist = max + 1
  for (const e of index) {
    if (allowedTypos(e.key.length) === 0) continue
    const d = editDistance(key, e.key, max)
    if (d < bestDist) {
      best = e
      bestDist = d
    }
  }
  return best ? { canonical: best.canonical, tier: best.tier, exact: false } : null
}

export { squash as _squash, editDistance as _editDistance }
