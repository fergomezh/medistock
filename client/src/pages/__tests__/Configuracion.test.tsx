// client/src/pages/__tests__/Configuracion.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Configuracion from '../Configuracion'

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}))
vi.mock('../../hooks/useProfile', () => ({
  useProfile: vi.fn(),
  useUpdateProfile: vi.fn(),
}))

import { useAuth } from '../../context/AuthContext'
import { useProfile, useUpdateProfile } from '../../hooks/useProfile'

const wrap = () => render(<MemoryRouter><Configuracion /></MemoryRouter>)

describe('Configuracion', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { email: 'test@example.com' },
      resetPassword: vi.fn(),
    } as any)
    vi.mocked(useProfile).mockReturnValue({
      data: {
        full_name: 'Juan',
        notification_email: '',
        restock_margin_days: 5,
        daily_summary_enabled: true,
      },
    } as any)
    vi.mocked(useUpdateProfile).mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    } as any)
  })

  it('renders the page title', () => {
    wrap()
    expect(screen.getByText('Configuración')).toBeInTheDocument()
  })

  it('pre-populates name from profile', () => {
    wrap()
    expect(screen.getByDisplayValue('Juan')).toBeInTheDocument()
  })

  it('shows user email (read-only)', () => {
    wrap()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
  })

  it('calls updateProfile on submit', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useUpdateProfile).mockReturnValue({ mutateAsync, isPending: false } as any)
    wrap()
    fireEvent.click(screen.getByText('Guardar cambios'))
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Juan' }))
    })
  })

  it('shows "Cambiar contraseña" button', () => {
    wrap()
    expect(screen.getByText('Cambiar contraseña')).toBeInTheDocument()
  })
})
