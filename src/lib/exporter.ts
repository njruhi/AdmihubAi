/* Export helpers — Bangla-safe.
 * PDF is produced through a styled print window (browser's "Save as PDF"),
 * which renders Bengali ligatures perfectly, unlike bundled PDF fonts. */

function slug(s: string): string {
  return (
    s
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '_')
      .slice(0, 60) || 'admihub'
  )
}

export function downloadBlob(content: string, filename: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob(['\ufeff' + content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function exportText(title: string, body: string) {
  const stamp = new Date().toLocaleString('bn-BD')
  downloadBlob(`${title}\n${'='.repeat(Math.min(title.length, 60))}\n${stamp}\nAdmihubAi\n\n${body}\n`, `${slug(title)}.txt`)
}

export function exportMarkdown(title: string, body: string) {
  const stamp = new Date().toLocaleString('bn-BD')
  downloadBlob(
    `# ${title}\n\n> তৈরি: ${stamp} · **AdmihubAi** — মানবিক ভর্তি প্রস্তুতি\n\n${body}\n`,
    `${slug(title)}.md`,
    'text/markdown;charset=utf-8',
  )
}

/** Minimal markdown → HTML (headings, lists, bold/italic, code, tables, quotes). */
export function mdToHtml(md: string): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const inline = (s: string) =>
    esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  const lines = md.replace(/\r/g, '').split('\n')
  const out: string[] = []
  let inUl = false
  let inOl = false
  let inCode = false
  let inTable = false

  const closeLists = () => {
    if (inUl) {
      out.push('</ul>')
      inUl = false
    }
    if (inOl) {
      out.push('</ol>')
      inOl = false
    }
    if (inTable) {
      out.push('</tbody></table>')
      inTable = false
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (/^```/.test(line)) {
      closeLists()
      out.push(inCode ? '</code></pre>' : '<pre><code>')
      inCode = !inCode
      continue
    }
    if (inCode) {
      out.push(esc(raw))
      continue
    }
    if (!line.trim()) {
      closeLists()
      continue
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      closeLists()
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`)
      continue
    }
    if (/^---+$/.test(line)) {
      closeLists()
      out.push('<hr/>')
      continue
    }
    if (/^>\s?/.test(line)) {
      closeLists()
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`)
      continue
    }
    if (/^\|.*\|$/.test(line)) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim())
      if (/^\|[\s:|-]+\|$/.test(line)) continue
      if (!inTable) {
        out.push('<table><thead><tr>' + cells.map((c) => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>')
        inTable = true
      } else {
        out.push('<tr>' + cells.map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>')
      }
      continue
    }
    const ul = line.match(/^\s*[-*+]\s+(.*)$/)
    if (ul) {
      if (inOl) {
        out.push('</ol>')
        inOl = false
      }
      if (!inUl) {
        out.push('<ul>')
        inUl = true
      }
      out.push(`<li>${inline(ul[1])}</li>`)
      continue
    }
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/)
    if (ol) {
      if (inUl) {
        out.push('</ul>')
        inUl = false
      }
      if (!inOl) {
        out.push('<ol>')
        inOl = true
      }
      out.push(`<li>${inline(ol[1])}</li>`)
      continue
    }
    closeLists()
    out.push(`<p>${inline(line)}</p>`)
  }
  if (inCode) out.push('</code></pre>')
  closeLists()
  return out.join('\n')
}

const PRINT_CSS = `
  @page { size: A4; margin: 16mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Hind Siliguri', 'Noto Sans Bengali', 'Inter', system-ui, sans-serif;
    color: #15151a; margin: 0; line-height: 1.75; font-size: 12.5pt;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .wrap { max-width: 760px; margin: 0 auto; padding: 8px; }
  .head {
    display:flex; align-items:center; gap:12px; padding-bottom:14px; margin-bottom:22px;
    border-bottom: 2px solid #0a84ff;
  }
  .logo {
    width:40px;height:40px;border-radius:12px;flex:0 0 auto;
    background:linear-gradient(135deg,#0a84ff,#bf5af2); color:#fff; font-weight:800;
    display:flex;align-items:center;justify-content:center;font-size:19px;font-family:Inter,sans-serif;
  }
  .head h1 { margin:0; font-size:19pt; letter-spacing:-.4px; }
  .head .sub { margin:2px 0 0; font-size:9.5pt; color:#666; }
  h1,h2,h3,h4 { line-height:1.35; margin:1.1em 0 .45em; page-break-after:avoid; }
  h1 { font-size:17pt } h2 { font-size:14.5pt; color:#0a3a6b } h3 { font-size:12.8pt }
  p { margin:.5em 0 }
  ul,ol { margin:.5em 0 .5em 1.1em; padding-left:.8em }
  li { margin:.22em 0 }
  strong { color:#06316b }
  blockquote { margin:.7em 0; padding:.45em .9em; border-left:3px solid #0a84ff; background:#f3f8ff; border-radius:0 8px 8px 0 }
  code { background:#f1f1f4; padding:1px 5px; border-radius:4px; font-size:.9em; font-family:ui-monospace,Menlo,monospace }
  pre { background:#f6f6f8; padding:11px 13px; border-radius:9px; overflow:auto; border:1px solid #e6e6ea; page-break-inside:avoid }
  table { border-collapse:collapse; width:100%; margin:.8em 0; font-size:11pt; page-break-inside:avoid }
  th,td { border:1px solid #dcdce2; padding:7px 9px; text-align:left; vertical-align:top }
  th { background:#f2f6fc; font-weight:600 }
  hr { border:none; border-top:1px solid #e2e2e8; margin:1.2em 0 }
  .qa { page-break-inside:avoid; border:1px solid #e4e4ea; border-radius:11px; padding:11px 14px; margin:10px 0; background:#fcfcfe }
  .foot { margin-top:30px; padding-top:11px; border-top:1px solid #e4e4ea; font-size:8.8pt; color:#8a8a93; display:flex; justify-content:space-between }
  a { color:#0a63c4; text-decoration:none }
`

/** Opens a print-ready window → user chooses "Save as PDF". Bangla renders perfectly. */
export function exportPdf(title: string, markdown: string, subtitle?: string) {
  const html = mdToHtml(markdown)
  const stamp = new Date().toLocaleString('bn-BD', { dateStyle: 'full', timeStyle: 'short' })
  const doc = `<!doctype html><html lang="bn"><head><meta charset="utf-8"/>
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
<style>${PRINT_CSS}</style></head>
<body><div class="wrap">
<div class="head"><div class="logo">A</div><div>
  <h1>${title}</h1>
  <p class="sub">${subtitle || 'AdmihubAi · মানবিক বিভাগ ভর্তি প্রস্তুতি'} — ${stamp}</p>
</div></div>
${html}
<div class="foot"><span>AdmihubAi — পার্সোনাল AI স্টাডি এজেন্ট</span><span>${stamp}</span></div>
</div>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},650)})<\/script>
</body></html>`

  const w = window.open('', '_blank', 'width=900,height=1000')
  if (!w) {
    // popup blocked → fall back to a downloadable HTML file
    downloadBlob(doc, `${slug(title)}.html`, 'text/html;charset=utf-8')
    return false
  }
  w.document.open()
  w.document.write(doc)
  w.document.close()
  return true
}
