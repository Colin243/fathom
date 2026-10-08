import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { Ocean, PPM, type OceanHandle } from './components/Ocean'
import { Results, type Round } from './components/Results'
import { TierIcon } from './components/Sprite'
import { BANK, cleanCode, freshCode, promptsForCode, todayInfo } from './lib/bank'
import { matchAnswer, type Prompt, type TierId } from './lib/match'
import { sound } from './lib/sound'
import { storage } from './lib/storage'
import { MISS, METRES_PER_POINT, ROUNDS, ROUND_SECONDS, TIERS } from './lib/tiers'

type Phase = 'title' | 'intro' | 'answer' | 'sinking' | 'reveal' | 'results'

const INTRO_SECONDS = 3

const titleCamera = () => -(window.innerHeight * 0.24) / PPM

function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      document.documentElement.style.setProperty('--kb', `${inset}px`)
    }
    update()
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])
}

export default function App() {
  useKeyboardInset()
  const ocean = useRef<OceanHandle>(null)
  const depthText = useRef<HTMLSpanElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [challenge] = useState(() => cleanCode(new URLSearchParams(location.search).get('dive')))
  const [phase, setPhase] = useState<Phase>('title')
  const [code, setCode] = useState('')
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [idx, setIdx] = useState(0)
  const [countdown, setCountdown] = useState(INTRO_SECONDS)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS * 1000)
  const [text, setText] = useState('')
  const [reject, setReject] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [tierBase, setTierBase] = useState<number | null>(null)
  const [chip, setChip] = useState<string | null>(null)
  const [muted, setMuted] = useState(sound.isMuted())
  const [howTo, setHowTo] = useState(false)
  const [codeEntry, setCodeEntry] = useState('')
  const revealAt = useRef(0)

  const score = rounds.reduce((s, r) => s + r.points, 0)
  const depth = score * METRES_PER_POINT
  const prompt = prompts[idx]
  const current = rounds[idx]
  const today = todayInfo()

  const onDepth = useCallback((m: number) => {
    if (depthText.current) depthText.current.textContent = `${Math.round(m).toLocaleString()}m`
  }, [])

  // Intro countdown, then the clock starts.
  useEffect(() => {
    if (phase !== 'intro') return
    setCountdown(INTRO_SECONDS)
    setTimeLeft(ROUND_SECONDS * 1000)
    const started = performance.now()
    const id = setInterval(() => {
      const left = INTRO_SECONDS - Math.floor((performance.now() - started) / 1000)
      if (left <= 0) {
        clearInterval(id)
        setTimeLeft(ROUND_SECONDS * 1000)
        setPhase('answer')
      } else setCountdown(left)
    }, 100)
    return () => clearInterval(id)
  }, [phase, idx])

  // Round clock.
  useEffect(() => {
    if (phase !== 'answer') return
    const deadline = performance.now() + ROUND_SECONDS * 1000
    let lastSecond = ROUND_SECONDS
    inputRef.current?.focus()
    const id = setInterval(() => {
      const left = Math.max(0, deadline - performance.now())
      setTimeLeft(left)
      const sec = Math.ceil(left / 1000)
      if (sec !== lastSecond) {
        lastSecond = sec
        if (sec <= 5 && sec > 0) sound.tick()
      }
      if (left <= 0) {
        clearInterval(id)
        land(null, null)
      }
    }, 80)
    // Dev-only: Escape skips the prompt, for testing the whole flow quickly.
    const skip = (e: KeyboardEvent) => {
      if (import.meta.env.DEV && e.key === 'Escape') {
        clearInterval(id)
        land(null, null)
      }
    }
    window.addEventListener('keydown', skip)
    return () => {
      clearInterval(id)
      window.removeEventListener('keydown', skip)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx])

  function land(answer: string | null, tier: TierId | null) {
    const points = tier ? TIERS[tier].points : 0
    inputRef.current?.blur()
    setRounds((rs) => {
      const next = [...rs]
      next[idx] = { prompt: prompts[idx], answer, tier, points }
      return next
    })
    setReject(null)
    setText('')
    if (!tier) {
      sound.reveal(null)
      revealAt.current = performance.now()
      setPhase('reveal')
      return
    }
    sound.bubble()
    setChip(answer)
    setTierBase(depth)
    setPhase('sinking')
    const target = depth + points * METRES_PER_POINT
    void ocean.current?.glide(target, 1300 + points * 22).then(() => {
      sound.reveal(tier)
      revealAt.current = performance.now()
      setChip(null)
      setPhase('reveal')
    })
  }

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (phase !== 'answer' || !prompt) return
    const guess = text.trim()
    if (!guess) return
    const hit = matchAnswer(prompt, guess)
    if (!hit) {
      sound.reject()
      setReject(guess)
      setShake((n) => n + 1)
      inputRef.current?.select()
      return
    }
    land(hit.canonical, hit.tier)
  }

  function start(diveCode: string) {
    sound.unlock()
    const ps = promptsForCode(diveCode)
    setCode(diveCode)
    setPrompts(ps)
    setRounds([])
    setIdx(0)
    setTierBase(null)
    setText('')
    setReject(null)
    history.replaceState(null, '', location.pathname)
    ocean.current?.jump(titleCamera())
    setPhase('intro')
    // Focusing inside the tap is what lets phones open the keyboard.
    inputRef.current?.focus({ preventScroll: true })
    void ocean.current?.glide(0, 1100)
  }

  const startFresh = () => start(freshCode(storage.seen()))

  const next = useCallback(() => {
    if (phase !== 'reveal' || performance.now() - revealAt.current < 350) return
    revealAt.current = Number.POSITIVE_INFINITY // ignore a second Enter/click for this reveal
    setTierBase(null)
    if (idx + 1 < ROUNDS) {
      setIdx(idx + 1)
      setPhase('intro')
      inputRef.current?.focus({ preventScroll: true })
      return
    }
    storage.markSeen(prompts.map((p) => p.id))
    storage.recordDive(
      rounds.reduce((s, r) => s + r.points, 0),
      rounds.filter((r) => r.tier === 'leviathan').length,
    )
    sound.surface()
    setPhase('results')
    void ocean.current?.glide(titleCamera(), 1800)
  }, [phase, idx, prompts, rounds])

  useEffect(() => {
    if (phase !== 'reveal') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, next])

  const toggleMute = () => {
    sound.setMuted(!muted)
    setMuted(!muted)
  }

  const inGame = phase === 'intro' || phase === 'answer' || phase === 'sinking' || phase === 'reveal'
  const secondsLeft = Math.ceil(timeLeft / 1000)
  const frac = timeLeft / (ROUND_SECONDS * 1000)
  const isDaily = code.startsWith('DAY-')

  return (
    <div className={`app phase-${phase}`}>
      <Ocean
        ref={ocean}
        initial={titleCamera()}
        onDepth={onDepth}
        tierBase={phase === 'sinking' || phase === 'reveal' ? tierBase : null}
        landed={phase === 'reveal' ? current?.tier : null}
        showPlayer={phase === 'intro' || phase === 'answer' || phase === 'sinking'}
        sinking={phase === 'sinking'}
        chip={chip}
        dim={phase === 'results'}
      />
      <div className="scanlines" aria-hidden />

      <button className="icon-btn sound-btn" onClick={toggleMute} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>
        {muted ? '🔇' : '🔊'}
      </button>

      {phase === 'title' && (
        <main className="title-screen">
          <h1 className="logo" data-text="FATHOM">
            FATHOM
          </h1>
          <p className="tagline">the endless dive</p>
          <p className="rules-line">{ROUNDS} prompts · {ROUND_SECONDS} seconds each · rarer answers sink deeper</p>

          <div className="title-panel">
            {challenge && (
              <div className="challenge">
                <span>a friend sent you dive</span> <b>{challenge.startsWith('DAY-') ? `daily ${challenge.slice(4)}` : challenge}</b>
              </div>
            )}
            <button className="howto-toggle" onClick={() => setHowTo(!howTo)} aria-expanded={howTo}>
              {howTo ? '▼' : '►'} how to play
            </button>
            {howTo && (
              <ul className="howto">
                <li>{ROUNDS} prompts per dive. Type one thing that fits.</li>
                <li>{ROUND_SECONDS} seconds on the clock. Wrong answers just bounce. Keep trying.</li>
                <li>Obvious answers float. Rare ones sink you deeper.</li>
                <li>The clever pick? Everyone else thought of it too.</li>
                <li>Every point sinks you {METRES_PER_POINT} metres. {(ROUNDS * 100).toLocaleString()} points reaches the trench floor.</li>
                <li>No daily limit. Dive as often as you like, and send friends your dive code.</li>
              </ul>
            )}
            <button className="big-btn" onClick={() => (challenge ? start(challenge) : startFresh())}>
              ▼ {challenge ? 'take the challenge' : 'begin descent'} ▼
            </button>
            <div className="title-row">
              <span className="meta">{BANK.length} prompts in the sea</span>
              <div className="title-actions">
                {challenge && (
                  <button className="small-btn" onClick={startFresh}>
                    random dive ∞
                  </button>
                )}
                <button className="small-btn" onClick={() => start(today.code)}>
                  today's dive #{today.number}
                </button>
              </div>
            </div>
            <form
              className="code-form"
              onSubmit={(e) => {
                e.preventDefault()
                const c = cleanCode(codeEntry)
                if (c) start(c)
              }}
            >
              <input
                value={codeEntry}
                onChange={(e) => setCodeEntry(e.target.value.toUpperCase())}
                placeholder="friend's dive code"
                aria-label="Dive code"
                maxLength={24}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
              />
              <button className="small-btn" disabled={!cleanCode(codeEntry)}>
                join ↵
              </button>
            </form>
          </div>
        </main>
      )}

      {inGame && (
        <header className="hud">
          <div className="gauge">
            <label>depth</label>
            <span ref={depthText} className="gauge-val cyan">
              0m
            </span>
          </div>
          <div className="progress">
            <div className="squares">
              {Array.from({ length: ROUNDS }, (_, i) => {
                const r = rounds[i]
                const done = r && (i < idx || phase === 'reveal')
                const style = done && r.tier ? ({ '--c': TIERS[r.tier].color } as CSSProperties) : undefined
                return <i key={i} className={`${done ? (r.tier ? 'done' : 'miss') : ''} ${i === idx && !done ? 'now' : ''}`} style={style} />
              })}
            </div>
            <span>
              {isDaily ? `daily #${today.number} · ` : ''}prompt {idx + 1} of {ROUNDS}
            </span>
          </div>
          <div className="gauge right">
            <label>score</label>
            <span className="gauge-val coral">{phase === 'sinking' && current ? score - current.points : score}</span>
          </div>
        </header>
      )}

      {(phase === 'intro' || phase === 'answer') && prompt && (
        <section className="prompt-card" key={prompt.id}>
          <div className="eyebrow">prompt {idx + 1} of {ROUNDS}</div>
          <h2>{prompt.text}</h2>
          <div className="sub">▼ rarer answers sink deeper ▼</div>
        </section>
      )}

      {phase === 'intro' && (
        <div className="countdown">
          descending · the clock starts in <b>{countdown}</b>
        </div>
      )}

      <form
        className={`answer-bar ${phase === 'intro' || phase === 'answer' ? 'show' : ''}`}
        onSubmit={submit}
        aria-hidden={phase === 'intro' || phase === 'answer' ? undefined : true}
      >
        {reject && phase === 'answer' && (
          <div className="reject" key={shake}>
            “{reject}” · nothing down here by that name. try again
          </div>
        )}
        <div className={`answer-row ${shake ? (shake % 2 ? 'shake-a' : 'shake-b') : ''}`}>
          <div className={`timer ${phase === 'answer' && secondsLeft <= 5 ? 'urgent' : ''}`}>
            <svg viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="19" className="track" />
              <circle cx="22" cy="22" r="19" className="fill" style={{ strokeDashoffset: `${(1 - frac) * 119.4}` }} />
            </svg>
            <span>{secondsLeft}</span>
          </div>
          <input
            ref={inputRef}
            tabIndex={phase === 'intro' || phase === 'answer' ? 0 : -1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="type one answer…"
            aria-label="Your answer"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={60}
          />
          <button className="dive-btn" disabled={phase !== 'answer' || !text.trim()}>
            dive
          </button>
        </div>
        <div className="timebar">
          <i style={{ transform: `scaleX(${frac})` }} />
        </div>
      </form>

      {phase === 'reveal' && current && (
        <section className="reveal" key={`rev-${idx}`}>
          {current.tier ? (
            <>
              <TierIcon tier={current.tier} px={6} className="reveal-icon" />
              <h2 style={{ color: TIERS[current.tier].color }}>{TIERS[current.tier].name}</h2>
              <p className="reveal-answer">“{current.answer}”</p>
              <p className="reveal-pts">
                <b>+{current.points} pts</b> · sink {current.points * METRES_PER_POINT}m
              </p>
              <p className="reveal-blurb">{TIERS[current.tier].blurb}</p>
            </>
          ) : (
            <>
              <h2 className="miss-title">{MISS.name}</h2>
              <p className="reveal-answer">—</p>
              <p className="reveal-pts">
                <b>+0 pts</b>
              </p>
              <p className="reveal-blurb">{MISS.blurb}</p>
            </>
          )}
          <button className="next-btn" onClick={next} autoFocus>
            {idx + 1 < ROUNDS ? 'descend ▼' : 'surface ▲'}
          </button>
        </section>
      )}

      {phase === 'results' && (
        <Results
          rounds={rounds}
          code={code}
          dailyNumber={isDaily ? today.number : null}
          onAgain={startFresh}
          onToday={() => start(today.code)}
        />
      )}
    </div>
  )
}
