import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:border-slate-200 transition-all' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
