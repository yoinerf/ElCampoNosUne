import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Pagos en línea con Mercado Pago (split 1:1): cada productor conecta su cuenta y cada
// pago va directo a ella. Un pedido con varios productores genera un cobro por productor.
// La tarifa de la pasarela se calcula en la base (gateway_fee) y se suma al comprador;
// aquí solo se muestra. Mientras payment_gateway_settings.enabled sea false, todo queda
// en "Próximamente".

export interface GatewaySettings {
  gateway: string
  enabled: boolean
  sandbox: boolean
  percent_fee: number
  fixed_fee: number
  vat_rate: number
  extra_percent: number
  extra_fixed: number
  pass_fees_to_buyer: boolean
}

/** Cobro de un productor dentro de la cotización */
export interface PaymentQuoteGroup {
  seller_id: string
  seller_name: string
  base: number
  fee: number
  total: number
  /** El productor tiene Mercado Pago conectado */
  connected: boolean
}

export interface PaymentQuote {
  enabled: boolean
  groups: PaymentQuoteGroup[]
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

export async function fetchGatewaySettings(): Promise<GatewaySettings | null> {
  const { data } = await supabase.from('payment_gateway_settings').select('*').eq('gateway', 'mercadopago').maybeSingle()
  return data
}

type QuoteItem = { id: string; type: string; quantity: number }

/** Cobros por productor y tarifa del carrito, con precios de la base */
export async function quoteOnlinePayment(store: string, items: QuoteItem[]): Promise<PaymentQuote | null> {
  const { data, error } = await supabase.rpc('quote_online_payment', { p_store: store, p_items: items })
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

/** Crea (o recupera) los enlaces de pago de Mercado Pago de un pedido en línea */
export function createOrderPayments(orderId: string) {
  return invokeFunction<{ reference: string; payments: OrderPaymentLink[] }>(
    'mp-create-payment', { order_id: orderId }, 'No se pudo iniciar el pago con Mercado Pago.')
}

/** URL de autorización de Mercado Pago para que el productor conecte su cuenta */
export function startMercadoPagoConnect() {
  return invokeFunction<{ url: string }>('mp-oauth', { action: 'start' }, 'No se pudo iniciar la conexión con Mercado Pago.')
}

export async function disconnectMercadoPago(): Promise<string | null> {
  const { error } = await supabase.rpc('disconnect_my_payment_account', { p_gateway: 'mercadopago' })
  return error ? error.message : null
}
