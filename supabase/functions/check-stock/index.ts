// supabase/functions/check-stock/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl     = Deno.env.get('SUPABASE_URL')!
const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const resendApiKey    = Deno.env.get('RESEND_API_KEY')!

serve(async (_req) => {
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // 1. Fetch all active medications
    const { data: meds, error: medsErr } = await supabase
      .from('medications')
      .select('id, name, user_id, quantity_current, quantity_minimum')
      .eq('active', true)
    if (medsErr) throw medsErr

    const lowStockMeds = (meds ?? []).filter(
      (m: { quantity_current: number; quantity_minimum: number }) => m.quantity_current <= m.quantity_minimum
    )

    let processed = 0

    for (const med of lowStockMeds) {
      // 2. Dedup: skip if unread low_stock alert already exists
      const { count } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('medication_id', med.id)
        .eq('type', 'low_stock')
        .eq('is_read', false)
      if (count !== null && count > 0) continue

      // 3. Create alert
      await supabase.from('alerts').insert({
        user_id:       med.user_id,
        medication_id: med.id,
        type:          'low_stock',
        message:       `Stock bajo en ${med.name}: ${med.quantity_current} unidades restantes.`,
      })

      // 4. Get notification email from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_email')
        .eq('id', med.user_id)
        .single()

      const to = profile?.notification_email
      if (!to) { processed++; continue }

      // 5. Send email via Resend
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    'MediStock <alertas@medistock.app>',
          to:      [to],
          subject: `⚠️ Stock bajo: ${med.name}`,
          html:    `<p>Tu medicamento <strong>${med.name}</strong> tiene stock bajo ` +
                   `(${med.quantity_current} unidades). Recordá reabastecerte pronto.</p>`,
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
