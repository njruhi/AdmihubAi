import type { WebSource } from '../types'

export interface TavilyResult {
  answer?: string
  sources: WebSource[]
  context: string
}

/** Tavily live web search — used for সার্কুলার / কারেন্ট অ্যাফেয়ার্স. */
export async function tavilySearch(
  apiKey: string,
  query: string,
  opts: { maxResults?: number; depth?: 'basic' | 'advanced'; days?: number; signal?: AbortSignal } = {},
): Promise<TavilyResult> {
  if (!apiKey) throw new Error('Tavily API Key সেট করা নেই। ⚙️ সেটিংস → API Keys থেকে যোগ করুন।')
  const { maxResults = 6, depth = 'basic', days, signal } = opts

  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify({
      api_key: apiKey, // legacy-compatible
      query,
      search_depth: depth,
      max_results: maxResults,
      include_answer: true,
      include_raw_content: false,
      ...(days ? { topic: 'news', days } : {}),
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    let detail = body.slice(0, 200)
    try {
      const j = JSON.parse(body)
      detail = j?.detail?.error || j?.error || j?.detail || detail
    } catch {
      /* ignore */
    }
    if (res.status === 401 || res.status === 403) throw new Error(`Tavily API Key সঠিক নয় (${res.status})। ${detail}`)
    if (res.status === 429) throw new Error('Tavily রেট লিমিট শেষ (429)। পরে আবার চেষ্টা করুন।')
    throw new Error(`Tavily সার্চ ব্যর্থ (${res.status})। ${detail}`)
  }

  const j = await res.json()
  const sources: WebSource[] = (j.results || []).map((r: any) => ({
    title: r.title || r.url,
    url: r.url,
    snippet: (r.content || '').slice(0, 400),
  }))
  const context = [
    j.answer ? `সংক্ষিপ্ত উত্তর: ${j.answer}` : '',
    ...sources.map((s, i) => `[ওয়েব ${i + 1}] ${s.title}\nURL: ${s.url}\n${s.snippet}`),
  ]
    .filter(Boolean)
    .join('\n\n')

  return { answer: j.answer, sources, context }
}

/** Heuristic: does this question need fresh information from the web? */
export function needsFreshInfo(q: string): boolean {
  return /সার্কুলার|বিজ্ঞপ্তি|ভর্তি\s*বিজ্ঞপ্তি|আবেদন|পরীক্ষার\s*তারিখ|রেজাল্ট|ফলাফল|সাম্প্রতিক|কারেন্ট\s*অ্যাফেয়ার্স|current affairs|latest|সর্বশেষ|আজকের|এই\s*বছর|নতুন খবর|news|কবে\s*হবে|কত\s*তারিখ|বর্তমান/i.test(
    q,
  )
}
