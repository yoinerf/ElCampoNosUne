// Edge Function: mp-oauth
// Conecta la cuenta de Mercado Pago de un productor (split 1:1: el dinero de sus ventas va
// directo a su cuenta). Se despliega con --no-verify-jwt porque Mercado Pago llama al
// callback sin sesión; el inicio valida la sesión a mano.
//
//   POST { action: 'start' }   (con sesión) → { url } para redirigir al productor a Mercado Pago
//   GET  ?code=...&state=...   (callback)   → guarda las credenciales y vuelve a APP_URL/panel
//
// Seguridad: el state es aleatorio, de un solo uso, vence en 15 minutos y amarra el
// callback al productor que inició la conexión.

import { MP_AUTH_URL, appUrl, corsHeaders, env, oauthRedirectUri, requestToken, saveSellerTokens, serviceClient, userClient } from '../_shared/mercadopago.ts'

const SELLER_ROLES = ['asociacion', 'turismo']
const STATE_TTL_MS = 15 * 60 * 1000

Deno.serve(async (req) => {
  const cors = corsHeaders(req)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const admin = serviceClient()

  // ─── Callback de Mercado Pago ───────────────────────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const back = (result: string) => Response.redirect(`${appUrl()}/panel?mp=${result}`, 302)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (!code || !state) return back('error')

    const { data: row } = await admin.from('payment_oauth_states').delete().eq('state', state).select().maybeSingle()
    if (!row || Date.now() - new Date(row.created_at).getTime() > STATE_TTL_MS) return back('expired')

    try {
      const { data: settings } = await admin.from('payment_gateway_settings').select('sandbox').eq('gateway', 'mercadopago').single()
      const token = await requestToken({
        grant_type: 'authorization_code',
        code,
        redirect_uri: oauthRedirectUri(),
        ...(settings?.sandbox ? { test_token: 'true' } : {}),
      })
      await saveSellerTokens(admin, row.seller_id, token)
      return back('connected')
    } catch (error) {
      console.error('mp-oauth callback:', error)
      return back('error')
    }
  }

  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  // ─── Inicio de la conexión ──────────────────────────────────────────────────
  const { data: { user } } = await userClient(req).auth.getUser()
  if (!user) return json({ error: 'Sesión inválida. Vuelve a iniciar sesión.' }, 401)

  const { data: profile } = await admin.from('profiles').select('user_type').eq('id', user.id).single()
  if (!SELLER_ROLES.includes(profile?.user_type)) return json({ error: 'Solo los productores pueden conectar Mercado Pago.' }, 403)
  if (!env('MP_CLIENT_ID')) return json({ error: 'Mercado Pago aún no está configurado.' }, 503)

  const state = crypto.randomUUID()
  // Limpia estados viejos del productor antes de crear uno nuevo
  await admin.from('payment_oauth_states').delete().eq('seller_id', user.id)
  const { error } = await admin.from('payment_oauth_states').insert({ state, seller_id: user.id })
  if (error) return json({ error: 'No se pudo iniciar la conexión.' }, 500)

  const authUrl = new URL(MP_AUTH_URL)
  authUrl.searchParams.set('client_id', env('MP_CLIENT_ID'))
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('platform_id', 'mp')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('redirect_uri', oauthRedirectUri())
  return json({ url: authUrl.toString() })
})
