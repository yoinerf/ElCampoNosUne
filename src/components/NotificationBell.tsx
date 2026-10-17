import { useEffect, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import {
  NOTIFICATION_ICONS,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  requestPanelSection,
  subscribeToNotifications,
  type NotificationRow,
} from '../lib/notifications'

interface NotificationBellProps {
  /** Al hacer clic en una notificación: lleva a su pestaña (la sección del panel se abre sola) */
  onOpen?: (tab: string) => void
  buttonStyle?: CSSProperties
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'Hace un momento'
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`
  return `Hace ${Math.floor(diff / 86400)} días`
}

export default function NotificationBell({ onOpen, buttonStyle }: NotificationBellProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId) {
      setItems([])
      return
    }
    const load = () => fetchNotifications(userId).then(setItems)
    load()
    const unsubscribe = subscribeToNotifications(userId, load)
    // Respaldo por si el tiempo real no está habilitado
    const timer = window.setInterval(load, 60000)
    return () => {
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [userId])

  if (!userId) return null

  const unread = items.filter((n) => !n.read_at).length

  const handleClick = async (n: NotificationRow) => {
    setOpen(false)
    if (!n.read_at) {
      setItems((prev) => prev.map((it) => (it.id === n.id ? { ...it, read_at: new Date().toISOString() } : it)))
      markNotificationRead(n.id)
    }
    if (n.link_section) requestPanelSection(n.link_section)
    if (n.link_tab) onOpen?.(n.link_tab)
  }

  const handleMarkAll = async () => {
    setItems((prev) => prev.map((it) => (it.read_at ? it : { ...it, read_at: new Date().toISOString() })))
    await markAllNotificationsRead(userId)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={unread > 0 ? `Notificaciones (${unread} sin leer)` : 'Notificaciones'}
        title="Notificaciones"
        style={{
          position: 'relative',
          width: 42,
          height: 42,
          borderRadius: 12,
          border: 'none',
          background: open ? '#EAF3EC' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: open ? '#205134' : '#4A5248',
          transition: 'all 180ms ease',
          ...buttonStyle,
        }}
        className="hover:bg-[#20513410]"
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 3,
              right: 2,
              minWidth: 18,
              height: 18,
              padding: '0 4px',
              boxSizing: 'border-box',
              borderRadius: 9,
              background: '#D06050',
              color: '#fff',
              fontSize: 10,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 8,
              width: 'min(340px, calc(100vw - 24px))',
              maxHeight: 420,
              overflowY: 'auto',
              background: '#fff',
              borderRadius: 16,
              boxShadow: '0 8px 30px rgba(32,81,52,0.14)',
              border: '1px solid #EDE4D8',
              zIndex: 100,
              fontFamily: "'Nunito Sans', sans-serif",
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #EDE4D8', position: 'sticky', top: 0, background: '#fff' }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 15, color: '#1C3A14' }}>Notificaciones</span>
              {unread > 0 && (
                <button type="button" onClick={handleMarkAll} style={{ background: 'none', border: 'none', color: '#205134', fontSize: 12, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: '#8A8070', fontSize: 13 }}>No tienes notificaciones.</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    textAlign: 'left',
                    padding: '11px 14px',
                    border: 'none',
                    borderBottom: '1px solid #F3ECE2',
                    background: n.read_at ? '#fff' : '#F2F7F4',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                  className="hover:bg-[#F5EEE6]"
                >
                  <span style={{ fontSize: 18, lineHeight: '22px', flexShrink: 0 }}>{NOTIFICATION_ICONS[n.type] ?? '🔔'}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: n.read_at ? 600 : 800, color: '#1C3A14' }}>{n.title}</span>
                    {n.body && <span style={{ display: 'block', fontSize: 12, color: '#5A5248', marginTop: 2 }}>{n.body}</span>}
                    <span style={{ display: 'block', fontSize: 11, color: '#8A8070', marginTop: 4 }}>{timeAgo(n.created_at)}</span>
                  </span>
                  {!n.read_at && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#205134', marginTop: 7, flexShrink: 0 }} />}
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
