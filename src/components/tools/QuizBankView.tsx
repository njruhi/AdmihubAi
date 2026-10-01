import { useState } from 'react'
import { Blocks, Play, Shuffle, Timer } from 'lucide-react'
import { QUIZ_CATEGORIES, filterBank, shuffle } from '../../data/quizBank'
import { QuizRunner } from '../quiz/QuizRunner'
import type { QuizQuestion } from '../../types'

export function QuizBankView() {
  const [cat, setCat] = useState('all')
  const [count, setCount] = useState(10)
  const [timed, setTimed] = useState(false)
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null)

  const pool = filterBank(cat)
  const label = QUIZ_CATEGORIES.find((c) => c.key === cat)?.label ?? 'কুইজ'

  const start = () => {
    const picked = shuffle(pool).slice(0, Math.min(count, pool.length))
    setQuiz(picked)
  }

  if (quiz) {
    return (
      <div className="h-full overflow-y-auto">
        <QuizRunner
          questions={quiz}
          title={`${label} — অনুশীলন`}
          mode="bank"
          subject={quiz[0]?.subject ?? 'মিশ্র'}
          topic={label}
          seconds={timed ? quiz.length * 40 : undefined}
          onExit={() => setQuiz(null)}
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-3 py-5 sm:px-5">
        <div className="card stagger !p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ios-orange to-ios-pink shadow-lg shadow-ios-orange/25">
              <Blocks size={21} className="text-white" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold tracking-tight">অফলাইন কুইজ ব্যাংক</h2>
              <p className="text-[12.5px] muted">
                {QUIZ_CATEGORIES[0].count}টি যাচাইকৃত প্রশ্ন · কোনো API Key ছাড়াই ফ্রি
              </p>
            </div>
          </div>

          <label className="mb-2 block text-[13px] font-medium">বিষয় বেছে নাও</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {QUIZ_CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCat(c.key)}
                className={`rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 ${
                  cat === c.key
                    ? 'border-ios-blue/40 bg-ios-blue/10'
                    : 'border-[rgb(var(--line)/0.1)] hover:bg-[rgb(var(--line)/0.05)]'
                }`}
              >
                <div className="truncate text-[13px] font-medium">{c.label}</div>
                <div className="text-[11px] muted">{c.count}টি প্রশ্ন</div>
              </button>
            ))}
          </div>

          <label className="mb-1.5 block text-[13px] font-medium">কয়টি প্রশ্ন?</label>
          <div className="seg mb-4 w-full">
            {[5, 10, 20, 40].map((n) => (
              <button key={n} data-active={count === n} onClick={() => setCount(n)} className="flex-1">
                {n}
              </button>
            ))}
          </div>

          <button
            onClick={() => setTimed((v) => !v)}
            className={`chip mb-4 ${timed ? '!bg-ios-orange/15 !text-ios-orange !border-ios-orange/30' : ''}`}
          >
            <Timer size={13} /> টাইমার {timed ? 'চালু' : 'বন্ধ'} (প্রতি প্রশ্নে ৪০ সে.)
          </button>

          <button onClick={start} className="btn-primary w-full !rounded-2xl !py-3">
            <Play size={17} /> পরীক্ষা শুরু করো ({Math.min(count, pool.length)}টি প্রশ্ন)
          </button>
          <p className="mt-2 flex items-center justify-center gap-1 text-[11.5px] muted">
            <Shuffle size={11} /> প্রতিবার প্রশ্ন এলোমেলো হয়ে আসবে
          </p>
        </div>
      </div>
    </div>
  )
}
