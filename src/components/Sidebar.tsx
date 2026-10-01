import { useState } from 'react'
import {
  Blocks,
  BookOpenCheck,
  Brain,
  GraduationCap,
  Layers,
  LineChart,
  ListChecks,
  MessageSquarePlus,
  Moon,
  NotebookPen,
  Settings2,
  Sparkles,
  Sun,
  Timer,
  Trash2,
  X,
} from 'lucide-react'
import { actions, useStore } from '../store/store'
import type { ViewId } from '../types'

const NAV: { id: ViewId; label: string; icon: typeof Brain; hint: string; free?: boolean }[] = [
  { id: 'chat', label: 'AI চ্যাট', icon: Sparkles, hint: 'পার্সোনাল স্টাডি এজেন্ট' },
  { id: 'mcq', label: 'MCQ টেস্ট', icon: ListChecks, hint: 'যেকোনো টপিকে তাৎক্ষণিক পরীক্ষা' },
  { id: 'brain', label: 'Brain / মেমোরি', icon: Brain, hint: 'নিজের নোট ও সিলেবাস আপলোড' },
  { id: 'knowledge', label: 'নলেজ বেস', icon: BookOpenCheck, hint: 'ভেরিফায়েড মানবিক কনটেন্ট', free: true },
  { id: 'quizbank', label: 'কুইজ ব্যাংক', icon: Blocks, hint: 'অফলাইন MCQ ব্যাংক', free: true },
  { id: 'flashcards', label: 'ফ্ল্যাশকার্ড', icon: Layers, hint: 'স্পেসড রিপিটিশন', free: true },
  { id: 'notes', label: 'শর্ট নোট', icon: NotebookPen, hint: 'নোট লেখা ও এক্সপোর্ট', free: true },
  { id: 'timer', label: 'স্টাডি টাইমার', icon: Timer, hint: 'পোমোডোরো ও এক্সাম সিমুলেটর', free: true },
  { id: 'progress', label: 'প্রোগ্রেস', icon: LineChart, hint: 'স্কোরবোর্ড ও ট্র্যাকার', free: true },
]

export function Sidebar() {
  const open = useStore((s) => s.sidebarOpen)
  const view = useStore((s) => s.view)
  const conversations = useStore((s) => s.conversations)
  const activeId = useStore((s) => s.activeId)
  const theme = useStore((s) => s.settings.theme)
  const [confirmClear, setConfirmClear] = useState(false)

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] animate-[fade-in_.2s_ease] lg:hidden"
          onClick={() => actions.setSidebar(false)}
        />
      )}

      <aside
        className={`glass fixed inset-y-0 left-0 z-40 flex w-[282px] flex-col border-r transition-transform duration-300 ease-[cubic-bezier(.16,1,.3,1)] lg:relative lg:z-10 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full lg:w-0 lg:overflow-hidden lg:border-r-0'
        }`}
        style={{ willChange: 'transform' }}
      >
        {/* brand */}
        <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
          <div className="grid size-9 place-items-center rounded-[13px] bg-gradient-to-br from-ios-blue to-ios-purple shadow-lg shadow-ios-blue/30">
            <GraduationCap size={19} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold tracking-tight">AdmihubAi</div>
            <div className="truncate text-[11px] leading-tight muted">মানবিক ভর্তি প্রস্তুতি</div>
          </div>
          <button
            onClick={() => actions.setSidebar(false)}
            className="btn-ghost size-8 !rounded-full !p-0 lg:hidden"
            aria-label="সাইডবার বন্ধ"
          >
            <X size={16} />
          </button>
        </div>

        {/* new chat */}
        <div className="px-3 pb-2">
          <button onClick={() => actions.newConversation()} className="btn-primary w-full !rounded-2xl !py-2.5">
            <MessageSquarePlus size={17} />
            নতুন চ্যাট
          </button>
        </div>

        {/* nav */}
        <nav className="no-scrollbar flex-1 overflow-y-auto px-2.5 pb-2">
          <div className="px-1.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider muted">টুলস</div>
          <div className="space-y-0.5">
            {NAV.map((n) => {
              const Icon = n.icon
              const active = view === n.id
              return (
                <button
                  key={n.id}
                  onClick={() => actions.setView(n.id)}
                  className={`group flex w-full items-center gap-2.5 rounded-2xl px-2.5 py-2 text-left transition-all duration-200 ${
                    active ? 'bg-ios-blue/12 text-ios-blue' : 'hover:bg-[rgb(var(--line)/0.07)]'
                  }`}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-[9px] transition-colors ${
                      active ? 'bg-ios-blue text-white shadow-sm shadow-ios-blue/40' : 'bg-[rgb(var(--line)/0.07)]'
                    }`}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{n.label}</span>
                    <span className="block truncate text-[10.5px] leading-tight muted">{n.hint}</span>
                  </span>
                  {n.free && (
                    <span className="shrink-0 rounded-full bg-ios-green/15 px-1.5 py-0.5 text-[9px] font-semibold text-ios-green">
                      ফ্রি
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* history */}
          {conversations.length > 0 && (
            <>
              <div className="flex items-center justify-between px-1.5 pb-1 pt-4">
                <span className="text-[11px] font-semibold uppercase tracking-wider muted">সাম্প্রতিক চ্যাট</span>
                <button
                  onClick={() => (confirmClear ? (actions.clearConversations(), setConfirmClear(false)) : setConfirmClear(true))}
                  onBlur={() => setConfirmClear(false)}
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium transition ${
                    confirmClear ? 'bg-ios-red/15 text-ios-red' : 'muted hover:text-ios-red'
                  }`}
                >
                  {confirmClear ? 'নিশ্চিত?' : 'মুছুন'}
                </button>
              </div>
              <div className="space-y-0.5">
                {conversations.slice(0, 25).map((c) => (
                  <div
                    key={c.id}
                    className={`group flex items-center gap-1 rounded-xl pr-1 transition-colors ${
                      activeId === c.id && view === 'chat' ? 'bg-[rgb(var(--line)/0.09)]' : 'hover:bg-[rgb(var(--line)/0.06)]'
                    }`}
                  >
                    <button
                      onClick={() => actions.selectConversation(c.id)}
                      className="min-w-0 flex-1 truncate px-2.5 py-2 text-left text-[13px]"
                      title={c.title}
                    >
                      {c.title}
                    </button>
                    <button
                      onClick={() => actions.deleteConversation(c.id)}
                      className="shrink-0 rounded-lg p-1.5 opacity-0 transition hover:bg-ios-red/15 hover:text-ios-red group-hover:opacity-100"
                      aria-label="চ্যাট মুছুন"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* bottom bar */}
        <div className="flex items-center gap-1.5 border-t px-3 py-2.5 hairline">
          <button onClick={() => actions.openSettings(true)} className="btn-ghost flex-1 !justify-start !rounded-2xl">
            <Settings2 size={16} />
            <span className="text-[13px]">সেটিংস ও API Keys</span>
          </button>
          <button
            onClick={() => actions.setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="btn-ghost size-9 !rounded-full !p-0"
            aria-label="থিম পরিবর্তন"
            title={theme === 'dark' ? 'লাইট মোড' : 'ডার্ক মোড'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </aside>
    </>
  )
}
