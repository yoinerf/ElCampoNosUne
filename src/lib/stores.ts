// Tiendas de la web. Cada producto, pedido y productor pertenece a una
// (columna `store` en profiles, products y orders).
export type StoreId = 'campo' | 'amazonica'

export const STORE_NAMES: Record<StoreId, string> = {
  campo: 'El Campo Nos Une',
  amazonica: 'Tienda Amazónica',
}

// Ruta propia de la Tienda Amazónica (se puede compartir y recargar)
export const AMAZON_PATH = '/tienda-amazonica'

export const isAmazonPath = (pathname = window.location.pathname) =>
  pathname === AMAZON_PATH || pathname.startsWith(`${AMAZON_PATH}/`)

// Un carrito por tienda: los pedidos no se mezclan entre tiendas
export const cartKey = (store: StoreId) =>
  store === 'amazonica' ? 'campoconecta_cart_amazonica' : 'campoconecta_cart'

// Métodos de pago (orders.payment_method)
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CashOnDelivery: 'Contraentrega',
  Online: 'En línea',
  Cash: 'Efectivo',
  BankTransfer: 'Transferencia',
}

export interface StoreSettings {
  store: StoreId
  name: string
  payment_timeout_hours: number | null
  transfer_info: {
    bank?: string
    accountType?: string
    accountNumber?: string
    accountHolder?: string
    nit?: string
    whatsapp?: string
    instructions?: string
  }
}
