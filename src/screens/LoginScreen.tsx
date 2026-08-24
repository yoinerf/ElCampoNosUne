import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onLogin: () => void
  onRegister: () => void
}

export default function LoginScreen({ onLogin, onRegister }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
  if (!email || !password) {
    setError('Ingresa tu correo y contraseña')
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
    setError('Correo o contraseña incorrectos')
    return
  }

  onLogin()
}

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #123d12 0%, #0d2d12 100%)',
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          margin: '0 auto',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 20px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: '100%',
            background: '#f4efe6',
            borderRadius: 26,
            overflow: 'hidden',
            boxShadow: '0 28px 60px rgba(0, 0, 0, 0.24)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, #1b4f18 0%, #1f5d1d 100%)',
              padding: '28px 26px 22px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: 18, right: 18, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', filter: 'blur(5px)' }} />
            <div style={{ position: 'absolute', bottom: -12, left: 20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(240,168,48,0.10)', filter: 'blur(4px)' }} />

            <div
              style={{
                position: 'relative',
                zIndex: 1,
                width: 78,
                height: 78,
                borderRadius: 22,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 36,
                margin: '0 auto 18px',
                boxShadow: '0 14px 28px rgba(10, 40, 15, 0.25)',
              }}
            >
              🌿
            </div>

            <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
              <h1
                style={{
                  fontFamily: 'Fraunces, serif',
                  fontSize: 42,
                  color: '#FAF7EF',
                  margin: 0,
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: '-0.04em',
                }}
              >
                Campo<span style={{ color: '#F0A830' }}>Conecta</span>
              </h1>
              <p
                style={{
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: 15,
                  color: '#E5F4D7',
                  margin: '10px 0 0',
                  lineHeight: 1.5,
                }}
              >
                Bienvenido de vuelta
              </p>
            </div>
          </div>

          <div style={{ padding: '26px 28px 24px', background: '#f5efe7' }}>
            {error && (
              <div
                style={{
                  background: '#FEE9E1',
                  borderRadius: 12,
                  padding: '12px 14px',
                  color: '#C4622D',
                  fontSize: 13,
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 600,
                  marginBottom: 18,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1C3F10', fontFamily: 'Nunito, sans-serif', marginBottom: 8 }}>
                Correo electrónico
              </div>
              <input
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: '1.5px solid rgba(28,63,16,0.12)',
                  background: '#fff',
                  fontSize: 14,
                  fontFamily: 'Nunito, sans-serif',
                  color: '#1C3F10',
                  outline: 'none',
                  boxSizing: 'border-box',
                  boxShadow: '0 10px 22px rgba(28,63,16,0.04)',
                }}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1C3F10', fontFamily: 'Nunito, sans-serif', marginBottom: 8 }}>
                Contraseña
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPw ? 'text' : 'password'}
                  style={{
                    width: '100%',
                    padding: '14px 48px 14px 16px',
                    borderRadius: 14,
                    border: '1.5px solid rgba(28,63,16,0.12)',
                    background: '#fff',
                    fontSize: 14,
                    fontFamily: 'Nunito, sans-serif',
                    color: '#1C3F10',
                    outline: 'none',
                    boxSizing: 'border-box',
                    boxShadow: '0 10px 22px rgba(28,63,16,0.04)',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 18,
                  }}
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 22 }}>
              <span style={{ fontSize: 13, color: '#D4870A', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: 'pointer' }}>
                ¿Olvidaste tu contraseña?
              </span>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%',
                padding: '15px 16px',
                borderRadius: 16,
                border: 'none',
                background: loading ? '#7FB069' : 'linear-gradient(135deg, #2b6e1f 0%, #3a8c2d 100%)',
                color: '#FAF7EF',
                fontSize: 16,
                fontWeight: 800,
                fontFamily: 'Nunito, sans-serif',
                cursor: loading ? 'wait' : 'pointer',
                boxShadow: '0 16px 26px rgba(42,92,26,0.22)',
                transition: 'all 0.2s',
                marginBottom: 18,
              }}
            >
              {loading ? '⏳ Ingresando...' : 'Ingresar'}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: '#E7DFD2' }} />
              <span style={{ fontSize: 12, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>o continúa con</span>
              <div style={{ flex: 1, height: 1, background: '#E7DFD2' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>
              {[
                { icon: '📱', label: 'WhatsApp' },
                { icon: '📧', label: 'Google' },
              ].map((s) => (
                <button
                  key={s.label}
                  style={{
                    padding: '12px',
                    borderRadius: 14,
                    border: '1.5px solid rgba(28,63,16,0.12)',
                    background: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: 'Nunito, sans-serif',
                    color: '#3D2B1A',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 8px 16px rgba(42,92,26,0.03)',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>

            <p style={{ textAlign: 'center', fontSize: 14, color: '#8A8070', fontFamily: 'Nunito, sans-serif', margin: 0 }}>
              ¿No tienes cuenta?{' '}
              <span
                style={{ color: '#2A5C1A', fontWeight: 800, cursor: 'pointer' }}
                onClick={onRegister}
              >
                Regístrate gratis
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
