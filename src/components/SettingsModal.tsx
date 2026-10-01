import { useState } from 'react'
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { Modal } from './ui/Modal'
import { actions, getState, useStore } from '../store/store'
import { PROVIDERS, fetchModels } from '../lib/providers'
import type { ProviderId } from '../types'
import { clearAllLocal } from '../lib/storage'

type Status = 'idle' | 'testing' | 'ok' | 'fail'

export function SettingsModal() {
  const open = useStore((s) => s.settingsOpen)
  const keys = useStore((s) => s.settings.keys)
  const answerLanguage = useStore((s) => s.settings.answerLanguage)
  const temperature = useStore((s) => s.settings.temperature)
  const target = useStore((s) => s.settings.targetUniversity)
  const theme = useStore((s) => s.settings.theme)
  const [status, setStatus] = useState<Record<string, Status>>({})
  const [tab, setTab] = useState<'keys' | 'prefs'>('keys')
  const [wipe, setWipe] = useState(false)

  const refreshModels = async (pid: ProviderId) => {
    setStatus((s) => ({ ...s, [pid]: 'testing' }))
    try {
      const models = await fetchModels(pid, keys[pid])
      if (!models.length) throw new Error('কোনো মডেল পাওয়া যায়নি')
      const others = getState().settings.customModels.filter((m) => m.provider !== pid)
      actions.patchSettings({ customModels: [...models, ...others] })
      setStatus((s) => ({ ...s, [pid]: 'ok' }))
      actions.toast(`${PROVIDERS[pid].name}: ${models.length}টি মডেল লোড হয়েছে ✓`, 'ok')
    } catch (err) {
      setStatus((s) => ({ ...s, [pid]: 'fail' }))
      actions.toast(err instanceof Error ? err.message : 'সংযোগ ব্যর্থ', 'err')
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => actions.openSettings(false)}
      title="সেটিংস ও API Keys"
      subtitle="কি-গুলো শুধুমাত্র আপনার ব্রাউজারে (localStorage) থাকে — কোথাও পাঠানো হয় না"
      icon={<KeyRound size={18} />}
      wide
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11.5px] muted">
            <ShieldCheck size={14} className="text-ios-green" />
            <span>১০০% ক্লায়েন্ট-সাইড · কোনো ব্যাকএন্ড সার্ভার নেই</span>
          </div>
          <button onClick={() => actions.openSettings(false)} className="btn-primary !px-5">
            সম্পন্ন
          </button>
        </div>
      }
    >
      <div className="seg mb-4 w-full">
        <button data-active={tab === 'keys'} onClick={() => setTab('keys')} className="flex-1">
          🔑 API Keys
        </button>
        <button data-active={tab === 'prefs'} onClick={() => setTab('prefs')} className="flex-1">
          ⚙️ পছন্দসমূহ
        </button>
      </div>

      {tab === 'keys' ? (
        <div className="space-y-3">
          <div className="flex items-start gap-2.5 rounded-2xl border border-ios-blue/20 bg-ios-blue/8 p-3">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-ios-blue" />
            <p className="text-[12.5px] leading-relaxed">
              অন্তত <b>একটি</b> কি দিলেই চ্যাট ও MCQ চলবে। সবচেয়ে দ্রুত অভিজ্ঞতার জন্য{' '}
              <b>Groq</b> (ফ্রি ও বিদ্যুৎগতি) দিয়ে শুরু করুন। <b>Tavily</b> লাগবে শুধু লাইভ ওয়েব সার্চের জন্য।
              <br />
              <span className="muted">
                নোট: কুইজ ব্যাংক, ফ্ল্যাশকার্ড, নোট, টাইমার ও নলেজ বেস — কোনো কি ছাড়াই ১০০% ফ্রি কাজ করে।
              </span>
            </p>
          </div>

          {(Object.keys(PROVIDERS) as ProviderId[]).map((pid) => (
            <KeyCard
              key={pid}
              pid={pid}
              value={keys[pid]}
              status={status[pid] ?? 'idle'}
              onChange={(v) => actions.setKey(pid, v)}
              onRefresh={() => refreshModels(pid)}
            />
          ))}

          <TavilyCard value={keys.tavily} onChange={(v) => actions.setKey('tavily', v)} />
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="উত্তরের ভাষা" hint="AI কোন ভাষায় উত্তর দেবে">
            <div className="seg w-full">
              {([
                ['bn', 'বাংলা'],
                ['mixed', 'মিশ্র'],
                ['en', 'English'],
              ] as const).map(([v, l]) => (
                <button
                  key={v}
                  data-active={answerLanguage === v}
                  onClick={() => actions.patchSettings({ answerLanguage: v })}
                  className="flex-1"
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>

          <Field label="থিম">
            <div className="seg w-full">
              {([
                ['light', '☀️ লাইট'],
                ['dark', '🌙 ডার্ক'],
                ['system', '⚙️ সিস্টেম'],
              ] as const).map(([v, l]) => (
                <button key={v} data-active={theme === v} onClick={() => actions.setTheme(v)} className="flex-1">
                  {l}
                </button>
              ))}
            </div>
          </Field>

          <Field label="টার্গেট বিশ্ববিদ্যালয় / ইউনিট" hint="AI এই অনুযায়ী প্রশ্নের ধরন ঠিক করবে">
            <input
              className="input"
              placeholder="যেমন: ঢাবি খ-ইউনিট, জাবি C ইউনিট, গুচ্ছ (মানবিক)"
              value={target}
              onChange={(e) => actions.patchSettings({ targetUniversity: e.target.value })}
            />
          </Field>

          <Field
            label={`সৃজনশীলতা (Temperature) — ${temperature.toFixed(1)}`}
            hint="কম = নির্ভুল ও সংক্ষিপ্ত · বেশি = সৃজনশীল"
          >
            <input
              type="range"
              min={0}
              max={1}
              step={0.1}
              value={temperature}
              onChange={(e) => actions.patchSettings({ temperature: Number(e.target.value) })}
              className="w-full accent-ios-blue"
            />
          </Field>

          <div className="rounded-2xl border border-ios-red/25 bg-ios-red/6 p-3.5">
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ios-red">
              <TriangleAlert size={15} /> ডেটা মুছে ফেলুন
            </div>
            <p className="mb-2.5 text-[12px] leading-relaxed muted">
              সব চ্যাট, নোট, ফ্ল্যাশকার্ড, প্রোগ্রেস ও API Keys ব্রাউজার থেকে স্থায়ীভাবে মুছে যাবে।
            </p>
            <button
              onClick={() => {
                if (!wipe) {
                  setWipe(true)
                  return
                }
                clearAllLocal()
                actions.clearDocs()
                location.reload()
              }}
              className={`btn ${wipe ? 'bg-ios-red text-white' : 'btn-outline !border-ios-red/40 !text-ios-red'}`}
            >
              <Trash2 size={15} />
              {wipe ? 'নিশ্চিতভাবে সব মুছুন' : 'সব ডেটা রিসেট করুন'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5">
        <div className="text-[13px] font-medium">{label}</div>
        {hint && <div className="text-[11.5px] muted">{hint}</div>}
      </div>
      {children}
    </div>
  )
}

function KeyCard({
  pid,
  value,
  status,
  onChange,
  onRefresh,
}: {
  pid: ProviderId
  value: string
  status: Status
  onChange: (v: string) => void
  onRefresh: () => void
}) {
  const p = PROVIDERS[pid]
  const [show, setShow] = useState(false)
  const filled = value.length > 6

  return (
    <div
      className="rounded-[20px] border p-3.5 transition-all hairline"
      style={{
        background: filled ? `color-mix(in oklab, ${p.accent} 7%, transparent)` : 'rgb(var(--line)/0.035)',
        borderColor: filled ? `color-mix(in oklab, ${p.accent} 28%, transparent)` : undefined,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ background: p.accent }} />
        <span className="text-[13.5px] font-semibold">{p.name}</span>
        <span className="truncate text-[11px] muted">{p.tagline}</span>
        {filled && <CheckCircle2 size={14} className="ml-auto shrink-0 text-ios-green" />}
      </div>

      <div className="flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={p.keyHint}
            autoComplete="off"
            spellCheck={false}
            className="input !pr-10 font-mono !text-[12.5px]"
          />
          <button
            onClick={() => setShow((v) => !v)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 muted hover:bg-[rgb(var(--line)/0.08)]"
            aria-label={show ? 'লুকান' : 'দেখান'}
            type="button"
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <button
          onClick={onRefresh}
          disabled={!filled || status === 'testing'}
          className="btn-outline shrink-0 !px-2.5 disabled:opacity-40"
          title="কি যাচাই করে মডেল লিস্ট আনুন"
          type="button"
        >
          {status === 'testing' ? (
            <Loader2 size={15} className="animate-spin" />
          ) : status === 'ok' ? (
            <CheckCircle2 size={15} className="text-ios-green" />
          ) : (
            <RefreshCw size={15} />
          )}
        </button>
      </div>

      <a
        href={p.keyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-ios-blue hover:underline"
      >
        ফ্রি কি নিন <ExternalLink size={11} />
      </a>
    </div>
  )
}

function TavilyCard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false)
  const filled = value.length > 6
  return (
    <div
      className="rounded-[20px] border p-3.5 hairline"
      style={{
        background: filled ? 'color-mix(in oklab, #40c8e0 8%, transparent)' : 'rgb(var(--line)/0.035)',
        borderColor: filled ? 'color-mix(in oklab, #40c8e0 30%, transparent)' : undefined,
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <Globe size={14} className="text-ios-teal" />
        <span className="text-[13.5px] font-semibold">Tavily — লাইভ ওয়েব সার্চ</span>
        {filled && <CheckCircle2 size={14} className="ml-auto text-ios-green" />}
      </div>
      <p className="mb-2 text-[11.5px] leading-relaxed muted">
        সর্বশেষ ভর্তি সার্কুলার, পরীক্ষার তারিখ ও কারেন্ট অ্যাফেয়ার্স লাইভ খুঁজে আনতে ব্যবহৃত হয়।
      </p>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="tvly-..."
          autoComplete="off"
          spellCheck={false}
          className="input !pr-10 font-mono !text-[12.5px]"
        />
        <button
          onClick={() => setShow((v) => !v)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 muted hover:bg-[rgb(var(--line)/0.08)]"
          type="button"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      <a
        href="https://app.tavily.com/home"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-ios-teal hover:underline"
      >
        ফ্রি কি নিন (মাসে ১০০০ সার্চ) <ExternalLink size={11} />
      </a>
    </div>
  )
}
