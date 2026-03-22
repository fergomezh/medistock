import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  maxWidth?: string
  /** Ref to the element that triggered the modal — focus returns here on close */
  triggerRef?: React.RefObject<HTMLElement | null>
}

const TITLE_ID = 'modal-title'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg', triggerRef }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Focus first focusable element when modal opens; restore focus when it closes
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return

    // Defer so the DOM is fully rendered
    const raf = requestAnimationFrame(() => {
      const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE)
      ;(firstFocusable ?? closeBtnRef.current)?.focus()
    })

    return () => {
      cancelAnimationFrame(raf)
      // Return focus to trigger element
      triggerRef?.current?.focus()
    }
  }, [open, triggerRef])

  // Keyboard handler: Escape to close, Tab to trap focus inside
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return

      const panel = panelRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return

      const first = focusable[0]
      const last  = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus() }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — modal en desktop, drawer desde abajo en mobile */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        className={`fixed z-50
          bottom-0 left-0 right-0 rounded-t-3xl
          sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:w-full sm:${maxWidth}
          bg-white dark:bg-slate-900 shadow-2xl dark:shadow-slate-950/80
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 id={TITLE_ID} className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="Cerrar"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </>
  )
}
