// Usage: node scripts/apply-moves.ts moves.json [--dry]
// moves.json: [{ "id": "fd-01", "answer": "Brie", "to": "shoal" }, ...]
// "answer" matches an entry's canonical name (the part before the first "|"),
// case-insensitively. Moves an entry, with its aliases, to another tier of the
// same prompt. Never adds or removes answers.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { TIER_ORDER, type Prompt, type TierId } from '../src/lib/match.ts'

const [movesPath, flag] = process.argv.slice(2)
const dry = flag === '--dry'
const moves: { id: string; answer: string; to: TierId }[] = JSON.parse(readFileSync(movesPath, 'utf8'))

const dataDir = fileURLToPath(new URL('../src/data/', import.meta.url))
const files = readdirSync(dataDir).filter((f) => /^bank-.*\.json$/.test(f))
const banks = new Map<string, Prompt[]>()
const byId = new Map<string, { file: string; prompt: Prompt }>()
for (const f of files) {
  const data: Prompt[] = JSON.parse(readFileSync(join(dataDir, f), 'utf8'))
  banks.set(f, data)
  for (const p of data) byId.set(p.id, { file: f, prompt: p })
}

const touched = new Set<string>()
let applied = 0
let skipped = 0
for (const m of moves) {
  const hit = byId.get(m.id)
  if (!hit || !TIER_ORDER.includes(m.to)) {
    console.warn(`skip: bad id or tier ${JSON.stringify(m)}`)
    skipped++
    continue
  }
  const want = m.answer.trim().toLowerCase()
  let found = false
  for (const tier of TIER_ORDER) {
    const list = hit.prompt.tiers[tier]
    const i = list.findIndex((e) => e.split('|')[0].trim().toLowerCase() === want)
    if (i === -1) continue
    found = true
    if (tier !== m.to) {
      const [entry] = list.splice(i, 1)
      hit.prompt.tiers[m.to].push(entry)
      touched.add(hit.file)
      applied++
    }
    break
  }
  if (!found) {
    console.warn(`skip: "${m.answer}" not found in ${m.id}`)
    skipped++
  }
}

if (!dry) for (const f of touched) writeFileSync(join(dataDir, f), JSON.stringify(banks.get(f), null, 1) + '\n')
console.log(`${applied} moved, ${skipped} skipped${dry ? ' (dry run)' : ''}, files: ${[...touched].join(', ') || 'none'}`)
