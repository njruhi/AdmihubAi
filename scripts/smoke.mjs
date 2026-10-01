import { JSDOM } from 'jsdom'
import { createServer } from 'vite'

const dom = new JSDOM('<!doctype html><html lang="bn"><head><meta name="theme-color" content="#000"></head><body><div id="root"></div></body></html>', {
  url: 'https://admihub.test/',
  pretendToBeVisual: true,
})
const { window } = dom
globalThis.window = window
globalThis.document = window.document
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
globalThis.HTMLElement = window.HTMLElement
globalThis.Element = window.Element
globalThis.Node = window.Node
globalThis.Event = window.Event
globalThis.KeyboardEvent = window.KeyboardEvent
globalThis.MouseEvent = window.MouseEvent
globalThis.getComputedStyle = window.getComputedStyle
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0)
globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
globalThis.localStorage = window.localStorage
globalThis.matchMedia = window.matchMedia = () => ({
  matches: false, media: '', onchange: null,
  addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
})
window.scrollTo = () => {}
globalThis.IS_REACT_ACT_ENVIRONMENT = false
globalThis.MessageChannel = window.MessageChannel

const errors = []
const origError = console.error
console.error = (...a) => { errors.push(a.map(String).join(' ')); origError(...a) }
window.addEventListener('error', (e) => errors.push('window error: ' + e.message))

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
try {
  const mod = await server.ssrLoadModule('/scripts/smoke-entry.tsx')
  const out = await mod.run()
  console.log('\n=== RENDER SIZES (html chars per view) ===')
  console.log(JSON.stringify(out, null, 2))
  const bad = Object.entries(out.report).filter(([, v]) => String(v).startsWith('❌'))
  console.log(bad.length ? '❌ FAILING VIEWS: ' + bad.map(([k]) => k).join(', ') : '✅ all views rendered correctly')
} catch (e) {
  console.log('❌ CRASH:', e?.stack || e)
} finally {
  await server.close()
}
const real = errors.filter((e) => !/not implemented|Not implemented|act\(\)|ReactDOMTestUtils|punycode/.test(e))
console.log('\n=== CONSOLE ERRORS (' + real.length + ') ===')
real.slice(0, 12).forEach((e) => console.log('•', e.slice(0, 400)))
process.exit(0)
