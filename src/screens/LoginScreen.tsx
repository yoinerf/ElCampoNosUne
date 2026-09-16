import { useState } from 'react'
import { supabase } from '../lib/supabase'
import logoSrc from '../assets/logo-nofond.png'

interface Props {
  onLogin: () => void
  onRegister: () => void
  onBackToStore?: () => void
  onBackToHome?: () => void
}

export default function LoginScreen({ onLogin, onRegister, onBackToStore, onBackToHome }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleBack = onBackToHome || onBackToStore

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email || !password) {
      setError('Ingresa tu correo electrónico y contraseña')
      return
    }
    setError('')
    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (loginError) {
      setError('Correo o contraseña incorrectos. Por favor verifica tus datos.')
      return
    }

    onLogin()
  }

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    try {
      if (provider === 'google') {
        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        })
        if (authError) {
          setError(`Acceso con ${provider} en configuración. Por favor usa tu correo y contraseña.`)
        }
      } else {
        setError('Acceso con Apple próximamente disponible.')
      }
    } catch {
      setError(`Servicio de autenticación no disponible temporalmente.`)
    }
  }

  return (
    <div
      style={{
        width: '100vw',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        display: 'flex',
        flexDirection: 'row',
        background: '#FAF7F0',
        fontFamily: "'Nunito Sans', sans-serif",
        overflowX: 'hidden',
      }}
    >
      {/* ===================== COLUMNA IZQUIERDA: HERO FOTOGRÁFICO CON CITA ===================== */}
      <div
        className="hidden lg:flex"
        style={{
          flex: '1 1 50%',
          minHeight: '100vh',
          position: 'relative',
          backgroundImage: 'url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1600&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          backgroundRepeat: 'no-repeat',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px 64px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Overlay verde oscuro característico del diseño (#1A3B22 a 40% - 60%) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(26, 59, 34, 0.35) 0%, rgba(20, 45, 26, 0.55) 50%, rgba(13, 31, 18, 0.82) 100%)',
            zIndex: 1,
          }}
        />

        {/* Botón Volver al inicio (sobre hero) */}
        {handleBack && (
          <div style={{ position: 'relative', zIndex: 10 }}>
            <button
              type="button"
              onClick={handleBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 20,
                padding: '8px 18px',
                color: '#FFFFFF',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.28)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
              }}
            >
              <span>←</span> Volver al inicio
            </button>
          </div>
        )}

        {/* Sección inferior con línea dorada, cita y subtítulo idénticos al manual */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 540 }}>
          {/* Línea dorada (#CF9D35 / #E5AE30) de 80px x 3.5px */}
          <div
            style={{
              width: 80,
              height: 3.5,
              backgroundColor: '#CF9D35',
              borderRadius: 2,
              marginBottom: 24,
            }}
          />

          {/* Cita con tipografía del proyecto */}
          <blockquote
            style={{
              margin: 0,
              padding: 0,
              fontFamily: "'Poppins', sans-serif",
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: 'clamp(26px, 3vw, 36px)',
              lineHeight: 1.3,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              textShadow: '0 2px 14px rgba(0, 0, 0, 0.45)',
              marginBottom: 20,
            }}
          >
            "La tierra que nos alimenta es el lazo que nos une de raíz."
          </blockquote>

          {/* Subtítulo institucional según manual */}
          <p
            style={{
              margin: 0,
              fontFamily: "'Poppins', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'rgba(255, 255, 255, 0.88)',
            }}
          >
            EL CAMPO NOS UNE
          </p>
        </div>
      </div>

      {/* ===================== COLUMNA DERECHA: FORMULARIO WARM CREAM ===================== */}
      <div
        style={{
          flex: '1 1 50%',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          boxSizing: 'border-box',
          backgroundColor: '#FAF7F0',
          position: 'relative',
        }}
      >
        {/* Botón Volver visible en móviles */}
        {handleBack && (
          <div className="lg:hidden" style={{ width: '100%', maxWidth: 410, marginBottom: 20 }}>
            <button
              type="button"
              onClick={handleBack}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#EAE3D6',
                border: 'none',
                borderRadius: 16,
                padding: '6px 14px',
                color: '#205134',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'Nunito Sans', sans-serif",
                cursor: 'pointer',
              }}
            >
              ← Volver al inicio
            </button>
          </div>
        )}

        {/* Tarjeta de Formulario centrada */}
        <div
          style={{
            width: '100%',
            maxWidth: 410,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Logo Central de El Campo Nos Une */}
          <div style={{ marginBottom: 18, textAlign: 'center' }}>
            <img
              src={logoSrc}
              alt="El Campo Nos Une"
              style={{
                height: 120,
                width: 'auto',
                display: 'block',
                margin: '0 auto',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.06))',
              }}
            />
          </div>

          {/* Título (Poppins Bold según manual de identidad) */}
          <h1
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 30,
              fontWeight: 700,
              color: '#205134',
              margin: '0 0 6px',
              textAlign: 'center',
              letterSpacing: '-0.03em',
            }}
          >
            Iniciar sesión
          </h1>
          <p
            style={{
              fontFamily: "'Nunito Sans', sans-serif",
              fontSize: 14,
              color: '#666666',
              margin: '0 0 28px',
              textAlign: 'center',
              lineHeight: 1.45,
            }}
          >
            Bienvenido de vuelta a la red agrícola premium de México
          </p>

          {/* Mensaje de Error si existe */}
          {error && (
            <div
              style={{
                width: '100%',
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                borderRadius: 8,
                padding: '11px 14px',
                color: '#991B1B',
                fontSize: 13,
                fontFamily: "'Nunito Sans', sans-serif",
                fontWeight: 600,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxSizing: 'border-box',
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleLogin} style={{ width: '100%' }}>
            {/* Campo: Correo Electrónico */}
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  fontWeight: 800,
                  fontFamily: "'Nunito Sans', sans-serif",
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#205134',
                  marginBottom: 6,
                }}
              >
                CORREO ELECTRÓNICO
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@elcamponosune.mx"
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #D1D5DB',
                  background: '#FFFFFF',
                  fontSize: 14,
                  fontFamily: "'Nunito Sans', sans-serif",
                  color: '#1F2937',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#205134'
                  e.target.style.boxShadow = '0 0 0 3px rgba(32, 81, 52, 0.12)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#D1D5DB'
                  e.target.style.boxShadow = 'none'
                }}
              />
            </div>

            {/* Campo: Contraseña */}
            <div style={{ marginBottom: 12 }}>
              <label
                htmlFor="login-password"
                style={{
                  display: 'block',
                  fontSize: 11.5,
                  fontWeight: 800,
                  fontFamily: "'Nunito Sans', sans-serif",
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: '#205134',
                  marginBottom: 6,
                }}
              >
                CONTRASEÑA
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    padding: '12px 42px 12px 14px',
                    borderRadius: 8,
                    border: '1.5px solid #D1D5DB',
                    background: '#FFFFFF',
                    fontSize: 14,
                    fontFamily: "'Nunito Sans', sans-serif",
                    color: '#1F2937',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#205134'
                    e.target.style.boxShadow = '0 0 0 3px rgba(32, 81, 52, 0.12)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#9CA3AF',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label={showPw ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPw ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Olvidaste tu contraseña - color #9B4728 (Terracota interfaz de marca) */}
            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => alert('Para restablecer tu contraseña, por favor contacta al administrador o ingresa tu correo registrado.')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: 12.5,
                  fontWeight: 700,
                  fontFamily: "'Nunito Sans', sans-serif",
                  color: '#9B4728',
                  cursor: 'pointer',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {/* Botón Principal "Entrar" (#205134 Verde Profundo) */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 8,
                border: 'none',
                background: loading ? '#3A6F4E' : '#205134',
                color: '#FFFFFF',
                fontSize: 15,
                fontWeight: 700,
                fontFamily: "'Nunito Sans', sans-serif",
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 4px 14px rgba(32, 81, 52, 0.22)',
                transition: 'all 0.18s ease',
                marginBottom: 20,
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = '#174028'
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = '#205134'
              }}
            >
              {loading ? 'Ingresando...' : 'Entrar'}
            </button>

            {/* Separador "O CONTINUAR CON" */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'Nunito Sans', sans-serif",
                  color: '#9CA3AF',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                O CONTINUAR CON
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: '#E5E7EB' }} />
            </div>

            {/* Botones Sociales */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
              {/* Botón Google */}
              <button
                type="button"
                onClick={() => handleSocialAuth('google')}
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
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12s.7 2.3 1.9 4.7l3.7-1.9z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                  />
                </svg>
                <span>Acceder con Google</span>
              </button>

              {/* Botón Apple */}
              <button
                type="button"
                onClick={() => handleSocialAuth('apple')}
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
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F9FAFB')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#111827">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.88c.64-.78 1.08-1.86.96-2.88-.93.04-2.05.62-2.72 1.4-.59.68-1.11 1.77-.97 2.83 1.04.08 2.09-.57 2.73-1.35z" />
                </svg>
                <span>Acceder con Apple</span>
              </button>
            </div>

            {/* Footer switcher */}
            <p
              style={{
                textAlign: 'center',
                fontSize: 13.5,
                fontFamily: "'Nunito Sans', sans-serif",
                color: '#666666',
                margin: 0,
              }}
            >
              ¿Aún no eres miembro?{' '}
              <button
                type="button"
                onClick={onRegister}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: '#9B4728',
                  fontWeight: 700,
                  fontFamily: "'Nunito Sans', sans-serif",
                  cursor: 'pointer',
                  fontSize: 13.5,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                Crear cuenta
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}



