// Utilidades comunes de las Edge Functions de pagos en línea (Mercado Pago y ePayco).
// Secrets compartidos:
//   APP_URL          → URL pública de la web (páginas de regreso después de pagar)
//   ALLOWED_ORIGINS  → orígenes permitidos para CORS, separados por coma (opcional)

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

export const env = (name: string) => Deno.env.get(name) ?? ''

export const functionUrl = (name: string) => `${env('SUPABASE_URL')}/functions/v1/${name}`
export const appUrl = () => env('APP_URL').replace(/\/+$/, '')

const ALLOWED_ORIGINS = env('ALLOWED_ORIGINS')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin = ALLOWED_ORIGINS.length === 0 ? '*' : ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  }
}

export function serviceClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Cliente con la sesión de quien llama (respeta RLS y auth.uid()) */
export function userClient(req: Request): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  })
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Comparación de cadenas en tiempo constante (firmas) */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Nombre visible de un productor */
export function sellerDisplayName(p?: { org_name?: string | null; first_name?: string | null; last_name?: string | null } | null) {
  return p?.org_name || `${p?.first_name ?? ''} ${p?.last_name ?? ''}`.trim() || 'Productor'
}
