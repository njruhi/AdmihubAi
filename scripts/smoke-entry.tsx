import { createRoot } from 'react-dom/client'
import App from '../src/App'
import { actions } from '../src/store/store'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function run() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  createRoot(el).render(<App />)
  await sleep(400)
  const checks: [string, string][] = [
    ['chat', 'কী পড়বে আজ'],
    ['mcq', 'ইন্টারঅ্যাক্টিভ MCQ টেস্ট'],
    ['brain', 'তোমার সিলেবাস, হ্যান্ডনোট'],
    ['knowledge', 'খুঁজুন: সমাস'],
    ['quizbank', 'অফলাইন কুইজ ব্যাংক'],
    ['flashcards', 'রেডিমেড ডেক'],
    ['notes', 'Markdown-এ লেখো'],
    ['timer', '🍅 পোমোডোরো'],
    ['progress', 'গড় নির্ভুলতা'],
  ]
  const report: Record<string, string> = {}
  for (const [v, marker] of checks) {
    actions.setView(v as any)
    await sleep(500)
    const html = el.innerHTML
    report[v] = html.includes(marker) ? `✅ ${html.length}` : `❌ MISSING (${html.length}) skel=${html.includes('skeleton')}`
  }
  return { report }
}
