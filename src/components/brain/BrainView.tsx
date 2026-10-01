import { useRef, useState } from 'react'
import {
  Brain,
  CheckCircle2,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { actions, useStore } from '../../store/store'
import { ACCEPTED, humanSize, parseFile } from '../../lib/fileParse'
import { chunkText } from '../../lib/brain'
import { uid } from '../../lib/storage'
import type { BrainDoc } from '../../types'

export function BrainView() {
  const docs = useStore((s) => s.docs)
  const memories = useStore((s) => s.memories)
  const useBrain = useStore((s) => s.settings.useBrain)
  const [busy, setBusy] = useState<string | null>(null)
  const [drag, setDrag] = useState(false)
  const [memText, setMemText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) {
        actions.toast(`${file.name} — ২৫MB-এর বেশি ফাইল সাপোর্ট করে না`, 'err')
        continue
      }
      setBusy(file.name)
      try {
        const parsed = await parseFile(file, (p) => setBusy(`${file.name} — ${Math.round(p * 100)}%`))
        const chunks = chunkText(parsed.text)
        if (!chunks.length) throw new Error('ফাইলে পর্যাপ্ত টেক্সট পাওয়া যায়নি')
        const doc: BrainDoc = {
          id: uid('doc'),
          name: file.name,
          kind: parsed.kind,
          size: file.size,
          chars: parsed.text.length,
          chunks,
          addedAt: Date.now(),
          enabled: true,
        }
        await actions.addDoc(doc)
        actions.toast(`${file.name} যোগ হয়েছে · ${chunks.length} অংশ ✓`)
      } catch (err) {
        actions.toast(err instanceof Error ? err.message : 'ফাইল পড়া যায়নি', 'err')
      } finally {
        setBusy(null)
      }
    }
  }

  const totalChars = docs.reduce((n, d) => n + d.chars, 0)

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-5 sm:px-5">
        {/* hero */}
        <div className="card stagger !p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ios-purple to-ios-pink shadow-lg shadow-ios-purple/25">
              <Brain size={21} className="text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-bold tracking-tight">Brain — নলেজ ও মেমোরি</h2>
              <p className="text-[12.5px] muted">
                তোমার সিলেবাস, হ্যান্ডনোট, লেকচার শিট ও বিগত বছরের প্রশ্ন আপলোড করো — AI সেগুলো থেকেই উত্তর দেবে
              </p>
            </div>
          </div>

          {/* dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDrag(false)
              if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files)
            }}
            onClick={() => inputRef.current?.click()}
            className={`cursor-pointer rounded-[22px] border-2 border-dashed p-7 text-center transition-all duration-300 ${
              drag
                ? 'border-ios-purple bg-ios-purple/10 scale-[1.01]'
                : 'border-[rgb(var(--line)/0.18)] hover:border-ios-purple/50 hover:bg-ios-purple/5'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) handleFiles(e.target.files)
                e.target.value = ''
              }}
            />
            {busy ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={26} className="animate-spin text-ios-purple" />
                <span className="text-[13px] font-medium">{busy}</span>
                <span className="text-[11.5px] muted">টেক্সট বের করা হচ্ছে…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                <Upload size={26} className="text-ios-purple" />
                <span className="text-[14px] font-semibold">ফাইল টেনে আনো বা ক্লিক করো</span>
                <span className="text-[11.5px] muted">PDF · DOCX · TXT · MD · CSV · JSON — সর্বোচ্চ ২৫MB</span>
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="chip !bg-transparent">
              📄 {docs.length} ফাইল
            </span>
            <span className="chip !bg-transparent">
              ✍️ {totalChars.toLocaleString('bn-BD')} অক্ষর
            </span>
            <button
              onClick={() => actions.patchSettings({ useBrain: !useBrain })}
              className={`chip ml-auto ${useBrain ? '!bg-ios-green/15 !text-ios-green !border-ios-green/25' : ''}`}
            >
              {useBrain ? <CheckCircle2 size={13} /> : <X size={13} />}
              চ্যাটে Brain {useBrain ? 'চালু' : 'বন্ধ'}
            </button>
          </div>
        </div>

        {/* docs */}
        {docs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[14px] font-semibold">📚 আপলোড করা ফাইল</h3>
              <button onClick={() => actions.clearDocs()} className="text-[11.5px] muted hover:text-ios-red">
                সব মুছুন
              </button>
            </div>
            {docs.map((d) => (
              <div key={d.id} className="card flex items-center gap-3 !p-3">
                <div
                  className={`grid size-9 shrink-0 place-items-center rounded-xl text-[10px] font-bold ${
                    d.enabled ? 'bg-ios-purple/15 text-ios-purple' : 'bg-[rgb(var(--line)/0.08)] muted'
                  }`}
                >
                  {d.kind.slice(0, 4)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{d.name}</div>
                  <div className="truncate text-[11px] muted">
                    {humanSize(d.size)} · {d.chunks.length} অংশ · {new Date(d.addedAt).toLocaleDateString('bn-BD')}
                  </div>
                </div>
                <button
                  onClick={() => actions.toggleDoc(d.id)}
                  className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-300 ${
                    d.enabled ? 'bg-ios-green' : 'bg-[rgb(var(--line)/0.18)]'
                  }`}
                  title={d.enabled ? 'নিষ্ক্রিয় করো' : 'সক্রিয় করো'}
                >
                  <span
                    className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all duration-300 ${
                      d.enabled ? 'left-[18px]' : 'left-0.5'
                    }`}
                  />
                </button>
                <button
                  onClick={() => actions.removeDoc(d.id)}
                  className="shrink-0 rounded-lg p-2 muted transition hover:bg-ios-red/12 hover:text-ios-red"
                  aria-label="মুছুন"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* memory */}
        <div className="card !p-5">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles size={16} className="text-ios-orange" />
            <h3 className="text-[15px] font-semibold">স্থায়ী মেমোরি</h3>
          </div>
          <p className="mb-3 text-[12.5px] leading-relaxed muted">
            যে তথ্যগুলো AI সবসময় মনে রাখবে — তোমার টার্গেট, দুর্বল টপিক, পড়ার রুটিন ইত্যাদি।
          </p>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="যেমন: আমার টার্গেট ঢাবি খ-ইউনিট; ইংরেজি গ্রামারে দুর্বল"
              value={memText}
              onChange={(e) => setMemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  actions.addMemory(memText)
                  setMemText('')
                }
              }}
            />
            <button
              onClick={() => {
                actions.addMemory(memText)
                setMemText('')
              }}
              disabled={!memText.trim()}
              className="btn-primary shrink-0 !px-3 disabled:opacity-40"
            >
              <Plus size={16} />
            </button>
          </div>

          {memories.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {memories.map((m) => (
                <div
                  key={m.id}
                  className="flex items-start gap-2 rounded-xl bg-[rgb(var(--line)/0.05)] px-3 py-2"
                >
                  <FileText size={13} className="mt-0.5 shrink-0 text-ios-orange" />
                  <span className="min-w-0 flex-1 text-[13px] leading-snug">{m.text}</span>
                  <button
                    onClick={() => actions.removeMemory(m.id)}
                    className="shrink-0 rounded p-0.5 muted hover:text-ios-red"
                    aria-label="মুছুন"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-ios-blue/20 bg-ios-blue/8 p-3.5">
          <p className="text-[12.5px] leading-relaxed">
            🔒 <b>গোপনীয়তা:</b> আপলোড করা ফাইল শুধুমাত্র তোমার ব্রাউজারের IndexedDB-তে থাকে। প্রশ্ন করলে কেবল
            প্রাসঙ্গিক ছোট অংশটুকু AI মডেলে যায় — পুরো ফাইল কোথাও আপলোড হয় না।
          </p>
        </div>
      </div>
    </div>
  )
}
