// Tipos del catálogo (productos y carrito) compartidos por marketplace, checkout y App
import type { Database } from './database.types'

/** Fila de public.images (embebida en products/experiences con images(*)) */
export type ImageRow = Database['public']['Tables']['images']['Row']

/** Fila de public.advertisements */
export type AdvertisementRow = Database['public']['Tables']['advertisements']['Row']

/** orders.shipping_address (jsonb): lo que envía el checkout en p_shipping */
export interface ShippingAddress {
  fullName?: string
  phone?: string
  department?: string
  municipality?: string
  address?: string
  deliveryNotes?: string
}

export interface Product {
  id: string
  title: string
  producer: string
  rating: number
  reviews: number
  price: number
  unit: string
  category: string
  description?: string
  type: 'producto' | 'experiencia'
  certified: boolean
  img: string
  images?: ImageRow[]
  stock: string
  outstanding?: boolean
}

export interface CartItem {
  product: Product
  quantity: number
}

/** Imagen principal de un producto/experiencia, o la de respaldo */
export function primaryImageUrl(images: ImageRow[] | null | undefined, fallback: string) {
  return images?.find((i) => i.is_primary)?.image_url || images?.[0]?.image_url || fallback
}
