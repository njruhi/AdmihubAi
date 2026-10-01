import type { BrainDoc, KbEntry } from '../types'

/* Lightweight, 100% offline retrieval (no embedding API needed).
 * Bangla + English aware tokenizer with IDF weighted scoring. */

const STOP = new Set([
  // bn
  'এবং','বা','কিন্তু','তবে','যে','যা','এই','ওই','সেই','একটি','একটা','এর','তার','আমি','আমার','আমরা','তুমি','তোমার',
  'করে','করা','করতে','হয়','হয়েছে','ছিল','থেকে','জন্য','সাথে','মধ্যে','কি','কী','কেন','কোন','কোনো','না','নি','ও',
  'হলো','হল','এটি','এটা','তারা','দিয়ে','উপর','পর','আরো','আরও','মত','মতো','সব','সকল','যদি','তাহলে','এবংকি',
  // en
  'the','a','an','and','or','but','of','to','in','on','for','with','is','are','was','were','be','been','it','this',
  'that','as','at','by','from','what','which','who','how','why','when','where','do','does','did','not','no','can',
  'will','would','should','could','i','you','he','she','they','we','my','your','me','us','them','about','into',
])

/* Bengali is an abugida: vowel signs (া ি ী ু) and the virama (্) are Unicode
 * *marks*, not letters — so \p{M} must be part of the word pattern, otherwise
 * "সংবিধান" shatters into meaningless fragments. */
const WORD_RE = /[\p{L}\p{N}\p{M}]+/gu

/** Light suffix stripper so "বাংলাদেশের" also matches "বাংলাদেশ". */
const BN_SUFFIX =
  /(?:দেরকে|গুলোকে|গুলোতে|গুলোর|গুলিতে|গুলোয়|গুলো|গুলি|দেরই|দের|েরা|কেই|েতে|েকে|েরই|ের|তে|কে|রা|টি|টা|খানা|খানি|য়ের|য়ে|ই|র|ে)$/u

export function stem(token: string): string {
  if (/[\u0980-\u09FF]/.test(token)) {
    if (token.length > 4) {
      const s = token.replace(BN_SUFFIX, '')
      if (s.length >= 3) return s
    }
    return token
  }
  if (token.length > 4) {
    if (token.endsWith('ies')) return token.slice(0, -3) + 'y'
    if (token.endsWith('es')) return token.slice(0, -2)
    if (token.endsWith('s')) return token.slice(0, -1)
    if (token.endsWith('ing')) return token.slice(0, -3)
  }
  return token
}

/** Second-level stem for Bengali derivations: প্রতিষ্ঠিত / প্রতিষ্ঠা → প্রতিষ্ঠ */
const BN_DERIV = /(?:ানো|িত|তা|ন|া)$/u

/** Exact tokens score fully; stems/derivations are damped so precision survives. */
const W_EXACT = 1
const W_STEM = 0.5
const W_DERIV = 0.3

export function tokenVariants(t: string): [string, number][] {
  const out: [string, number][] = [[t, W_EXACT]]
  const s = stem(t)
  if (s !== t && s.length >= 2 && !STOP.has(s)) out.push([s, W_STEM])
  if (/[\u0980-\u09FF]/.test(s) && s.length >= 5) {
    const d = s.replace(BN_DERIV, '')
    if (d !== s && d.length >= 4 && !STOP.has(d)) out.push([d, W_DERIV])
  }
  return out
}

/** Weighted term-frequency map for a piece of text. */
export function weighTerms(text: string): Map<string, number> {
  const raw = text.toLowerCase().match(WORD_RE) || []
  const map = new Map<string, number>()
  for (const t of raw) {
    if (t.length < 2 || STOP.has(t)) continue
    for (const [term, w] of tokenVariants(t)) map.set(term, (map.get(term) || 0) + w)
  }
  return map
}

export function tokenize(text: string): string[] {
  return [...weighTerms(text).keys()]
}

export function chunkText(text: string, size = 900, overlap = 140): string[] {
  const clean = text.replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (!clean) return []
  if (clean.length <= size) return [clean]

  // split on paragraph/sentence boundaries first, then pack into chunks
  const units = clean.split(/(?<=[।!?\.\n])\s+/)
  const chunks: string[] = []
  let cur = ''
  for (const u of units) {
    if ((cur + ' ' + u).trim().length > size && cur) {
      chunks.push(cur.trim())
      cur = overlap > 0 ? cur.slice(-overlap) + ' ' + u : u
    } else {
      cur = cur ? cur + ' ' + u : u
    }
  }
  if (cur.trim()) chunks.push(cur.trim())
  return chunks.filter((c) => c.length > 30)
}

export interface Retrieved {
  text: string
  source: string
  score: number
  kind: 'doc' | 'kb'
}

interface Indexed {
  text: string
  source: string
  kind: 'doc' | 'kb'
  tf: Map<string, number>
  len: number
}

function buildIndex(docs: BrainDoc[], kb: KbEntry[]): Indexed[] {
  const items: Indexed[] = []
  for (const d of docs) {
    if (!d.enabled) continue
    for (const c of d.chunks) items.push(mkItem(c, d.name, 'doc'))
  }
  for (const e of kb) {
    // title/topic terms are repeated so they carry more weight than body text
    const head = `${e.title} ${e.topic} ${e.subject} ${(e.tags || []).join(' ')}`
    items.push(
      mkItem(`${e.title}\n${e.body}`, `নলেজ বেস · ${e.subject} › ${e.topic}`, 'kb', `${head} ${head} ${head}`),
    )
  }
  return items
}

function mkItem(text: string, source: string, kind: 'doc' | 'kb', boost?: string): Indexed {
  const tf = weighTerms(boost ? `${boost} ${text}` : text)
  let len = 0
  for (const v of tf.values()) len += v
  return { text, source, kind, tf, len: Math.max(len, 1) }
}

/** BM25-lite ranking over uploaded docs + built-in knowledge base. */
export function retrieve(
  query: string,
  docs: BrainDoc[],
  kb: KbEntry[],
  topK = 6,
): Retrieved[] {
  const q = [...weighTerms(query).entries()]
  if (!q.length) return []
  const items = buildIndex(docs, kb)
  if (!items.length) return []

  const N = items.length
  const df = new Map<string, number>()
  for (const [term] of q) {
    if (df.has(term)) continue
    let c = 0
    for (const it of items) if (it.tf.has(term)) c++
    df.set(term, c)
  }
  const avgLen = items.reduce((s, i) => s + i.len, 0) / N
  const k1 = 1.4
  const b = 0.72

  const scored = items.map((it) => {
    let score = 0
    for (const [term, qw] of q) {
      const f = it.tf.get(term)
      if (!f) continue
      const n = df.get(term) || 0
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      score += qw * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * it.len) / avgLen)))
    }
    // tiny preference for the user's own uploads
    if (it.kind === 'doc') score *= 1.12
    return { text: it.text, source: it.source, score, kind: it.kind }
  })

  return scored
    .filter((s) => s.score > 0.8)
    .sort((a, b2) => b2.score - a.score)
    .slice(0, topK)
}

export function buildContextBlock(hits: Retrieved[], maxChars = 7000): string {
  if (!hits.length) return ''
  let out = ''
  let used = 0
  const lines: string[] = []
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i]
    const snippet = h.text.length > 1600 ? h.text.slice(0, 1600) + '…' : h.text
    const block = `[সূত্র ${i + 1} · ${h.source}]\n${snippet}`
    if (used + block.length > maxChars) break
    lines.push(block)
    used += block.length
  }
  out = lines.join('\n\n---\n\n')
  return out
}
