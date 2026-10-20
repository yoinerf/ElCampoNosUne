// Google Identity Services (botón oficial "Continuar con Google"). Google abre su ventana desde
// nuestro dominio y entrega un ID token que Supabase valida con signInWithIdToken, así el usuario
// ve www.saki5.com en lugar del dominio de Supabase. Requiere VITE_GOOGLE_CLIENT_ID (ID de cliente
// web de Google Cloud, público) y que ese ID esté en Supabase → Auth → Google → Client IDs.

export const GOOGLE_CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

export interface GoogleCredentialResponse {
  credential: string
}

export interface GoogleButtonOptions {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  logo_alignment?: 'left' | 'center'
  width?: number
  locale?: string
}

interface GoogleAccountsId {
  initialize: (config: {
    client_id: string
    callback: (response: GoogleCredentialResponse) => void
    nonce?: string
    ux_mode?: 'popup' | 'redirect'
    itp_support?: boolean
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
  }) => void
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } }
  }
}

let loading: Promise<GoogleAccountsId> | null = null

/** Carga la librería de Google una sola vez (rechaza si está bloqueada o no hay red) */
export function loadGoogleIdentity(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id)
  loading ??= new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => (window.google?.accounts?.id ? resolve(window.google.accounts.id) : reject(new Error('Google Identity no disponible')))
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity'))
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    loading = null // permitir reintentar en el próximo montaje
    throw error
  })
  return loading
}

/**
 * Nonce contra reutilización del token: a Google va el hash SHA-256 (queda dentro del ID token)
 * y a Supabase el valor original, que lo vuelve a hashear y compara.
 */
export async function createNonce(): Promise<{ raw: string; hashed: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const raw = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, '')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  return { raw, hashed }
}
