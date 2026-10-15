import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { addFavorite, isFavorite, removeFavorite } from '../lib/buyer'

interface FavoriteButtonProps {
  productId: string
  // Se llama si el usuario no ha iniciado sesión
  onRequireAuth?: () => void
}

// Botón "Guardar en favoritos" del detalle de producto
export default function FavoriteButton({ productId, onRequireAuth }: FavoriteButtonProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let active = true
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return
      const uid = data.user?.id ?? null
      setUserId(uid)
      setSaved(uid ? await isFavorite(uid, productId) : false)
    })
    return () => { active = false }
  }, [productId])

  const toggle = async () => {
    if (!userId) {
      if (onRequireAuth) onRequireAuth()
      else setMsg('Inicia sesión para guardar favoritos.')
      return
    }
    setBusy(true)
    setMsg('')
    const { error } = saved ? await removeFavorite(userId, productId) : await addFavorite(userId, productId)
    setBusy(false)
    if (error) {
      setMsg('No se pudo actualizar tus favoritos.')
      return
    }
    setSaved(!saved)
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={saved}
        style={{
          width: '100%',
          height: 46,
          borderRadius: 14,
          border: `1.5px solid ${saved ? '#D06050' : '#E8DED0'}`,
          background: saved ? '#FFF5F3' : '#fff',
          color: saved ? '#D06050' : '#205134',
          fontSize: 15,
          fontWeight: 800,
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.7 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {saved ? '❤️ Guardado en favoritos' : '🤍 Guardar en favoritos'}
      </button>
      {msg && <div style={{ fontSize: 12, color: '#D06050', marginTop: 6, textAlign: 'center' }}>{msg}</div>}
    </div>
  )
}
