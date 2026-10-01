import { useCallback, useRef } from 'react'
import { actions, getState } from '../store/store'
import { streamChat, networkHint, type ChatTurn } from '../lib/providers'
import { buildContextBlock, retrieve } from '../lib/brain'
import { KNOWLEDGE_BASE } from '../data/knowledgeBase'
import { systemPrompt } from '../data/prompts'
import { needsFreshInfo, tavilySearch } from '../lib/tavily'
import { uid } from '../lib/storage'
import type { ChatMessage, WebSource } from '../types'

export function useChat() {
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    actions.setStreaming(false)
  }, [])

  const send = useCallback(async (text: string, opts: { convId?: string } = {}) => {
    const trimmed = text.trim()
    if (!trimmed) return
    const s = getState()
    if (s.streaming) return

    const convId = opts.convId ?? actions.ensureConversation()
    const userMsg: ChatMessage = { id: uid('u'), role: 'user', content: trimmed, createdAt: Date.now() }
    actions.addMessage(convId, userMsg)

    const assistantId = uid('a')
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      model: s.settings.model,
      provider: s.settings.provider,
    }
    actions.addMessage(convId, assistantMsg)
    actions.setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller
    const started = performance.now()

    try {
      const st = getState()
      const { settings } = st

      /* 1 — Brain retrieval (uploaded docs + verified knowledge base) */
      let brainBlock = ''
      let refs: string[] = []
      if (settings.useBrain) {
        const hits = retrieve(trimmed, st.docs, KNOWLEDGE_BASE, 6)
        if (hits.length) {
          brainBlock = buildContextBlock(hits)
          refs = Array.from(new Set(hits.map((h) => h.source)))
          actions.patchMessage(convId, assistantId, { refs })
        }
      }

      /* 2 — Tavily live web search */
      let webBlock = ''
      let sources: WebSource[] = []
      const wantWeb = settings.useWeb || (!!settings.keys.tavily && needsFreshInfo(trimmed))
      if (wantWeb && settings.keys.tavily) {
        actions.patchMessage(convId, assistantId, { content: '🌐 লাইভ ওয়েব সার্চ করছি…' })
        try {
          const res = await tavilySearch(settings.keys.tavily, trimmed, {
            maxResults: 6,
            depth: 'basic',
            signal: controller.signal,
          })
          webBlock = res.context
          sources = res.sources
          actions.patchMessage(convId, assistantId, { sources, content: '' })
        } catch (err) {
          actions.toast(err instanceof Error ? err.message : 'Tavily সার্চ ব্যর্থ', 'err')
          actions.patchMessage(convId, assistantId, { content: '' })
        }
      }

      /* 3 — Build the conversation turns */
      const memory = st.memories.map((m) => `• ${m.text}`).join('\n')
      const sys = systemPrompt(settings, { brain: brainBlock, web: webBlock, memory })
      const conv = getState().conversations.find((c) => c.id === convId)
      const history = (conv?.messages ?? [])
        .filter((m) => m.id !== assistantId && !m.error)
        .slice(-10)
        .map<ChatTurn>((m) => ({ role: m.role, content: m.content }))

      const turns: ChatTurn[] = [{ role: 'system', content: sys }, ...history]

      /* 4 — Stream */
      let acc = ''
      let raf = 0
      const flush = () => {
        raf = 0
        actions.patchMessage(convId, assistantId, { content: acc })
      }
      await streamChat({
        provider: settings.provider,
        model: settings.model,
        apiKey: settings.keys[settings.provider],
        messages: turns,
        temperature: settings.temperature,
        signal: controller.signal,
        onDelta: (d) => {
          acc += d
          if (!raf) raf = requestAnimationFrame(flush)
        },
      })
      if (raf) cancelAnimationFrame(raf)
      actions.patchMessage(convId, assistantId, {
        content: acc || '*(খালি উত্তর এসেছে — অন্য মডেল দিয়ে আবার চেষ্টা করুন)*',
        elapsedMs: Math.round(performance.now() - started),
      })
    } catch (err) {
      const msg = networkHint(err, getState().settings.provider)
      const current = getState().conversations.find((c) => c.id === convId)?.messages.find((m) => m.id === assistantId)
      actions.patchMessage(convId, assistantId, {
        content: current?.content ? `${current.content}\n\n---\n⚠️ ${msg}` : `⚠️ ${msg}`,
        error: true,
      })
    } finally {
      abortRef.current = null
      actions.setStreaming(false)
      actions.commitMessages()
    }
  }, [])

  const regenerate = useCallback(
    async (assistantMsgId: string) => {
      const s = getState()
      const conv = s.conversations.find((c) => c.id === s.activeId)
      if (!conv) return
      const idx = conv.messages.findIndex((m) => m.id === assistantMsgId)
      if (idx < 1) return
      const prevUser = conv.messages[idx - 1]
      if (prevUser.role !== 'user') return
      actions.removeMessagesFrom(conv.id, prevUser.id)
      await send(prevUser.content, { convId: conv.id })
    },
    [send],
  )

  return { send, stop, regenerate }
}
