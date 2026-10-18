import { useState } from 'react'
import { TICKET_STATUS, updateTicket, type SupportTicket, type TicketStatus } from '../lib/buyer'

interface SupportTicketsAdminProps {
  tickets: SupportTicket[]
  onTicketsChange: (tickets: SupportTicket[]) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })
}

// Gestión de solicitudes y reportes de compradores (solo admin)
export default function SupportTicketsAdmin({ tickets, onTicketsChange }: SupportTicketsAdminProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'problema' | 'solicitud'>('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<{ id: string; status: TicketStatus; response: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const filtered = tickets.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    if (typeFilter !== 'all' && t.type !== typeFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    const name = `${t.customer?.first_name ?? ''} ${t.customer?.last_name ?? ''}`
    return [t.subject, t.description, t.category, name, t.customer?.email, t.order_id].some((v) => v?.toLowerCase().includes(q))
  })

  const save = async () => {
    if (!editing) return
    setSaving(true)
    setMsg(null)
    const response = editing.response.trim() || null
    const { error } = await updateTicket(editing.id, { status: editing.status, admin_response: response })
    setSaving(false)
    if (error) {
      setMsg({ ok: false, text: `No se pudo guardar: ${error.message}` })
      return
    }
    onTicketsChange(tickets.map((t) => (t.id === editing.id ? { ...t, status: editing.status, admin_response: response } : t)))
    setEditing(null)
    setMsg({ ok: true, text: 'Solicitud actualizada.' })
  }

  const inputStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: 12, border: '1.5px solid #EDE4D8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'Nunito Sans', sans-serif", background: '#FDFAF6', color: '#1C3A14' }
  const counts = (Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => ({ s, n: tickets.filter((t) => t.status === s).length }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {counts.map(({ s, n }) => (
          <button key={s} type="button" onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)} style={{ border: statusFilter === s ? '2px solid #205134' : '2px solid transparent', background: TICKET_STATUS[s].bg, color: TICKET_STATUS[s].color, borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
            {n} · {TICKET_STATUS[s].label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <input type="text" placeholder="Buscar por asunto, cliente, correo o pedido..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, flex: '1 1 260px' }} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} style={{ ...inputStyle, flex: '0 1 180px' }}>
          <option value="all">Todos los tipos</option>
          <option value="problema">Problemas</option>
          <option value="solicitud">Solicitudes</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} style={{ ...inputStyle, flex: '0 1 180px' }}>
          <option value="all">Todos los estados</option>
          {(Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => <option key={s} value={s}>{TICKET_STATUS[s].label}</option>)}
        </select>
      </div>

      {msg && (
        <div style={{ background: msg.ok ? '#EAF3EC' : '#FDEDED', color: msg.ok ? '#205134' : '#C53030', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700 }}>{msg.text}</div>
      )}

      {filtered.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #EDE4D8', padding: 40, textAlign: 'center', color: '#8A8070', fontSize: 14 }}>
          {tickets.length === 0 ? 'No hay solicitudes ni reportes.' : 'Sin resultados para el filtro.'}
        </div>
      ) : filtered.map((t) => {
        const st = TICKET_STATUS[t.status]
        const isEditing = editing?.id === t.id
        const name = `${t.customer?.first_name ?? ''} ${t.customer?.last_name ?? ''}`.trim() || 'Comprador'
        return (
          <div key={t.id} style={{ background: '#fff', borderRadius: 18, border: `1px solid ${t.type === 'problema' && t.status === 'abierto' ? '#F3C38B' : '#EDE4D8'}`, padding: 18, boxShadow: '0 2px 12px rgba(32,81,52,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: t.type === 'problema' ? '#C4622D' : '#205134', textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  {t.type === 'problema' ? '⚠️ Problema' : '📝 Solicitud'} · {t.category}
                </div>
                <div style={{ fontWeight: 700, color: '#1C3A14', fontSize: 15, marginTop: 2 }}>{t.subject}</div>
                <div style={{ fontSize: 12, color: '#8A8070' }}>
                  {name}{t.customer?.email ? ` · ${t.customer.email}` : ''}{t.customer?.phone ? ` · ${t.customer.phone}` : ''}
                </div>
                <div style={{ fontSize: 12, color: '#8A8070' }}>
                  {formatDate(t.created_at)}{t.order_id ? ` · Pedido #${t.order_id.slice(0, 8).toUpperCase()}` : ''}
                </div>
              </div>
              <span style={{ background: st.bg, color: st.color, fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 20 }}>{st.label}</span>
            </div>

            <p style={{ margin: '10px 0 0', fontSize: 13, color: '#5A5248', whiteSpace: 'pre-wrap' }}>{t.description}</p>

            {!isEditing && t.admin_response && (
              <div style={{ marginTop: 10, background: '#EAF3EC', borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#1C3A14', whiteSpace: 'pre-wrap' }}>
                <strong>Respuesta:</strong> {t.admin_response}
              </div>
            )}

            {isEditing ? (
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as TicketStatus })} style={{ ...inputStyle, maxWidth: 240 }}>
                  {(Object.keys(TICKET_STATUS) as TicketStatus[]).map((s) => <option key={s} value={s}>{TICKET_STATUS[s].label}</option>)}
                </select>
                <textarea value={editing.response} onChange={(e) => setEditing({ ...editing, response: e.target.value })} rows={3} placeholder="Respuesta visible para el comprador" style={{ ...inputStyle, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setEditing(null)} style={{ background: '#fff', color: '#205134', border: '1px solid #EDE4D8', borderRadius: 10, padding: '8px 14px', fontWeight: 700, cursor: 'pointer' }}>Cancelar</button>
                  <button type="button" disabled={saving} onClick={save} style={{ background: '#205134', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" onClick={() => setEditing({ id: t.id, status: t.status, response: t.admin_response ?? '' })} style={{ background: '#EAF3EC', color: '#205134', border: '1px solid rgba(32,81,52,0.25)', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Gestionar / Responder
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
