import { Fragment, useEffect, useState } from 'react'
import {
  STATUS_COLORS,
  fetchOrderTransitions,
  fetchStatusHistory,
  getNextStatuses,
  updateOrderItemStatus,
  type OrderItemRow,
  type OrderStatus,
  type OrderStatusTransition,
  type StatusHistoryRow,
} from '../lib/orders'
import { PAYMENT_METHOD_LABELS, STORE_NAMES } from '../lib/stores'

interface OrdersTableProps {
  items: OrderItemRow[]
  statuses: OrderStatus[]
  showSeller?: boolean
  // Admin: permite forzar cualquier estado para corregir errores
  allowOverride?: boolean
  onItemsChange: (items: OrderItemRow[]) => void
  // Se llama tras guardar un estado para recargar pedidos y stock (triggers en BD)
  onStatusChanged?: () => void | Promise<void>
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  asociacion: 'Productor',
  turismo: 'Anfitrión',
  comprador: 'Comprador',
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })
}

export function StatusBadge({ status, count }: { status?: OrderStatus; count?: number }) {
  if (!status) return null
  const c = STATUS_COLORS[status.code] ?? { bg: '#F3ECE2', color: '#5A5248' }
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {count !== undefined ? `${count} · ` : ''}{status.name}
    </span>
  )
}

// Insignias con el resumen de estados de pedidos de un producto
export function OrderStatusSummary({ entries }: { entries?: { status: OrderStatus; count: number }[] }) {
  if (!entries || entries.length === 0) return <span style={{ fontSize: 12, color: '#B0A595' }}>Sin pedidos</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 240 }}>
      {entries.map((e) => <StatusBadge key={e.status.id} status={e.status} count={e.count} />)}
    </div>
  )
}

export default function OrdersTable({ items, statuses, showSeller = false, allowOverride = false, onItemsChange, onStatusChanged }: OrdersTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [transitions, setTransitions] = useState<OrderStatusTransition[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [history, setHistory] = useState<Record<string, StatusHistoryRow[]>>({})

  useEffect(() => { fetchOrderTransitions().then(setTransitions) }, [])

  const statusById = new Map(statuses.map((s) => [s.id, s]))

  const loadHistory = async (itemId: string) => {
    const rows = await fetchStatusHistory(itemId)
    setHistory((prev) => ({ ...prev, [itemId]: rows }))
  }

  const toggleHistory = (itemId: string) => {
    if (expandedId === itemId) {
      setExpandedId(null)
      return
    }
    setExpandedId(itemId)
    loadHistory(itemId)
  }

  const filtered = items.filter((it) => {
    if (statusFilter !== 'all' && String(it.status_id) !== statusFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return [it.title, it.order?.customer_name, it.order?.customer_phone, it.order_id].some((v) => v?.toLowerCase().includes(q))
  })

  const handleChange = async (item: OrderItemRow, newStatusId: number) => {
    if (newStatusId === item.status_id) return
    const target = statusById.get(newStatusId)
    const current = statusById.get(item.status_id)
    const cancelling = target?.code === 'Cancelled'
    const reopening = current?.code === 'Cancelled'
    const confirmText = cancelling
      ? `¿Cancelar "${item.title}"? Se devolverán ${item.quantity} unidad(es) al inventario.`
      : reopening
        ? `¿Reactivar "${item.title}"? Se descontarán ${item.quantity} unidad(es) del inventario.`
        : target?.is_final
          ? `¿Cambiar "${item.title}" a "${target.name}"? Es un estado final.`
          : null
    if (confirmText && !window.confirm(confirmText)) return

    setSavingId(item.id)
    setErrorMsg('')
    setSuccessMsg('')
    const { error } = await updateOrderItemStatus(item.id, newStatusId)
    if (error) {
      setSavingId(null)
      setErrorMsg(`No se pudo actualizar el estado: ${error.message}`)
      return
    }
    onItemsChange(items.map((it) => (it.id === item.id ? { ...it, status_id: newStatusId } : it)))
    // Refrescar: el estado del pedido, el pago y el stock los actualizan triggers en la BD
    await onStatusChanged?.()
    if (expandedId === item.id) await loadHistory(item.id)
    setSavingId(null)
    setSuccessMsg(
      cancelling
        ? `"${item.title}" cancelado. Se devolvieron ${item.quantity} unidad(es) al inventario.`
        : reopening
          ? `"${item.title}" reactivado. Se descontaron ${item.quantity} unidad(es) del inventario.`
          : `"${item.title}" ahora está en "${target?.name}".`
    )
  }

  const inputStyle: React.CSSProperties = { padding: '10px 14px', borderRadius: 12, border: '1.5px solid #EDE4D8', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: "'Nunito Sans', sans-serif", background: '#FDFAF6', color: '#1C3A14' }
  const th: React.CSSProperties = { padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#8A8070', fontFamily: "'Poppins', sans-serif", whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: 0.4 }
  const td: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: '#5A5248', verticalAlign: 'top' }
  const headers = ['Pedido', 'Producto', 'Cliente / Entrega', ...(showSeller ? ['Vendedor'] : []), 'Total', 'Pago', 'Estado']

  return (
    <div>
      {/* Resumen por estado */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {statuses
          .map((s) => ({ s, n: items.filter((it) => it.status_id === s.id).length }))
          .filter(({ n }) => n > 0)
          .map(({ s, n }) => (
            <button key={s.id} type="button" onClick={() => setStatusFilter(statusFilter === String(s.id) ? 'all' : String(s.id))} style={{ border: statusFilter === String(s.id) ? '2px solid #205134' : '2px solid transparent', background: 'none', padding: 0, borderRadius: 22, cursor: 'pointer' }}>
              <StatusBadge status={s} count={n} />
            </button>
          ))}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <input type="text" placeholder="Buscar por producto, cliente o teléfono..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, flex: '1 1 240px' }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, flex: '0 1 220px' }}>
          <option value="all">Todos los estados</option>
          {statuses.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
        </select>
      </div>

      {errorMsg && (
        <div style={{ background: '#FDEDED', color: '#C53030', border: '1px solid #F5C2C2', padding: '10px 14px', borderRadius: 12, marginBottom: 14, fontSize: 13, fontWeight: 700 }}>{errorMsg}</div>
      )}
      {successMsg && (
        <div style={{ background: '#EAF3EC', color: '#205134', border: '1px solid #C8E6C9', padding: '10px 14px', borderRadius: 12, marginBottom: 14, fontSize: 13, fontWeight: 700 }}>{successMsg}</div>
      )}

      <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #EDE4D8', boxShadow: '0 4px 20px rgba(32,81,52,0.05)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#FDFAF6', borderBottom: '1px solid #EDE4D8' }}>
                {headers.map((h) => <th key={h} style={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={headers.length} style={{ padding: 36, textAlign: 'center', color: '#8A8070', fontSize: 14 }}>
                  {items.length === 0 ? 'Aún no hay pedidos registrados.' : 'Sin resultados para el filtro.'}
                </td></tr>
              ) : filtered.map((it) => {
                const addr = it.order?.shipping_address || {}
                const sellerName = it.seller ? (it.seller.org_name || `${it.seller.first_name ?? ''} ${it.seller.last_name ?? ''}`.trim()) : ''
                const orderStore = it.order?.store ?? 'campo'
                const next = getNextStatuses(it.status_id, it.order?.payment_method, transitions, statuses, orderStore)
                const itemPay = it.payment_status ?? it.order?.payment_status
                // Tienda Amazónica: no se prepara ni se envía nada sin pago
                const awaitingPayment = orderStore === 'amazonica' && itemPay !== 'Paid' && statusById.get(it.status_id)?.code === 'PendingPayment'
                const suggested = next.find((n) => n.suggested)
                const others = allowOverride ? statuses.filter((s) => s.id !== it.status_id && !next.some((n) => n.status.id === s.id)) : []
                const saving = savingId === it.id
                const expanded = expandedId === it.id
                return (
                  <Fragment key={it.id}>
                    <tr style={{ borderBottom: expanded ? 'none' : '1px solid #F3ECE2' }} className="hover:bg-[#FDFAF6]">
                      <td style={td}>
                        <div style={{ fontWeight: 800, color: '#1C3A14', fontFamily: 'monospace' }}>#{it.order_id.slice(0, 8).toUpperCase()}</div>
                        <div style={{ fontSize: 12, color: '#8A8070', whiteSpace: 'nowrap' }}>{formatDate(it.order?.created_at || it.created_at)}</div>
                        {showSeller && orderStore === 'amazonica' && (
                          <div style={{ marginTop: 4, display: 'inline-block', background: '#E3F2FD', color: '#1B4D82', fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>{STORE_NAMES.amazonica}</div>
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {it.img && <img src={it.img} alt={it.title} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                          <div>
                            <div style={{ fontWeight: 700, color: '#1C3A14' }}>{it.title}</div>
                            <div style={{ fontSize: 12, color: '#8A8070' }}>{it.quantity} × {formatPrice(Number(it.unit_price))}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...td, minWidth: 200 }}>
                        <div style={{ fontWeight: 700, color: '#1C3A14' }}>{it.order?.customer_name || 'Cliente'}</div>
                        {it.order?.customer_phone && <div style={{ fontSize: 12 }}>📞 {it.order.customer_phone}</div>}
                        {addr.address && <div style={{ fontSize: 12 }}>📍 {addr.address}{addr.municipality ? `, ${addr.municipality}` : ''}{addr.department ? ` (${addr.department})` : ''}</div>}
                        {addr.deliveryNotes && <div style={{ fontSize: 12, color: '#8A8070' }}>📝 {addr.deliveryNotes}</div>}
                      </td>
                      {showSeller && <td style={td}>{sellerName || '—'}</td>}
                      <td style={{ ...td, fontWeight: 700, color: '#9B4728', fontFamily: "'Poppins', sans-serif", whiteSpace: 'nowrap' }}>{formatPrice(Number(it.total))}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        <div>{PAYMENT_METHOD_LABELS[it.order?.payment_method ?? ''] ?? (it.order?.payment_method || '—')}</div>
                        {(() => {
                          // Pago del ítem (lo que cobra este vendedor); si no existe aún, el del pedido
                          const pay = itemPay
                          return (
                            <div style={{ fontSize: 12, fontWeight: 700, color: pay === 'Paid' ? '#205134' : '#C4622D' }}>
                              {pay === 'Paid' ? 'Pagado' : pay === 'Refunded' ? 'Reembolsado' : pay === 'Failed' ? 'Fallido' : 'Pendiente'}
                            </div>
                          )
                        })()}
                      </td>
                      <td style={{ ...td, minWidth: 210 }}>
                        <div style={{ marginBottom: 8 }}><StatusBadge status={statusById.get(it.status_id)} /></div>
                        {awaitingPayment && (
                          <div style={{ marginBottom: 8, background: '#FFF1E0', color: '#C4622D', border: '1px solid #F3C38B', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 800 }}>
                            Esperando pago — no enviar
                          </div>
                        )}

                        {suggested && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleChange(it, suggested.status.id)}
                            title="Siguiente estado sugerido"
                            style={{ width: '100%', marginBottom: 6, padding: '7px 10px', borderRadius: 10, border: 'none', background: '#205134', color: '#fff', fontSize: 12, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: "'Nunito Sans', sans-serif" }}
                          >
                            → {awaitingPayment && suggested.status.code === 'Paid' ? 'Confirmar pago recibido' : suggested.status.name}
                          </button>
                        )}

                        {next.length > 0 || others.length > 0 ? (
                          <select
                            value=""
                            disabled={saving}
                            onChange={(e) => e.target.value && handleChange(it, Number(e.target.value))}
                            style={{ ...inputStyle, padding: '6px 10px', fontSize: 13, width: '100%', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}
                            title="Cambiar estado"
                          >
                            <option value="">{saving ? 'Guardando...' : 'Cambiar estado...'}</option>
                            {next.map((n) => (
                              <option key={n.status.id} value={String(n.status.id)}>
                                {n.suggested ? `★ ${n.status.name} (sugerido)` : n.status.name}
                              </option>
                            ))}
                            {others.length > 0 && (
                              <optgroup label="Corrección (solo admin)">
                                {others.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                              </optgroup>
                            )}
                          </select>
                        ) : (
                          <div style={{ fontSize: 12, color: '#8A8070', fontWeight: 700 }}>Estado final</div>
                        )}

                        <button
                          type="button"
                          onClick={() => toggleHistory(it.id)}
                          style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, color: '#205134', fontSize: 12, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
                        >
                          {expanded ? 'Ocultar historial' : 'Ver historial'}
                        </button>
                      </td>
                    </tr>

                    {expanded && (
                      <tr style={{ borderBottom: '1px solid #F3ECE2', background: '#FDFAF6' }}>
                        <td colSpan={headers.length} style={{ padding: '4px 16px 16px' }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#205134', margin: '8px 0 10px', textTransform: 'uppercase', letterSpacing: 0.4 }}>Historial de estados</div>
                          {!history[it.id] ? (
                            <div style={{ fontSize: 13, color: '#8A8070' }}>Cargando...</div>
                          ) : history[it.id].length === 0 ? (
                            <div style={{ fontSize: 13, color: '#8A8070' }}>Sin cambios registrados.</div>
                          ) : (
                            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {history[it.id].map((h, idx) => {
                                const last = idx === history[it.id].length - 1
                                return (
                                  <li key={h.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: last ? '#205134' : '#C8BFA8' }} />
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                      {h.from_status_id ? (
                                        <>
                                          <StatusBadge status={statusById.get(h.from_status_id)} />
                                          <span style={{ color: '#8A8070' }}>→</span>
                                        </>
                                      ) : (
                                        <span style={{ color: '#8A8070', fontWeight: 700 }}>Pedido creado:</span>
                                      )}
                                      <StatusBadge status={statusById.get(h.to_status_id)} />
                                      <span style={{ color: '#8A8070' }}>
                                        {formatDate(h.created_at)}
                                        {h.changed_by_name ? ` · ${h.changed_by_name}` : ''}
                                        {h.changed_by_role ? ` (${ROLE_LABELS[h.changed_by_role] ?? h.changed_by_role})` : ''}
                                      </span>
                                    </div>
                                  </li>
                                )
                              })}
                            </ol>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
