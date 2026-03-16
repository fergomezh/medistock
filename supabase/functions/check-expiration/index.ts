// supabase/functions/check-expiration/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey    = Deno.env.get('RESEND_API_KEY')!

serve(async (_req) => {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const now           = new Date()
    const todayStr      = now.toISOString().slice(0, 10)
    const sevenDaysStr  = new Date(now.getTime() + 7  * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const tomorrowStr   = new Date(now.getTime() + 1  * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const dedup24h      = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()

    // Medications expiring within 7 days (and not already expired)
    const { data: meds, error: medsErr } = await supabase
      .from('medications')
      .select('id, name, user_id, expiration_date')
      .eq('active', true)
      .not('expiration_date', 'is', null)
      .gte('expiration_date', todayStr)
      .lte('expiration_date', sevenDaysStr)
    if (medsErr) throw medsErr

    let processed = 0

    for (const med of meds ?? []) {
      // Dedup: skip if unread expiration alert created in last 24 hours
      const { count } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('medication_id', med.id)
        .eq('type', 'expiration')
        .eq('is_read', false)
        .gte('triggered_at', dedup24h)
      if (count !== null && count > 0) continue

      const daysLeft = Math.ceil(
        (new Date(med.expiration_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const isUrgent = med.expiration_date === tomorrowStr

      // Create alert
      await supabase.from('alerts').insert({
        user_id:       med.user_id,
        medication_id: med.id,
        type:          'expiration',
        message:       `${med.name} vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}.`,
      })

      // Get notification email
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_email')
        .eq('id', med.user_id)
        .single()

      const to = profile?.notification_email
      if (!to) { processed++; continue }

      const subject = isUrgent
        ? `🚨 ¡${med.name} vence mañana!`
        : `⚠️ ${med.name} vence en ${daysLeft} días`

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    'MediStock <alertas@medistock.app>',
          to:      [to],
          subject,
          html:    `<p>Tu medicamento <strong>${med.name}</strong> vence el ` +
                   `${med.expiration_date} (en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}).</p>`,
        }),
      })

      processed++
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
