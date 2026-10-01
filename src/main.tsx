import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const boot = document.getElementById('boot')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

requestAnimationFrame(() => {
  boot?.classList.add('hide')
  setTimeout(() => boot?.remove(), 420)
})
