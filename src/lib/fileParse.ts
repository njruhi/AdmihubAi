/* File → plain text extraction, fully client side.
 * Heavy parsers (pdf.js, mammoth) are dynamically imported so they never
 * slow down the first paint. */

export interface ParsedFile {
  text: string
  kind: string
  pages?: number
}

export const ACCEPTED =
  '.pdf,.txt,.md,.markdown,.csv,.json,.docx,.doc,.rtf,.html,.htm,text/plain,application/pdf'

export async function parseFile(file: File, onProgress?: (p: number) => void): Promise<ParsedFile> {
  const name = file.name.toLowerCase()
  const ext = name.slice(name.lastIndexOf('.') + 1)

  if (ext === 'pdf') return parsePdf(file, onProgress)
  if (ext === 'docx') return parseDocx(file)
  if (ext === 'doc') throw new Error('পুরনো .doc ফরম্যাট সাপোর্ট করে না — Word থেকে .docx বা PDF আকারে সেভ করে আপলোড করুন।')
  if (['html', 'htm'].includes(ext)) {
    const raw = await file.text()
    const div = document.createElement('div')
    div.innerHTML = raw
    return { text: (div.textContent || '').trim(), kind: 'HTML' }
  }
  if (ext === 'json') {
    const raw = await file.text()
    try {
      return { text: JSON.stringify(JSON.parse(raw), null, 2), kind: 'JSON' }
    } catch {
      return { text: raw, kind: 'JSON' }
    }
  }
  // txt / md / csv / rtf / anything text-ish
  const text = await file.text()
  if (/\ufffd/.test(text.slice(0, 2000)) && text.length > 200) {
    throw new Error('ফাইলটি টেক্সট হিসেবে পড়া যায়নি। PDF, DOCX বা TXT ব্যবহার করুন।')
  }
  return { text: stripRtf(text, ext), kind: ext.toUpperCase() || 'TEXT' }
}

function stripRtf(text: string, ext: string): string {
  if (ext !== 'rtf') return text
  return text
    .replace(/\\'[0-9a-f]{2}/gi, ' ')
    .replace(/\\[a-z]+-?\d* ?/gi, ' ')
    .replace(/[{}]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

async function parsePdf(file: File, onProgress?: (p: number) => void): Promise<ParsedFile> {
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default
  ;(pdfjs as any).GlobalWorkerOptions.workerSrc = workerUrl

  const buf = await file.arrayBuffer()
  const task = (pdfjs as any).getDocument({
    data: buf,
    isEvalSupported: false,
    useSystemFonts: true,
  })
  const pdf = await task.promise
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    let last: any = null
    let line = ''
    const lines: string[] = []
    for (const item of content.items as any[]) {
      if (!('str' in item)) continue
      if (last && Math.abs((item.transform?.[5] ?? 0) - (last.transform?.[5] ?? 0)) > 2) {
        if (line.trim()) lines.push(line.trim())
        line = ''
      }
      line += item.str + (item.hasEOL ? '\n' : ' ')
      last = item
    }
    if (line.trim()) lines.push(line.trim())
    pages.push(`[পৃষ্ঠা ${i}]\n` + lines.join('\n'))
    onProgress?.(i / pdf.numPages)
  }
  const text = pages.join('\n\n').replace(/[ \t]{2,}/g, ' ').trim()
  if (!text || text.replace(/\[পৃষ্ঠা \d+\]/g, '').trim().length < 20) {
    throw new Error(
      'এই PDF থেকে টেক্সট পাওয়া যায়নি — সম্ভবত এটি স্ক্যান করা ছবি। OCR করা PDF বা টেক্সট ফাইল আপলোড করুন।',
    )
  }
  return { text, kind: 'PDF', pages: pdf.numPages }
}

async function parseDocx(file: File): Promise<ParsedFile> {
  const mod: any = await import('mammoth/mammoth.browser.js')
  const mammoth = mod?.default ?? mod ?? (window as any).mammoth
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  const text = (result?.value || '').trim()
  if (!text) throw new Error('DOCX ফাইল থেকে কোনো টেক্সট পাওয়া যায়নি।')
  return { text, kind: 'DOCX' }
}

export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
