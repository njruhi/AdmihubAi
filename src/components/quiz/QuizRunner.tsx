import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, FileDown, Layers, RotateCcw, Timer, X } from 'lucide-react'
import type { QuizQuestion } from '../../types'
import { actions, getState } from '../../store/store'
import { quizToMarkdown } from '../../lib/mcq'
import { exportPdf } from '../../lib/exporter'

const LETTERS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ']

export function QuizRunner({
  questions,
  title,
  mode,
  subject,
  topic,
  onExit,
  seconds,
}: {
  questions: QuizQuestion[]
  title: string
  mode: 'ai' | 'bank'
  subject: string
  topic?: string
  onExit: () => void
  seconds?: number
}) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<Record<string, number>>({})
  const [done, setDone] = useState(false)
  const [left, setLeft] = useState(seconds ?? 0)
  const startedAt = useRef(Date.now())
  const saved = useRef(false)

  const q = questions[idx]
  const answered = q ? picked[q.id] !== undefined : false
  const correctCount = useMemo(
    () => questions.reduce((n, item) => n + (picked[item.id] === item.answer ? 1 : 0), 0),
    [picked, questions],
  )

  useEffect(() => {
    if (!seconds || done) return
    const t = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(t)
          setDone(true)
          return 0
        }
        return v - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [seconds, done])

  useEffect(() => {
    if (!done || saved.current) return
    saved.current = true
    actions.addResult({
      subject,
      topic,
      total: questions.length,
      correct: correctCount,
      mode,
      durationSec: Math.round((Date.now() - startedAt.current) / 1000),
    })
  }, [done, correctCount, questions.length, subject, topic, mode])

  const pick = (optIdx: number) => {
    if (answered) return
    setPicked((p) => ({ ...p, [q.id]: optIdx }))
  }

  const next = () => {
    if (idx + 1 >= questions.length) setDone(true)
    else setIdx((i) => i + 1)
  }

  if (!questions.length) return null

  if (done) {
    const pct = Math.round((correctCount / questions.length) * 100)
    const wrong = questions.filter((item) => picked[item.id] !== undefined && picked[item.id] !== item.answer)
    const skipped = questions.filter((item) => picked[item.id] === undefined)
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-5 sm:px-5">
        <div className="card stagger flex flex-col items-center !p-6 text-center">
          <ScoreRing pct={pct} />
          <h2 className="mt-4 text-[22px] font-bold tracking-tight">
            {pct >= 80 ? '🏆 অসাধারণ!' : pct >= 60 ? '👏 ভালো করেছো' : pct >= 40 ? '💪 আরও চর্চা দরকার' : '📚 রিভিশন দাও'}
          </h2>
          <p className="mt-1 text-[14px] muted">
            {questions.length}টির মধ্যে <b className="text-ios-green">{correctCount}</b> সঠিক ·{' '}
            <b className="text-ios-red">{wrong.length}</b> ভুল · {skipped.length} বাদ
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => exportPdf(title, quizToMarkdown(title, questions, picked), `স্কোর: ${correctCount}/${questions.length}`)}
              className="btn-outline"
            >
              <FileDown size={15} /> PDF ডাউনলোড
            </button>
            <button
              onClick={() => {
                const deckId = actions.addDeck(`${title} — ভুল প্রশ্ন`, subject)
                const rows: [string, string][] = (wrong.length ? wrong : questions).map((item) => [
                  item.q,
                  `${item.options[item.answer]}${item.explain ? `\n\n${item.explain}` : ''}`,
                ])
                actions.addCards(deckId, rows)
                actions.toast(`${rows.length}টি ফ্ল্যাশকার্ড তৈরি হয়েছে ✓`)
                actions.setView('flashcards')
              }}
              className="btn-outline"
            >
              <Layers size={15} /> ফ্ল্যাশকার্ড বানাও
            </button>
            <button
              onClick={() => {
                setPicked({})
                setIdx(0)
                setDone(false)
                saved.current = false
                startedAt.current = Date.now()
                setLeft(seconds ?? 0)
              }}
              className="btn-outline"
            >
              <RotateCcw size={15} /> আবার দাও
            </button>
            <button onClick={onExit} className="btn-primary">
              শেষ করো
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          <h3 className="px-1 text-[14px] font-semibold">📋 বিস্তারিত রিভিউ</h3>
          {questions.map((item, i) => {
            const p = picked[item.id]
            const ok = p === item.answer
            return (
              <div key={item.id} className="card !p-4">
                <div className="flex gap-2">
                  <span
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${
                      p === undefined ? 'bg-[rgb(var(--muted))]' : ok ? 'bg-ios-green' : 'bg-ios-red'
                    }`}
                  >
                    {p === undefined ? '–' : ok ? '✓' : '✕'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-medium leading-relaxed">
                      {i + 1}. {item.q}
                    </p>
                    <p className="mt-1.5 text-[13px]">
                      <span className="text-ios-green">সঠিক: {LETTERS[item.answer]}) {item.options[item.answer]}</span>
                      {p !== undefined && !ok && (
                        <span className="ml-2 text-ios-red">
                          · তোমার: {LETTERS[p]}) {item.options[p]}
                        </span>
                      )}
                    </p>
                    {item.explain && <p className="mt-1 text-[12.5px] leading-relaxed muted">💡 {item.explain}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-3 py-4 sm:px-5">
      {/* header */}
      <div className="mb-3 flex items-center gap-3">
        <button onClick={onExit} className="btn-ghost size-8 !rounded-full !p-0" aria-label="বন্ধ">
          <X size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[13px] font-medium">{title}</span>
            <span className="shrink-0 text-[12px] tabular-nums muted">
              {idx + 1} / {questions.length}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--line)/0.1)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ios-blue to-ios-purple transition-all duration-500"
              style={{ width: `${((idx + (answered ? 1 : 0)) / questions.length) * 100}%` }}
            />
          </div>
        </div>
        {!!seconds && (
          <span
            className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums ${
              left < 60 ? 'bg-ios-red/15 text-ios-red' : 'bg-[rgb(var(--line)/0.08)]'
            }`}
          >
            <Timer size={12} />
            {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      {/* question */}
      <div key={q.id} className="card animate-[fade-up_.3s_cubic-bezier(.16,1,.3,1)] !p-5">
        <p className="text-[16.5px] font-semibold leading-relaxed">{q.q}</p>

        <div className="mt-4 space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.answer
            const isPicked = picked[q.id] === i
            let cls = 'border-[rgb(var(--line)/0.12)] hover:border-ios-blue/40 hover:bg-ios-blue/5'
            if (answered) {
              if (isCorrect) cls = 'border-ios-green/50 bg-ios-green/10'
              else if (isPicked) cls = 'border-ios-red/50 bg-ios-red/10'
              else cls = 'border-[rgb(var(--line)/0.08)] opacity-55'
            }
            return (
              <button
                key={i}
                onClick={() => pick(i)}
                disabled={answered}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ${cls}`}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-bold transition ${
                    answered && isCorrect
                      ? 'bg-ios-green text-white'
                      : answered && isPicked
                        ? 'bg-ios-red text-white'
                        : 'bg-[rgb(var(--line)/0.08)]'
                  }`}
                >
                  {answered && isCorrect ? <Check size={14} /> : answered && isPicked ? <X size={14} /> : LETTERS[i]}
                </span>
                <span className="flex-1 text-[14.5px] leading-snug">{opt}</span>
              </button>
            )
          })}
        </div>

        {answered && (
          <div className="mt-4 animate-[fade-up_.25s_ease] rounded-2xl border border-ios-blue/20 bg-ios-blue/8 p-3.5">
            <p className="text-[13px] font-semibold">
              {picked[q.id] === q.answer ? '✅ সঠিক উত্তর!' : `❌ ভুল — সঠিক উত্তর: ${LETTERS[q.answer]}) ${q.options[q.answer]}`}
            </p>
            {q.explain && <p className="mt-1 text-[13px] leading-relaxed">{q.explain}</p>}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[12.5px] muted">
          স্কোর: <b className="text-ios-green">{correctCount}</b> / {Object.keys(picked).length}
        </span>
        <div className="flex gap-2">
          {!answered && (
            <button onClick={next} className="btn-ghost">
              বাদ দাও
            </button>
          )}
          <button onClick={next} disabled={!answered} className="btn-primary disabled:opacity-40">
            {idx + 1 >= questions.length ? 'ফলাফল দেখো' : 'পরবর্তী'}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ScoreRing({ pct, size = 112 }: { pct: number; size?: number }) {
  const r = size / 2 - 8
  const c = 2 * Math.PI * r
  const color = pct >= 80 ? '#30d158' : pct >= 50 ? '#ff9f0a' : '#ff453a'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="ring-progress">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--line)/0.12)" strokeWidth="9" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.16,1,.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-[26px] font-bold tabular-nums tracking-tight" style={{ color }}>
          {pct}%
        </span>
      </div>
    </div>
  )
}

/** Helper so other views can record a finished session without the runner. */
export function recordStudy(minutes: number, kind: 'pomodoro' | 'exam' | 'focus', label?: string) {
  if (minutes <= 0) return
  actions.addSession({ minutes, kind, label })
  const total = getState().sessions.reduce((n, s) => n + s.minutes, 0)
  actions.toast(`⏱️ ${minutes} মিনিট যোগ হলো · মোট ${total} মিনিট`)
}
