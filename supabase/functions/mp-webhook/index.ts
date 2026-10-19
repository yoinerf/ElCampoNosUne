// Edge Function: mp-webhook
// Recibe las notificaciones de pago de Mercado Pago (Webhooks, evento "Pagos"). Se despliega
// con --no-verify-jwt: Mercado Pago no envía sesión de Supabase; la autenticidad se verifica
// con la firma x-signature (MP_WEBHOOK_SECRET).
//
// Nunca confía en el contenido de la notificación: con el id consulta el pago en la API de
// Mercado Pago usando el token del productor que lo recibió, y solo entonces
// apply_order_payment_result actualiza order_payments y los ítems del pedido.

import { corsHeaders, mpFetch, sellerAccessToken, serviceClient, validWebhookSignature } from '../_shared/mercadopago.ts'

Deno.serve(async (req) => {
  const cors = corsHeaders(req)
  const reply = (status = 200) => new Response(null, { status, headers: cors })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return reply(405)

  const url = new URL(req.url)
  let body: { type?: string; action?: string; user_id?: number | string; data?: { id?: string | number } } = {}
  try {
    body = await req.json()
  } catch {
    // Algunas notificaciones llegan solo con query params
  }

  const type = body.type ?? url.searchParams.get('type')
  const paymentId = String(url.searchParams.get('data.id') ?? body.data?.id ?? '')
  // Solo interesan los pagos; el resto se confirma para que Mercado Pago no reintente
  if (type !== 'payment' || !paymentId) return reply(200)

  if (!(await validWebhookSignature(req, paymentId))) return reply(401)

  const admin = serviceClient()
  try {
    // Productor dueño del pago (user_id = cuenta de Mercado Pago que cobró)
    const { data: account } = await admin
      .from('seller_payment_accounts')
      .select('seller_id')
      .eq('gateway', 'mercadopago')
      .eq('provider_user_id', String(body.user_id ?? ''))
      .maybeSingle()
    if (!account) {
      console.warn(`mp-webhook: cuenta ${body.user_id} no registrada (pago ${paymentId})`)
      return reply(200)
    }

    const token = await sellerAccessToken(admin, account.seller_id)
    const payment = await mpFetch(`/v1/payments/${encodeURIComponent(paymentId)}`, token)

    const { data: orderPayment } = await admin
      .from('order_payments')
      .select('id, seller_id')
      .eq('id', String(payment.external_reference ?? ''))
      .maybeSingle()
    if (!orderPayment || orderPayment.seller_id !== account.seller_id) {
      console.warn(`mp-webhook: pago ${paymentId} sin pedido válido (${payment.external_reference})`)
      return reply(200)
    }
    if (payment.currency_id !== 'COP') {
      console.warn(`mp-webhook: pago ${paymentId} en moneda ${payment.currency_id}`)
      return reply(200)
    }

    const { error } = await admin.rpc('apply_order_payment_result', {
      p_payment_id: orderPayment.id,
      p_provider_payment_id: String(payment.id),
      p_provider_status: String(payment.status),
      p_amount: Number(payment.transaction_amount),
    })
    if (error) throw error
    return reply(200)
  } catch (error) {
    // 500 → Mercado Pago reintenta la notificación más tarde
    console.error(`mp-webhook ${paymentId}:`, error)
    return reply(500)
  }
})
