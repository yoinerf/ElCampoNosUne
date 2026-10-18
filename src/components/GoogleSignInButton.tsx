import { useState } from 'react'
import { supabase, authRedirectUrl } from '../lib/supabase'

// Inicio de sesión / registro con Google (Supabase Auth → proveedor Google).
// Al volver, la sesión la detecta AuthProvider; si la cuenta es nueva se pide
// completar el perfil (CompleteProfileScreen).
export default function GoogleSignInButton({ label = 'Continuar con Google', onError }: { label?: string; onError?: (message: string) => void }) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Debe estar en Supabase → Authentication → URL Configuration → Redirect URLs
      options: { redirectTo: authRedirectUrl },
    })
    // Si todo va bien el navegador sale hacia Google; solo se vuelve aquí si falla
    if (error) {
      setLoading(false)
      onError?.('No pudimos conectar con Google. Intenta de nuevo o usa tu correo y contraseña.')
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        width: '100%',
        padding: '10px 14px',
        borderRadius: 8,
        border: '1.5px solid #E5E7EB',
        background: '#FFFFFF',
        fontSize: 13.5,
        fontWeight: 600,
        fontFamily: "'Nunito Sans', sans-serif",
        color: '#374151',
        cursor: loading ? 'default' : 'pointer',
        opacity: loading ? 0.7 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
        <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-1.9z" />
        <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z" />
      </svg>
      <span>{loading ? 'Conectando con Google...' : label}</span>
    </button>
  )
}

/** Separador "o continuar con" entre el formulario y los botones de proveedores */
export function AuthDivider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0 16px' }}>
      <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif", color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        o continuar con
      </span>
      <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
    </div>
  )
}
