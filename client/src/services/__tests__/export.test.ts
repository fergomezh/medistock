// client/src/services/__tests__/export.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock jsPDF y jspdf-autotable
vi.mock('jspdf', () => {
  const mockDoc = {
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
  }
  const MockJsPDF = vi.fn(function(this: unknown) { return mockDoc })
  return { default: MockJsPDF }
})
vi.mock('jspdf-autotable', () => ({ default: vi.fn() }))

// Mock SheetJS
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))

vi.mock('../../utils/restock', () => ({ calcRestockDate: vi.fn(() => null) }))
vi.mock('../../utils/dates',   () => ({ formatDate: (d: string) => d }))

import { exportInventoryPDF, exportInventoryExcel, exportHistorialExcel } from '../export'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const makeMed = (id: string) => ({
  id, name: 'Aspirina', description: null,
  quantity_current: 10, quantity_minimum: 5, quantity_unit: 'pastillas',
  dose_amount: 1, dose_times: ['08:00'], dose_frequency: 'diaria',
  expiration_date: null, purchase_date: null, active: true,
  user_id: 'u1', created_at: '2026-01-01',
})

const makeLog = (id: string) => ({
  id, medication_id: 'med-1', user_id: 'u1', status: 'taken',
  scheduled_at: '2026-03-15T08:00:00Z', taken_at: '2026-03-15T08:05:00Z',
  notes: null, created_at: '2026-03-15',
  medication: { name: 'Aspirina' },
})

describe('exportInventoryPDF', () => {
  it('creates a jsPDF instance and calls save', () => {
    exportInventoryPDF([makeMed('1')])
    expect(jsPDF).toHaveBeenCalled()
    const doc = vi.mocked(jsPDF).mock.results[0].value
    expect(doc.save).toHaveBeenCalledWith('medistock-inventario.pdf')
  })

  it('calls autoTable with correct headers', () => {
    exportInventoryPDF([makeMed('1')])
    expect(autoTable).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        head: [['Nombre', 'Descripción', 'Stock', 'Unidad', 'Vencimiento', 'Recomprar', 'Estado']],
      })
    )
  })
})

describe('exportInventoryExcel', () => {
  it('creates workbook with "Inventario" sheet', () => {
    exportInventoryExcel([makeMed('1')])
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), 'Inventario'
    )
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'medistock-inventario.xlsx')
  })
})

describe('exportHistorialExcel', () => {
  it('creates workbook with "Inventario" and "Historial de Tomas" sheets', () => {
    exportHistorialExcel([makeMed('1')], [makeLog('1') as any])
    const calls = vi.mocked(XLSX.utils.book_append_sheet).mock.calls
    const sheetNames = calls.map(c => c[2])
    expect(sheetNames).toContain('Inventario')
    expect(sheetNames).toContain('Historial de Tomas')
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'medistock-historial.xlsx')
  })
})
