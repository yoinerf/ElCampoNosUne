import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { FALLBACK_MAIN_STORE, MAIN_STORE, type StoreId, type StoreSettings } from './stores'

// Tiendas configuradas en public.store_settings, cargadas una vez para toda la app.

interface StoresState {
  /** Todas las tiendas (incluidas las inactivas), ordenadas por sort_order */
  allStores: StoreSettings[]
  /** Tiendas activas */
  stores: StoreSettings[]
  /** Tiendas aliadas activas (todas menos la principal): cada una tiene su vitrina */
  alliedStores: StoreSettings[]
  loading: boolean
  /** Configuración de una tienda (si no existe, la principal) */
  getStore: (store: StoreId | null | undefined) => StoreSettings
  storeName: (store: StoreId | null | undefined) => string
  reload: () => Promise<void>
}

const StoresContext = createContext<StoresState | null>(null)

export function StoresProvider({ children }: { children: ReactNode }) {
  const [allStores, setAllStores] = useState<StoreSettings[]>([FALLBACK_MAIN_STORE])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    // Sin .order() por columnas: si falta alguna (migración pendiente) la consulta no debe fallar
    const { data, error } = await supabase.from('store_settings').select('*')
    if (error) console.error('Error cargando tiendas:', error.message)
    if (data && data.length > 0) {
      // Valores por defecto para columnas que aún no existan en la base
      const rows = data as Partial<StoreSettings>[]
      setAllStores(
        rows
          .filter((s): s is Partial<StoreSettings> & { store: string } => !!s.store)
          .map((s) => {
            const isMain = s.store === MAIN_STORE
            return {
              ...FALLBACK_MAIN_STORE,
              ...s,
              name: s.name ?? s.store,
              slug: isMain ? null : s.slug ?? s.store.replace(/_/g, '-'),
              ally_name: s.ally_name?.trim() || null,
              tagline: s.tagline ?? (isMain ? FALLBACK_MAIN_STORE.tagline : null),
              payment_methods: (s.payment_methods?.length ? s.payment_methods : isMain ? FALLBACK_MAIN_STORE.payment_methods : ['Cash', 'BankTransfer']) as StoreSettings['payment_methods'],
              shipping_fee: Number(s.shipping_fee ?? FALLBACK_MAIN_STORE.shipping_fee),
              active: s.active ?? true,
              sort_order: s.sort_order ?? (isMain ? 0 : 10),
              transfer_info: (s.transfer_info ?? {}) as StoreSettings['transfer_info'],
            }
          })
          .sort((a, b) => a.sort_order - b.sort_order || a.store.localeCompare(b.store)),
      )
    }
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  const value = useMemo<StoresState>(() => {
    const stores = allStores.filter((s) => s.active || s.store === MAIN_STORE)
    const byId = new Map(allStores.map((s) => [s.store, s]))
    const main = byId.get(MAIN_STORE) ?? FALLBACK_MAIN_STORE
    const getStore = (store: StoreId | null | undefined) => byId.get(store ?? MAIN_STORE) ?? main
    return {
      allStores,
      stores,
      alliedStores: stores.filter((s) => s.store !== MAIN_STORE && s.slug),
      loading,
      getStore,
      storeName: (store) => getStore(store).name,
      reload,
    }
  }, [allStores, loading, reload])

  return <StoresContext.Provider value={value}>{children}</StoresContext.Provider>
}

export function useStores(): StoresState {
  const ctx = useContext(StoresContext)
  if (!ctx) throw new Error('useStores debe usarse dentro de <StoresProvider>')
  return ctx
}
