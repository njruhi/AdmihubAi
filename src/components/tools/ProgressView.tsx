import { useMemo } from 'react'
import { Flame, LineChart, RotateCcw, Target, Timer, Trophy } from 'lucide-react'
import { actions, useStore } from '../../store/store'
import { ScoreRing } from '../quiz/QuizRunner'

const DAY = 86400000

export function ProgressView() {
  const results = useStore((s) => s.results)
  const sessions = useStore((s) => s.sessions)
  const cards = useStore((s) => s.cards)

  const stats = useMemo(() => {
    const totalQ = results.reduce((n, r) => n + r.total, 0)
    const totalC = results.reduce((n, r) => n + r.correct, 0)
    const minutes = sessions.reduce((n, s) => n + s.minutes, 0)

    const bySubject = new Map<string, { total: number; correct: number }>()
    for (const r of results) {
      const cur = bySubject.get(r.subject) ?? { total: 0, correct: 0 }
      cur.total += r.total
      cur.correct += r.correct
      bySubject.set(r.subject, cur)
    }

    // streak of consecutive days with any activity
    const days = new Set<string>()
    for (const r of results) days.add(new Date(r.at).toDateString())
    for (const s of sessions) days.add(new Date(s.at).toDateString())
    let streak = 0
    for (let i = 0; i < 400; i++) {
      const d = new Date(Date.now() - i * DAY).toDateString()
      if (days.has(d)) streak++
      else if (i > 0) break
    }

    const last7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6 - i) * DAY)
      const key = d.toDateString()
      return {
        label: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'][d.getDay()],
        minutes: sessions.filter((s) => new Date(s.at).toDateString() === key).reduce((n, s) => n + s.minutes, 0),
        quizzes: results.filter((r) => new Date(r.at).toDateString() === key).length,
      }
    })

    return {
      accuracy: totalQ ? Math.round((totalC / totalQ) * 100) : 0,
      totalQ,
      totalC,
      minutes,
      streak,
      bySubject: [...bySubject.entries()].sort((a, b) => b[1].total - a[1].total),
      last7,
      mastered: cards.filter((c) => c.box >= 4).length,
    }
  }, [results, sessions, cards])

  const maxMin = Math.max(60, ...stats.last7.map((d) => d.minutes))

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-5 sm:px-5">
        {/* top cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatCard icon={<Target size={16} />} label="গড় নির্ভুলতা" value={`${stats.accuracy}%`} color="#30d158" />
          <StatCard icon={<Trophy size={16} />} label="মোট প্রশ্ন" value={`${stats.totalQ}`} color="#0a84ff" />
          <StatCard icon={<Timer size={16} />} label="পড়ার সময়" value={`${stats.minutes} মি`} color="#bf5af2" />
          <StatCard icon={<Flame size={16} />} label="স্ট্রিক" value={`${stats.streak} দিন`} color="#ff9f0a" />
        </div>

        {results.length === 0 && sessions.length === 0 ? (
          <div className="card py-12 text-center">
            <LineChart size={32} className="mx-auto mb-3 muted" />
            <p className="text-[15px] font-semibold">এখনো কোনো ডেটা নেই</p>
            <p className="mx-auto mt-1 max-w-xs text-[12.5px] leading-relaxed muted">
              একটি কুইজ দাও বা স্টাডি টাইমার চালাও — তোমার অগ্রগতি এখানে সুন্দরভাবে দেখানো হবে।
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={() => actions.setView('quizbank')} className="btn-primary">
                কুইজ দাও
              </button>
              <button onClick={() => actions.setView('timer')} className="btn-outline">
                টাইমার চালাও
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* weekly chart */}
            <div className="card !p-5">
              <h3 className="mb-4 text-[14px] font-semibold">📊 গত ৭ দিনের পড়াশোনা</h3>
              <div className="flex h-36 items-end justify-between gap-2">
                {stats.last7.map((d, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] tabular-nums muted">{d.minutes || ''}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-ios-blue to-ios-purple transition-all duration-700"
                      style={{ height: `${Math.max(3, (d.minutes / maxMin) * 100)}%`, opacity: d.minutes ? 1 : 0.18 }}
                      title={`${d.minutes} মিনিট · ${d.quizzes} কুইজ`}
                    />
                    <span className="text-[10.5px] muted">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* subject accuracy */}
            {stats.bySubject.length > 0 && (
              <div className="card !p-5">
                <h3 className="mb-3 text-[14px] font-semibold">🎯 বিষয়ভিত্তিক নির্ভুলতা</h3>
                <div className="space-y-3">
                  {stats.bySubject.map(([subject, v]) => {
                    const pct = Math.round((v.correct / v.total) * 100)
                    const color = pct >= 75 ? '#30d158' : pct >= 50 ? '#ff9f0a' : '#ff453a'
                    return (
                      <div key={subject}>
                        <div className="mb-1 flex items-center justify-between text-[12.5px]">
                          <span className="truncate font-medium">{subject}</span>
                          <span className="shrink-0 tabular-nums muted">
                            {v.correct}/{v.total} · <b style={{ color }}>{pct}%</b>
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--line)/0.1)]">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                {stats.bySubject.length > 1 && (
                  <p className="mt-3 rounded-xl bg-ios-orange/10 p-2.5 text-[12px] leading-relaxed">
                    💡 সবচেয়ে দুর্বল:{' '}
                    <b>
                      {
                        [...stats.bySubject].sort(
                          (a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total,
                        )[0][0]
                      }
                    </b>{' '}
                    — এই বিষয়ে MCQ মোডে বেশি অনুশীলন করো।
                  </p>
                )}
              </div>
            )}

            {/* overall ring + recent */}
            <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
              <div className="card flex flex-col items-center justify-center !p-5">
                <ScoreRing pct={stats.accuracy} size={122} />
                <p className="mt-2 text-[12px] muted">সামগ্রিক স্কোর</p>
                <p className="text-[11px] muted">{stats.mastered}টি কার্ড আয়ত্তে</p>
              </div>
              <div className="card !p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[14px] font-semibold">🕐 সাম্প্রতিক পরীক্ষা</h3>
                  <button
                    onClick={() => {
                      actions.resetProgress()
                      actions.toast('প্রোগ্রেস রিসেট হয়েছে')
                    }}
                    className="flex items-center gap-1 text-[11px] muted hover:text-ios-red"
                  >
                    <RotateCcw size={11} /> রিসেট
                  </button>
                </div>
                <div className="space-y-1.5">
                  {results
                    .slice(-6)
                    .reverse()
                    .map((r) => {
                      const pct = Math.round((r.correct / r.total) * 100)
                      return (
                        <div key={r.id} className="flex items-center gap-2 rounded-xl bg-[rgb(var(--line)/0.045)] px-3 py-2">
                          <span
                            className="grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-white"
                            style={{ background: pct >= 75 ? '#30d158' : pct >= 50 ? '#ff9f0a' : '#ff453a' }}
                          >
                            {pct}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[12.5px] font-medium">
                              {r.topic || r.subject}
                              <span className="ml-1 text-[10px] muted">{r.mode === 'ai' ? '· AI' : '· ব্যাংক'}</span>
                            </div>
                            <div className="text-[10.5px] muted">
                              {r.correct}/{r.total} সঠিক · {Math.round(r.durationSec / 60)} মিনিট ·{' '}
                              {new Date(r.at).toLocaleDateString('bn-BD')}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  {results.length === 0 && <p className="py-4 text-center text-[12.5px] muted">কোনো পরীক্ষা দাওনি</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="card !p-3.5">
      <div className="mb-1.5 grid size-8 place-items-center rounded-xl" style={{ background: `${color}22`, color }}>
        {icon}
      </div>
      <div className="text-[19px] font-bold tabular-nums leading-tight tracking-tight">{value}</div>
      <div className="truncate text-[11px] muted">{label}</div>
    </div>
  )
}
