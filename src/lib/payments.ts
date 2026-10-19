import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { StorePaymentMethod } from './stores'

// Pagos en línea con dinero directo a cada productor. La plataforma no cobra comisión;
// la tarifa de la pasarela se calcula en la base (gateway_fee) y se suma al comprador
// (aquí solo se muestra). Cada pasarela se activa desde Superadmin → Pagos.
//   - Mercado Pago (split 1:1): cada productor conecta su cuenta por OAuth; un pedido con
//     varios productores genera un pago por productor.
//   - ePayco (Pagos Divididos): cada productor es receptor de la cuenta de la plataforma;
//     un pedido es un solo cobro que ePayco reparte entre los productores.

export type Gateway = 'mercadopago' | 'epayco'

export const GATEWAYS: Gateway[] = ['mercadopago', 'epayco']

export const GATEWAY_LABELS: Record<Gateway, string> = {
  mercadopago: 'Mercado Pago',
  epayco: 'ePayco',
}

/** orders.payment_method / store_settings.payment_methods de cada pasarela */
export const GATEWAY_METHODS: Record<Gateway, StorePaymentMethod> = {
  mercadopago: 'MercadoPago',
  epayco: 'Epayco',
}

export interface GatewaySettings {
  gateway: Gateway
  enabled: boolean
  sandbox: boolean
  percent_fee: number
  fixed_fee: number
  vat_rate: number
  extra_percent: number
  extra_fixed: number
  pass_fees_to_buyer: boolean
}

/** Parte de un productor dentro de la cotización */
export interface PaymentQuoteGroup {
  seller_id: string
  seller_name: string
  base: number
  /** Mercado Pago: tarifa de su pago. ePayco: 0 (la tarifa va sobre el total) */
  fee: number
  total: number
  /** El productor tiene su cuenta de cobro activa en esta pasarela */
  connected: boolean
}

export interface PaymentQuote {
  gateway: Gateway
  enabled: boolean
  groups: PaymentQuoteGroup[]
  /** Número de pagos que hará el comprador */
  payments: number
  fee: number
  total: number
}

export interface OrderPaymentLink {
  id: string
  seller_id: string
  seller_name: string
  base_amount: number
  fee_amount: number
  total_amount: number
  status: string
  checkout_url: string | null
}

export interface SellerPaymentAccount {
  seller_id: string
  gateway: Gateway
  provider_user_id: string
  status: 'pending' | 'active' | 'revoked'
  connected_at: string
}

/**
 * Recargo de la pasarela para que el productor reciba `base` completo. Misma fórmula que
 * public.gateway_fee; solo para vistas previas (el cobro real lo calcula la base).
 */
export function gatewayFee(base: number, s: Pick<GatewaySettings, 'percent_fee' | 'fixed_fee' | 'vat_rate' | 'extra_percent' | 'extra_fixed' | 'pass_fees_to_buyer'>): number {
  if (!(base > 0) || !s.pass_fees_to_buyer) return 0
  const vat = 1 + s.vat_rate / 100
  const rate = (s.percent_fee / 100) * vat + s.extra_percent / 100
  if (rate >= 0.5) return 0
  // Redondeo a 6 decimales antes del techo: evita que 53028.000001 suba un peso de más
  const total = Math.ceil(Number(((base + s.fixed_fee * vat + s.extra_fixed) / (1 - rate)).toFixed(6)))
  return total - base
}

/** Configuración de las pasarelas (vacío si la migración de pagos aún no se aplica) */
export async function fetchGatewaySettings(): Promise<GatewaySettings[]> {
  const { data } = await supabase.from('payment_gateway_settings').select('*').order('gateway')
  return (data ?? []) as GatewaySettings[]
}

type QuoteItem = { id: string; type: string; quantity: number }

/** Cobros por productor y tarifa del carrito, con precios de la base */
export async function quoteOnlinePayment(store: string, items: QuoteItem[], gateway: Gateway): Promise<PaymentQuote | null> {
  const { data, error } = await supabase.rpc('quote_online_payment', { p_store: store, p_items: items, p_gateway: gateway })
  if (error) {
    console.error('Error cotizando el pago en línea:', error)
    return null
  }
  return data as unknown as PaymentQuote
}

// Los errores de las Edge Functions vienen como { error: "mensaje" } en el cuerpo
async function invokeFunction<T>(name: string, body: Record<string, unknown>, fallback: string): Promise<T | { error: string }> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json()
        return { error: payload?.error ?? fallback }
      } catch {
        return { error: fallback }
      }
    }
    return { error: fallback }
  }
  return data as T
}

// ─── Mercado Pago ─────────────────────────────────────────────────────────────

/** Crea (o recupera) los enlaces de pago de Mercado Pago de un pedido (uno por productor) */
export function createOrderPayments(orderId: string) {
  return invokeFunction<{ reference: string; payments: OrderPaymentLink[] }>(
    'mp-create-payment', { order_id: orderId }, 'No se pudo iniciar el pago con Mercado Pago.')
}

/** URL de autorización de Mercado Pago para que el productor conecte su cuenta */
export function startMercadoPagoConnect() {
  return invokeFunction<{ url: string }>('mp-oauth', { action: 'start' }, 'No se pudo iniciar la conexión con Mercado Pago.')
}

// ─── ePayco ───────────────────────────────────────────────────────────────────

const EPAYCO_CHECKOUT_SCRIPT = 'https://checkout.epayco.co/checkout-v2.js'

declare global {
  interface Window {
    ePayco?: { checkout: { configure: (options: { sessionId: string; type: 'onpage' | 'standard'; test: boolean }) => { open: () => void } } }
  }
}

function loadEpaycoScript(): Promise<void> {
  if (window.ePayco) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = EPAYCO_CHECKOUT_SCRIPT
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('No se pudo cargar el checkout de ePayco.'))
    document.head.appendChild(script)
  })
}

/** Crea la sesión del cobro en el servidor y abre el checkout de ePayco */
export async function payWithEpayco(orderId: string): Promise<{ error: string } | null> {
  const session = await invokeFunction<{ sessionId: string; test: boolean }>(
    'epayco-create-session', { order_id: orderId }, 'No se pudo iniciar el pago con ePayco.')
  if ('error' in session) return session
  try {
    await loadEpaycoScript()
    // "standard" redirige a ePayco y vuelve a /mi-cuenta al terminar
    window.ePayco!.checkout.configure({ sessionId: session.sessionId, type: 'standard', test: session.test }).open()
    return null
  } catch (e) {
    return { error: (e as Error).message }
  }
}

// ─── Cuentas de cobro de los productores ──────────────────────────────────────

export async function fetchMyPaymentAccounts(userId: string): Promise<SellerPaymentAccount[]> {
  const { data } = await supabase
    .from('seller_payment_accounts')
    .select('seller_id, gateway, provider_user_id, status, connected_at')
    .eq('seller_id', userId)
  return (data ?? []) as SellerPaymentAccount[]
}

/** El productor registra su ID de cliente de ePayco (queda pendiente de activación) */
export async function requestEpaycoReceiver(customerId: string): Promise<string | null> {
  const { error } = await supabase.rpc('request_epayco_receiver', { p_customer_id: customerId })
  return error ? error.message : null
}

export async function disconnectPaymentAccount(gateway: Gateway): Promise<string | null> {
  const { error } = await supabase.rpc('disconnect_my_payment_account', { p_gateway: gateway })
  return error ? error.message : null
}

/** Superadmin / admin de tienda: activa o revoca la cuenta de cobro de un productor */
export async function setSellerPaymentStatus(sellerId: string, gateway: Gateway, status: 'active' | 'revoked'): Promise<string | null> {
  const { error } = await supabase.rpc('set_seller_payment_status', { p_seller: sellerId, p_gateway: gateway, p_status: status })
  return error ? error.message : null
}
