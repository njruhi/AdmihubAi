import type { ModelOption, ProviderId } from '../types'

export interface ProviderMeta {
  id: ProviderId
  name: string
  tagline: string
  keyUrl: string
  keyHint: string
  accent: string
  needsKey: true
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  groq: {
    id: 'groq',
    name: 'Groq',
    tagline: 'সুপার ফাস্ট · LPU ইনফারেন্স',
    keyUrl: 'https://console.groq.com/keys',
    keyHint: 'gsk_...',
    accent: '#ff6b35',
    needsKey: true,
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    tagline: 'লং কনটেক্সট · ফ্রি টিয়ার',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyHint: 'AIza...',
    accent: '#4285f4',
    needsKey: true,
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    tagline: '৩০০+ মডেল একই কি দিয়ে',
    keyUrl: 'https://openrouter.ai/keys',
    keyHint: 'sk-or-v1-...',
    accent: '#8b5cf6',
    needsKey: true,
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    tagline: 'ইউরোপিয়ান · দক্ষ ও হালকা',
    keyUrl: 'https://console.mistral.ai/api-keys',
    keyHint: 'mistral key',
    accent: '#fa520f',
    needsKey: true,
  },
}

/** Curated defaults — the Settings card can also fetch each provider's live list. */
export const DEFAULT_MODELS: ModelOption[] = [
  // Groq — fastest streaming
  { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B', provider: 'groq', note: 'ব্যালান্সড · শক্তিশালী', fast: true },
  { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant', provider: 'groq', note: 'বিদ্যুৎগতি', fast: true },
  { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B', provider: 'groq', note: 'রিজনিং', fast: true },
  { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B', provider: 'groq', fast: true },
  { id: 'moonshotai/kimi-k2-instruct', label: 'Kimi K2', provider: 'groq', fast: true },
  { id: 'qwen/qwen3-32b', label: 'Qwen 3 32B', provider: 'groq', fast: true },
  { id: 'gemma2-9b-it', label: 'Gemma 2 9B', provider: 'groq', fast: true },
  // Gemini
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini', note: 'দ্রুত ও ফ্রি টিয়ার', fast: true },
  { id: 'gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite', provider: 'gemini', fast: true },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini', note: 'নতুন প্রজন্ম' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini', note: 'সবচেয়ে বুদ্ধিমান' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'gemini', fast: true },
  // OpenRouter
  { id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (free)', provider: 'openrouter', note: 'ফ্রি' },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B', provider: 'openrouter' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat', provider: 'openrouter' },
  { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen 2.5 72B', provider: 'openrouter' },
  { id: 'anthropic/claude-3.5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'openrouter', note: 'প্রিমিয়াম' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o mini', provider: 'openrouter' },
  // Mistral
  { id: 'mistral-large-latest', label: 'Mistral Large', provider: 'mistral' },
  { id: 'mistral-small-latest', label: 'Mistral Small', provider: 'mistral', fast: true },
  { id: 'open-mistral-nemo', label: 'Mistral Nemo', provider: 'mistral', fast: true },
]

export interface ChatTurn {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamOptions {
  provider: ProviderId
  model: string
  apiKey: string
  messages: ChatTurn[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
  onDelta: (text: string) => void
}

export class ProviderError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message)
    this.name = 'ProviderError'
  }
}

function friendlyError(status: number, body: string, provider: ProviderId): string {
  const name = PROVIDERS[provider].name
  const detail = extractApiMessage(body)
  if (status === 401 || status === 403)
    return `${name} API Key গ্রহণ করেনি (${status})। সেটিংসে গিয়ে কি-টি আবার চেক করুন।${detail ? `\n\n\`${detail}\`` : ''}`
  if (status === 404)
    return `মডেলটি ${name}-এ পাওয়া যায়নি (404)। সেটিংস → মডেল লিস্ট রিফ্রেশ করে সঠিক মডেল বেছে নিন।${detail ? `\n\n\`${detail}\`` : ''}`
  if (status === 429)
    return `${name} রেট লিমিট (429)। একটু পরে আবার চেষ্টা করুন, বা অন্য মডেল/প্রোভাইডার বেছে নিন।${detail ? `\n\n\`${detail}\`` : ''}`
  if (status >= 500) return `${name} সার্ভারে সমস্যা (${status})। একটু পরে আবার চেষ্টা করুন।`
  return `${name} রিকোয়েস্ট ব্যর্থ (${status})।${detail ? `\n\n\`${detail}\`` : ''}`
}

function extractApiMessage(body: string): string {
  try {
    const j = JSON.parse(body)
    return (j?.error?.message || j?.message || j?.error || '').toString().slice(0, 400)
  } catch {
    return body.slice(0, 240)
  }
}

export function networkHint(err: unknown, provider: ProviderId): string {
  if (err instanceof ProviderError) return err.message
  const msg = err instanceof Error ? err.message : String(err)
  if (/abort/i.test(msg)) return '⏹️ জেনারেশন থামানো হয়েছে।'
  return `${PROVIDERS[provider].name}-এ কানেক্ট করা যায়নি (${msg})। ইন্টারনেট সংযোগ, অথবা ব্রাউজার থেকে সরাসরি কল ব্লক (CORS/অ্যাডব্লকার) কিনা দেখুন।`
}

/* ------------------------------------------------------------------ *
 * SSE reader shared by all OpenAI-compatible providers + Gemini
 * ------------------------------------------------------------------ */
async function readSse(res: Response, onEvent: (data: string) => void) {
  const reader = res.body?.getReader()
  if (!reader) throw new ProviderError('স্ট্রিম রিডার পাওয়া যায়নি।')
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n')
    buffer = parts.pop() ?? ''
    for (const raw of parts) {
      const line = raw.trim()
      if (!line || line.startsWith(':')) continue
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') return
      onEvent(data)
    }
  }
  const tail = buffer.trim()
  if (tail.startsWith('data:')) {
    const data = tail.slice(5).trim()
    if (data && data !== '[DONE]') onEvent(data)
  }
}

const OPENAI_COMPATIBLE: Record<string, { url: string; headers: (k: string) => Record<string, string> }> = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    headers: (k) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${k}` }),
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    headers: (k) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${k}`,
      'X-Title': 'AdmihubAi',
    }),
  },
  mistral: {
    url: 'https://api.mistral.ai/v1/chat/completions',
    headers: (k) => ({
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: `Bearer ${k}`,
    }),
  },
}

/** Streams a chat completion, calling `onDelta` for every token chunk. */
export async function streamChat(opts: StreamOptions): Promise<string> {
  const { provider, model, apiKey, messages, temperature = 0.4, maxTokens = 4096, signal, onDelta } = opts
  if (!apiKey) throw new ProviderError(`${PROVIDERS[provider].name}-এর API Key সেট করা নেই। ⚙️ সেটিংস থেকে কি যোগ করুন।`)

  let full = ''
  const push = (t: string) => {
    if (!t) return
    full += t
    onDelta(t)
  }

  if (provider === 'gemini') {
    const sys = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n')
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        contents,
        ...(sys ? { systemInstruction: { parts: [{ text: sys }] } } : {}),
        generationConfig: { temperature, maxOutputTokens: maxTokens },
        safetySettings: [
          'HARM_CATEGORY_HARASSMENT',
          'HARM_CATEGORY_HATE_SPEECH',
          'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          'HARM_CATEGORY_DANGEROUS_CONTENT',
        ].map((category) => ({ category, threshold: 'BLOCK_ONLY_HIGH' })),
      }),
    })
    if (!res.ok) throw new ProviderError(friendlyError(res.status, await res.text(), provider), res.status)
    await readSse(res, (data) => {
      try {
        const j = JSON.parse(data)
        const parts = j?.candidates?.[0]?.content?.parts
        if (Array.isArray(parts)) for (const p of parts) if (typeof p?.text === 'string') push(p.text)
      } catch {
        /* partial json — ignore */
      }
    })
    return full
  }

  const cfg = OPENAI_COMPATIBLE[provider]
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: cfg.headers(apiKey),
    signal,
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }),
  })
  if (!res.ok) throw new ProviderError(friendlyError(res.status, await res.text(), provider), res.status)
  await readSse(res, (data) => {
    try {
      const j = JSON.parse(data)
      const delta = j?.choices?.[0]?.delta
      if (typeof delta?.content === 'string') push(delta.content)
      else if (typeof j?.choices?.[0]?.text === 'string') push(j.choices[0].text)
    } catch {
      /* ignore */
    }
  })
  return full
}

/** Non-streaming helper (used for MCQ / JSON generation). */
export async function complete(
  opts: Omit<StreamOptions, 'onDelta'> & { onDelta?: (t: string) => void },
): Promise<string> {
  return streamChat({ ...opts, onDelta: opts.onDelta ?? (() => {}) })
}

/* ------------------------------------------------------------------ *
 * Live model discovery
 * ------------------------------------------------------------------ */
export async function fetchModels(provider: ProviderId, apiKey: string): Promise<ModelOption[]> {
  const mk = (id: string, note?: string): ModelOption => ({
    id,
    label: prettyModel(id),
    provider,
    note,
    fast: provider === 'groq',
  })

  if (provider === 'gemini') {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=200&key=${encodeURIComponent(apiKey)}`,
    )
    if (!res.ok) throw new ProviderError(friendlyError(res.status, await res.text(), provider), res.status)
    const j = await res.json()
    return (j.models || [])
      .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m: any) => mk(String(m.name).replace(/^models\//, ''), m.displayName))
      .filter((m: ModelOption) => !/embedding|aqa|imagen|veo|tts/i.test(m.id))
  }

  const urls: Record<string, string> = {
    groq: 'https://api.groq.com/openai/v1/models',
    openrouter: 'https://openrouter.ai/api/v1/models',
    mistral: 'https://api.mistral.ai/v1/models',
  }
  const res = await fetch(urls[provider], {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  })
  if (!res.ok) throw new ProviderError(friendlyError(res.status, await res.text(), provider), res.status)
  const j = await res.json()
  const rows: any[] = j.data || j.models || []
  return rows
    .map((m) => mk(String(m.id), m.name && m.name !== m.id ? String(m.name) : undefined))
    .filter((m) => !/whisper|tts|embed|guard|moderation|distil-whisper|playai/i.test(m.id))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export function prettyModel(id: string): string {
  const base = id.split('/').pop() || id
  return base
    .replace(/[-_]/g, ' ')
    .replace(/\b(\w)/g, (c) => c.toUpperCase())
    .replace(/\bIt\b/, 'IT')
    .trim()
}
