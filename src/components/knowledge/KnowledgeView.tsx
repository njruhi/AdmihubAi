import { useMemo, useState } from 'react'
import { BookOpenCheck, ChevronDown, FileDown, MessageSquare, Search, Layers } from 'lucide-react'
import { KNOWLEDGE_BASE, KB_SUBJECTS } from '../../data/knowledgeBase'
import { Markdown } from '../ui/Markdown'
import { exportPdf } from '../../lib/exporter'
import { actions } from '../../store/store'
import { useChat } from '../../hooks/useChat'

export function KnowledgeView() {
  const [q, setQ] = useState('')
  const [subject, setSubject] = useState('সব')
  const [openId, setOpenId] = useState<string | null>(null)
  const { send } = useChat()

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    return KNOWLEDGE_BASE.filter((k) => {
      if (subject !== 'সব' && k.subject !== subject) return false
      if (!term) return true
      return [k.title, k.topic, k.subject, k.body, ...(k.tags || [])].join(' ').toLowerCase().includes(term)
    })
  }, [q, subject])

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-3 px-3 py-5 sm:px-5">
        <div className="card !p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ios-blue to-ios-teal shadow-lg shadow-ios-blue/25">
              <BookOpenCheck size={19} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold tracking-tight">ভেরিফায়েড নলেজ বেস</h2>
              <p className="text-[12px] muted">
                {KNOWLEDGE_BASE.length}টি টপিক · পাঠ্যবই-ভিত্তিক · AI এখান থেকেই উত্তর দেয়
              </p>
            </div>
          </div>

          <div className="relative mb-3">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 muted" />
            <input
              className="input !pl-10"
              placeholder="খুঁজুন: সমাস, চর্যাপদ, সংবিধান, Tense, জাতিসংঘ…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            {['সব', ...KB_SUBJECTS].map((s) => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`chip shrink-0 ${subject === s ? '!bg-ios-blue/15 !text-ios-blue !border-ios-blue/30' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 && (
          <div className="card py-10 text-center">
            <p className="text-[14px] muted">কিছু পাওয়া যায়নি — অন্য শব্দ দিয়ে খুঁজুন</p>
          </div>
        )}

        {list.map((k) => {
          const open = openId === k.id
          return (
            <div key={k.id} className="card !p-0 overflow-hidden transition-all">
              <button
                onClick={() => setOpenId(open ? null : k.id)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-ios-blue/12 px-2 py-0.5 text-[10px] font-semibold text-ios-blue">
                      {k.subject}
                    </span>
                    <span className="text-[10.5px] muted">{k.topic}</span>
                  </div>
                  <div className="text-[14.5px] font-semibold leading-snug">{k.title}</div>
                </div>
                <ChevronDown
                  size={17}
                  className={`shrink-0 muted transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                />
              </button>

              {open && (
                <div className="animate-[fade-up_.25s_ease] border-t px-4 py-3.5 hairline">
                  <Markdown>{k.body}</Markdown>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <button
                      onClick={() => {
                        actions.setView('chat')
                        actions.newConversation()
                        setTimeout(
                          () => send(`"${k.title}" বিষয়ে আরও বিস্তারিত বুঝিয়ে বলো এবং ভর্তি পরীক্ষার জন্য ১০টি সম্ভাব্য প্রশ্ন দাও।`),
                          60,
                        )
                      }}
                      className="chip"
                    >
                      <MessageSquare size={12} /> AI-কে জিজ্ঞাসা করো
                    </button>
                    <button onClick={() => exportPdf(k.title, k.body, `${k.subject} › ${k.topic}`)} className="chip">
                      <FileDown size={12} /> PDF
                    </button>
                    <button
                      onClick={() => {
                        const deckId = actions.addDeck(k.title, k.subject)
                        const rows = k.body
                          .split('\n')
                          .map((l) => l.replace(/^[•\-*]\s*/, '').trim())
                          .filter((l) => l.length > 18 && /[—:–]/.test(l))
                          .slice(0, 25)
                          .map((l) => {
                            const sep = l.search(/[—:–]/)
                            return [l.slice(0, sep).trim(), l.slice(sep + 1).trim()] as [string, string]
                          })
                        if (!rows.length) {
                          actions.toast('এই টপিক থেকে কার্ড বানানো গেল না', 'info')
                          actions.deleteDeck(deckId)
                          return
                        }
                        actions.addCards(deckId, rows)
                        actions.toast(`${rows.length}টি ফ্ল্যাশকার্ড তৈরি ✓`)
                        actions.setView('flashcards')
                      }}
                      className="chip"
                    >
                      <Layers size={12} /> ফ্ল্যাশকার্ড
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
