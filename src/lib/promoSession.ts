/**
 * Manejo de sesión para anuncios y ventanas promocionales de "El Campo Nos Une".
 *
 * Reglas:
 * 1. Persiste en memoria de la sesión (sessionStorage + memoria SPA) mientras el usuario navega
 *    entre pantallas (Productos, Experiencias, Inicio, Perfil, etc.) para no interrumpir repetidamente.
 * 2. Se reinicia automáticamente cuando se recarga la página (F5 o reload).
 * 3. Se reinicia cuando se cierra o borra la sesión (signOut).
 */

const PROMO_SESSION_KEY = 'campoconecta_seen_promos'
const PROMO_ANY_SEEN_KEY = 'campoconecta_has_seen_promo'

// Memoria viva dentro de la SPA para sincronía inmediata entre componentes
const inMemorySeenPromos = new Set<string>()
let inMemoryAnySeen = false

// Detección de recarga (F5) para limpiar automáticamente y permitir que vuelva a salir al recargar
if (typeof window !== 'undefined') {
  try {
    const navEntries = performance.getEntriesByType?.('navigation') as PerformanceNavigationTiming[] | undefined
    if (navEntries && navEntries.length > 0 && navEntries[0].type === 'reload') {
      sessionStorage.removeItem(PROMO_SESSION_KEY)
      sessionStorage.removeItem(PROMO_ANY_SEEN_KEY)
    }
  } catch {
    // Ignorar si el navegador no soporta PerformanceNavigationTiming
  }

  // Al recargar la página o cerrar la pestaña, limpiar la clave de sessionStorage
  window.addEventListener('beforeunload', () => {
    sessionStorage.removeItem(PROMO_SESSION_KEY)
    sessionStorage.removeItem(PROMO_ANY_SEEN_KEY)
  })
}

/**
 * Retorna true si el usuario ya vio una promoción durante la sesión actual de navegación.
 * Si se especifica promoId, comprueba si esa promoción específica ya fue vista.
 */
export function hasSeenPromoInSession(promoId?: string): boolean {
  if (typeof window === 'undefined') return false

  if (promoId) {
    if (inMemorySeenPromos.has(promoId)) return true
    try {
      const raw = sessionStorage.getItem(PROMO_SESSION_KEY)
      if (raw) {
        const list = JSON.parse(raw)
        if (Array.isArray(list) && list.includes(promoId)) {
          inMemorySeenPromos.add(promoId)
          return true
        }
      }
    } catch {
      // Fallback
    }
    return false
  }

  if (inMemoryAnySeen) return true

  try {
    if (sessionStorage.getItem(PROMO_ANY_SEEN_KEY) === 'true') {
      inMemoryAnySeen = true
      return true
    }
  } catch {
    // Fallback silencioso a la memoria
  }

  return false
}

/**
 * Registra que el usuario ya vio un anuncio / ventana promocional en la sesión actual
 */
export function markPromoAsSeenInSession(promoId?: string): void {
  inMemoryAnySeen = true
  if (promoId) inMemorySeenPromos.add(promoId)

  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(PROMO_ANY_SEEN_KEY, 'true')
    if (promoId) {
      const raw = sessionStorage.getItem(PROMO_SESSION_KEY)
      const list: string[] = raw ? JSON.parse(raw) : []
      if (!list.includes(promoId)) {
        list.push(promoId)
      }
      sessionStorage.setItem(PROMO_SESSION_KEY, JSON.stringify(list))
    }
  } catch {
    // Ignorar si sessionStorage está deshabilitado en modo incógnito estricto
  }
}

/**
 * Limpia el estado de promociones vistas (útil al cerrar sesión o reiniciar)
 */
export function clearPromoSession(): void {
  inMemoryAnySeen = false
  inMemorySeenPromos.clear()

  if (typeof window === 'undefined') return

  try {
    sessionStorage.removeItem(PROMO_SESSION_KEY)
    sessionStorage.removeItem(PROMO_ANY_SEEN_KEY)
  } catch {
    // Ignorar
  }
}
