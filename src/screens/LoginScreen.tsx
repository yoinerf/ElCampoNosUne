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
    <div className="h-full flex flex-col overflow-hidden" style={{ background: '#FAF7EF' }}>
      {/* Top image / brand */}
      <div
        style={{
          background: 'linear-gradient(160deg, #1C3F10 0%, #2A5C1A 70%, #3D7A28 100%)',
          padding: '36px 28px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: 22,
            background: 'rgba(255,255,255,0.12)',
            border: '1.5px solid rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            marginBottom: 16,
          }}
        >
          🌿
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 30, color: '#FAF7EF', margin: '0 0 6px', fontWeight: 700 }}>
          Campo<span style={{ color: '#F0A830' }}>Conecta</span>
        </h1>
        <p style={{ fontSize: 14, color: '#A8D48A', fontFamily: 'Nunito, sans-serif', margin: 0 }}>
          Bienvenido de vuelta
        </p>
      </div>

      {/* Form */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
        {error && (
          <div
            style={{
              background: '#FEE9E1',
              borderRadius: 12,
              padding: '12px 16px',
              color: '#C4622D',
              fontSize: 13,
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C3F10', fontFamily: 'Nunito, sans-serif', marginBottom: 6 }}>
            Correo electrónico
          </div>
          <input
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            style={{
              width: '100%',
              padding: '13px 14px',
              borderRadius: 14,
              border: '1.5px solid #E8E0CF',
              background: '#fff',
              fontSize: 14,
              fontFamily: 'Nunito, sans-serif',
              color: '#1C3F10',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1C3F10', fontFamily: 'Nunito, sans-serif', marginBottom: 6 }}>
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
                padding: '13px 44px 13px 14px',
                borderRadius: 14,
                border: '1.5px solid #E8E0CF',
                background: '#fff',
                fontSize: 14,
                fontFamily: 'Nunito, sans-serif',
                color: '#1C3F10',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'right', marginBottom: 28 }}>
          <span style={{ fontSize: 13, color: '#D4870A', fontWeight: 700, fontFamily: 'Nunito, sans-serif', cursor: 'pointer' }}>
            ¿Olvidaste tu contraseña?
          </span>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%',
            padding: '15px',
            borderRadius: 16,
            border: 'none',
            background: loading ? '#7FB069' : 'linear-gradient(135deg, #2A5C1A, #3D7A28)',
            color: '#FAF7EF',
            fontSize: 16,
            fontWeight: 800,
            fontFamily: 'Nunito, sans-serif',
            cursor: loading ? 'wait' : 'pointer',
            boxShadow: '0 6px 20px rgba(42,92,26,0.3)',
            transition: 'all 0.2s',
            marginBottom: 16,
          }}
        >
          {loading ? '⏳ Ingresando...' : 'Ingresar'}
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: '#E8E0CF' }} />
          <span style={{ fontSize: 12, color: '#8A8070', fontFamily: 'Nunito, sans-serif' }}>o continúa con</span>
          <div style={{ flex: 1, height: 1, background: '#E8E0CF' }} />
        </div>

        {/* Social login */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 32 }}>
          {[
            { icon: '📱', label: 'WhatsApp' },
            { icon: '📧', label: 'Google' },
          ].map((s) => (
            <button
              key={s.label}
              style={{
                padding: '12px',
                borderRadius: 14,
                border: '1.5px solid #E8E0CF',
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
  )
}
