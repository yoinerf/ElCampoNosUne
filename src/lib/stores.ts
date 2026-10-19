// Tiendas de la web. Cada producto, pedido y productor pertenece a una
// (columna `store` en profiles, products y orders). Las tiendas y su configuración
// (ruta, marca, métodos de pago, envío) viven en public.store_settings: agregar una
// tienda no requiere tocar código. Ver lib/storesContext.tsx.
export type StoreId = string

/** Tienda principal: home, experiencias, registro y la marca El Campo Nos Une */
export const MAIN_STORE: StoreId = 'campo'

export const isMainStore = (store: StoreId | null | undefined) => (store ?? MAIN_STORE) === MAIN_STORE

// Un carrito por tienda: los pedidos no se mezclan entre tiendas
export const cartKey = (store: StoreId) =>
  isMainStore(store) ? 'campoconecta_cart' : `campoconecta_cart_${store}`

/** orders.payment_method que puede aceptar una tienda */
export type StorePaymentMethod = 'CashOnDelivery' | 'Cash' | 'BankTransfer' | 'MercadoPago' | 'Epayco'

// Métodos de pago (orders.payment_method)
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CashOnDelivery: 'Contraentrega',
  Online: 'En línea',
  MercadoPago: 'Mercado Pago',
  Epayco: 'ePayco',
  Cash: 'Efectivo',
  BankTransfer: 'Transferencia',
}

export interface TransferInfo {
  bank?: string
  accountType?: string
  accountNumber?: string
  accountHolder?: string
  nit?: string
  nequi?: string
  whatsapp?: string
  instructions?: string
}

export interface StoreSettings {
  store: StoreId
  name: string
  /** Ruta de la vitrina (/<slug>); null en la tienda principal */
  slug: string | null
  tagline: string | null
  description: string | null
  payment_methods: StorePaymentMethod[]
  shipping_fee: number
  active: boolean
  sort_order: number
  payment_timeout_hours: number | null
  transfer_info: TransferInfo
}

/** Configuración mínima mientras carga store_settings (o si falla la consulta) */
export const FALLBACK_MAIN_STORE: StoreSettings = {
  store: MAIN_STORE,
  name: 'El Campo Nos Une',
  slug: null,
  tagline: 'Sembrando hoy la cooperación del mañana.',
  description: null,
  payment_methods: ['CashOnDelivery', 'BankTransfer'],
  shipping_fee: 0,
  active: true,
  sort_order: 0,
  payment_timeout_hours: null,
  transfer_info: {},
}
