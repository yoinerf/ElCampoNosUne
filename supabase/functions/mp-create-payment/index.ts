// Edge Function: mp-create-payment
// Crea los cobros de Mercado Pago de un pedido en línea: uno por productor (split 1:1),
// cada uno con el access_token de ese productor para que el dinero llegue directo a su
// cuenta. La plataforma no cobra comisión (marketplace_fee = 0).
//
//   POST { order_id } (con sesión del comprador)
//     → { payments: [{ id, seller_id, seller_name, base_amount, fee_amount, total_amount, status, checkout_url }] }
//
// Los montos NO vienen del navegador: prepare_order_payments los calcula en la base con los
// precios del pedido y la tarifa de payment_gateway_settings (gateway_fee).

import { appUrl, corsHeaders, functionUrl, mpFetch, sellerAccessToken, serviceClient, userClient } from '../_shared/mercadopago.ts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface OrderPayment {
  id: string
  order_id: string
  seller_id: string
  base_amount: number
  fee_amount: number
  total_amount: number
  status: string
  preference_id: string | null
  checkout_url: string | null
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

  // 1. Pagos por productor (valida dueño del pedido, método y pasarela activa)
  const { data: payments, error: prepError } = await buyer.rpc('prepare_order_payments', { p_order_id: orderId })
  if (prepError) return json({ error: prepError.message }, 400)

  const admin = serviceClient()
  const [{ data: settings }, { data: items }, { data: sellers }] = await Promise.all([
    admin.from('payment_gateway_settings').select('sandbox').eq('gateway', 'mercadopago').single(),
    admin.from('order_items').select('seller_id, title, quantity, unit_price').eq('order_id', orderId),
    admin.from('profiles').select('id, org_name, first_name, last_name')
      .in('id', (payments as OrderPayment[]).map((p) => p.seller_id)),
  ])
  const sellerName = (id: string) => {
    const s = sellers?.find((x) => x.id === id)
    return s?.org_name || `${s?.first_name ?? ''} ${s?.last_name ?? ''}`.trim() || 'Productor'
  }
  const reference = orderId.slice(0, 8).toUpperCase()
  const back = (result: string) => `${appUrl()}/mi-cuenta?pago=${result}&pedido=${orderId}`

  // 2. Una preferencia de Checkout Pro por productor (se reutiliza si ya existe)
  const result = []
  for (const pay of payments as OrderPayment[]) {
    let checkoutUrl = pay.checkout_url
    if (pay.status === 'Pending' && !checkoutUrl) {
      try {
        const token = await sellerAccessToken(admin, pay.seller_id)
        const lines = (items ?? [])
          .filter((i) => i.seller_id === pay.seller_id)
          .map((i) => ({ title: i.title, quantity: i.quantity, unit_price: Number(i.unit_price), currency_id: 'COP' }))
        if (pay.fee_amount > 0) {
          lines.push({ title: 'Tarifa de procesamiento del pago', quantity: 1, unit_price: Number(pay.fee_amount), currency_id: 'COP' })
        }

        const preference = await mpFetch('/checkout/preferences', token, {
          method: 'POST',
          headers: { 'X-Idempotency-Key': `${pay.id}-${pay.total_amount}` },
          body: JSON.stringify({
            items: lines,
            marketplace_fee: 0,
            external_reference: pay.id,
            notification_url: functionUrl('mp-webhook'),
            payer: { email: user.email },
            statement_descriptor: 'ELCAMPONOSUNE',
            metadata: { order_id: orderId, order_payment_id: pay.id },
            back_urls: { success: back('aprobado'), pending: back('pendiente'), failure: back('rechazado') },
            auto_return: 'approved',
          }),
        })
        checkoutUrl = settings?.sandbox ? preference.sandbox_init_point : preference.init_point
        await admin.from('order_payments')
          .update({ preference_id: preference.id, checkout_url: checkoutUrl, updated_at: new Date().toISOString() })
          .eq('id', pay.id)
      } catch (error) {
        console.error(`mp-create-payment ${pay.id}:`, error)
        return json({ error: `No se pudo crear el cobro de ${sellerName(pay.seller_id)}. Intenta de nuevo.` }, 502)
      }
    }

    result.push({
      id: pay.id,
      seller_id: pay.seller_id,
      seller_name: sellerName(pay.seller_id),
      base_amount: Number(pay.base_amount),
      fee_amount: Number(pay.fee_amount),
      total_amount: Number(pay.total_amount),
      status: pay.status,
      checkout_url: pay.status === 'Pending' ? checkoutUrl : null,
    })
  }

  return json({ reference, payments: result })
})
