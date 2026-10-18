import { AMAZON_PATH, type StoreId } from './stores'
import type { Tab } from './types'

// Rutas de cada pestaña: la pantalla actual queda en la URL (se puede recargar,
// compartir y usar el botón atrás). Las páginas vistas desde la Tienda Amazónica
// cuelgan de /tienda-amazonica para conservar la marca al recargar.

const TAB_PATHS: Record<Tab, string> = {
  home: '/',
  market: '/productos',
  tourism: '/experiencias',
  amazon: AMAZON_PATH,
  about: '/nosotros',
  profile: '/mi-cuenta',
  admin: '/panel',
  superadmin: '/superadmin',
  storeadmin: '/admin-tienda',
}

const PATH_TABS = new Map(Object.entries(TAB_PATHS).map(([tab, path]) => [path, tab as Tab]))

export function pathForTab(tab: Tab, store: StoreId = 'campo'): string {
  if (tab === 'amazon') return AMAZON_PATH
  // home no existe dentro de la Tienda Amazónica: su inicio es la propia tienda
  if (store === 'amazonica') return tab === 'home' ? AMAZON_PATH : `${AMAZON_PATH}${TAB_PATHS[tab]}`
  return TAB_PATHS[tab]
}

/** Pestaña y tienda a partir de la ruta. Rutas desconocidas → inicio. */
export function routeFromPath(pathname: string): { tab: Tab; store: StoreId } {
  const clean = pathname.replace(/\/+$/, '') || '/'
  if (clean === AMAZON_PATH) return { tab: 'amazon', store: 'amazonica' }
  if (clean.startsWith(`${AMAZON_PATH}/`)) {
    const tab = PATH_TABS.get(clean.slice(AMAZON_PATH.length))
    return { tab: tab && tab !== 'home' ? tab : 'amazon', store: 'amazonica' }
  }
  return { tab: PATH_TABS.get(clean) ?? 'home', store: 'campo' }
}
