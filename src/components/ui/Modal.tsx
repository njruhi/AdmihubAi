import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5">
      <div
        className="absolute inset-0 animate-[fade-in_.2s_ease] bg-black/35 backdrop-blur-[3px] dark:bg-black/60"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`glass relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[28px] shadow-2xl animate-[pop_.3s_cubic-bezier(.34,1.56,.64,1)] sm:rounded-[28px] ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'
        }`}
      >
        <div className="flex items-start gap-3 border-b px-5 py-4 hairline">
          {icon && (
            <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-ios-blue to-ios-purple text-white shadow-lg shadow-ios-blue/30">
              {icon}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[17px] font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[13px] leading-snug muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="btn-ghost -mr-1 size-9 shrink-0 !rounded-full !p-0"
            aria-label="বন্ধ করুন"
          >
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t px-5 py-3.5 hairline">{footer}</div>}
      </div>
    </div>
  )
}
