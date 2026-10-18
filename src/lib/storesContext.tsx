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
    const { data, error } = await supabase.from('store_settings').select('*').order('sort_order').order('store')
    if (error) console.error('Error cargando tiendas:', error.message)
    if (data && data.length > 0) {
      setAllStores(
        data.map((s) => ({
          ...s,
          slug: s.slug ?? null,
          payment_methods: (s.payment_methods ?? []) as StoreSettings['payment_methods'],
          shipping_fee: Number(s.shipping_fee ?? 0),
          transfer_info: (s.transfer_info ?? {}) as StoreSettings['transfer_info'],
        })),
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
