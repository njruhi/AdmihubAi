export type ProviderId = 'groq' | 'gemini' | 'openrouter' | 'mistral'
export type ThemeMode = 'light' | 'dark' | 'system'

export type ViewId =
  | 'chat'
  | 'mcq'
  | 'brain'
  | 'knowledge'
  | 'quizbank'
  | 'flashcards'
  | 'notes'
  | 'timer'
  | 'progress'

export interface ApiKeys {
  groq: string
  gemini: string
  openrouter: string
  mistral: string
  tavily: string
}

export interface ModelOption {
  id: string
  label: string
  provider: ProviderId
  note?: string
  fast?: boolean
}

export interface Settings {
  keys: ApiKeys
  provider: ProviderId
  model: string
  temperature: number
  theme: ThemeMode
  useBrain: boolean
  useWeb: boolean
  answerLanguage: 'bn' | 'en' | 'mixed'
  targetUniversity: string
  customModels: ModelOption[]
}

export interface WebSource {
  title: string
  url: string
  snippet?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
  model?: string
  provider?: ProviderId
  sources?: WebSource[]
  refs?: string[]
  error?: boolean
  elapsedMs?: number
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  pinned?: boolean
}

export interface BrainDoc {
  id: string
  name: string
  kind: string
  size: number
  chars: number
  chunks: string[]
  addedAt: number
  enabled: boolean
  tag?: string
}

export interface MemoryNote {
  id: string
  text: string
  createdAt: number
}

export interface Deck {
  id: string
  name: string
  subject: string
  createdAt: number
  builtin?: boolean
}

export interface Flashcard {
  id: string
  deckId: string
  front: string
  back: string
  box: number // 1..5 Leitner box
  due: number
  reviews: number
  lapses: number
}

export interface Note {
  id: string
  title: string
  content: string
  subject: string
  updatedAt: number
}

export interface QuizQuestion {
  id: string
  q: string
  options: string[]
  answer: number
  explain?: string
  subject: string
  topic?: string
}

export interface QuizResult {
  id: string
  subject: string
  topic?: string
  total: number
  correct: number
  mode: 'bank' | 'ai'
  at: number
  durationSec: number
}

export interface StudySession {
  id: string
  at: number
  minutes: number
  kind: 'pomodoro' | 'exam' | 'focus'
  label?: string
}

export interface KbEntry {
  id: string
  subject: string
  topic: string
  title: string
  body: string
  tags?: string[]
}
