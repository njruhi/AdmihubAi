import { Suspense, lazy, useEffect } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { ChatView } from './components/chat/ChatView'

/* Secondary screens load on demand — keeps first paint instant */
const SettingsModal = lazy(() => import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })))
const McqView = lazy(() => import('./components/mcq/McqView').then((m) => ({ default: m.McqView })))
const BrainView = lazy(() => import('./components/brain/BrainView').then((m) => ({ default: m.BrainView })))
const KnowledgeView = lazy(() =>
  import('./components/knowledge/KnowledgeView').then((m) => ({ default: m.KnowledgeView })),
)
const QuizBankView = lazy(() => import('./components/tools/QuizBankView').then((m) => ({ default: m.QuizBankView })))
const FlashcardsView = lazy(() =>
  import('./components/tools/FlashcardsView').then((m) => ({ default: m.FlashcardsView })),
)
const NotesView = lazy(() => import('./components/tools/NotesView').then((m) => ({ default: m.NotesView })))
const TimerView = lazy(() => import('./components/tools/TimerView').then((m) => ({ default: m.TimerView })))
const ProgressView = lazy(() => import('./components/tools/ProgressView').then((m) => ({ default: m.ProgressView })))
import { actions, applyTheme, getState, useStore } from './store/store'

export default function App() {
  const view = useStore((s) => s.view)
  const theme = useStore((s) => s.settings.theme)

  useEffect(() => {
    applyTheme(theme)
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (getState().settings.theme === 'system') applyTheme('system')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  useEffect(() => {
    actions.loadDocs()
    if (window.innerWidth < 1024) actions.setSidebar(false)
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        actions.newConversation()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        actions.openSettings(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="relative flex h-full overflow-hidden">
      <div className="aurora" aria-hidden>
        <span />
        <span />
        <span />
      </div>

      <Sidebar />

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="min-h-0 flex-1">
          <Suspense fallback={<ViewSkeleton />}>
            {view === 'chat' && <ChatView />}
            {view === 'mcq' && <McqView />}
            {view === 'brain' && <BrainView />}
            {view === 'knowledge' && <KnowledgeView />}
            {view === 'quizbank' && <QuizBankView />}
            {view === 'flashcards' && <FlashcardsView />}
            {view === 'notes' && <NotesView />}
            {view === 'timer' && <TimerView />}
            {view === 'progress' && <ProgressView />}
          </Suspense>
        </div>
      </main>

      <Suspense fallback={null}>
        <SettingsModal />
      </Suspense>
      <Toast />
    </div>
  )
}

function ViewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 px-4 py-6">
      <div className="skeleton h-28 rounded-[1.5rem]" />
      <div className="skeleton h-40 rounded-[1.5rem]" />
      <div className="skeleton h-20 rounded-[1.5rem]" />
    </div>
  )
}

function Toast() {
  const toast = useStore((s) => s.toast)
  if (!toast) return null
  const Icon = toast.kind === 'err' ? AlertCircle : toast.kind === 'info' ? Info : CheckCircle2
  const color = toast.kind === 'err' ? 'text-ios-red' : toast.kind === 'info' ? 'text-ios-blue' : 'text-ios-green'
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div className="glass pointer-events-auto flex max-w-md items-start gap-2.5 rounded-2xl px-4 py-3 shadow-2xl animate-[fade-up_.3s_cubic-bezier(.16,1,.3,1)]">
        <Icon size={17} className={`mt-0.5 shrink-0 ${color}`} />
        <p className="flex-1 text-[13px] leading-snug">{toast.text}</p>
        <button onClick={() => actions.dismissToast()} className="shrink-0 rounded-md p-0.5 muted hover:text-[rgb(var(--text))]">
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
