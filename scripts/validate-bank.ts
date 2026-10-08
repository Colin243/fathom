// Usage: node scripts/validate-bank.ts [file.json ...]
// With no args, validates every src/data/bank-*.json.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TIER_ORDER, normalize, _squash as squash, _editDistance as editDistance } from '../src/lib/match.ts'

const MIN_PER_TIER: Record<string, number> = { seafoam: 3, bait: 2, shoal: 6, rare: 8, deep: 8, leviathan: 5 }
const MIN_TOTAL = 45

const dataDir = fileURLToPath(new URL('../src/data/', import.meta.url))
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync(dataDir).filter((f) => /^bank-.*\.json$/.test(f)).map((f) => join(dataDir, f))

let errors = 0
let warnings = 0
const seenIds = new Map<string, string>()
let promptCount = 0
let answerCount = 0

for (const file of files) {
  let data: unknown
  try {
    data = JSON.parse(readFileSync(file, 'utf8'))
  } catch (e) {
    console.error(`ERROR ${file}: invalid JSON: ${(e as Error).message}`)
    errors++
    continue
  }
  if (!Array.isArray(data)) {
    console.error(`ERROR ${file}: top level must be an array`)
    errors++
    continue
  }
  for (const p of data as any[]) {
    const where = `${file.split('/').pop()}:${p?.id ?? '?'}`
    if (typeof p.id !== 'string' || typeof p.text !== 'string' || typeof p.category !== 'string' || !p.tiers) {
      console.error(`ERROR ${where}: needs string id, text, category and a tiers object`)
      errors++
      continue
    }
    if (seenIds.has(p.id)) {
      console.error(`ERROR ${where}: duplicate id (also in ${seenIds.get(p.id)})`)
      errors++
    }
    seenIds.set(p.id, file)
    promptCount++

    const keys = new Map<string, string>()
    let total = 0
    for (const tier of TIER_ORDER) {
      const list = p.tiers[tier]
      if (!Array.isArray(list)) {
        console.error(`ERROR ${where}: missing tier "${tier}"`)
        errors++
        continue
      }
      if (list.length < MIN_PER_TIER[tier]) {
        console.error(`ERROR ${where}: tier "${tier}" has ${list.length}, needs at least ${MIN_PER_TIER[tier]}`)
        errors++
      }
      total += list.length
      for (const raw of list) {
        if (typeof raw !== 'string' || !raw.trim()) {
          console.error(`ERROR ${where}: non-string or empty answer in ${tier}`)
          errors++
          continue
        }
        for (const form of raw.split('|')) {
          const key = squash(normalize(form))
          if (!key) continue
          const prev = keys.get(key)
          if (prev && prev !== `${tier}:${raw}`) {
            console.error(`ERROR ${where}: "${form}" (${tier}) collides with ${prev}`)
            errors++
          }
          keys.set(key, `${tier}:${raw}`)
        }
      }
    }
    for (const extra of Object.keys(p.tiers)) {
      if (!(TIER_ORDER as readonly string[]).includes(extra)) {
        console.error(`ERROR ${where}: unknown tier "${extra}"`)
        errors++
      }
    }
    if (total < MIN_TOTAL) {
      console.error(`ERROR ${where}: only ${total} answers, needs at least ${MIN_TOTAL}`)
      errors++
    }
    answerCount += total

    // Near-duplicates in different entries make fuzzy matching ambiguous.
    const entries = [...keys.entries()]
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [ka, va] = entries[i]
        const [kb, vb] = entries[j]
        if (va === vb || ka.length < 5 || kb.length < 5) continue
        if (editDistance(ka, kb, 1) <= 1 && va.split(':')[0] !== vb.split(':')[0]) {
          console.warn(`warn  ${where}: "${ka}" and "${kb}" are one typo apart in different tiers (${va} / ${vb})`)
          warnings++
        }
      }
    }
  }
}

console.log(`\n${files.length} file(s), ${promptCount} prompts, ${answerCount} answers, ${errors} error(s), ${warnings} warning(s)`)
process.exit(errors ? 1 : 0)
