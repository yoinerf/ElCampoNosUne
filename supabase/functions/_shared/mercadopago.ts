// Utilidades de Mercado Pago para las Edge Functions mp-oauth, mp-create-payment y
// mp-webhook. Secrets:
//   MP_CLIENT_ID, MP_CLIENT_SECRET  → app de Mercado Pago de la plataforma (Tus integraciones)
//   MP_WEBHOOK_SECRET               → clave secreta de Webhooks de esa app

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { env, functionUrl, safeEqual } from './common.ts'

export const MP_API = 'https://api.mercadopago.com'
export const MP_AUTH_URL = 'https://auth.mercadopago.com.co/authorization'

export const oauthRedirectUri = () => functionUrl('mp-oauth')

export interface MpTokenResponse {
  access_token: string
  refresh_token?: string
  public_key?: string
  user_id: number | string
  expires_in?: number
  live_mode?: boolean
}

/** Intercambia un code de OAuth o renueva un refresh_token */
export async function requestToken(body: Record<string, string>): Promise<MpTokenResponse> {
  const res = await fetch(`${MP_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: env('MP_CLIENT_ID'), client_secret: env('MP_CLIENT_SECRET'), ...body }),
  })
  const data = await res.json()
  if (!res.ok || !data.access_token) throw new Error(`Mercado Pago OAuth: ${data.message ?? res.status}`)
  return data
}

/** Guarda la conexión (datos visibles) y las credenciales (solo service role) del productor */
export async function saveSellerTokens(admin: SupabaseClient, sellerId: string, token: MpTokenResponse) {
  const { error: accountError } = await admin.from('seller_payment_accounts').upsert({
    seller_id: sellerId,
    gateway: 'mercadopago',
    provider_user_id: String(token.user_id),
    status: 'active',
    live_mode: !!token.live_mode,
    updated_at: new Date().toISOString(),
  })
  if (accountError) throw accountError

  const { error: credError } = await admin.from('seller_payment_credentials').upsert({
    seller_id: sellerId,
    gateway: 'mercadopago',
    access_token: token.access_token,
    refresh_token: token.refresh_token ?? null,
    public_key: token.public_key ?? null,
    expires_at: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  })
  if (credError) throw credError
}

// Los tokens de Mercado Pago duran ~180 días: se renuevan si faltan menos de 7
const REFRESH_MARGIN_MS = 7 * 24 * 60 * 60 * 1000

/** access_token vigente del productor (lo renueva si está por vencer) */
export async function sellerAccessToken(admin: SupabaseClient, sellerId: string): Promise<string> {
  const { data: cred } = await admin
    .from('seller_payment_credentials')
    .select('access_token, refresh_token, expires_at')
    .eq('seller_id', sellerId)
    .eq('gateway', 'mercadopago')
    .maybeSingle()
  if (!cred) throw new Error('El productor no tiene Mercado Pago conectado')

  const expiresAt = cred.expires_at ? new Date(cred.expires_at).getTime() : Infinity
  if (cred.refresh_token && expiresAt - Date.now() < REFRESH_MARGIN_MS) {
    const token = await requestToken({ grant_type: 'refresh_token', refresh_token: cred.refresh_token })
    await saveSellerTokens(admin, sellerId, token)
    return token.access_token
  }
  return cred.access_token
}

export async function mpFetch(path: string, accessToken: string, init: RequestInit = {}) {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Mercado Pago ${path}: ${data.message ?? res.status}`)
  return data
}

/**
 * Verifica la firma x-signature de un webhook de Mercado Pago:
 *   manifest = "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 *   v1 = HMAC-SHA256(manifest, MP_WEBHOOK_SECRET) en hexadecimal
 */
export async function validWebhookSignature(req: Request, dataId: string): Promise<boolean> {
  const secret = env('MP_WEBHOOK_SECRET')
  const signature = req.headers.get('x-signature') ?? ''
  const requestId = req.headers.get('x-request-id') ?? ''
  if (!secret || !signature) return false

  const parts = Object.fromEntries(signature.split(',').map((p) => p.trim().split('=') as [string, string]))
  if (!parts.ts || !parts.v1) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parts.ts};`
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
  const hex = Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('')
  return safeEqual(hex, parts.v1)
}
