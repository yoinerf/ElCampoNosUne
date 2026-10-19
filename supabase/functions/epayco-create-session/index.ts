// Edge Function: epayco-create-session
// Crea la sesión del Smart Checkout de ePayco para un pedido en línea. Es UN solo cobro y
// ePayco lo reparte entre los productores con Pagos Divididos (splitPayment): cada
// productor es un "receptor" de la cuenta de la plataforma. La plataforma no cobra
// comisión (fee 0); la tarifa de la pasarela la paga el comprador y queda en la cuenta
// principal para cubrir lo que descuenta ePayco.
//
//   POST { order_id } (con sesión del comprador) → { sessionId, test, reference, total }
//
// Los montos NO vienen del navegador: prepare_order_payments los calcula en la base.

import { UUID_RE, appUrl, corsHeaders, env, functionUrl, serviceClient, userClient } from '../_shared/common.ts'
import { createCheckoutSession, type EpaycoReceiver } from '../_shared/epayco.ts'

interface OrderPayment {
  id: string
  gateway: string
  status: string
  base_amount: number
  fee_amount: number
  total_amount: number
  split: { seller_id: string; receiver_id: string; amount: number }[] | null
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const buyer = userClient(req)
  const { data: { user } } = await buyer.auth.getUser()
  if (!user) return json({ error: 'Sesión inválida. Vuelve a iniciar sesión.' }, 401)

  let orderId: string
  try {
    orderId = String((await req.json()).order_id ?? '')
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }
  if (!UUID_RE.test(orderId)) return json({ error: 'Pedido inválido.' }, 400)
  if (!env('EPAYCO_PUBLIC_KEY')) return json({ error: 'ePayco aún no está configurado.' }, 503)

  // 1. Cobro del pedido (valida dueño, método, pasarela activa y receptores activos)
  const { data: prepared, error: prepError } = await buyer.rpc('prepare_order_payments', { p_order_id: orderId })
  if (prepError) return json({ error: prepError.message }, 400)
  const pay = (prepared as OrderPayment[]).find((p) => p.gateway === 'epayco')
  if (!pay) return json({ error: 'Este pedido no se paga con ePayco.' }, 400)
  if (pay.status === 'Paid') return json({ error: 'Este pedido ya está pagado.' }, 400)

  const admin = serviceClient()
  const [{ data: settings }, { data: profile }] = await Promise.all([
    admin.from('payment_gateway_settings').select('sandbox').eq('gateway', 'epayco').single(),
    admin.from('profiles').select('first_name, last_name, phone, document_type, document_number').eq('id', user.id).maybeSingle(),
  ])

  const reference = orderId.slice(0, 8).toUpperCase()
  const receivers: EpaycoReceiver[] = (pay.split ?? []).map((r) => ({
    merchantId: Number(r.receiver_id),
    amount: Number(r.amount),
    taxBase: 0,
    tax: 0,
    fee: 0,
  }))

  try {
    const sessionId = await createCheckoutSession({
      name: 'El Campo Nos Une',
      description: `Pedido #${reference}`,
      invoice: pay.id,
      currency: 'COP',
      amount: Number(pay.total_amount),
      taxBase: 0,
      tax: 0,
      taxIco: 0,
      country: 'CO',
      lang: 'ES',
      response: `${appUrl()}/mi-cuenta?pago=epayco&pedido=${orderId}`,
      confirmation: functionUrl('epayco-confirmation'),
      method: 'POST',
      extras: { extra1: pay.id, extra2: orderId },
      billing: {
        email: user.email ?? '',
        name: `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim(),
        typeDoc: profile?.document_type ?? 'CC',
        numberDoc: profile?.document_number ?? '',
        callingCode: '+57',
        mobilePhone: profile?.phone ?? '',
      },
      splitPayment: {
        type: env('EPAYCO_SPLIT_TYPE') || 'percentage',
        receivers,
      },
    })

    await admin.from('order_payments')
      .update({ preference_id: sessionId, updated_at: new Date().toISOString() })
      .eq('id', pay.id)

    return json({ sessionId, test: settings?.sandbox ?? true, reference, total: Number(pay.total_amount) })
  } catch (error) {
    console.error(`epayco-create-session ${pay.id}:`, error)
    return json({ error: 'No se pudo abrir el pago con ePayco. Intenta de nuevo.' }, 502)
  }
})
