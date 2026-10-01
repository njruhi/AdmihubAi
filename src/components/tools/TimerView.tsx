import { useEffect, useRef, useState } from 'react'
import { Coffee, Pause, Play, RotateCcw, Timer as TimerIcon } from 'lucide-react'
import { actions, useStore } from '../../store/store'

type Mode = 'pomodoro' | 'exam'

const POMODORO = { focus: 25, short: 5, long: 15 }

const EXAM_PRESETS = [
  { label: 'ঢাবি খ-ইউনিট', minutes: 60, note: '৬০ মিনিট · MCQ + লিখিত' },
  { label: 'গুচ্ছ (মানবিক)', minutes: 60, note: '৬০ মিনিট · ১০০ MCQ' },
  { label: 'দ্রুত মক টেস্ট', minutes: 30, note: '৩০ মিনিট স্প্রিন্ট' },
  { label: 'ফুল মডেল টেস্ট', minutes: 90, note: '৯০ মিনিট' },
]

function beep(times = 2) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    for (let i = 0; i < times; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      osc.type = 'sine'
      const t = ctx.currentTime + i * 0.45
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
      osc.start(t)
      osc.stop(t + 0.4)
    }
    setTimeout(() => ctx.close(), times * 500 + 400)
  } catch {
    /* ignore */
  }
}

export function TimerView() {
  const [mode, setMode] = useState<Mode>('pomodoro')
  const [phase, setPhase] = useState<'focus' | 'break'>('focus')
  const [total, setTotal] = useState(POMODORO.focus * 60)
  const [left, setLeft] = useState(POMODORO.focus * 60)
  const [running, setRunning] = useState(false)
  const [rounds, setRounds] = useState(0)
  const [custom, setCustom] = useState(25)
  const tick = useRef<number | undefined>(undefined)
  const sessions = useStore((s) => s.sessions)

  const todayMinutes = sessions
    .filter((s) => new Date(s.at).toDateString() === new Date().toDateString())
    .reduce((n, s) => n + s.minutes, 0)

  useEffect(() => {
    if (!running) {
      window.clearInterval(tick.current)
      return
    }
    tick.current = window.setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          window.clearInterval(tick.current)
          finish()
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => window.clearInterval(tick.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const finish = () => {
    setRunning(false)
    beep(3)
    const minutes = Math.round(total / 60)
    if (mode === 'exam') {
      actions.addSession({ minutes, kind: 'exam', label: 'পরীক্ষা সিমুলেশন' })
      actions.toast(`⏰ সময় শেষ! ${minutes} মিনিট যোগ হয়েছে`)
      return
    }
    if (phase === 'focus') {
      actions.addSession({ minutes, kind: 'pomodoro', label: 'ফোকাস সেশন' })
      const nextRound = rounds + 1
      setRounds(nextRound)
      const breakMin = nextRound % 4 === 0 ? POMODORO.long : POMODORO.short
      setPhase('break')
      setTotal(breakMin * 60)
      setLeft(breakMin * 60)
      actions.toast(`✅ ${minutes} মিনিট ফোকাস সম্পন্ন · এবার ${breakMin} মিনিট বিশ্রাম`)
    } else {
      setPhase('focus')
      setTotal(custom * 60)
      setLeft(custom * 60)
      actions.toast('🔔 বিরতি শেষ — আবার শুরু করো!')
    }
  }

  const setMinutes = (m: number, nextMode: Mode = mode) => {
    setRunning(false)
    setMode(nextMode)
    setPhase('focus')
    setTotal(m * 60)
    setLeft(m * 60)
  }

  const pct = total ? ((total - left) / total) * 100 : 0
  const size = 248
  const r = size / 2 - 14
  const c = 2 * Math.PI * r
  const color = phase === 'break' ? '#30d158' : mode === 'exam' ? '#ff9f0a' : '#0a84ff'

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-xl space-y-4 px-3 py-5 sm:px-5">
        <div className="seg w-full">
          <button
            data-active={mode === 'pomodoro'}
            onClick={() => {
              setCustom(POMODORO.focus)
              setMinutes(POMODORO.focus, 'pomodoro')
            }}
            className="flex-1"
          >
            🍅 পোমোডোরো
          </button>
          <button data-active={mode === 'exam'} onClick={() => setMinutes(60, 'exam')} className="flex-1">
            📝 পরীক্ষা সিমুলেটর
          </button>
        </div>

        <div className="card flex flex-col items-center !p-6">
          <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="ring-progress">
              <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line)/0.1)" strokeWidth="13" />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={c - (c * pct) / 100}
                style={{ transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="text-[13px] font-medium" style={{ color }}>
                  {mode === 'exam' ? '📝 পরীক্ষা চলছে' : phase === 'focus' ? '🎯 ফোকাস' : '☕ বিরতি'}
                </div>
                <div className="font-sans text-[46px] font-bold leading-none tabular-nums tracking-tight">
                  {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
                </div>
                <div className="mt-1 text-[11.5px] muted">
                  {mode === 'pomodoro' ? `রাউন্ড ${rounds + (phase === 'focus' ? 1 : 0)}` : `মোট ${Math.round(total / 60)} মিনিট`}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2.5">
            <button
              onClick={() => {
                setRunning(false)
                setLeft(total)
              }}
              className="btn-ghost size-11 !rounded-full !p-0"
              aria-label="রিসেট"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={() => setRunning((v) => !v)}
              className="btn-primary size-16 !rounded-full !p-0 shadow-xl"
              aria-label={running ? 'বিরতি' : 'শুরু'}
            >
              {running ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-0.5" />}
            </button>
            <button
              onClick={() => {
                setRunning(false)
                setPhase('break')
                setTotal(POMODORO.short * 60)
                setLeft(POMODORO.short * 60)
              }}
              className="btn-ghost size-11 !rounded-full !p-0"
              aria-label="বিরতি নাও"
              title="৫ মিনিটের বিরতি"
            >
              <Coffee size={18} />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 text-[12px] muted">
            <TimerIcon size={13} /> আজ পড়েছো <b className="text-ios-green">{todayMinutes}</b> মিনিট
          </div>
        </div>

        {mode === 'pomodoro' ? (
          <div className="card !p-4">
            <h3 className="mb-2 text-[13.5px] font-semibold">⏱️ ফোকাস সময় বাছো</h3>
            <div className="flex flex-wrap gap-1.5">
              {[15, 25, 30, 45, 50, 60].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setCustom(m)
                    setMinutes(m, 'pomodoro')
                  }}
                  className={`chip ${custom === m ? '!bg-ios-blue/15 !text-ios-blue !border-ios-blue/30' : ''}`}
                >
                  {m} মিনিট
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[11.5px] leading-relaxed muted">
              প্রতি ৪টি ফোকাস সেশনের পর স্বয়ংক্রিয়ভাবে ১৫ মিনিটের লম্বা বিরতি আসবে।
            </p>
          </div>
        ) : (
          <div className="card !p-4">
            <h3 className="mb-2 text-[13.5px] font-semibold">🎓 ভর্তি পরীক্ষার টাইমিং</h3>
            <div className="grid grid-cols-2 gap-2">
              {EXAM_PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setMinutes(p.minutes, 'exam')}
                  className={`rounded-2xl border px-3 py-2.5 text-left transition ${
                    total === p.minutes * 60
                      ? 'border-ios-orange/40 bg-ios-orange/10'
                      : 'border-[rgb(var(--line)/0.1)] hover:bg-[rgb(var(--line)/0.05)]'
                  }`}
                >
                  <div className="text-[13px] font-medium">{p.label}</div>
                  <div className="text-[11px] muted">{p.note}</div>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[11.5px] leading-relaxed muted">
              💡 টিপ: টাইমার চালু করে কুইজ ব্যাংক বা MCQ মোডে পরীক্ষা দাও — আসল পরীক্ষার চাপ অনুশীলন হবে।
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
