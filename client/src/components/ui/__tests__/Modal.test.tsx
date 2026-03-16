import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import Modal from '../Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Test"><span>content</span></Modal>
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders with role="dialog" when open', () => {
    render(<Modal open onClose={vi.fn()} title="Test"><span>content</span></Modal>)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the title', () => {
    render(<Modal open onClose={vi.fn()} title="Mi título"><span /></Modal>)
    expect(screen.getByText('Mi título')).toBeInTheDocument()
  })

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Test"><span /></Modal>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('close button has aria-label', () => {
    render(<Modal open onClose={vi.fn()} title="Test"><span /></Modal>)
    expect(screen.getByLabelText('Cerrar')).toBeInTheDocument()
  })
})
