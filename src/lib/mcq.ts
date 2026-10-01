import type { QuizQuestion } from '../types'
import { uid } from './storage'

/** Robustly pull a questions array out of a model response. */
export function parseMcqJson(raw: string, subject: string, topic?: string): QuizQuestion[] {
  const text = raw.trim()
  const candidates: string[] = []

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) candidates.push(fence[1])
  candidates.push(text)

  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) candidates.push(text.slice(firstBrace, lastBrace + 1))

  const firstBracket = text.indexOf('[')
  const lastBracket = text.lastIndexOf(']')
  if (firstBracket >= 0 && lastBracket > firstBracket) candidates.push(text.slice(firstBracket, lastBracket + 1))

  for (const c of candidates) {
    const parsed = tryParse(c)
    if (parsed.length) return parsed.map((q) => ({ ...q, subject, topic }))
  }
  return []
}

function tryParse(src: string): QuizQuestion[] {
  let data: any
  try {
    data = JSON.parse(src)
  } catch {
    try {
      // tolerate trailing commas / single quotes around keys
      data = JSON.parse(
        src
          .replace(/,\s*([}\]])/g, '$1')
          .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":'),
      )
    } catch {
      return []
    }
  }
  const rows: any[] = Array.isArray(data) ? data : data?.questions || data?.mcqs || data?.items || []
  if (!Array.isArray(rows)) return []

  return rows
    .map((r) => normalize(r))
    .filter((q): q is QuizQuestion => q !== null)
}

function normalize(r: any): QuizQuestion | null {
  if (!r) return null
  const q = String(r.q ?? r.question ?? r.prompt ?? '').trim()
  let options: string[] = r.options ?? r.choices ?? r.answers ?? []
  if (!Array.isArray(options) && typeof options === 'object' && options !== null) {
    options = Object.values(options).map((v) => String(v))
  }
  options = (options || []).map((o: any) => String(o).replace(/^\s*[(\[]?[ক-ঘa-dA-D][)\].]\s*/, '').trim())
  if (!q || options.length < 2) return null

  let answer = r.answer ?? r.correct ?? r.correctIndex ?? r.answerIndex
  if (typeof answer === 'string') {
    const t = answer.trim()
    const letter = t.match(/^[(\[]?([ক-ঘa-dA-D])[)\].]?$/)
    if (letter) {
      const map: Record<string, number> = { ক: 0, খ: 1, গ: 2, ঘ: 3, a: 0, b: 1, c: 2, d: 3 }
      answer = map[letter[1].toLowerCase()] ?? 0
    } else if (/^\d+$/.test(t)) {
      answer = parseInt(t, 10)
    } else {
      const idx = options.findIndex((o) => o.toLowerCase() === t.toLowerCase())
      answer = idx >= 0 ? idx : 0
    }
  }
  if (typeof answer !== 'number' || answer < 0 || answer >= options.length) answer = 0

  return {
    id: uid('q'),
    q,
    options,
    answer,
    explain: String(r.explain ?? r.explanation ?? r.reason ?? '').trim() || undefined,
    subject: '',
  }
}

export function mcqPrompt(opts: {
  subject: string
  topic: string
  count: number
  difficulty: string
  context?: string
}): string {
  const { subject, topic, count, difficulty, context } = opts
  return `বিষয়: ${subject}
টপিক/অধ্যায়: ${topic || 'সম্পূর্ণ বিষয়ের গুরুত্বপূর্ণ অংশ'}
কঠিনতা: ${difficulty}
সংখ্যা: ${count}টি MCQ

${context ? `নিচের রেফারেন্স টেক্সট থেকে প্রশ্ন তৈরি করো (এর বাইরের তথ্য যোগ করতে পারো যদি ১০০% নিশ্চিত হও):\n"""\n${context.slice(0, 7000)}\n"""\n` : ''}
বাংলাদেশের পাবলিক বিশ্ববিদ্যালয়ের ভর্তি পরীক্ষার (মানবিক ইউনিট) মানে ${count}টি MCQ তৈরি করো। শুধু JSON দাও।`
}

/** Export a quiz as markdown (for PDF / text export). */
export function quizToMarkdown(title: string, questions: QuizQuestion[], picked?: Record<string, number>): string {
  const letters = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ']
  const lines: string[] = []
  questions.forEach((q, i) => {
    lines.push(`**${i + 1}. ${q.q}**`)
    q.options.forEach((o, oi) => {
      const mark = oi === q.answer ? ' ✅' : picked && picked[q.id] === oi ? ' ❌' : ''
      lines.push(`- ${letters[oi] || oi + 1}) ${o}${mark}`)
    })
    lines.push(`> **উত্তর:** ${letters[q.answer] || q.answer + 1}) ${q.options[q.answer]}${q.explain ? ` — ${q.explain}` : ''}`)
    lines.push('')
  })
  return `## ${title}\n\n${lines.join('\n')}`
}
