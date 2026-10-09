// Usage: node scripts/dump-bank.ts bank-1.json
// Compact view: one line per tier with canonical answer names.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { TIER_ORDER, type Prompt } from '../src/lib/match.ts'

const file = fileURLToPath(new URL(`../src/data/${process.argv[2]}`, import.meta.url))
for (const p of JSON.parse(readFileSync(file, 'utf8')) as Prompt[]) {
  console.log(`\n${p.id} · ${p.text}`)
  for (const t of TIER_ORDER) console.log(`  ${t}: ${p.tiers[t].map((e) => e.split('|')[0]).join(', ')}`)
}
