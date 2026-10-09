import { useMemo, useState, type CSSProperties } from 'react'
import { TIER_ORDER, type Prompt, type TierId } from '../lib/match'
import { displayCode } from '../lib/bank'
import { storage } from '../lib/storage'
import { BANDS, MAX_DEPTH, METRES_PER_POINT, MISS, ROUNDS, TIERS, bandFor } from '../lib/tiers'
import { TierIcon } from './Sprite'

export interface Round {
  prompt: Prompt
  answer: string | null
  tier: TierId | null
  points: number
}

interface Props {
  rounds: Round[]
  code: string
  dailyNumber: number | null
  onAgain: () => void
  onToday: () => void
}

function display(entry: string) {
  return entry.split('|')[0]
}

function sample<T>(list: T[], n: number, seed: string): T[] {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) | 0
  const copy = [...list]
  const out: T[] = []
  while (copy.length && out.length < n) {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    out.push(copy.splice(h % copy.length, 1)[0])
  }
  return out
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

function DiveLog({ rounds }: { rounds: Round[] }) {
  const W = 640
  const H = 250
  const top = 26
  const bottom = 220
  const left = 44
  const step = (W - left - 24) / (ROUNDS - 1)
  const y = (pts: number) => top + (pts / 100) * (bottom - top)
  return (
    <svg className="divelog" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Points per prompt, drawn as depth">
      {[0, 25, 50, 75, 100].map((p) => (
        <g key={p}>
          <line x1={left} x2={W - 12} y1={y(p)} y2={y(p)} className={p === 0 ? 'surface-line' : 'grid'} />
          <text x={left - 8} y={y(p) + 4} textAnchor="end">
            {p === 0 ? '0' : `-${p}`}
          </text>
        </g>
      ))}
      {rounds.map((r, i) => {
        const x = left + 12 + i * step * 0.97
        const c = r.tier ? TIERS[r.tier].color : '#5b6577'
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={y(0)} y2={y(r.points)} stroke={c} strokeWidth={2} strokeDasharray={r.tier ? undefined : '3 4'} />
            <circle cx={x} cy={y(r.points)} r={r.tier ? 6 : 4} fill={c} className="dot" />
            <text x={x} y={H - 6} textAnchor="middle">
              {i + 1}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function Results({ rounds, code, dailyNumber, onAgain, onToday }: Props) {
  const score = rounds.reduce((s, r) => s + r.points, 0)
  const band = bandFor(score)
  const log = useMemo(() => storage.logbook(), [])
  const [open, setOpen] = useState<number | null>(null)
  const [copied, setCopied] = useState<'result' | 'link' | null>(null)

  const link = `${location.origin}${location.pathname}?dive=${encodeURIComponent(code)}`
  const label = dailyNumber ? `daily #${dailyNumber}` : `dive ${displayCode(code)}`
  const shareText = [
    `FATHOM · ${label}`,
    `${rounds.map((r) => (r.tier ? TIERS[r.tier].emoji : MISS.emoji)).join('')}  ${score} pts · -${(score * METRES_PER_POINT).toLocaleString()}m`,
    `dive the same prompts: ${link}`,
  ].join('\n')

  const flash = (kind: 'result' | 'link') => {
    setCopied(kind)
    setTimeout(() => setCopied((c) => (c === kind ? null : c)), 1800)
  }

  const deeper = useMemo(
    () =>
      rounds.map((r) => {
        const from = r.tier ? TIER_ORDER.indexOf(r.tier) + 1 : 2
        return TIER_ORDER.slice(Math.max(from, 2)).map((t) => ({
          tier: t,
          answers: sample(r.prompt.tiers[t], 3, r.prompt.id + t).map(display),
        }))
      }),
    [rounds],
  )

  return (
    <main className="results">
      <div className="results-inner">
        <div className="results-head">
          <span className="mini-logo">FATHOM</span>
          <span className="meta">{label} complete</span>
        </div>

        <div className="big-score">
          <span className="num">{score}</span>
          <span className="m">-{(score * METRES_PER_POINT).toLocaleString()}m</span>
          <span className="of">/ {(MAX_DEPTH / METRES_PER_POINT).toLocaleString()}</span>
        </div>
        <div className="band" style={{ '--c': TIERS[band.tier].color } as CSSProperties}>
          <TierIcon tier={band.tier} px={4} />
          <div>
            <b>{band.name}</b>
            <span>{band.line}</span>
          </div>
        </div>

        <h3 className="section">
          dive log <span>deeper = rarer</span>
        </h3>
        <DiveLog rounds={rounds} />

        <div className="share-row">
          <button
            className="big-btn"
            onClick={async () => {
              if (await copyText(shareText)) flash('result')
            }}
          >
            {copied === 'result' ? 'copied ✓' : 'copy result'}
          </button>
          <button
            className="big-btn alt"
            onClick={async () => {
              if (await copyText(link)) flash('link')
            }}
          >
            {copied === 'link' ? 'link copied ✓' : 'challenge friends ⤴'}
          </button>
        </div>
        <p className="hint">Friends who open the challenge link get these exact {ROUNDS} prompts.</p>

        <div className="again-row">
          <button className="small-btn hot" onClick={onAgain}>
            keep diving ∞
          </button>
          {!dailyNumber && (
            <button className="small-btn" onClick={onToday}>
              today's dive
            </button>
          )}
        </div>

        <h3 className="section">
          the catch <span>tap a prompt for what lurked deeper</span>
        </h3>
        <ol className="catch">
          {rounds.map((r, i) => (
            <li key={r.prompt.id} className={open === i ? 'open' : ''}>
              <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                <span className="n">{i + 1}</span>
                <span className="body">
                  <span className="q">{r.prompt.text}</span>
                  <span className="a">
                    {r.answer ?? '—'}
                    <em style={{ color: r.tier ? TIERS[r.tier].color : undefined }}>{r.tier ? TIERS[r.tier].name : MISS.name}</em>
                  </span>
                </span>
                <span className="pts">{r.points}</span>
                <span className="chev">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && (
                <div className="lurk">
                  {deeper[i].length ? (
                    deeper[i].map((d) => (
                      <div key={d.tier} className="lurk-row">
                        <span style={{ color: TIERS[d.tier].color }}>
                          {TIERS[d.tier].name} · {TIERS[d.tier].points}
                        </span>
                        <span>{d.answers.join(' · ')}</span>
                      </div>
                    ))
                  ) : (
                    <div className="lurk-row">
                      <span style={{ color: TIERS.leviathan.color }}>Nothing deeper.</span>
                      <span>You hit the bottom of this one.</span>
                    </div>
                  )}
                  <div className="lurk-row floaty">
                    <span>Seafoam</span>
                    <span>{r.prompt.tiers.seafoam.map(display).join(' · ')}</span>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>

        <h3 className="section">the reading</h3>
        <ul className="bands">
          {BANDS.map((b, i) => {
            const max = BANDS[i + 1] ? BANDS[i + 1].min - 1 : null
            return (
              <li key={b.name} className={b === band ? 'me' : ''} style={{ '--c': TIERS[b.tier].color } as CSSProperties}>
                <TierIcon tier={b.tier} px={2} />
                <span className="range">{max ? `${b.min}–${max}` : `${b.min}+`}</span>
                <span>
                  <b>{b.name}.</b> {b.line}
                </span>
              </li>
            )
          })}
        </ul>

        <div className="logbook">
          <span>logbook</span>
          dives {log.dives} · avg {log.dives ? Math.round(log.total / log.dives) : 0} · best {log.best} · leviathans {log.leviathans}
        </div>

        <footer className="credit">
          A fan-made homage to <a href="https://krillion.io" target="_blank" rel="noreferrer">Krillion</a>. Not affiliated. Answers
          are scored from hand-curated lists, so a real but unlisted answer may bounce.
        </footer>
      </div>
    </main>
  )
}
