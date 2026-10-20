// Variantes de producto: atributos (Sabor, Presentación...) y combinaciones con inventario propio.
// La base (save_product_variants, create_store_order) valida todo; aquí está la lógica de la interfaz.
import { supabase } from './supabase'
import { removeStoredFiles } from './storageCleanup'
import type { Database, Json } from './database.types'

type AttributeRow = Database['public']['Tables']['product_variant_attributes']['Row']
type VariantRow = Database['public']['Tables']['product_variants']['Row']

/** Atributo de variante con sus opciones en orden */
export interface VariantAttribute {
  name: string
  options: string[]
}

/** Valor elegido por atributo: { Sabor: 'Fresa', Presentación: '1 L' } */
export type VariantOptions = Record<string, string>

/** Combinación de un producto con su inventario; price/image_url null = los del producto */
export interface ProductVariant {
  id: string
  options: VariantOptions
  stock: number
  price: number | null
  image_url: string | null
  active: boolean
}

/** Estado de una opción en el selector del detalle */
export type OptionState = 'available' | 'soldout' | 'unavailable'

// Mismos límites que save_product_variants
export const MAX_VARIANT_ATTRIBUTES = 5
export const MAX_ATTRIBUTE_OPTIONS = 30
export const MAX_VARIANT_COMBINATIONS = 300

/** Sugerencias para el nombre del atributo (el vendedor puede escribir cualquiera) */
export const ATTRIBUTE_SUGGESTIONS = ['Sabor', 'Color', 'Talla', 'Tamaño', 'Material', 'Aroma', 'Variedad']

/** Atributo de medida (cantidad + unidad: "250 ml", "1 lb"). Se edita aparte y va de último. */
export const MEASURE_ATTRIBUTE = 'Presentación'

export function isMeasureAttribute(name: string) {
  return name.trim().toLowerCase() === MEASURE_ATTRIBUTE.toLowerCase()
}

/** Nombres de atributo repetidos (sin importar mayúsculas), para avisar mientras se escribe */
export function duplicateAttributeNames(attributes: VariantAttribute[]) {
  const seen = new Set<string>()
  const dups = new Set<string>()
  for (const a of attributes) {
    const name = a.name.trim().toLowerCase()
    if (!name) continue
    if (seen.has(name)) dups.add(name)
    seen.add(name)
  }
  return dups
}

function toOptions(value: Json): VariantOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const options: VariantOptions = {}
  for (const [key, val] of Object.entries(value)) if (typeof val === 'string') options[key] = val
  return options
}

/** Filas de la base (embebidas en products o consultadas aparte) → atributos y variantes en orden */
export function normalizeVariants(
  attributeRows: Pick<AttributeRow, 'name' | 'options' | 'position'>[] | null | undefined,
  variantRows: Pick<VariantRow, 'id' | 'options' | 'stock' | 'price' | 'image_url' | 'active' | 'position'>[] | null | undefined
): { attributes: VariantAttribute[]; variants: ProductVariant[] } {
  const attributes = [...(attributeRows ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((a) => ({ name: a.name, options: a.options ?? [] }))
  const variants = [...(variantRows ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((v) => ({
      id: v.id,
      options: toOptions(v.options),
      stock: v.stock,
      price: v.price === null ? null : Number(v.price),
      image_url: v.image_url,
      active: v.active,
    }))
  return { attributes, variants }
}

/** "Sabor: Fresa · Presentación: 1 L" (igual que product_variant_label en la base) */
export function variantLabel(options: VariantOptions, attributes: VariantAttribute[]) {
  return attributes
    .filter((a) => options[a.name] !== undefined)
    .map((a) => `${a.name}: ${options[a.name]}`)
    .join(' · ')
}

/** Precio efectivo de una combinación */
export function variantPrice(basePrice: number, variant: ProductVariant | null | undefined) {
  return variant?.price ?? basePrice
}

/** Precio mínimo y máximo entre las combinaciones ofrecidas */
export function priceRange(basePrice: number, variants: ProductVariant[]) {
  const prices = variants.filter((v) => v.active).map((v) => variantPrice(basePrice, v))
  if (prices.length === 0) return { min: basePrice, max: basePrice }
  return { min: Math.min(...prices), max: Math.max(...prices) }
}

function matches(variant: ProductVariant, selection: VariantOptions) {
  return Object.entries(selection).every(([name, value]) => variant.options[name] === value)
}

/** Combinación ofrecida que corresponde a la selección completa (o null si falta elegir algo) */
export function findVariant(attributes: VariantAttribute[], variants: ProductVariant[], selection: VariantOptions) {
  if (attributes.length === 0 || attributes.some((a) => !selection[a.name])) return null
  return variants.find((v) => v.active && matches(v, selection)) ?? null
}

/**
 * Estado de cada opción de un atributo según lo ya elegido en los demás:
 * 'unavailable' = no se ofrece esa combinación (se oculta), 'soldout' = existe pero sin stock.
 */
export function optionStates(
  attributes: VariantAttribute[],
  variants: ProductVariant[],
  selection: VariantOptions,
  attributeName: string
): Record<string, OptionState> {
  const others: VariantOptions = {}
  for (const [name, value] of Object.entries(selection)) if (name !== attributeName) others[name] = value
  const compatible = variants.filter((v) => v.active && matches(v, others))
  const states: Record<string, OptionState> = {}
  const attribute = attributes.find((a) => a.name === attributeName)
  for (const option of attribute?.options ?? []) {
    const withOption = compatible.filter((v) => v.options[attributeName] === option)
    states[option] = withOption.length === 0 ? 'unavailable' : withOption.some((v) => v.stock > 0) ? 'available' : 'soldout'
  }
  return states
}

/** Completa los atributos que solo tienen una opción posible con lo ya elegido */
export function autoSelect(attributes: VariantAttribute[], variants: ProductVariant[], selection: VariantOptions) {
  const next = { ...selection }
  for (const attribute of attributes) {
    if (next[attribute.name]) continue
    const states = optionStates(attributes, variants, next, attribute.name)
    const offered = Object.keys(states).filter((o) => states[o] !== 'unavailable')
    if (offered.length === 1) next[attribute.name] = offered[0]
  }
  return next
}

/**
 * Elige una opción; si ya estaba elegida, la quita. Si lo elegido en otros atributos ya no
 * forma una combinación ofrecida con la nueva opción, se descarta (empezando por el último
 * atributo). No completa nada solo: el comprador decide cada atributo.
 */
export function selectOption(
  attributes: VariantAttribute[],
  variants: ProductVariant[],
  selection: VariantOptions,
  attributeName: string,
  value: string
) {
  if (selection[attributeName] === value) {
    const next = { ...selection }
    delete next[attributeName]
    return next
  }
  const next: VariantOptions = { ...selection, [attributeName]: value }
  const offered = variants.filter((v) => v.active)
  for (const attribute of [...attributes].reverse()) {
    if (attribute.name === attributeName || !next[attribute.name]) continue
    if (!offered.some((v) => matches(v, next))) delete next[attribute.name]
  }
  return next
}

/** Opciones de un atributo que existen en alguna combinación ofrecida (las demás no se muestran) */
export function offeredOptions(attributes: VariantAttribute[], variants: ProductVariant[], attributeName: string) {
  const attribute = attributes.find((a) => a.name === attributeName)
  return (attribute?.options ?? []).filter((option) => variants.some((v) => v.active && v.options[attributeName] === option))
}

/** Todas las combinaciones posibles de los atributos, en orden */
export function cartesian(attributes: VariantAttribute[]): VariantOptions[] {
  return attributes.reduce<VariantOptions[]>(
    (combos, attribute) => combos.flatMap((combo) => attribute.options.map((option) => ({ ...combo, [attribute.name]: option }))),
    [{}]
  )
}

// ─── Carrito ─────────────────────────────────────────────────────────────────
// Línea del carrito: "<productId>" o "<productId>::<variantId>". Los carritos guardados antes
// de las variantes (solo el id del producto) siguen funcionando.
const LINE_SEPARATOR = '::'

export function cartLineKey(productId: string, variantId?: string | null) {
  return variantId ? `${productId}${LINE_SEPARATOR}${variantId}` : productId
}

export function parseCartLineKey(key: string) {
  const [productId, variantId] = key.split(LINE_SEPARATOR)
  return { productId, variantId: variantId || null }
}

/** Unidades que se pueden comprar: stock de la combinación, o el número del stock en texto (null = sin límite) */
export function availableStock(stock: string | null | undefined, variant?: ProductVariant | null) {
  if (variant) return variant.active ? variant.stock : 0
  const digits = String(stock ?? '').replace(/\D/g, '')
  return digits === '' ? null : parseInt(digits, 10)
}

// ─── Formulario del vendedor ─────────────────────────────────────────────────
/** Fila editable de una combinación (los números como texto, como en los inputs) */
export interface VariantDraftRow {
  options: VariantOptions
  stock: string
  price: string
  image_url: string | null
  image_storage_path: string | null
  active: boolean
}

export interface VariantDraft {
  attributes: VariantAttribute[]
  rows: VariantDraftRow[]
}

/** Clave de una combinación independiente del orden de las propiedades */
export function optionsKey(options: VariantOptions, attributes: VariantAttribute[]) {
  return JSON.stringify(attributes.map((a) => options[a.name] ?? ''))
}

/** Atributos limpios: sin espacios sobrantes, sin opciones vacías y sin atributos sin nombre u opciones */
export function cleanAttributes(attributes: VariantAttribute[]): VariantAttribute[] {
  return attributes
    .map((a) => ({ name: a.name.trim(), options: a.options.map((o) => o.trim()).filter(Boolean) }))
    .filter((a) => a.name && a.options.length > 0)
}

/**
 * Atributos a partir de las variantes que el vendedor agregó una a una: cada atributo de texto
 * con sus valores en el orden en que aparecen y, si alguna variante tiene medida, «Presentación» al final.
 * textNames se conserva aunque aún no haya variantes (para el formulario).
 */
export function draftAttributes(textNames: string[], rows: VariantDraftRow[]): VariantAttribute[] {
  const unique = (values: string[]) => values.filter((v, i) => v && values.indexOf(v) === i)
  const attributes = textNames.map((name) => ({ name, options: unique(rows.map((r) => r.options[name] ?? '')) }))
  const measures = unique(rows.map((r) => r.options[MEASURE_ATTRIBUTE] ?? ''))
  return measures.length > 0 ? [...attributes, { name: MEASURE_ATTRIBUTE, options: measures }] : attributes
}

/** Variantes guardadas → borrador del formulario (solo las que se ofrecen) */
export function draftFromVariants(attributes: VariantAttribute[], variants: ProductVariant[], storagePaths: Record<string, string | null> = {}): VariantDraft {
  const rows = variants
    .filter((v) => v.active && attributes.every((a) => v.options[a.name]))
    .map((v) => ({
      options: Object.fromEntries(attributes.map((a) => [a.name, v.options[a.name]])),
      stock: String(v.stock),
      price: v.price === null ? '' : String(v.price),
      image_url: v.image_url,
      image_storage_path: storagePaths[v.id] ?? null,
      active: true,
    }))
  const textNames = attributes.filter((a) => !isMeasureAttribute(a.name)).map((a) => a.name)
  return { attributes: draftAttributes(textNames, rows), rows }
}

/** Mismas reglas que save_product_variants; devuelve el error a mostrar o null */
export function validateVariantDraft(draft: VariantDraft): string | null {
  const attributes = draft.attributes
  if (attributes.length > 0 && draft.rows.length === 0) return 'Agrega al menos una variante.'
  if (attributes.length > MAX_VARIANT_ATTRIBUTES) return `Máximo ${MAX_VARIANT_ATTRIBUTES} atributos de variante.`
  const names = new Set<string>()
  for (const attribute of attributes) {
    const name = attribute.name.trim()
    if (!name) return 'Escribe el nombre de cada atributo (por ejemplo, Sabor).'
    if (name.length > 40) return `El nombre "${name}" es muy largo (máximo 40 caracteres).`
    if (names.has(name.toLowerCase())) return `El atributo "${name}" está repetido.`
    names.add(name.toLowerCase())
    const options = attribute.options.map((o) => o.trim()).filter(Boolean)
    if (options.length === 0) return `Agrega al menos una opción a "${name}".`
    if (options.length > MAX_ATTRIBUTE_OPTIONS) return `"${name}" puede tener máximo ${MAX_ATTRIBUTE_OPTIONS} opciones.`
    if (options.some((o) => o.length > 60)) return `Las opciones de "${name}" deben tener máximo 60 caracteres.`
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return `Hay opciones repetidas en "${name}".`
  }
  if (attributes.length === 0) return null
  if (draft.rows.length > MAX_VARIANT_COMBINATIONS) return `Demasiadas combinaciones (${draft.rows.length}). El máximo es ${MAX_VARIANT_COMBINATIONS}.`
  if (!draft.rows.some((r) => r.active)) return 'Agrega al menos una variante.'
  for (const row of draft.rows) {
    const label = variantLabel(row.options, attributes)
    const missing = attributes.find((a) => !row.options[a.name]?.trim())
    if (missing) return `Completa «${missing.name}» en la variante ${label || 'sin datos'}.`
    if (!/^\d{1,7}$/.test(row.stock.trim())) return `Inventario inválido en ${label}: usa un número entero de 0 en adelante.`
    // Con variantes no hay precio general: cada una lleva el suyo
    const price = row.price.trim()
    if (!price) return `Escribe el precio de ${label}.`
    if (!(/^\d{1,12}(\.\d{1,2})?$/.test(price) && Number(price) > 0)) return `Precio inválido en ${label}.`
  }
  return null
}

/** Argumentos de save_product_variants. Sin borrador = quitar las variantes. */
export function variantDraftPayload(draft: VariantDraft | null) {
  if (!draft || draft.attributes.length === 0) return { p_attributes: [] as Json, p_variants: [] as Json }
  const attributes = cleanAttributes(draft.attributes)
  return {
    p_attributes: attributes.map((a) => ({ name: a.name, options: a.options })) as Json,
    p_variants: draft.rows.map((r) => ({
      options: r.options,
      stock: Number(r.stock.trim() || 0),
      price: r.price.trim() ? Number(r.price.trim()) : null,
      image_url: r.image_url,
      image_storage_path: r.image_storage_path,
      active: r.active,
    })) as Json,
  }
}

/** Atributos y combinaciones de un producto (para editarlo) */
export async function fetchProductVariants(productId: string) {
  const [{ data: attributeRows, error: attrError }, { data: variantRows, error: varError }] = await Promise.all([
    supabase.from('product_variant_attributes').select('name, options, position').eq('product_id', productId),
    supabase.from('product_variants').select('id, options, stock, price, image_url, image_storage_path, active, position').eq('product_id', productId),
  ])
  if (attrError || varError) console.error('Error cargando variantes:', (attrError ?? varError)?.message)
  const storagePaths = Object.fromEntries((variantRows ?? []).map((v) => [v.id, v.image_storage_path]))
  return { ...normalizeVariants(attributeRows, variantRows), storagePaths }
}

/**
 * Guarda las variantes después de crear/editar el producto.
 * - Con borrador: reemplaza atributos y combinaciones (la base recalcula products.stock).
 * - Sin borrador y el producto tenía variantes: las quita y deja el stock simple del formulario.
 * - Solo si se guardó bien, borra del Storage las fotos de variantes que ya no se usan.
 * Devuelve el mensaje de error o null.
 */
export async function persistProductVariants(
  productId: string,
  draft: VariantDraft | null,
  hadVariants: boolean,
  simpleStock: string,
  imagesToDelete: string[] = []
) {
  const hasDraft = !!draft && draft.attributes.length > 0
  if (hasDraft || hadVariants) {
    const { error } = await supabase.rpc('save_product_variants', { p_product_id: productId, ...variantDraftPayload(draft) })
    if (error) return error.message
    if (!hasDraft) {
      const { error: stockError } = await supabase.from('products').update({ stock: simpleStock || '0' }).eq('id', productId)
      if (stockError) return stockError.message
    }
  }
  await removeStoredFiles('product-images', imagesToDelete)
  return null
}
