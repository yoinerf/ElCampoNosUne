import { supabase } from './supabase'

export interface OrderStatus {
  id: number
  code: string
  name: string
  description?: string | null
  is_final: boolean
}

export interface OrderItemRow {
  id: string
  order_id: string
  item_type: 'producto' | 'experiencia'
  product_id: string | null
  experience_id: string | null
  seller_id: string | null
  title: string
  img: string | null
  quantity: number
  unit_price: number
  total: number
  status_id: number
  // Pago de este ítem (contraentrega: cada vendedor cobra lo suyo). Puede faltar si no se ha migrado.
  payment_status?: string
  created_at: string
  order: {
    id: string
    customer_name: string | null
    customer_phone: string | null
    shipping_address: any
    payment_method: string
    payment_status: string
    // Tienda del pedido ('campo' | 'amazonica'). Puede faltar si no se ha migrado.
    store?: string
    created_at: string
  } | null
  seller?: { org_name: string | null; first_name: string | null; last_name: string | null } | null
}

// Colores de las insignias por código de estado (tabla order_statuses)
export const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PendingConfirmation: { bg: '#FFF7E8', color: '#A86B05' },
  Reserved: { bg: '#E3F2FD', color: '#1B4D82' },
  PendingPayment: { bg: '#FFF1E0', color: '#C4622D' },
  Paid: { bg: '#EAF3EC', color: '#205134' },
  Processing: { bg: '#F1F8E9', color: '#3D7A28' },
  Shipped: { bg: '#E8EAF6', color: '#3949AB' },
  InTransit: { bg: '#E8EAF6', color: '#3949AB' },
  Delivered: { bg: '#D6E8D8', color: '#1C3A14' },
  Cancelled: { bg: '#FEE9E1', color: '#C53030' },
  Returned: { bg: '#F3ECE2', color: '#7A5C3A' },
  Refunded: { bg: '#F3ECE2', color: '#7A5C3A' },
  DeliveryFailed: { bg: '#FEE9E1', color: '#C53030' },
}

export async function fetchOrderStatuses(): Promise<OrderStatus[]> {
  const { data, error } = await supabase
    .from('order_statuses')
    .select('id, code, name, description, is_final')
    .order('id', { ascending: true })
  if (error) console.error('Error cargando order_statuses:', error.message)
  return (data ?? []) as OrderStatus[]
}

// sellerId: limita a los ítems de un productor/anfitrión. Sin sellerId (admin) trae todos.
export async function fetchOrderItems(sellerId?: string): Promise<OrderItemRow[]> {
  let query = supabase
    .from('order_items')
    .select(
      '*, order:orders(id, customer_name, customer_phone, shipping_address, payment_method, payment_status, store, created_at), seller:profiles(org_name, first_name, last_name)'
    )
    .order('created_at', { ascending: false })
  if (sellerId) query = query.eq('seller_id', sellerId)
  const { data, error } = await query
  if (error) console.error('Error cargando order_items:', error.message)
  return (data ?? []) as OrderItemRow[]
}

export interface OrderStatusTransition {
  // Cada tienda tiene su propio flujo de estados
  store?: string
  from_status_id: number
  to_status_id: number
  sort_order: number
  suggested_for: string[]
}

export interface StatusHistoryRow {
  id: string
  from_status_id: number | null
  to_status_id: number
  changed_by_name: string | null
  changed_by_role: string | null
  created_at: string
}

export async function fetchOrderTransitions(): Promise<OrderStatusTransition[]> {
  const { data, error } = await supabase
    .from('order_status_transitions')
    .select('store, from_status_id, to_status_id, sort_order, suggested_for')
    .order('sort_order', { ascending: true })
  if (error) console.error('Error cargando order_status_transitions:', error.message)
  return (data ?? []) as OrderStatusTransition[]
}

export async function fetchStatusHistory(itemId: string): Promise<StatusHistoryRow[]> {
  const { data, error } = await supabase
    .from('order_item_status_history')
    .select('id, from_status_id, to_status_id, changed_by_name, changed_by_role, created_at')
    .eq('order_item_id', itemId)
    .order('created_at', { ascending: true })
  if (error) console.error('Error cargando historial de estados:', error.message)
  return (data ?? []) as StatusHistoryRow[]
}

// Estados a los que se puede pasar desde el actual (según el flujo de la tienda del pedido),
// en orden y con el sugerido primero
export function getNextStatuses(
  currentStatusId: number,
  paymentMethod: string | undefined,
  transitions: OrderStatusTransition[],
  statuses: OrderStatus[],
  store: string = 'campo'
) {
  return transitions
    .filter((t) => (t.store ?? 'campo') === store && t.from_status_id === currentStatusId)
    .map((t) => ({
      status: statuses.find((s) => s.id === t.to_status_id),
      suggested: !!paymentMethod && t.suggested_for.includes(paymentMethod),
      sortOrder: t.sort_order,
    }))
    .filter((t): t is { status: OrderStatus; suggested: boolean; sortOrder: number } => !!t.status)
    .sort((a, b) => Number(b.suggested) - Number(a.suggested) || a.sortOrder - b.sortOrder)
}

export async function updateOrderItemStatus(itemId: string, statusId: number) {
  return supabase.from('order_items').update({ status_id: statusId }).eq('id', itemId)
}

// Resumen de estados de pedidos por producto/experiencia: { [itemId]: [{ status, count }] }
export function summarizeStatusesByItem(items: OrderItemRow[], statuses: OrderStatus[]) {
  const summary: Record<string, { status: OrderStatus; count: number }[]> = {}
  for (const item of items) {
    const key = item.product_id || item.experience_id
    const status = statuses.find((s) => s.id === item.status_id)
    if (!key || !status) continue
    const list = (summary[key] ||= [])
    const entry = list.find((e) => e.status.id === status.id)
    if (entry) entry.count += item.quantity
    else list.push({ status, count: item.quantity })
  }
  return summary
}
