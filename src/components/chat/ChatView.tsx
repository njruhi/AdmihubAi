import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Brain,
  Check,
  Copy,
  ExternalLink,
  FileDown,
  GraduationCap,
  Globe,
  Link2,
  NotebookPen,
  Paperclip,
  RefreshCw,
  Square,
  Timer,
} from 'lucide-react'
import { actions, activeConversation, useStore } from '../../store/store'
import { useChat } from '../../hooks/useChat'
import { Markdown } from '../ui/Markdown'
import { QUICK_PROMPTS, STUDY_PLAN_PROMPT } from '../../data/prompts'
import { exportPdf, exportText } from '../../lib/exporter'
import { uid } from '../../lib/storage'
import type { ChatMessage } from '../../types'

export function ChatView() {
  const conv = useStore(activeConversation)
  const streaming = useStore((s) => s.streaming)
  const { send, stop, regenerate } = useChat()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [stick, setStick] = useState(true)

  const messages = conv?.messages ?? []

  useLayoutEffect(() => {
    if (!stick) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, stick])

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    setStick(el.scrollHeight - el.scrollTop - el.clientHeight < 90)
  }

  return (
    <div className="relative flex h-full flex-col">
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-3xl px-3 pb-6 pt-4 sm:px-5">
          {messages.length === 0 ? (
            <EmptyState onPick={(p) => send(p)} />
          ) : (
            <div className="space-y-5">
              {messages.map((m, i) => (
                <Bubble
                  key={m.id}
                  msg={m}
                  streaming={streaming && i === messages.length - 1 && m.role === 'assistant'}
                  onRegenerate={() => regenerate(m.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {!stick && messages.length > 0 && (
        <button
          onClick={() => {
            setStick(true)
            const el = scrollRef.current
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
          }}
          className="glass absolute bottom-[112px] left-1/2 z-10 grid size-9 -translate-x-1/2 place-items-center rounded-full shadow-lg animate-[pop_.2s_ease]"
          aria-label="নিচে যান"
        >
          <ArrowDown size={16} />
        </button>
      )}

      <Composer onSend={send} onStop={stop} streaming={streaming} />
    </div>
  )
}

/* ------------------------------------------------------------- empty UI */
function EmptyState({ onPick }: { onPick: (p: string) => void }) {
  const hasAnyKey = useStore((s) => Object.values(s.settings.keys).some(Boolean))
  return (
    <div className="stagger flex flex-col items-center pt-6 text-center sm:pt-10">
      <div className="grid size-16 place-items-center rounded-[22px] bg-gradient-to-br from-ios-blue to-ios-purple shadow-xl shadow-ios-blue/30">
        <GraduationCap size={30} className="text-white" />
      </div>
      <h2 className="mt-4 text-[26px] font-bold tracking-tight sm:text-[30px]">
        কী পড়বে আজ?
      </h2>
      <p className="mt-1.5 max-w-md text-[14px] leading-relaxed muted">
        মানবিক বিভাগের ভর্তি পরীক্ষার জন্য তোমার নিজস্ব AI শিক্ষক। বাংলা, ইংরেজি, সাধারণ জ্ঞান, পৌরনীতি, ইতিহাস ও
        অর্থনীতি — যেকোনো প্রশ্ন করো।
      </p>

      {!hasAnyKey && (
        <button
          onClick={() => actions.openSettings(true)}
          className="mt-4 flex items-center gap-2 rounded-2xl border border-ios-orange/30 bg-ios-orange/10 px-3.5 py-2 text-[12.5px] font-medium text-ios-orange transition hover:bg-ios-orange/15"
        >
          🔑 শুরু করতে একটি ফ্রি API Key যোগ করো (Groq সবচেয়ে দ্রুত)
        </button>
      )}

      <div className="mt-6 grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.label}
            onClick={() => onPick(q.prompt)}
            className="card group flex items-start gap-3 !p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
          >
            <span className="text-[19px] leading-none">{q.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13.5px] font-medium">{q.label}</span>
              <span className="block truncate text-[11px] muted">{q.subject}</span>
            </span>
            <ArrowUp size={14} className="mt-0.5 shrink-0 rotate-45 muted transition group-hover:text-ios-blue" />
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button onClick={() => onPick(STUDY_PLAN_PROMPT)} className="chip">
          🗓️ ৩০ দিনের স্টাডি প্ল্যান বানাও
        </button>
        <button onClick={() => actions.setView('mcq')} className="chip">
          <Timer size={13} /> MCQ টেস্ট মোড
        </button>
        <button onClick={() => actions.setView('brain')} className="chip">
          <Brain size={13} /> নিজের নোট আপলোড করো
        </button>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- bubble */
function Bubble({
  msg,
  streaming,
  onRegenerate,
}: {
  msg: ChatMessage
  streaming: boolean
  onRegenerate: () => void
}) {
  const [copied, setCopied] = useState(false)

  if (msg.role === 'user') {
    return (
      <div className="flex justify-end animate-[fade-up_.3s_cubic-bezier(.16,1,.3,1)]">
        <div className="max-w-[86%] rounded-[22px] rounded-br-lg bg-gradient-to-br from-[#2b96ff] to-ios-blue px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-lg shadow-ios-blue/25">
          <div className="whitespace-pre-wrap break-words">{msg.content}</div>
        </div>
      </div>
    )
  }

  const empty = !msg.content

  return (
    <div className="group animate-[fade-up_.3s_cubic-bezier(.16,1,.3,1)]">
      <div className="flex gap-2.5">
        <div className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-ios-blue to-ios-purple shadow-md shadow-ios-blue/25">
          <GraduationCap size={14} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          {(msg.refs?.length || msg.sources?.length) && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {msg.refs?.slice(0, 4).map((r) => (
                <span
                  key={r}
                  className="inline-flex max-w-[220px] items-center gap-1 rounded-full bg-ios-purple/12 px-2 py-0.5 text-[10.5px] font-medium text-ios-purple"
                >
                  <Brain size={10} className="shrink-0" />
                  <span className="truncate">{r}</span>
                </span>
              ))}
              {msg.sources?.slice(0, 4).map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-[220px] items-center gap-1 rounded-full bg-ios-teal/12 px-2 py-0.5 text-[10.5px] font-medium text-ios-teal hover:bg-ios-teal/20"
                >
                  <Link2 size={10} className="shrink-0" />
                  <span className="truncate">{new URL(s.url).hostname.replace('www.', '')}</span>
                </a>
              ))}
            </div>
          )}

          {empty && streaming ? (
            <div className="flex items-center gap-2 py-1">
              <span className="flex gap-1">
                <i className="size-1.5 animate-bounce rounded-full bg-ios-blue [animation-delay:-.3s]" />
                <i className="size-1.5 animate-bounce rounded-full bg-ios-purple [animation-delay:-.15s]" />
                <i className="size-1.5 animate-bounce rounded-full bg-ios-pink" />
              </span>
              <span className="text-[12.5px] muted">ভাবছি…</span>
            </div>
          ) : (
            <div className={msg.error ? 'rounded-2xl border border-ios-red/25 bg-ios-red/6 p-3' : ''}>
              <Markdown>{msg.content}</Markdown>
              {streaming && <span className="ml-0.5 inline-block h-4 w-[2px] animate-[blink_1s_steps(2,start)_infinite] bg-ios-blue align-middle" />}
            </div>
          )}

          {!streaming && msg.content && (
            <div className="mt-2 flex flex-wrap items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100">
              <IconBtn
                label={copied ? 'কপি হয়েছে' : 'কপি'}
                onClick={() => {
                  navigator.clipboard.writeText(msg.content)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1600)
                }}
              >
                {copied ? <Check size={13} className="text-ios-green" /> : <Copy size={13} />}
              </IconBtn>
              <IconBtn label="PDF এক্সপোর্ট" onClick={() => exportPdf('AdmihubAi — উত্তর', msg.content)}>
                <FileDown size={13} />
              </IconBtn>
              <IconBtn label="টেক্সট ডাউনলোড" onClick={() => exportText('AdmihubAi-উত্তর', msg.content)}>
                <ExternalLink size={13} />
              </IconBtn>
              <IconBtn
                label="নোট হিসেবে সেভ"
                onClick={() => {
                  actions.upsertNote({
                    id: uid('n'),
                    title: msg.content.replace(/[#*>`]/g, '').trim().split('\n')[0].slice(0, 50) || 'AI নোট',
                    content: msg.content,
                    subject: 'AI চ্যাট',
                    updatedAt: Date.now(),
                  })
                  actions.toast('নোট হিসেবে সেভ হয়েছে ✓')
                }}
              >
                <NotebookPen size={13} />
              </IconBtn>
              <IconBtn label="আবার তৈরি করো" onClick={onRegenerate}>
                <RefreshCw size={13} />
              </IconBtn>
              {msg.elapsedMs != null && (
                <span className="ml-1 text-[10.5px] muted">{(msg.elapsedMs / 1000).toFixed(1)}s</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function IconBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid size-7 place-items-center rounded-lg muted transition hover:bg-[rgb(var(--line)/0.09)] hover:text-[rgb(var(--text))]"
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------- composer */
function Composer({
  onSend,
  onStop,
  streaming,
}: {
  onSend: (t: string) => void
  onStop: () => void
  streaming: boolean
}) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const useBrain = useStore((s) => s.settings.useBrain)
  const useWeb = useStore((s) => s.settings.useWeb)
  const docCount = useStore((s) => s.docs.length)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 190) + 'px'
  }, [text])

  const submit = () => {
    if (!text.trim() || streaming) return
    onSend(text)
    setText('')
    requestAnimationFrame(() => ref.current?.focus())
  }

  return (
    <div className="shrink-0 px-3 pb-3 pt-1 sm:px-5 sm:pb-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="glass flex items-end gap-2 rounded-[26px] p-1.5 shadow-xl transition-shadow focus-within:shadow-2xl">
          <button
            onClick={() => actions.setView('brain')}
            className="relative mb-0.5 grid size-9 shrink-0 place-items-center rounded-full transition hover:bg-[rgb(var(--line)/0.09)]"
            title="ফাইল আপলোড করে Brain-এ যোগ করুন"
          >
            <Paperclip size={17} className="muted" />
            {docCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-ios-purple text-[9px] font-bold text-white">
                {docCount}
              </span>
            )}
          </button>

          <textarea
            ref={ref}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder="প্রশ্ন লিখো… যেমন: সমাস কত প্রকার ও কী কী?"
            className="max-h-[190px] min-h-[38px] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-relaxed outline-none placeholder:text-[rgb(var(--muted))]"
          />

          {streaming ? (
            <button onClick={onStop} className="btn mb-0.5 size-9 shrink-0 !rounded-full !p-0 bg-[rgb(var(--line)/0.12)]" title="থামান">
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!text.trim()}
              className="btn-primary mb-0.5 size-9 shrink-0 !rounded-full !p-0"
              title="পাঠান (Enter)"
            >
              <ArrowUp size={17} />
            </button>
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-center gap-2.5 px-2 text-[10.5px] muted">
          <span className="hidden sm:inline">Enter — পাঠাও · Shift+Enter — নতুন লাইন</span>
          {useBrain && (
            <span className="flex items-center gap-1 text-ios-purple">
              <Brain size={10} /> Brain চালু
            </span>
          )}
          {useWeb && (
            <span className="flex items-center gap-1 text-ios-teal">
              <Globe size={10} /> লাইভ সার্চ
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
