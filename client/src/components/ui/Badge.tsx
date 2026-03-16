import type { ReactNode } from 'react'

type BadgeVariant = 'green' | 'yellow' | 'red' | 'gray' | 'blue'

const variantClasses: Record<BadgeVariant, string> = {
  green:  'bg-health-100 text-health-700 border-health-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  red:    'bg-red-100 text-red-700 border-red-200',
  gray:   'bg-slate-100 text-slate-600 border-slate-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

export default function Badge({ variant = 'gray', children, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
