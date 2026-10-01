import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
let pass = 0, fail = 0
const t = (name, cond, extra = '') => { cond ? (pass++, console.log('✅', name)) : (fail++, console.log('❌', name, extra)) }

try {
  /* ---------- 1. MCQ JSON parsing ---------- */
  const { parseMcqJson, quizToMarkdown } = await server.ssrLoadModule('/src/lib/mcq.ts')
  const messy = `এই নাও তোমার প্রশ্ন:\n\`\`\`json\n{"questions":[{"q":"সমাস কত প্রকার?","options":["ক) ৪","খ) ৫","গ) ৬","ঘ) ৮"],"answer":"গ","explain":"৬ প্রকার।"},{"question":"Who wrote Hamlet?","choices":["Shakespeare","Milton","Keats","Shelley"],"correct":0,"explanation":"Shakespeare."}],}\n\`\`\`\nআশা করি কাজে লাগবে!`
  const qs = parseMcqJson(messy, 'বাংলা', 'সমাস')
  t('MCQ: messy fenced JSON parsed', qs.length === 2, JSON.stringify(qs).slice(0, 200))
  t('MCQ: bengali letter answer → index 2', qs[0]?.answer === 2, String(qs[0]?.answer))
  t('MCQ: option prefix "ক)" stripped', qs[0]?.options[0] === '৪', qs[0]?.options?.[0])
  t('MCQ: alt key names (question/choices/correct)', qs[1]?.q === 'Who wrote Hamlet?' && qs[1]?.answer === 0)
  t('MCQ: bare array fallback', parseMcqJson('[{"q":"a","options":["1","2"],"answer":1}]', 's').length === 1)
  t('MCQ: garbage → empty', parseMcqJson('কোনো JSON নেই', 's').length === 0)
  t('MCQ → markdown export', quizToMarkdown('T', qs).includes('✅'))

  /* ---------- 2. Brain retrieval ---------- */
  const { retrieve, chunkText, tokenize } = await server.ssrLoadModule('/src/lib/brain.ts')
  const { KNOWLEDGE_BASE } = await server.ssrLoadModule('/src/data/knowledgeBase.ts')
  const hits = retrieve('চর্যাপদ কে আবিষ্কার করেন এবং কত সালে?', [], KNOWLEDGE_BASE, 4)
  t('RAG: চর্যাপদ query hits KB', hits.length > 0 && hits[0].text.includes('হরপ্রসাদ'), hits[0]?.source)
  const h2 = retrieve('What is the rule for subject verb agreement with neither nor?', [], KNOWLEDGE_BASE, 3)
  t('RAG: English query works', h2.length > 0 && /Agreement|agreement/.test(h2[0].source + h2[0].text), h2[0]?.source)
  const h3 = retrieve('সংবিধান কত সালে কার্যকর হয়', [], KNOWLEDGE_BASE, 3)
  t('RAG: সংবিধান query ranks constitution first', h3[0]?.source.includes('সংবিধান'), h3[0]?.source)
  const cases = [
    ['সমাস কত প্রকার ও কী কী', 'বাংলা › সমাস'],
    ['চর্যাপদের আদি কবি কে', 'বাংলা › চর্যাপদ'],
    ['নজরুলের প্রথম কাব্যগ্রন্থ', 'বাংলা › কাজী নজরুল ইসলাম'],
    ['মুক্তিযুদ্ধের সেক্টর কয়টি ছিল', 'মুক্তিযুদ্ধ'],
    ['জাতিসংঘ কবে প্রতিষ্ঠিত হয়', 'জাতিসংঘ'],
    ['GDP ও GNP এর পার্থক্য', 'অর্থনীতি'],
    ['সুশাসনের বৈশিষ্ট্য কয়টি', 'সুশাসন'],
    ['tense structure present perfect', 'Tense'],
    ['বাংলাদেশের প্রশস্ততম নদী কোনটি', 'ভূগোল ও নদী'],
    ['পলাশীর যুদ্ধ কত সালে', 'মধ্যযুগ'],
  ]
  let ok = 0
  for (const [q, expect] of cases) {
    const top = retrieve(q, [], KNOWLEDGE_BASE, 3)[0]
    if (top && top.source.includes(expect)) ok++
    else console.log('    ↳ miss:', q, '→', top?.source)
  }
  t(`RAG: ${ok}/${cases.length} real exam queries hit the right topic first`, ok >= 9, String(ok))
  t('RAG: stemming (বাংলাদেশের → বাংলাদেশ)', retrieve('বাংলাদেশের সংবিধান', [], KNOWLEDGE_BASE, 2)[0]?.source.includes('সংবিধান'))
  const doc = { id: 'd', name: 'আমার নোট.pdf', kind: 'PDF', size: 1, chars: 1, enabled: true, addedAt: 0,
    chunks: chunkText('পরীক্ষার বিশেষ টিপস: ঢাবি খ ইউনিটে প্রতি বছর বাংলা ব্যাকরণ থেকে ২০টি প্রশ্ন আসে। '.repeat(20)) }
  const h4 = retrieve('ঢাবি খ ইউনিটে কয়টি প্রশ্ন আসে', [doc], KNOWLEDGE_BASE, 3)
  t('RAG: user doc outranks KB', h4[0]?.kind === 'doc', JSON.stringify(h4[0]?.source))
  t('RAG: chunking splits long text', chunkText('বাক্য। '.repeat(900)).length > 1)
  t('RAG: tokenizer strips stopwords', !tokenize('এবং কিন্তু the and চর্যাপদ').includes('এবং'))

  /* ---------- 3. Export / markdown→html ---------- */
  const { mdToHtml } = await server.ssrLoadModule('/src/lib/exporter.ts')
  const html = mdToHtml('# শিরোনাম\n\n- বুলেট **বোল্ড**\n\n| ক | খ |\n|---|---|\n| ১ | ২ |\n\n> উক্তি')
  t('Export: heading', html.includes('<h1>শিরোনাম</h1>'))
  t('Export: list + bold', html.includes('<li>বুলেট <strong>বোল্ড</strong></li>'))
  t('Export: table', html.includes('<table>') && html.includes('<th>ক</th>'))
  t('Export: blockquote', html.includes('<blockquote>'))

  /* ---------- 4. Streaming (SSE) with mocked fetch ---------- */
  const { streamChat } = await server.ssrLoadModule('/src/lib/providers.ts')
  const sse = (lines) => new ReadableStream({ start(c) { const e = new TextEncoder(); lines.forEach((l) => c.enqueue(e.encode(l))); c.close() } })
  // OpenAI-compatible (groq), chunk split across buffer boundary
  globalThis.fetch = async () => new Response(sse([
    'data: {"choices":[{"delta":{"content":"চর্যা"}}]}\n\ndata: {"choices":[{"delta":{"content":"পদ হলো"}}]}\n\nda',
    'ta: {"choices":[{"delta":{"content":" বাংলার আদি নিদর্শন।"}}]}\n\ndata: [DONE]\n\n',
  ]), { status: 200 })
  let acc = ''
  const r1 = await streamChat({ provider: 'groq', model: 'm', apiKey: 'k', messages: [{ role: 'user', content: 'x' }], onDelta: (d) => (acc += d) })
  t('Stream: groq SSE across chunk boundary', r1 === 'চর্যাপদ হলো বাংলার আদি নিদর্শন।' && acc === r1, JSON.stringify(r1))
  // Gemini
  globalThis.fetch = async (url) => {
    if (!String(url).includes('streamGenerateContent')) throw new Error('wrong url: ' + url)
    return new Response(sse(['data: {"candidates":[{"content":{"parts":[{"text":"হ্যালো "}]}}]}\n\n', 'data: {"candidates":[{"content":{"parts":[{"text":"বিশ্ব"}]}}]}\n\n']), { status: 200 })
  }
  const r2 = await streamChat({ provider: 'gemini', model: 'gemini-2.0-flash', apiKey: 'k', messages: [{ role: 'system', content: 's' }, { role: 'user', content: 'x' }], onDelta: () => {} })
  t('Stream: gemini SSE', r2 === 'হ্যালো বিশ্ব', JSON.stringify(r2))
  // error mapping
  globalThis.fetch = async () => new Response('{"error":{"message":"Invalid API Key"}}', { status: 401 })
  try { await streamChat({ provider: 'groq', model: 'm', apiKey: 'bad', messages: [], onDelta: () => {} }); t('Stream: 401 throws', false) }
  catch (e) { t('Stream: 401 → friendly Bangla error', /API Key গ্রহণ করেনি/.test(e.message), e.message) }
  try { await streamChat({ provider: 'groq', model: 'm', apiKey: '', messages: [], onDelta: () => {} }); t('Stream: missing key throws', false) }
  catch (e) { t('Stream: missing key → prompt to settings', /সেটিংস/.test(e.message)) }

  /* ---------- 5. Tavily ---------- */
  const { tavilySearch, needsFreshInfo } = await server.ssrLoadModule('/src/lib/tavily.ts')
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body)
    if (!body.api_key || !init.headers.Authorization) throw new Error('missing auth')
    return new Response(JSON.stringify({ answer: 'উত্তর', results: [{ title: 'T', url: 'https://x.com/a', content: 'c' }] }), { status: 200 })
  }
  const tv = await tavilySearch('tvly-x', 'ঢাবি ভর্তি সার্কুলার ২০২৬')
  t('Tavily: parses sources + answer', tv.sources.length === 1 && tv.answer === 'উত্তর' && tv.context.includes('https://x.com/a'))
  t('Tavily: freshness heuristic', needsFreshInfo('ঢাবি ভর্তি সার্কুলার কবে প্রকাশ হবে?') && !needsFreshInfo('সমাস কত প্রকার?'))

  /* ---------- 6. Quiz bank integrity ---------- */
  const { QUIZ_BANK, QUIZ_CATEGORIES, filterBank } = await server.ssrLoadModule('/src/data/quizBank.ts')
  t('Bank: 140+ questions', QUIZ_BANK.length >= 140, String(QUIZ_BANK.length))
  t('Bank: every q has 4 options & valid answer', QUIZ_BANK.every((q) => q.options.length === 4 && q.answer >= 0 && q.answer < 4))
  t('Bank: unique ids', new Set(QUIZ_BANK.map((q) => q.id)).size === QUIZ_BANK.length)
  t('Bank: all have explanations', QUIZ_BANK.every((q) => q.explain && q.explain.length > 4))
  t('Bank: categories non-empty', QUIZ_CATEGORIES.every((c) => filterBank(c.key).length === c.count))
  const spread = new Set(QUIZ_BANK.map((q) => q.answer))
  t('Bank: answers spread across positions', spread.size === 4)
  t('KB: 40+ verified entries', KNOWLEDGE_BASE.length >= 40, String(KNOWLEDGE_BASE.length))
  t('KB: unique ids', new Set(KNOWLEDGE_BASE.map((k) => k.id)).size === KNOWLEDGE_BASE.length)
} catch (e) {
  fail++
  console.log('💥 CRASH', e?.stack || e)
} finally {
  await server.close()
}
console.log(`\n${fail === 0 ? '🎉' : '⚠️'}  ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
