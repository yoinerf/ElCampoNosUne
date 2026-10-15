import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Se lee ANTES de crear el cliente: supabase-js limpia el hash de la URL al procesarlo.
// El enlace de "restablecer contraseña" llega como #access_token=...&type=recovery
// y, si expiró, como #error=access_denied&error_code=otp_expired&error_description=...
const initialHash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
export const authRedirectInfo = {
  isRecovery: initialHash.get('type') === 'recovery',
  error: initialHash.get('error_description')?.replace(/\+/g, ' ') ?? null,
}

// URL a la que Supabase redirige desde los correos (debe estar en Auth → URL Configuration)
export const authRedirectUrl = `${window.location.origin}${import.meta.env.BASE_URL}`

export const supabase = createClient(supabaseUrl, supabaseKey)
