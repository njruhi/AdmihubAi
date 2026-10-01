import { useSyncExternalStore } from 'react'
import type {
  BrainDoc,
  ChatMessage,
  Conversation,
  Deck,
  Flashcard,
  MemoryNote,
  Note,
  ProviderId,
  QuizResult,
  Settings,
  StudySession,
  ThemeMode,
  ViewId,
} from '../types'
import { brainDb, load, save, uid } from '../lib/storage'
import { BUILTIN_DECKS } from '../data/quizBank'

export interface State {
  settings: Settings
  conversations: Conversation[]
  activeId: string | null
  docs: BrainDoc[]
  memories: MemoryNote[]
  notes: Note[]
  decks: Deck[]
  cards: Flashcard[]
  results: QuizResult[]
  sessions: StudySession[]
  view: ViewId
  sidebarOpen: boolean
  settingsOpen: boolean
  streaming: boolean
  toast: { id: string; text: string; kind: 'ok' | 'err' | 'info' } | null
}

const defaultSettings: Settings = {
  keys: { groq: '', gemini: '', openrouter: '', mistral: '', tavily: '' },
  provider: 'groq',
  model: 'llama-3.3-70b-versatile',
  temperature: 0.4,
  theme: 'dark',
  useBrain: true,
  useWeb: false,
  answerLanguage: 'bn',
  targetUniversity: '',
  customModels: [],
}

function initialState(): State {
  const settings = { ...defaultSettings, ...load<Partial<Settings>>('settings', {}) }
  settings.keys = { ...defaultSettings.keys, ...(settings.keys || {}) }
  const conversations = load<Conversation[]>('conversations', [])
  return {
    settings,
    conversations,
    activeId: conversations[0]?.id ?? null,
    docs: [],
    memories: load<MemoryNote[]>('memories', []),
    notes: load<Note[]>('notes', []),
    decks: load<Deck[]>('decks', []),
    cards: load<Flashcard[]>('cards', []),
    results: load<QuizResult[]>('results', []),
    sessions: load<StudySession[]>('sessions', []),
    view: 'chat',
    sidebarOpen: true,
    settingsOpen: false,
    streaming: false,
    toast: null,
  }
}

let state: State = initialState()
const listeners = new Set<() => void>()

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getState(): State {
  return state
}

export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const next = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

/** Selector hook. Selectors must return stable references (no inline objects). */
export function useStore<S>(selector: (s: State) => S): S {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  )
}

/* ------------------------------------------------------------ persistence */
let saveTimer: number | undefined
function persist() {
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    save('settings', state.settings)
    save('conversations', state.conversations.slice(0, 60))
    save('memories', state.memories)
    save('notes', state.notes)
    save('decks', state.decks)
    save('cards', state.cards)
    save('results', state.results.slice(-300))
    save('sessions', state.sessions.slice(-500))
  }, 250)
}

function update(patch: Partial<State> | ((s: State) => Partial<State>)) {
  setState(patch)
  persist()
}

/* ----------------------------------------------------------------- theme */
export function applyTheme(theme: ThemeMode) {
  const dark = theme === 'dark' || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0b0b0f' : '#f2f2f7')
}

/* --------------------------------------------------------------- actions */
export const actions = {
  /* ui */
  setView(view: ViewId) {
    setState({ view, sidebarOpen: window.innerWidth >= 1024 ? state.sidebarOpen : false })
  },
  toggleSidebar() {
    setState({ sidebarOpen: !state.sidebarOpen })
  },
  setSidebar(open: boolean) {
    setState({ sidebarOpen: open })
  },
  openSettings(open = true) {
    setState({ settingsOpen: open })
  },
  setStreaming(v: boolean) {
    setState({ streaming: v })
  },
  toast(text: string, kind: 'ok' | 'err' | 'info' = 'ok') {
    const id = uid('t')
    setState({ toast: { id, text, kind } })
    window.setTimeout(() => {
      if (getState().toast?.id === id) setState({ toast: null })
    }, 3600)
  },
  dismissToast() {
    setState({ toast: null })
  },

  /* settings */
  patchSettings(patch: Partial<Settings>) {
    update({ settings: { ...state.settings, ...patch } })
  },
  setKey(provider: keyof Settings['keys'], value: string) {
    update({ settings: { ...state.settings, keys: { ...state.settings.keys, [provider]: value.trim() } } })
  },
  setTheme(theme: ThemeMode) {
    applyTheme(theme)
    update({ settings: { ...state.settings, theme } })
  },
  setModel(provider: ProviderId, model: string) {
    update({ settings: { ...state.settings, provider, model } })
  },

  /* conversations */
  newConversation(): string {
    const conv: Conversation = {
      id: uid('c'),
      title: 'নতুন চ্যাট',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    update({ conversations: [conv, ...state.conversations], activeId: conv.id, view: 'chat' })
    return conv.id
  },
  ensureConversation(): string {
    const active = state.conversations.find((c) => c.id === state.activeId)
    if (active) return active.id
    return actions.newConversation()
  },
  selectConversation(id: string) {
    setState({ activeId: id, view: 'chat', sidebarOpen: window.innerWidth >= 1024 })
  },
  deleteConversation(id: string) {
    const rest = state.conversations.filter((c) => c.id !== id)
    update({ conversations: rest, activeId: state.activeId === id ? (rest[0]?.id ?? null) : state.activeId })
  },
  renameConversation(id: string, title: string) {
    update({
      conversations: state.conversations.map((c) => (c.id === id ? { ...c, title: title.slice(0, 80) } : c)),
    })
  },
  clearConversations() {
    update({ conversations: [], activeId: null })
  },
  addMessage(convId: string, msg: ChatMessage) {
    update({
      conversations: state.conversations.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: [...c.messages, msg],
              updatedAt: Date.now(),
              title:
                c.messages.length === 0 && msg.role === 'user'
                  ? msg.content.replace(/\s+/g, ' ').slice(0, 42) + (msg.content.length > 42 ? '…' : '')
                  : c.title,
            }
          : c,
      ),
    })
  },
  patchMessage(convId: string, msgId: string, patch: Partial<ChatMessage>) {
    setState({
      conversations: state.conversations.map((c) =>
        c.id === convId
          ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)), updatedAt: Date.now() }
          : c,
      ),
    })
  },
  commitMessages() {
    persist()
  },
  removeMessagesFrom(convId: string, msgId: string) {
    update({
      conversations: state.conversations.map((c) => {
        if (c.id !== convId) return c
        const idx = c.messages.findIndex((m) => m.id === msgId)
        return idx < 0 ? c : { ...c, messages: c.messages.slice(0, idx) }
      }),
    })
  },

  /* brain docs (IndexedDB) */
  async loadDocs() {
    const docs = await brainDb.all()
    setState({ docs })
  },
  async addDoc(doc: BrainDoc) {
    await brainDb.put(doc)
    setState({ docs: [doc, ...state.docs] })
  },
  async removeDoc(id: string) {
    await brainDb.del(id)
    setState({ docs: state.docs.filter((d) => d.id !== id) })
  },
  async toggleDoc(id: string) {
    const doc = state.docs.find((d) => d.id === id)
    if (!doc) return
    const next = { ...doc, enabled: !doc.enabled }
    await brainDb.put(next)
    setState({ docs: state.docs.map((d) => (d.id === id ? next : d)) })
  },
  async clearDocs() {
    await brainDb.clear()
    setState({ docs: [] })
  },

  /* memory */
  addMemory(text: string) {
    if (!text.trim()) return
    update({ memories: [{ id: uid('m'), text: text.trim(), createdAt: Date.now() }, ...state.memories] })
  },
  removeMemory(id: string) {
    update({ memories: state.memories.filter((m) => m.id !== id) })
  },

  /* notes */
  upsertNote(note: Note) {
    const exists = state.notes.some((n) => n.id === note.id)
    update({
      notes: exists ? state.notes.map((n) => (n.id === note.id ? note : n)) : [note, ...state.notes],
    })
  },
  deleteNote(id: string) {
    update({ notes: state.notes.filter((n) => n.id !== id) })
  },

  /* flashcards */
  seedDecks() {
    if (state.decks.length) return
    const decks: Deck[] = []
    const cards: Flashcard[] = []
    for (const d of BUILTIN_DECKS) {
      const deckId = uid('d')
      decks.push({ id: deckId, name: d.name, subject: d.subject, createdAt: Date.now(), builtin: true })
      for (const [front, back] of d.cards) {
        cards.push({ id: uid('f'), deckId, front, back, box: 1, due: Date.now(), reviews: 0, lapses: 0 })
      }
    }
    update({ decks, cards })
  },
  addDeck(name: string, subject: string): string {
    const deck: Deck = { id: uid('d'), name, subject, createdAt: Date.now() }
    update({ decks: [deck, ...state.decks] })
    return deck.id
  },
  deleteDeck(id: string) {
    update({ decks: state.decks.filter((d) => d.id !== id), cards: state.cards.filter((c) => c.deckId !== id) })
  },
  addCard(deckId: string, front: string, back: string) {
    const card: Flashcard = { id: uid('f'), deckId, front, back, box: 1, due: Date.now(), reviews: 0, lapses: 0 }
    update({ cards: [...state.cards, card] })
  },
  addCards(deckId: string, rows: [string, string][]) {
    const cards = rows.map(([front, back]) => ({
      id: uid('f'),
      deckId,
      front,
      back,
      box: 1,
      due: Date.now(),
      reviews: 0,
      lapses: 0,
    }))
    update({ cards: [...state.cards, ...cards] })
  },
  deleteCard(id: string) {
    update({ cards: state.cards.filter((c) => c.id !== id) })
  },
  reviewCard(id: string, grade: 'again' | 'good' | 'easy') {
    const DAY = 86400000
    update({
      cards: state.cards.map((c) => {
        if (c.id !== id) return c
        let box = c.box
        if (grade === 'again') box = 1
        else if (grade === 'good') box = Math.min(5, box + 1)
        else box = Math.min(5, box + 2)
        const gaps = [0, 1, 3, 7, 15, 30]
        return {
          ...c,
          box,
          due: Date.now() + gaps[box] * DAY,
          reviews: c.reviews + 1,
          lapses: grade === 'again' ? c.lapses + 1 : c.lapses,
        }
      }),
    })
  },

  /* progress */
  addResult(r: Omit<QuizResult, 'id' | 'at'>) {
    update({ results: [...state.results, { ...r, id: uid('r'), at: Date.now() }] })
  },
  addSession(s: Omit<StudySession, 'id' | 'at'>) {
    update({ sessions: [...state.sessions, { ...s, id: uid('s'), at: Date.now() }] })
  },
  resetProgress() {
    update({ results: [], sessions: [] })
  },
}

export function activeConversation(s: State): Conversation | null {
  return s.conversations.find((c) => c.id === s.activeId) ?? null
}
