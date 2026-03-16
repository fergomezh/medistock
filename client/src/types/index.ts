export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  notification_email: string | null
  restock_margin_days: number
  timezone: string
  daily_summary_enabled: boolean
  created_at: string
}

export interface Medication {
  id: string
  user_id: string
  name: string
  description: string | null
  quantity_current: number
  quantity_minimum: number
  quantity_unit: string
  dose_amount: number
  dose_frequency: string | null
  dose_times: string[]
  expiration_date: string | null
  purchase_date: string | null
  active: boolean
  created_at: string
}

export type DoseStatus = 'taken' | 'skipped' | 'missed'

export interface DoseLog {
  id: string
  user_id: string
  medication_id: string
  taken_at: string | null
  scheduled_at: string
  status: DoseStatus
  notes: string | null
  created_at: string
  medication?: Pick<Medication, 'name' | 'dose_amount' | 'quantity_unit'>
}

export type AlertType = 'low_stock' | 'expiration' | 'dose_reminder' | 'restock_date'

export interface Alert {
  id: string
  user_id: string
  medication_id: string | null
  type: AlertType
  message: string
  is_read: boolean
  triggered_at: string
  medication?: Pick<Medication, 'name'>
}

export type MedicationFormData = Omit<Medication, 'id' | 'user_id' | 'created_at'>

// Dosis programada del día (calculada en frontend)
export interface ScheduledDose {
  medication: Medication
  scheduledTime: string   // "08:00"
  scheduledAt: Date
  logEntry: DoseLog | null  // null = pendiente
}
