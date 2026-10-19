// Utilidades de ePayco para las Edge Functions epayco-create-session y epayco-confirmation.
// Secrets (Dashboard ePayco → Integraciones → Llaves API):
//   EPAYCO_PUBLIC_KEY, EPAYCO_PRIVATE_KEY → autenticación de Apify (crear sesiones de checkout)
//   EPAYCO_CUST_ID, EPAYCO_P_KEY          → P_CUST_ID_CLIENTE y P_KEY (firma de la confirmación)
//   EPAYCO_SPLIT_TYPE                      → tipo de split de Smart Checkout (opcional, por defecto
//                                            "percentage"; confírmalo con ePayco al activar el split)

import { env, safeEqual, sha256Hex } from './common.ts'

export const EPAYCO_APIFY = 'https://apify.epayco.co'
export const EPAYCO_VALIDATION = 'https://secure.epayco.co/validation/v1/reference'

/** Token Bearer de Apify (Basic con PUBLIC_KEY:PRIVATE_KEY) */
export async function apifyToken(): Promise<string> {
  const basic = btoa(`${env('EPAYCO_PUBLIC_KEY')}:${env('EPAYCO_PRIVATE_KEY')}`)
  const res = await fetch(`${EPAYCO_APIFY}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${basic}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.token) throw new Error(`ePayco login: ${data.textResponse ?? data.message ?? res.status}`)
  return data.token
}

export interface EpaycoReceiver {
  merchantId: number
  amount: number
  taxBase: number
  tax: number
  /** Comisión para la plataforma: siempre 0 (no cobramos comisión) */
  fee: number
}

/** Crea la sesión del Smart Checkout (checkout-v2) y devuelve el sessionId */
export async function createCheckoutSession(body: Record<string, unknown>): Promise<string> {
  const token = await apifyToken()
  const res = await fetch(`${EPAYCO_APIFY}/payment/session/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ checkout_version: '2', ...body }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success || !data.data?.sessionId) {
    throw new Error(`ePayco session: ${data.textResponse ?? data.message ?? res.status} ${JSON.stringify(data.data ?? '')}`)
  }
  return data.data.sessionId
}

/**
 * Firma de la confirmación:
 *   x_signature = SHA256(P_CUST_ID_CLIENTE^P_KEY^x_ref_payco^x_transaction_id^x_amount^x_currency_code)
 */
export async function validConfirmationSignature(p: Record<string, string>): Promise<boolean> {
  const custId = env('EPAYCO_CUST_ID')
  const pKey = env('EPAYCO_P_KEY')
  if (!custId || !pKey || !p.x_signature) return false
  const expected = await sha256Hex(
    [custId, pKey, p.x_ref_payco, p.x_transaction_id, p.x_amount, p.x_currency_code].join('^'),
  )
  return safeEqual(expected, p.x_signature.toLowerCase())
}

/** Transacción consultada directamente en ePayco por su referencia (fuente de verdad) */
export async function fetchTransaction(refPayco: string): Promise<Record<string, string>> {
  const res = await fetch(`${EPAYCO_VALIDATION}/${encodeURIComponent(refPayco)}`, {
    headers: { 'Content-Type': 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.data) throw new Error(`ePayco validation: ${res.status}`)
  return data.data
}
