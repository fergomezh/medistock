// client/src/services/export.ts
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { calcRestockDate } from '../utils/restock'
import { formatDate } from '../utils/dates'
import type { Medication } from '../types'
import type { DoseLogWithMedication } from './doseLogs'

// ─── PDF ────────────────────────────────────────────────────────────────────

export function exportInventoryPDF(medications: Medication[]): void {
  const doc = new jsPDF()

  // Header
  doc.setFontSize(18)
  doc.setTextColor(34, 197, 94) // health-500
  doc.text('MediStock', 14, 22)
  doc.setFontSize(10)
  doc.setTextColor(100, 116, 139) // slate-500
  doc.text(`Generado: ${formatDate(new Date().toISOString())}`, 14, 30)

  autoTable(doc, {
    startY: 38,
    head: [['Nombre', 'Descripción', 'Stock', 'Unidad', 'Vencimiento', 'Recomprar', 'Estado']],
    body: medications.map(m => {
      const restock = calcRestockDate(
        m.quantity_current,
        m.dose_amount,
        m.dose_times?.length ?? 0
      )
      return [
        m.name,
        m.description ?? '',
        m.quantity_current.toString(),
        m.quantity_unit,
        m.expiration_date ? formatDate(m.expiration_date) : '—',
        restock ? formatDate(restock.toISOString()) : '—',
        m.active ? 'Activo' : 'Inactivo',
      ]
    }),
    styles:     { fontSize: 9 },
    headStyles: { fillColor: [34, 197, 94] },
  })

  doc.save('medistock-inventario.pdf')
}

// ─── Excel ───────────────────────────────────────────────────────────────────

function buildInventoryRows(medications: Medication[]) {
  return medications.map(m => ({
    Nombre:         m.name,
    'Descripción':  m.description ?? '',
    'Stock actual': m.quantity_current,
    Unidad:         m.quantity_unit,
    Vencimiento:    m.expiration_date ?? '',
    Estado:         m.active ? 'Activo' : 'Inactivo',
  }))
}

export function exportInventoryExcel(medications: Medication[]): void {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(buildInventoryRows(medications))
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
  XLSX.writeFile(wb, 'medistock-inventario.xlsx')
}

export function exportHistorialExcel(
  medications: Medication[],
  doseLogs: DoseLogWithMedication[]
): void {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Inventory
  const ws1 = XLSX.utils.json_to_sheet(buildInventoryRows(medications))
  XLSX.utils.book_append_sheet(wb, ws1, 'Inventario')

  // Sheet 2: Dose history
  const STATUS_ES: Record<string, string> = {
    taken: 'Tomada', skipped: 'Omitida', missed: 'Perdida',
  }
  const historialRows = doseLogs.map(log => ({
    Medicamento:        log.medication.name,
    Fecha:              formatDate(log.scheduled_at),
    'Hora programada':  log.scheduled_at.slice(11, 16),
    'Hora tomada':      log.taken_at ? log.taken_at.slice(11, 16) : '',
    Estado:             STATUS_ES[log.status] ?? log.status,
    Notas:              log.notes ?? '',
  }))
  const ws2 = XLSX.utils.json_to_sheet(historialRows)
  XLSX.utils.book_append_sheet(wb, ws2, 'Historial de Tomas')

  XLSX.writeFile(wb, 'medistock-historial.xlsx')
}
