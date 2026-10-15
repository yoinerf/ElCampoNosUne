import { useState } from 'react'
import { supabase } from '../lib/supabase'
import PasswordFields, { validateNewPassword } from './PasswordFields'

// Cambio de contraseña para un usuario con sesión iniciada (cualquier rol)
export default function ChangePasswordCard({ style }: { style?: React.CSSProperties }) {
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleSave = async () => {
    if (!current) {
      setMsg({ ok: false, text: 'Ingresa tu contraseña actual.' })
      return
    }
    const validation = validateNewPassword(password, confirm)
    if (validation) {
      setMsg({ ok: false, text: validation })
      return
    }

    setSaving(true)
    setMsg(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      setSaving(false)
      setMsg({ ok: false, text: 'Tu sesión expiró. Vuelve a iniciar sesión.' })
      return
    }

    // Verifica la contraseña actual (y renueva la sesión, requisito de Supabase para cambiarla)
    const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email, password: current })
    if (authError) {
      setSaving(false)
      setMsg({ ok: false, text: 'La contraseña actual no es correcta.' })
      return
    }

    const { error } = await supabase.auth.updateUser({ password, data: { must_change_password: false } })
    setSaving(false)
    if (error) {
      setMsg({
        ok: false,
        text: error.code === 'same_password' ? 'La nueva contraseña debe ser diferente a la actual.' : `No se pudo cambiar la contraseña: ${error.message}`,
      })
      return
    }
    setCurrent('')
    setPassword('')
    setConfirm('')
    setMsg({ ok: true, text: 'Tu contraseña se actualizó correctamente.' })
  }

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EDE4D8', boxShadow: '0 4px 16px rgba(32,81,52,0.05)', padding: 20, ...style }}>
      <h2 style={{ margin: 0, fontFamily: "'Poppins', sans-serif", fontSize: 18, fontWeight: 700, color: '#1C3A14' }}>🔒 Cambiar contraseña</h2>
      <p style={{ margin: '4px 0 16px', fontSize: 13, color: '#8A8070' }}>Por seguridad, confirma tu contraseña actual.</p>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#205134', marginBottom: 5 }}>Contraseña actual</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #EDE4D8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'Nunito Sans', sans-serif", background: '#FDFAF6', color: '#1C3A14' }}
        />
      </div>

      <PasswordFields password={password} confirm={confirm} onPasswordChange={setPassword} onConfirmChange={setConfirm} />

      {msg && (
        <div style={{ marginTop: 12, background: msg.ok ? '#EAF3EC' : '#FDEDED', color: msg.ok ? '#205134' : '#C53030', borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 700 }}>{msg.text}</div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button type="button" onClick={handleSave} disabled={saving} style={{ background: '#205134', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Guardando...' : 'Cambiar contraseña'}
        </button>
      </div>
    </div>
  )
}
