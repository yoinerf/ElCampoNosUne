import { useState } from 'react'

export const MIN_PASSWORD_LENGTH = 8

// Devuelve un mensaje de error o null si la contraseña es válida
export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'La contraseña debe incluir letras y números.'
  if (password !== confirm) return 'Las contraseñas no coinciden.'
  return null
}

interface PasswordFieldsProps {
  password: string
  confirm: string
  onPasswordChange: (v: string) => void
  onConfirmChange: (v: string) => void
}

// Campos "Nueva contraseña" + "Confirmar" con mostrar/ocultar y requisitos
export default function PasswordFields({ password, confirm, onPasswordChange, onConfirmChange }: PasswordFieldsProps) {
  const [show, setShow] = useState(false)
  const input: React.CSSProperties = { width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #EDE4D8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'Nunito Sans', sans-serif", background: '#FDFAF6', color: '#1C3A14' }
  const label: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: '#205134', marginBottom: 5 }
  const rules = [
    { ok: password.length >= MIN_PASSWORD_LENGTH, text: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres` },
    { ok: /[A-Za-z]/.test(password) && /\d/.test(password), text: 'Letras y números' },
    { ok: password.length > 0 && password === confirm, text: 'Las dos coinciden' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={label}>Nueva contraseña</label>
        <input type={show ? 'text' : 'password'} value={password} onChange={(e) => onPasswordChange(e.target.value)} autoComplete="new-password" style={input} />
      </div>
      <div>
        <label style={label}>Confirmar contraseña</label>
        <input type={show ? 'text' : 'password'} value={confirm} onChange={(e) => onConfirmChange(e.target.value)} autoComplete="new-password" style={input} />
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#5A5248', cursor: 'pointer' }}>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} /> Mostrar contraseñas
      </label>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
        {rules.map((r) => (
          <li key={r.text} style={{ fontSize: 12, fontWeight: 700, color: r.ok ? '#205134' : '#A89F92' }}>{r.ok ? '✓' : '○'} {r.text}</li>
        ))}
      </ul>
    </div>
  )
}
