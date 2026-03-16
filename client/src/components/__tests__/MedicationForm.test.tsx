import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MedicationForm from '../MedicationForm'

vi.mock('../../hooks/useMedications', () => ({
  useCreateMedication: vi.fn(),
  useUpdateMedication: vi.fn(),
}))

import { useCreateMedication, useUpdateMedication } from '../../hooks/useMedications'

const mockMutation = () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })

describe('MedicationForm', () => {
  beforeEach(() => {
    vi.mocked(useCreateMedication).mockReturnValue(mockMutation() as any)
    vi.mocked(useUpdateMedication).mockReturnValue(mockMutation() as any)
  })

  it('does not render when closed', () => {
    const { container } = render(
      <MedicationForm open={false} onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('shows validation error when name is empty and form is submitted', async () => {
    render(<MedicationForm open onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Crear medicamento'))
    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio.')).toBeInTheDocument()
    })
  })

  it('calls createMutation when form is submitted with valid data', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({})
    vi.mocked(useCreateMedication).mockReturnValue({ mutateAsync, isPending: false } as any)

    render(<MedicationForm open onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Aspirina' } })
    fireEvent.click(screen.getByText('Crear medicamento'))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ name: 'Aspirina' }))
    })
  })

  it('pre-populates form in edit mode', () => {
    const medication = {
      id: 'med-1', user_id: 'u1', name: 'Paracetamol', description: null,
      quantity_current: 20, quantity_minimum: 5, quantity_unit: 'pastillas',
      dose_amount: 1, dose_frequency: 'diaria', dose_times: ['08:00'],
      expiration_date: null, purchase_date: null, active: true, created_at: '2026-01-01',
    }
    render(<MedicationForm open onClose={vi.fn()} medication={medication} />)
    expect(screen.getByDisplayValue('Paracetamol')).toBeInTheDocument()
    expect(screen.getByText('Guardar cambios')).toBeInTheDocument()
  })
})
