import { useMemo, useState } from 'react'
import { ArrowLeft, Layers, Plus, RotateCw, Sparkles, Trash2, X } from 'lucide-react'
import { actions, useStore } from '../../store/store'

export function FlashcardsView() {
  const decks = useStore((s) => s.decks)
  const cards = useStore((s) => s.cards)
  const [activeDeck, setActiveDeck] = useState<string | null>(null)
  const [newDeck, setNewDeck] = useState('')
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [adding, setAdding] = useState(false)

  if (activeDeck) {
    const deck = decks.find((d) => d.id === activeDeck)
    if (!deck) {
      setActiveDeck(null)
      return null
    }
    return <StudyDeck deckId={activeDeck} onBack={() => setActiveDeck(null)} />
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-4 px-3 py-5 sm:px-5">
        <div className="card !p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ios-indigo to-ios-blue shadow-lg shadow-ios-indigo/25">
              <Layers size={21} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-bold tracking-tight">ফ্ল্যাশকার্ড</h2>
              <p className="text-[12.5px] muted">স্পেসড রিপিটিশন (Leitner) — যা ভুলে যাও, তা বেশি আসবে</p>
            </div>
            {decks.length === 0 && (
              <button onClick={() => actions.seedDecks()} className="btn-primary shrink-0 !px-3 !text-[12.5px]">
                <Sparkles size={14} /> রেডিমেড ডেক
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <input
              className="input"
              placeholder="নতুন ডেকের নাম… যেমন: ইংরেজি ভোকাবুলারি"
              value={newDeck}
              onChange={(e) => setNewDeck(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newDeck.trim()) {
                  actions.addDeck(newDeck.trim(), 'নিজস্ব')
                  setNewDeck('')
                }
              }}
            />
            <button
              onClick={() => {
                if (!newDeck.trim()) return
                actions.addDeck(newDeck.trim(), 'নিজস্ব')
                setNewDeck('')
              }}
              disabled={!newDeck.trim()}
              className="btn-primary shrink-0 !px-3 disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {decks.length === 0 ? (
          <div className="card py-10 text-center">
            <Layers size={30} className="mx-auto mb-3 muted" />
            <p className="text-[14px] font-medium">এখনো কোনো ডেক নেই</p>
            <p className="mt-1 text-[12.5px] muted">
              "রেডিমেড ডেক" চাপলে ভোকাবুলারি, বাগধারা, সাহিত্য ও সাল-তারিখের ৭৫+ কার্ড যুক্ত হবে
            </p>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {decks.map((d) => {
              const deckCards = cards.filter((c) => c.deckId === d.id)
              const due = deckCards.filter((c) => c.due <= Date.now()).length
              const mastered = deckCards.filter((c) => c.box >= 4).length
              return (
                <div key={d.id} className="card group !p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="mb-2 flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-[14.5px] font-semibold">{d.name}</h3>
                      <p className="text-[11.5px] muted">
                        {d.subject} · {deckCards.length} কার্ড
                      </p>
                    </div>
                    <button
                      onClick={() => actions.deleteDeck(d.id)}
                      className="rounded-lg p-1.5 opacity-0 transition muted hover:bg-ios-red/12 hover:text-ios-red group-hover:opacity-100"
                      aria-label="ডেক মুছুন"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--line)/0.1)]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ios-green to-ios-teal transition-all duration-700"
                      style={{ width: deckCards.length ? `${(mastered / deckCards.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveDeck(d.id)}
                      disabled={!deckCards.length}
                      className="btn-primary flex-1 !py-1.5 !text-[12.5px] disabled:opacity-40"
                    >
                      পড়া শুরু {due > 0 && `(${due} বাকি)`}
                    </button>
                    <button
                      onClick={() => {
                        setAdding(true)
                        setActiveDeck(null)
                        setFront('')
                        setBack('')
                        setNewDeck(d.id)
                      }}
                      className="btn-outline shrink-0 !px-2.5 !py-1.5"
                      title="কার্ড যোগ করো"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {adding && (
          <div className="card !p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[14px] font-semibold">নতুন কার্ড যোগ করো</h3>
              <button onClick={() => setAdding(false)} className="btn-ghost size-7 !rounded-full !p-0">
                <X size={14} />
              </button>
            </div>
            <input className="input mb-2" placeholder="সামনের দিক (প্রশ্ন/শব্দ)" value={front} onChange={(e) => setFront(e.target.value)} />
            <textarea
              className="input mb-2 min-h-[72px]"
              placeholder="পেছনের দিক (উত্তর/অর্থ)"
              value={back}
              onChange={(e) => setBack(e.target.value)}
            />
            <button
              onClick={() => {
                if (!front.trim() || !back.trim()) return
                actions.addCard(newDeck, front.trim(), back.trim())
                setFront('')
                setBack('')
                actions.toast('কার্ড যোগ হয়েছে ✓')
              }}
              disabled={!front.trim() || !back.trim()}
              className="btn-primary w-full !rounded-2xl disabled:opacity-40"
            >
              <Plus size={16} /> যোগ করো
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StudyDeck({ deckId, onBack }: { deckId: string; onBack: () => void }) {
  const decks = useStore((s) => s.decks)
  const allCards = useStore((s) => s.cards)
  const deck = decks.find((d) => d.id === deckId)
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [done, setDone] = useState(0)

  const queue = useMemo(
    () =>
      allCards
        .filter((c) => c.deckId === deckId)
        .sort((a, b) => a.due - b.due || a.box - b.box),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deckId],
  )

  const card = queue[i]

  const grade = (g: 'again' | 'good' | 'easy') => {
    if (!card) return
    actions.reviewCard(card.id, g)
    setDone((d) => d + 1)
    setFlipped(false)
    setTimeout(() => setI((v) => v + 1), 120)
  }

  if (!card) {
    return (
      <div className="grid h-full place-items-center px-5">
        <div className="card max-w-sm text-center !p-7">
          <div className="mb-3 text-[40px]">🎉</div>
          <h3 className="text-[18px] font-bold">রিভিশন শেষ!</h3>
          <p className="mt-1 text-[13px] muted">এই সেশনে {done}টি কার্ড রিভিউ করেছো।</p>
          <button onClick={onBack} className="btn-primary mt-4">
            ডেকে ফিরে যাও
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col px-3 py-4 sm:px-5">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        <button onClick={onBack} className="btn-ghost size-8 !rounded-full !p-0">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{deck?.name}</div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--line)/0.1)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-ios-indigo to-ios-blue transition-all duration-500"
              style={{ width: `${((i + 1) / queue.length) * 100}%` }}
            />
          </div>
        </div>
        <span className="shrink-0 text-[12px] tabular-nums muted">
          {i + 1}/{queue.length}
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-1 items-center py-4">
        <div
          className="flip-card h-[290px] w-full cursor-pointer select-none"
          data-flipped={flipped}
          onClick={() => setFlipped((f) => !f)}
        >
          <div className="flip-inner">
            <div className="flip-face card !p-7">
              <div className="text-center">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider muted">প্রশ্ন</div>
                <div className="text-[20px] font-semibold leading-relaxed">{card.front}</div>
                <div className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] muted">
                  <RotateCw size={12} /> উত্তর দেখতে ট্যাপ করো
                </div>
              </div>
            </div>
            <div className="flip-face flip-back card !p-7" style={{ background: 'rgb(var(--surface))' }}>
              <div className="text-center">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ios-green">উত্তর</div>
                <div className="whitespace-pre-wrap text-[17px] leading-relaxed">{card.back}</div>
                <div className="mt-3 text-[11px] muted">বক্স {card.box}/৫ · রিভিউ {card.reviews} বার</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl">
        {flipped ? (
          <div className="grid grid-cols-3 gap-2 animate-[fade-up_.25s_ease]">
            <button onClick={() => grade('again')} className="btn !rounded-2xl !py-3 bg-ios-red/12 text-ios-red">
              😵 আবার
            </button>
            <button onClick={() => grade('good')} className="btn !rounded-2xl !py-3 bg-ios-orange/12 text-ios-orange">
              🙂 মোটামুটি
            </button>
            <button onClick={() => grade('easy')} className="btn !rounded-2xl !py-3 bg-ios-green/12 text-ios-green">
              😎 সহজ
            </button>
          </div>
        ) : (
          <button onClick={() => setFlipped(true)} className="btn-primary w-full !rounded-2xl !py-3">
            উত্তর দেখাও
          </button>
        )}
      </div>
    </div>
  )
}
