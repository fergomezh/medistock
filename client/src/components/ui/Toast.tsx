import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

type ToastType = 'success' | 'error'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

let nextId = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++nextId
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  function dismiss(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-medium max-w-xs ${
              t.type === 'success' ? 'bg-health-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {t.type === 'success'
              ? <CheckCircle2 size={16} className="shrink-0" />
              : <AlertCircle size={16} className="shrink-0" />
            }
            <span className="flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Cerrar notificación"
              className="shrink-0 opacity-80 hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
