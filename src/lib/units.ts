// Unidades de medida de los productos. Por ahora es una lista del front: products.unit guarda
// la abreviatura ("kg", "ml", "und"), que es lo que se muestra junto al precio ("/ kg").

export type UnitGroup = 'Peso' | 'Volumen' | 'Cantidad'

export interface Unit {
  value: string
  label: string
  group: UnitGroup
}

export const UNITS: Unit[] = [
  { value: 'g', label: 'Gramo (g)', group: 'Peso' },
  { value: 'kg', label: 'Kilogramo (kg)', group: 'Peso' },
  { value: 'lb', label: 'Libra (lb)', group: 'Peso' },
  { value: 'arroba', label: 'Arroba', group: 'Peso' },
  { value: 'ml', label: 'Mililitro (ml)', group: 'Volumen' },
  { value: 'L', label: 'Litro (L)', group: 'Volumen' },
  { value: 'galón', label: 'Galón', group: 'Volumen' },
  { value: 'und', label: 'Unidad (und)', group: 'Cantidad' },
  { value: 'docena', label: 'Docena', group: 'Cantidad' },
  { value: 'paquete', label: 'Paquete', group: 'Cantidad' },
  { value: 'caja', label: 'Caja', group: 'Cantidad' },
  { value: 'bolsa', label: 'Bolsa', group: 'Cantidad' },
  { value: 'botella', label: 'Botella', group: 'Cantidad' },
  { value: 'frasco', label: 'Frasco', group: 'Cantidad' },
  { value: 'bulto', label: 'Bulto', group: 'Cantidad' },
  { value: 'canasta', label: 'Canasta', group: 'Cantidad' },
  { value: 'racimo', label: 'Racimo', group: 'Cantidad' },
]

export const UNIT_GROUPS: UnitGroup[] = ['Peso', 'Volumen', 'Cantidad']

export const DEFAULT_UNIT = 'und'

// Abreviaturas que la app guardaba antes y su equivalente en la lista
const UNIT_ALIASES: Record<string, string> = { uds: 'und', unidad: 'und', unidades: 'und', l: 'L', lt: 'L', gr: 'g' }

/** Unidad de la lista que corresponde a un valor guardado (o el mismo valor si no está en la lista) */
export function normalizeUnit(value: string | null | undefined) {
  const raw = (value ?? '').trim()
  if (!raw) return DEFAULT_UNIT
  const exact = UNITS.find((u) => u.value === raw)
  if (exact) return exact.value
  const alias = UNIT_ALIASES[raw.toLowerCase()]
  if (alias) return alias
  return UNITS.find((u) => u.value.toLowerCase() === raw.toLowerCase())?.value ?? raw
}

/** Cantidad válida para una medida: número positivo, con decimales por punto o coma ("250", "1,5") */
export function isMeasureAmount(value: string) {
  const text = value.trim()
  return /^\d+([.,]\d+)?$/.test(text) && Number(text.replace(',', '.')) > 0
}

/**
 * Texto de una opción con cantidad y unidad: ("250", "ml") → "250 ml", ("1,5", "L") → "1,5 L".
 * Si no hay unidad o el texto no es un número, se deja igual ("Fresa", "Grande").
 */
export function formatMeasure(value: string, unit: string) {
  const text = value.trim()
  if (!unit || !isMeasureAmount(text)) return text
  return `${text} ${unit}`
}

/**
 * Opciones escritas en el campo "Nueva opción": separadas por coma o punto y coma, sin partir
 * decimales ("1,5"). Con unidad, los números quedan como medida: "250, 500" + ml → ["250 ml", "500 ml"].
 */
export function parseOptionInput(raw: string, unit = '') {
  return raw
    .split(/;|,(?!\d)/)
    .map((v) => formatMeasure(v, unit))
    .filter(Boolean)
}
