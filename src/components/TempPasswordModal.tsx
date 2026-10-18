import { useState } from 'react'
import { adminSetTempPassword } from '../lib/adminUsers'
import { MIN_PASSWORD_LENGTH } from './PasswordFields'

interface TempPasswordModalProps {
  user: { id: string; name: string; email?: string | null }
  onClose: () => void
}

// Genera una contraseña temporal legible (sin caracteres ambiguos como 0/O, 1/l)
export function generateTempPassword(length = 10) {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz'
  const digits = '23456789'
  const all = letters + digits
  const values = crypto.getRandomValues(new Uint32Array(length))
  const chars = Array.from(values, (v) => all[v % all.length])
  // Garantiza al menos una letra y un número
  chars[0] = letters[values[0] % letters.length]
  chars[length - 1] = digits[values[length - 1] % digits.length]
  return chars.join('')
}

// Super admin: asigna una contraseña temporal; el usuario deberá cambiarla al ingresar
export default function TempPasswordModal({ user, onClose }: TempPasswordModalProps) {
  const [password, setPassword] = useState(() => generateTempPassword())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleAssign = async () => {
    if (password.length < MIN_PASSWORD_LENGTH || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres, con letras y números.`)
      return
    }
    setSaving(true)
    setError('')
    // La Edge Function marca must_change_password: App.tsx obliga a cambiarla al ingresar
    const result = await adminSetTempPassword(user.id, password)
    setSaving(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setDone(true)
  }

  const shareText = `Hola ${user.name}, tu contraseña temporal de El Campo Nos Une es: ${password}\nAl ingresar se te pedirá crear una contraseña personal.`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const inp: React.CSSProperties = { flex: 1, padding: '11px 14px', borderRadius: 12, border: '1.5px solid #EDE4D8', fontSize: 16, outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace', background: '#FDFAF6', color: '#1C3A14', letterSpacing: 1 }
  const btn: React.CSSProperties = { padding: '11px 14px', borderRadius: 12, border: '1px solid #EDE4D8', background: '#fff', color: '#205134', fontSize: 13, fontWeight: 700, cursor: 'pointer' }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(21,56,35,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.15)', fontFamily: "'Nunito Sans', sans-serif" }}>
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 20, color: '#205134', margin: '0 0 6px', fontWeight: 700 }}>🔑 Contraseña temporal</h3>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#8A8070' }}>
          {user.name}{user.email ? ` · ${user.email}` : ''}
        </p>

        {done ? (
          <>
            <div style={{ background: '#EAF3EC', color: '#205134', borderRadius: 12, padding: '12px 14px', fontSize: 13, fontWeight: 700, marginBottom: 14 }}>
              ✅ Contraseña asignada. Compártela con el usuario por un canal privado; al ingresar deberá crear su propia contraseña.
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              <input readOnly value={password} style={inp} onFocus={(e) => e.target.select()} />
              <button type="button" onClick={copy} style={btn}>{copied ? '✓ Copiado' : 'Copiar mensaje'}</button>
            </div>
            <button type="button" onClick={onClose} style={{ width: '100%', padding: 12, borderRadius: 12, border: 'none', background: '#205134', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              Listo
            </button>
          </>
        ) : (
          <>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#205134', marginBottom: 5 }}>Contraseña temporal</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={password} onChange={(e) => setPassword(e.target.value)} style={inp} />
              <button type="button" onClick={() => setPassword(generateTempPassword())} style={btn} title="Generar otra">↻ Generar</button>
            </div>
            <p style={{ fontSize: 12, color: '#8A8070', margin: '8px 0 0' }}>
              La contraseña actual del usuario dejará de funcionar. Al ingresar con la temporal, se le pedirá crear una nueva.
            </p>
            {error && (
              <div style={{ marginTop: 12, background: '#FDEDED', color: '#C53030', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>{error}</div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button type="button" onClick={onClose} style={{ ...btn, flex: 1, color: '#8A8070' }}>Cancelar</button>
              <button type="button" onClick={handleAssign} disabled={saving} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: '#205134', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Asignando...' : 'Asignar contraseña'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
