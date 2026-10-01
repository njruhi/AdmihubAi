import { useState } from 'react'
import { ArrowLeft, Eye, FileDown, FileText, NotebookPen, Pencil, Plus, Trash2 } from 'lucide-react'
import { actions, useStore } from '../../store/store'
import { Markdown } from '../ui/Markdown'
import { exportMarkdown, exportPdf, exportText } from '../../lib/exporter'
import { uid } from '../../lib/storage'
import { SUBJECTS } from '../../data/prompts'
import type { Note } from '../../types'

export function NotesView() {
  const notes = useStore((s) => s.notes)
  const [editing, setEditing] = useState<Note | null>(null)
  const [preview, setPreview] = useState(false)

  if (editing) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b px-3 py-2.5 hairline sm:px-5">
          <button
            onClick={() => {
              if (editing.title.trim() || editing.content.trim()) {
                actions.upsertNote({ ...editing, updatedAt: Date.now() })
                actions.toast('নোট সেভ হয়েছে ✓')
              }
              setEditing(null)
            }}
            className="btn-ghost size-8 !rounded-full !p-0"
          >
            <ArrowLeft size={16} />
          </button>
          <input
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold outline-none"
            placeholder="নোটের শিরোনাম…"
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
          />
          <select
            className="shrink-0 rounded-xl bg-[rgb(var(--line)/0.06)] px-2 py-1 text-[12px] outline-none"
            value={editing.subject}
            onChange={(e) => setEditing({ ...editing, subject: e.target.value })}
          >
            {['সাধারণ', ...SUBJECTS].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button onClick={() => setPreview((p) => !p)} className="btn-ghost size-8 !rounded-full !p-0" title="প্রিভিউ">
            {preview ? <Pencil size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-4">
            {preview ? (
              <Markdown>{editing.content || '*(খালি নোট)*'}</Markdown>
            ) : (
              <textarea
                autoFocus
                className="min-h-[60vh] w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none"
                placeholder={'এখানে লেখো…\n\nMarkdown সাপোর্ট করে:\n# হেডিং\n- বুলেট\n**বোল্ড**\n| টেবিল | কলাম |'}
                value={editing.content}
                onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2.5 hairline sm:px-5">
          <button onClick={() => exportPdf(editing.title || 'নোট', editing.content, editing.subject)} className="chip">
            <FileDown size={13} /> PDF
          </button>
          <button onClick={() => exportMarkdown(editing.title || 'নোট', editing.content)} className="chip">
            <FileText size={13} /> Markdown
          </button>
          <button onClick={() => exportText(editing.title || 'নোট', editing.content)} className="chip">
            TXT
          </button>
          <span className="ml-auto text-[11.5px] muted">{editing.content.length} অক্ষর</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-3 px-3 py-5 sm:px-5">
        <div className="card flex items-center gap-3 !p-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ios-yellow to-ios-orange shadow-lg shadow-ios-orange/25">
            <NotebookPen size={21} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold tracking-tight">শর্ট নোট মেকার</h2>
            <p className="text-[12px] muted">Markdown-এ লেখো · PDF/TXT এক্সপোর্ট করো</p>
          </div>
          <button
            onClick={() =>
              setEditing({ id: uid('n'), title: '', content: '', subject: 'সাধারণ', updatedAt: Date.now() })
            }
            className="btn-primary shrink-0 !px-3"
          >
            <Plus size={16} /> নতুন
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="card py-10 text-center">
            <NotebookPen size={30} className="mx-auto mb-3 muted" />
            <p className="text-[14px] font-medium">কোনো নোট নেই</p>
            <p className="mt-1 text-[12.5px] muted">
              চ্যাটের উত্তরগুলোও 📝 আইকনে চাপ দিয়ে সরাসরি নোট হিসেবে সেভ করতে পারো
            </p>
          </div>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="card group flex items-start gap-3 !p-4">
              <button onClick={() => setEditing(n)} className="min-w-0 flex-1 text-left">
                <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-full bg-ios-orange/12 px-2 py-0.5 text-[10px] font-semibold text-ios-orange">
                    {n.subject}
                  </span>
                  <span className="text-[10.5px] muted">{new Date(n.updatedAt).toLocaleString('bn-BD')}</span>
                </div>
                <h3 className="truncate text-[14.5px] font-semibold">{n.title || 'শিরোনামহীন'}</h3>
                <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug muted">
                  {n.content.replace(/[#*`>|-]/g, '').slice(0, 160)}
                </p>
              </button>
              <div className="flex shrink-0 flex-col gap-1">
                <button
                  onClick={() => exportPdf(n.title || 'নোট', n.content, n.subject)}
                  className="rounded-lg p-1.5 muted transition hover:bg-[rgb(var(--line)/0.08)]"
                  title="PDF"
                >
                  <FileDown size={14} />
                </button>
                <button
                  onClick={() => actions.deleteNote(n.id)}
                  className="rounded-lg p-1.5 muted transition hover:bg-ios-red/12 hover:text-ios-red"
                  title="মুছুন"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
