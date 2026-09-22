/**
 * Utilidades de fecha y hora local de Colombia (America/Bogota, UTC-5)
 * para toda la aplicación El Campo Nos Une.
 *
 * Colombia se encuentra permanentemente en UTC-5 (no aplica horario de verano).
 */

export const COLOMBIA_TIMEZONE = 'America/Bogota'
export const COLOMBIA_OFFSET = '-05:00'

/**
 * Convierte cualquier fecha/ISO string a formato compatible con `<input type="datetime-local" />`
 * en la zona horaria de Colombia (YYYY-MM-DDTHH:mm).
 */
export function toColombiaInputString(dateOrIso?: string | Date | null): string {
  if (!dateOrIso) return ''

  // Si ya viene como string YYYY-MM-DDTHH:mm sin zona, devolver directamente
  if (typeof dateOrIso === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dateOrIso)) {
    return dateOrIso
  }

  const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso
  if (isNaN(d.getTime())) return ''

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COLOMBIA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '00'
  let hour = get('hour')
  if (hour === '24') hour = '00'

  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`
}

/**
 * Convierte el valor de un `<input type="datetime-local" />` (YYYY-MM-DDTHH:mm)
 * a una cadena ISO con la zona horaria de Colombia (-05:00), lista para almacenar en Postgres timestamptz.
 */
export function fromColombiaInputToISO(inputVal: string): string {
  if (!inputVal) return ''
  const clean = inputVal.slice(0, 16)
  return `${clean}:00${COLOMBIA_OFFSET}`
}

/**
 * Parsea con seguridad cualquier fecha o ISO, interpretando horas sin offset
 * explícito como hora local de Colombia.
 */
export function parseColombiaDate(dateOrIso?: string | Date | null): Date | null {
  if (!dateOrIso) return null
  if (dateOrIso instanceof Date) {
    return isNaN(dateOrIso.getTime()) ? null : dateOrIso
  }

  // Si no tiene indicador de zona horaria ('Z' o '+' o '-' al final)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(dateOrIso)) {
    const withSecs = dateOrIso.length === 16 ? `${dateOrIso}:00` : dateOrIso
    const d = new Date(`${withSecs}${COLOMBIA_OFFSET}`)
    return isNaN(d.getTime()) ? null : d
  }

  const d = new Date(dateOrIso)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Retorna la fecha y hora actual en Colombia como string para input datetime-local.
 * Permite sumar días y horas adicionales para valores por defecto (ej: +14 días).
 */
export function getColombiaNowForInput(offsetDays: number = 0, offsetHours: number = 0): string {
  const now = new Date(Date.now() + offsetDays * 86400000 + offsetHours * 3600000)
  return toColombiaInputString(now)
}

/**
 * Valida si un rango de fechas [starts_at, ends_at] está actualmente vigente en Colombia.
 */
export function isDateRangeActiveInColombia(startsAt?: string | null, endsAt?: string | null): boolean {
  const now = Date.now()

  if (startsAt) {
    const s = parseColombiaDate(startsAt)
    if (s && s.getTime() > now) {
      return false // Aún no ha iniciado en Colombia
    }
  }

  if (endsAt) {
    const e = parseColombiaDate(endsAt)
    if (e && e.getTime() < now) {
      return false // Ya expiró en Colombia
    }
  }

  return true
}

/**
 * Valida si un anuncio o destacado está activo y dentro del rango de vigencia de Colombia.
 */
export function isAdvertisementActive(ad: any): boolean {
  if (!ad) return false
  if (ad.active === false) return false
  return isDateRangeActiveInColombia(ad.starts_at, ad.ends_at)
}

/**
 * Formatea una fecha en español (Colombia) con su hora correspondiente.
 * Ej: "21 sep 2026, 6:30 p. m." o "21 sep 2026"
 */
export function formatColombiaDateTime(
  dateOrIso?: string | Date | null,
  options?: { includeTime?: boolean; short?: boolean }
): string {
  const d = parseColombiaDate(dateOrIso)
  if (!d) return '—'

  const includeTime = options?.includeTime ?? true
  const isShort = options?.short ?? false

  if (isShort) {
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: COLOMBIA_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit', hour12: true } : {}),
    }).format(d)
  }

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: COLOMBIA_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(includeTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
  }).format(d)
}
