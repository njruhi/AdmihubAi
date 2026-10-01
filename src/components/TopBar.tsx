import { useEffect, useMemo, useRef, useState } from 'react'
import { Brain, Check, ChevronDown, Globe, KeyRound, Menu, Settings2, Zap } from 'lucide-react'
import { actions, useStore } from '../store/store'
import { DEFAULT_MODELS, PROVIDERS, prettyModel } from '../lib/providers'
import type { ProviderId } from '../types'

const VIEW_TITLES: Record<string, { title: string; sub: string }> = {
  chat: { title: 'AI স্টাডি এজেন্ট', sub: 'মানবিক বিভাগ · ভর্তি প্রস্তুতি' },
  mcq: { title: 'MCQ টেস্ট মোড', sub: 'যেকোনো অধ্যায়ে তাৎক্ষণিক পরীক্ষা' },
  brain: { title: 'Brain — নলেজ ও মেমোরি', sub: 'নিজের সিলেবাস ও নোট আপলোড' },
  knowledge: { title: 'ভেরিফায়েড নলেজ বেস', sub: 'মানবিক বিভাগের প্রস্তুতি কনটেন্ট' },
  quizbank: { title: 'কুইজ ব্যাংক', sub: 'অফলাইন MCQ — API লাগবে না' },
  flashcards: { title: 'ফ্ল্যাশকার্ড', sub: 'স্পেসড রিপিটিশন রিভিশন' },
  notes: { title: 'শর্ট নোট মেকার', sub: 'লিখুন, সেভ করুন, PDF এক্সপোর্ট' },
  timer: { title: 'স্টাডি ও এক্সাম টাইমার', sub: 'পোমোডোরো + পরীক্ষার সিমুলেটর' },
  progress: { title: 'প্রোগ্রেস ট্র্যাকার', sub: 'স্কোর, সময় ও দুর্বলতা বিশ্লেষণ' },
}

export function TopBar() {
  const view = useStore((s) => s.view)
  const sidebarOpen = useStore((s) => s.sidebarOpen)
  const meta = VIEW_TITLES[view] ?? VIEW_TITLES.chat

  return (
    <header className="glass sticky top-0 z-20 flex items-center gap-2 border-b px-3 py-2.5 sm:px-4">
      <button
        onClick={() => actions.toggleSidebar()}
        className="btn-ghost size-9 shrink-0 !rounded-full !p-0"
        aria-label="মেনু"
        aria-expanded={sidebarOpen}
      >
        <Menu size={18} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold tracking-tight">{meta.title}</h1>
        <p className="truncate text-[11.5px] leading-tight muted">{meta.sub}</p>
      </div>

      {view === 'chat' && <ChatToggles />}
      <ModelPicker />
    </header>
  )
}

function ChatToggles() {
  const useBrain = useStore((s) => s.settings.useBrain)
  const useWeb = useStore((s) => s.settings.useWeb)
  const hasTavily = useStore((s) => !!s.settings.keys.tavily)

  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <button
        onClick={() => actions.patchSettings({ useBrain: !useBrain })}
        className={`chip ${useBrain ? '!bg-ios-purple/15 !text-ios-purple !border-ios-purple/25' : ''}`}
        title="নিজের আপলোড করা ফাইল ও নলেজ বেস থেকে উত্তর দেবে"
      >
        <Brain size={14} />
        <span className="hidden md:inline">Brain</span>
      </button>
      <button
        onClick={() => {
          if (!hasTavily) {
            actions.toast('Tavily API Key লাগবে — সেটিংসে যোগ করুন', 'info')
            actions.openSettings(true)
            return
          }
          actions.patchSettings({ useWeb: !useWeb })
        }}
        className={`chip ${useWeb && hasTavily ? '!bg-ios-teal/15 !text-ios-teal !border-ios-teal/25' : ''}`}
        title="Tavily দিয়ে লাইভ ওয়েব সার্চ"
      >
        <Globe size={14} />
        <span className="hidden md:inline">ওয়েব</span>
      </button>
    </div>
  )
}

function ModelPicker() {
  const provider = useStore((s) => s.settings.provider)
  const model = useStore((s) => s.settings.model)
  const keys = useStore((s) => s.settings.keys)
  const customModels = useStore((s) => s.settings.customModels)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const grouped = useMemo(() => {
    const all = [...customModels, ...DEFAULT_MODELS]
    const seen = new Set<string>()
    const out: Record<ProviderId, typeof all> = { groq: [], gemini: [], openrouter: [], mistral: [] }
    for (const m of all) {
      const key = `${m.provider}:${m.id}`
      if (seen.has(key)) continue
      seen.add(key)
      out[m.provider].push(m)
    }
    return out
  }, [customModels])

  const hasKey = !!keys[provider]

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn-outline max-w-[46vw] !rounded-2xl !px-2.5 !py-1.5 sm:max-w-none"
      >
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: hasKey ? PROVIDERS[provider].accent : 'rgb(var(--muted))' }}
        />
        <span className="truncate text-[13px] font-medium">{prettyModel(model)}</span>
        <ChevronDown size={14} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="glass absolute right-0 top-[calc(100%+8px)] z-50 max-h-[72vh] w-[320px] overflow-y-auto rounded-3xl p-2 shadow-2xl animate-[pop_.22s_cubic-bezier(.34,1.56,.64,1)]">
          {(Object.keys(grouped) as ProviderId[]).map((pid) => {
            const p = PROVIDERS[pid]
            const ok = !!keys[pid]
            return (
              <div key={pid} className="mb-1.5 last:mb-0">
                <div className="flex items-center gap-2 px-2.5 pb-1 pt-2">
                  <span className="size-2 rounded-full" style={{ background: p.accent }} />
                  <span className="text-[12px] font-semibold">{p.name}</span>
                  <span className="text-[10.5px] muted">{p.tagline}</span>
                  {!ok && (
                    <button
                      onClick={() => {
                        setOpen(false)
                        actions.openSettings(true)
                      }}
                      className="ml-auto flex items-center gap-1 rounded-full bg-ios-orange/15 px-1.5 py-0.5 text-[9.5px] font-semibold text-ios-orange"
                    >
                      <KeyRound size={9} /> কি লাগবে
                    </button>
                  )}
                </div>
                {grouped[pid].slice(0, 14).map((m) => {
                  const active = provider === pid && model === m.id
                  return (
                    <button
                      key={pid + m.id}
                      onClick={() => {
                        actions.setModel(pid, m.id)
                        setOpen(false)
                        if (!keys[pid]) actions.openSettings(true)
                      }}
                      className={`flex w-full items-center gap-2 rounded-2xl px-2.5 py-2 text-left transition ${
                        active ? 'bg-ios-blue/12' : 'hover:bg-[rgb(var(--line)/0.07)]'
                      } ${ok ? '' : 'opacity-60'}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-medium">{m.label}</span>
                          {m.fast && <Zap size={11} className="shrink-0 text-ios-yellow" />}
                        </div>
                        {m.note && <div className="truncate text-[10.5px] muted">{m.note}</div>}
                      </div>
                      {active && <Check size={15} className="shrink-0 text-ios-blue" />}
                    </button>
                  )
                })}
              </div>
            )
          })}
          <button
            onClick={() => {
              setOpen(false)
              actions.openSettings(true)
            }}
            className="btn-ghost mt-1 w-full !rounded-2xl !justify-start"
          >
            <Settings2 size={15} /> <span className="text-[13px]">API Keys ও মডেল লিস্ট রিফ্রেশ</span>
          </button>
        </div>
      )}
    </div>
  )
}
