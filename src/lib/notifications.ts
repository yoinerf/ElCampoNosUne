import { useEffect } from 'react'
import { supabase } from './supabase'

// Notificaciones de la campanita. Las crean triggers en la BD
// (ver Instructions/migration_notifications.sql). El cliente las lee y las borra cuando el
// usuario las abre o las marca como vistas, para no acumular registros.
// Como respaldo, un job diario borra las de más de 60 días.
export interface NotificationRow {
  id: string
  user_id: string
  type: 'order_status' | 'new_order' | 'ticket_status' | 'new_ticket'
  title: string
  body: string | null
  link_tab: string | null
  link_section: string | null
  entity_id: string | null
  store: string
  read_at: string | null
  created_at: string
}

export const NOTIFICATION_ICONS: Record<NotificationRow['type'], string> = {
  order_status: '📦',
  new_order: '🛒',
  ticket_status: '🛟',
  new_ticket: '📝',
}

export async function fetchNotifications(userId: string, limit = 20): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('user_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) console.error('Error cargando notificaciones:', error.message)
  return (data ?? []) as NotificationRow[]
}

/** Borra notificaciones ya vistas (RLS: solo las del propio usuario) */
export async function deleteNotifications(ids: string[]) {
  if (ids.length === 0) return
  const { error } = await supabase.from('user_notifications').delete().in('id', ids)
  if (error) console.error('Error borrando notificaciones:', error.message)
}

// Avisa en tiempo real cuando llega una notificación nueva para el usuario
export function subscribeToNotifications(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${userId}` }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

// ─── Abrir una sección concreta de un panel desde una notificación ──────────
// La campanita pide la sección (p. ej. 'orders' o 'tickets') y el panel la abre,
// tanto si ya está montado (evento) como si se monta después (sessionStorage).
const SECTION_KEY = 'campoconecta_panel_section'
const SECTION_EVENT = 'campoconecta:open-panel-section'

export function requestPanelSection(section: string) {
  try {
    sessionStorage.setItem(SECTION_KEY, section)
  } catch {
    // sin sessionStorage: igual se envía el evento
  }
  window.dispatchEvent(new CustomEvent(SECTION_EVENT, { detail: section }))
}

export function usePanelSectionRequest<T extends string>(setSection: (section: T) => void, validSections: readonly T[]) {
  useEffect(() => {
    const apply = (section: string | null) => {
      if (!section || !validSections.includes(section as T)) return
      setSection(section as T)
      try {
        sessionStorage.removeItem(SECTION_KEY)
      } catch {
        // ignorar
      }
    }
    try {
      apply(sessionStorage.getItem(SECTION_KEY))
    } catch {
      // ignorar
    }
    const handler = (e: Event) => apply((e as CustomEvent<string>).detail)
    window.addEventListener(SECTION_EVENT, handler)
    return () => window.removeEventListener(SECTION_EVENT, handler)
  }, [])
}
