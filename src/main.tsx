import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import './index.css'

const boot = document.getElementById('boot')

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )

  requestAnimationFrame(() => {
    boot?.classList.add('hide')
    setTimeout(() => boot?.remove(), 420)
  })
} catch (err) {
  // Never leave a silent blank page — the boot watchdog renders this.
  console.error('[AdmihubAi] mount failed', err)
  window.dispatchEvent(new ErrorEvent('error', { error: err, message: String(err) }))
}
