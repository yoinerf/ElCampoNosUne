// Edge Function: epayco-confirmation
// URL de confirmación de ePayco (la llama ePayco al cambiar el estado de una transacción).
// Se despliega con --no-verify-jwt: ePayco no envía sesión de Supabase.
//
// Seguridad:
//   1. Verifica x_signature = SHA256(P_CUST_ID_CLIENTE^P_KEY^x_ref_payco^x_transaction_id^x_amount^x_currency_code)
//   2. Consulta la transacción en ePayco por su referencia y usa ESOS datos (no los recibidos)
//   3. apply_order_payment_result valida el monto contra el cobro calculado en la base
// Responde 200 para confirmar recepción; 500 hace que ePayco reintente.

import { corsHeaders, serviceClient } from '../_shared/common.ts'
import { fetchTransaction, validConfirmationSignature } from '../_shared/epayco.ts'

/** Parámetros por POST (form o JSON) o por GET */
async function readParams(req: Request): Promise<Record<string, string>> {
  const params: Record<string, string> = Object.fromEntries(new URL(req.url).searchParams)
  if (req.method === 'POST') {
    const type = req.headers.get('content-type') ?? ''
    try {
      if (type.includes('application/json')) {
        Object.assign(params, await req.json())
      } else {
        Object.assign(params, Object.fromEntries(new URLSearchParams(await req.text())))
      }
    } catch {
      // Cuerpo vacío o inválido: se usan los parámetros de la URL
    }
  }
  return Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v ?? '')]))
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req)
  const reply = (status = 200) => new Response(null, { status, headers: cors })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST' && req.method !== 'GET') return reply(405)

  const params = await readParams(req)
  const refPayco = params.x_ref_payco || params.ref_payco
  if (!refPayco) return reply(400)
  if (!(await validConfirmationSignature(params))) {
    console.warn(`epayco-confirmation: firma inválida (ref ${refPayco})`)
    return reply(401)
  }

  const admin = serviceClient()
  try {
    const tx = await fetchTransaction(refPayco)
    const paymentId = tx.x_extra1 || tx.x_id_invoice
    const { data: orderPayment } = await admin
      .from('order_payments')
      .select('id')
      .eq('id', paymentId)
      .eq('gateway', 'epayco')
      .maybeSingle()
    if (!orderPayment) {
      console.warn(`epayco-confirmation: ref ${refPayco} sin pedido válido (${paymentId})`)
      return reply(200)
    }
    if (tx.x_currency_code && tx.x_currency_code !== 'COP') {
      console.warn(`epayco-confirmation: ref ${refPayco} en moneda ${tx.x_currency_code}`)
      return reply(200)
    }

    const { error } = await admin.rpc('apply_order_payment_result', {
      p_payment_id: orderPayment.id,
      p_provider_payment_id: String(tx.x_transaction_id ?? refPayco),
      p_provider_status: String(tx.x_response ?? tx.x_transaction_state ?? ''),
      p_amount: Number(tx.x_amount),
    })
    if (error) throw error
    return reply(200)
  } catch (error) {
    console.error(`epayco-confirmation ${refPayco}:`, error)
    return reply(500)
  }
})
