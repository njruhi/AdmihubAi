import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react'
import { clearAllLocal } from '../../lib/storage'

type Props = { children: ReactNode; label?: string }
type State = { error: Error | null }

/**
 * Keeps one broken screen from blanking the whole app. Used around the view
 * area (so the sidebar stays usable) and around the whole tree in main.tsx.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AdmihubAi] render error', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  hardReset = () => {
    clearAllLocal()
    location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="card animate-fade-up w-full max-w-md p-6 text-center">
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ios-red/15 text-ios-red">
            <AlertTriangle size={22} />
          </div>
          <h2 className="text-lg font-semibold">কিছু একটা ভুল হয়েছে</h2>
          <p className="muted mt-1.5 text-sm">
            {this.props.label ? `"${this.props.label}" স্ক্রিনটি লোড করা যায়নি।` : 'স্ক্রিনটি লোড করা যায়নি।'} তোমার
            ডেটা নিরাপদে সংরক্ষিত আছে।
          </p>
          <pre className="muted mt-3 max-h-28 overflow-auto rounded-xl bg-black/20 p-3 text-left text-[11px] leading-relaxed whitespace-pre-wrap">
            {error.message || String(error)}
          </pre>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button className="btn-primary" onClick={this.reset}>
              <RefreshCw size={15} /> আবার চেষ্টা করুন
            </button>
            <button className="btn-outline" onClick={() => location.reload()}>
              পেজ রিলোড
            </button>
            <button className="btn-ghost text-ios-red" onClick={this.hardReset}>
              <Trash2 size={15} /> ডেটা রিসেট
            </button>
          </div>
        </div>
      </div>
    )
  }
}
