// supabase/functions/send-daily-summary/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey    = Deno.env.get('RESEND_API_KEY')!

serve(async (_req) => {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const nowUTC = new Date()

    // Fetch profiles with daily summary enabled and a notification email
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, notification_email, timezone')
      .eq('daily_summary_enabled', true)
      .not('notification_email', 'is', null)
    if (profErr) throw profErr

    let sent = 0

    for (const profile of profiles ?? []) {
      // Filter: only send if user's local time is between 6 AM and 8 AM
      const tz = profile.timezone ?? 'America/Argentina/Buenos_Aires'
      const localHour = parseInt(
        new Intl.DateTimeFormat('en', { timeZone: tz, hour: 'numeric', hour12: false }).format(nowUTC),
        10
      )
      if (localHour < 6 || localHour > 8) continue

      // Get user's active medications with dose times
      const { data: meds } = await supabase
        .from('medications')
        .select('name, dose_times, dose_amount, quantity_unit')
        .eq('user_id', profile.id)
        .eq('active', true)

      const doseItems = (meds ?? [])
        .filter((m: { dose_times: string[] }) => m.dose_times?.length > 0)
        .flatMap((m: { name: string; dose_times: string[]; dose_amount: number; quantity_unit: string }) =>
          (m.dose_times as string[]).map(t =>
            `<li>${m.name} — ${t} (${m.dose_amount} ${m.quantity_unit})</li>`
          )
        )

      if (doseItems.length === 0) continue

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    'MediStock <resumen@medistock.app>',
          to:      [profile.notification_email],
          subject: '💊 Tu resumen de dosis de hoy',
          html:    `<h2>Tus dosis de hoy</h2><ul>${doseItems.join('')}</ul>` +
                   `<p>¡Que tengas un buen día!</p>`,
        }),
      })

      sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
