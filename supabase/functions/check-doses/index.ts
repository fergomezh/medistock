// supabase/functions/check-doses/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TOLERANCE_MS    = 5 * 60 * 1000   // 5 minutes

serve(async (_req) => {
  try {
    const supabase   = createClient(supabaseUrl, serviceRoleKey)
    const now        = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    // Fetch all active medications with dose times
    const { data: meds, error: medsErr } = await supabase
      .from('medications')
      .select('id, name, user_id, dose_times')
      .eq('active', true)
    if (medsErr) throw medsErr

    let missedCount = 0

    for (const med of meds ?? []) {
      for (const timeStr of (med.dose_times ?? []) as string[]) {
        const [hh, mm] = timeStr.split(':').map(Number)

        // Build the scheduled Date for today at this time
        const scheduledAt = new Date(now)
        scheduledAt.setHours(hh, mm, 0, 0)

        // Only process doses that were scheduled in the last hour
        if (scheduledAt < oneHourAgo || scheduledAt >= now) continue

        const windowStart = new Date(scheduledAt.getTime() - TOLERANCE_MS).toISOString()
        const windowEnd   = new Date(scheduledAt.getTime() + TOLERANCE_MS).toISOString()

        // Check if a dose log already exists within the tolerance window
        const { count } = await supabase
          .from('dose_logs')
          .select('*', { count: 'exact', head: true })
          .eq('medication_id', med.id)
          .gte('scheduled_at', windowStart)
          .lte('scheduled_at', windowEnd)
        if (count !== null && count > 0) continue

        const scheduledAtISO = scheduledAt.toISOString()

        // Insert missed dose log
        await supabase.from('dose_logs').insert({
          user_id:       med.user_id,
          medication_id: med.id,
          status:        'missed',
          scheduled_at:  scheduledAtISO,
          taken_at:      null,
        })

        // Create dose_reminder alert
        await supabase.from('alerts').insert({
          user_id:       med.user_id,
          medication_id: med.id,
          type:          'dose_reminder',
          message:       `Dosis perdida de ${med.name} a las ${timeStr}.`,
        })

        missedCount++
      }
    }

    return new Response(JSON.stringify({ ok: true, missed: missedCount }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
