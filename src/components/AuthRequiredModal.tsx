interface AuthRequiredModalProps {
  open: boolean
  onClose: () => void
  onRequireAuth: (mode: 'login' | 'auth') => void
}

export default function AuthRequiredModal({ open, onClose, onRequireAuth }: AuthRequiredModalProps) {
  if (!open) return null

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(19, 30, 18, 0.58)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 400 }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: 360, background: '#fff', borderRadius: 24, border: '1px solid #E8DED0', boxShadow: '0 30px 60px rgba(28,63,16,0.24)', padding: 24, textAlign: 'center' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#205134', fontFamily: "'Poppins', sans-serif", marginBottom: 8 }}>Casi listo para reservar</div>
        <div style={{ fontSize: 14, color: '#666', fontFamily: "'Nunito Sans', sans-serif", lineHeight: 1.5, marginBottom: 20 }}>
          Para completar esta acción necesitas iniciar sesión o crear una cuenta como comprador.
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          <button type="button" onClick={() => { onClose(); onRequireAuth('login') }} style={{ width: '100%', background: '#205134', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
            Iniciar sesión
          </button>
          <button type="button" onClick={() => { onClose(); onRequireAuth('auth') }} style={{ width: '100%', background: '#9B4728', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" }}>
            Crear cuenta como comprador
          </button>
        </div>
        <button type="button" onClick={onClose} style={{ marginTop: 14, background: 'transparent', border: 'none', color: '#205134', cursor: 'pointer', fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif" }}>Volver</button>
      </div>
    </div>
  )
}
