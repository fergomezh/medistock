import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
}

export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  required,
}: PasswordInputProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="w-full px-4 py-2.5 pr-11 rounded-xl border border-slate-200 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-health-400 text-sm"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
