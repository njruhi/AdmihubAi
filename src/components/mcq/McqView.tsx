import { useRef, useState } from 'react'
import { Brain, ListChecks, Loader2, Sparkles, Wand2 } from 'lucide-react'
import { actions, getState, useStore } from '../../store/store'
import { complete, networkHint } from '../../lib/providers'
import { MCQ_SYSTEM, SUBJECTS } from '../../data/prompts'
import { mcqPrompt, parseMcqJson } from '../../lib/mcq'
import { buildContextBlock, retrieve } from '../../lib/brain'
import { KNOWLEDGE_BASE } from '../../data/knowledgeBase'
import { QuizRunner } from '../quiz/QuizRunner'
import type { QuizQuestion } from '../../types'

const PRESET_TOPICS: Record<string, string[]> = {
  বাংলা: ['সমাস', 'কারক ও বিভক্তি', 'সন্ধি', 'বাগধারা', 'চর্যাপদ', 'রবীন্দ্রনাথ', 'নজরুল', 'মধ্যযুগ', 'শুদ্ধ বানান'],
  ইংরেজি: ['Tense', 'Preposition', 'Voice', 'Narration', 'Synonym-Antonym', 'Idioms & Phrases', 'Article'],
  'সাধারণ জ্ঞান (বাংলাদেশ)': ['মুক্তিযুদ্ধ', 'সংবিধান', 'ভাষা আন্দোলন', 'নদী ও ভূগোল', 'অর্থনীতি', 'জাতীয় বিষয়াবলি'],
  'সাধারণ জ্ঞান (আন্তর্জাতিক)': ['জাতিসংঘ', 'আন্তর্জাতিক সংস্থা', 'বিশ্বযুদ্ধ', 'সীমারেখা ও প্রণালী', 'পুরস্কার'],
  'পৌরনীতি ও সুশাসন': ['রাষ্ট্র ও সরকার', 'নাগরিকতা', 'সুশাসন', 'আইনের শাসন', 'নির্বাচন ব্যবস্থা'],
  ইতিহাস: ['প্রাচীন বাংলা', 'পাল ও সেন যুগ', 'মুঘল আমল', 'ব্রিটিশ আমল', 'পাকিস্তান আমল'],
  অর্থনীতি: ['চাহিদা ও যোগান', 'জাতীয় আয়', 'মুদ্রা ও ব্যাংক', 'বাজার কাঠামো', 'বাংলাদেশের অর্থনীতি'],
}

export function McqView() {
  const [subject, setSubject] = useState<string>('বাংলা')
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(10)
  const [difficulty, setDifficulty] = useState('ভর্তি পরীক্ষার মান (মাঝারি-কঠিন)')
  const [useBrainCtx, setUseBrainCtx] = useState(true)
  const [timed, setTimed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const provider = useStore((s) => s.settings.provider)
  const keys = useStore((s) => s.settings.keys)
  const docCount = useStore((s) => s.docs.length)

  const generate = async () => {
    const s = getState()
    if (!s.settings.keys[s.settings.provider]) {
      actions.toast('প্রথমে একটি API Key যোগ করুন', 'info')
      actions.openSettings(true)
      return
    }
    setLoading(true)
    setProgress('প্রশ্ন তৈরি হচ্ছে…')
    const controller = new AbortController()
    abortRef.current = controller

    try {
      let context = ''
      if (useBrainCtx) {
        const hits = retrieve(`${subject} ${topic}`, s.docs, KNOWLEDGE_BASE, 5)
        context = buildContextBlock(hits, 6000)
      }
      let acc = 0
      const raw = await complete({
        provider: s.settings.provider,
        model: s.settings.model,
        apiKey: s.settings.keys[s.settings.provider],
        temperature: 0.55,
        maxTokens: 4096,
        signal: controller.signal,
        messages: [
          { role: 'system', content: MCQ_SYSTEM },
          { role: 'user', content: mcqPrompt({ subject, topic, count, difficulty, context }) },
        ],
        onDelta: (d) => {
          acc += d.length
          setProgress(`প্রশ্ন তৈরি হচ্ছে… ${Math.min(99, Math.round((acc / (count * 170)) * 100))}%`)
        },
      })
      const parsed = parseMcqJson(raw, subject, topic || undefined)
      if (!parsed.length) {
        actions.toast('মডেল সঠিক JSON দেয়নি — আবার চেষ্টা করুন বা অন্য মডেল বেছে নিন', 'err')
      } else {
        setQuiz(parsed)
      }
    } catch (err) {
      actions.toast(networkHint(err, getState().settings.provider), 'err')
    } finally {
      setLoading(false)
      setProgress('')
      abortRef.current = null
    }
  }

  if (quiz) {
    return (
      <div className="h-full overflow-y-auto">
        <QuizRunner
          questions={quiz}
          title={`${subject}${topic ? ' — ' + topic : ''} MCQ টেস্ট`}
          mode="ai"
          subject={subject}
          topic={topic || undefined}
          seconds={timed ? quiz.length * 45 : undefined}
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
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ios-green to-ios-teal shadow-lg shadow-ios-green/25">
              <ListChecks size={21} className="text-white" />
            </div>
            <div>
              <h2 className="text-[17px] font-bold tracking-tight">ইন্টারঅ্যাক্টিভ MCQ টেস্ট</h2>
              <p className="text-[12.5px] muted">যেকোনো অধ্যায়ে তাৎক্ষণিক প্রশ্ন · সাথে সাথে ব্যাখ্যা</p>
            </div>
          </div>

          <label className="mb-1.5 block text-[13px] font-medium">বিষয়</label>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {SUBJECTS.slice(0, 8).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSubject(s)
                  setTopic('')
                }}
                className={`chip ${subject === s ? '!bg-ios-blue/15 !text-ios-blue !border-ios-blue/30' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="mb-1.5 block text-[13px] font-medium">অধ্যায় / টপিক</label>
          <input
            className="input mb-2"
            placeholder="যেমন: সমাস, মুক্তিযুদ্ধ, Tense… (খালি রাখলে পুরো বিষয় থেকে)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          {(PRESET_TOPICS[subject] || []).length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {PRESET_TOPICS[subject].map((t) => (
                <button key={t} onClick={() => setTopic(t)} className="chip !py-1 !text-[12px]">
                  {t}
                </button>
              ))}
            </div>
          )}

          <div className="mb-3 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium">প্রশ্ন সংখ্যা</label>
              <div className="seg w-full">
                {[5, 10, 20, 30].map((n) => (
                  <button key={n} data-active={count === n} onClick={() => setCount(n)} className="flex-1 !px-2">
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium">কঠিনতা</label>
              <select className="input !py-2" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option>সহজ (বেসিক)</option>
                <option>ভর্তি পরীক্ষার মান (মাঝারি-কঠিন)</option>
                <option>অত্যন্ত কঠিন (ঢাবি স্ট্যান্ডার্ড)</option>
              </select>
            </div>
          </div>

          <div className="mb-4 space-y-2">
            <Toggle
              on={useBrainCtx}
              onChange={setUseBrainCtx}
              icon={<Brain size={15} className="text-ios-purple" />}
              label="Brain ও নলেজ বেস থেকে প্রশ্ন বানাও"
              hint={docCount ? `${docCount}টি আপলোড করা ফাইল + ভেরিফায়েড কনটেন্ট` : 'ভেরিফায়েড নলেজ বেস ব্যবহার হবে'}
            />
            <Toggle
              on={timed}
              onChange={setTimed}
              icon={<Sparkles size={15} className="text-ios-orange" />}
              label="পরীক্ষার টাইমার চালু করো"
              hint="প্রতি প্রশ্নে ৪৫ সেকেন্ড — আসল পরীক্ষার চাপ অনুভব করো"
            />
          </div>

          <button onClick={generate} disabled={loading} className="btn-primary w-full !rounded-2xl !py-3">
            {loading ? <Loader2 size={17} className="animate-spin" /> : <Wand2 size={17} />}
            {loading ? progress || 'তৈরি হচ্ছে…' : `${count}টি MCQ তৈরি করো`}
          </button>
          {!keys[provider] && (
            <p className="mt-2 text-center text-[11.5px] text-ios-orange">
              ⚠️ এই ফিচারে API Key লাগে ·{' '}
              <button onClick={() => actions.openSettings(true)} className="underline">
                সেটিংসে যোগ করুন
              </button>
            </p>
          )}
        </div>

        <div className="card !p-4">
          <h3 className="mb-1.5 text-[13.5px] font-semibold">💡 কি ছাড়া অনুশীলন করতে চাও?</h3>
          <p className="mb-3 text-[12.5px] leading-relaxed muted">
            ১৪০+ যাচাইকৃত প্রশ্নের অফলাইন <b>কুইজ ব্যাংক</b> সম্পূর্ণ ফ্রি — কোনো API Key ছাড়াই এখনই শুরু করো।
          </p>
          <button onClick={() => actions.setView('quizbank')} className="btn-outline w-full !rounded-2xl">
            কুইজ ব্যাংকে যাও
          </button>
        </div>
      </div>
    </div>
  )
}

function Toggle({
  on,
  onChange,
  label,
  hint,
  icon,
}: {
  on: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
  icon?: React.ReactNode
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition hairline hover:bg-[rgb(var(--line)/0.04)]"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium">{label}</span>
        {hint && <span className="block truncate text-[11px] muted">{hint}</span>}
      </span>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-300 ${
          on ? 'bg-ios-green' : 'bg-[rgb(var(--line)/0.18)]'
        }`}
      >
        <span
          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all duration-300 ${
            on ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}
