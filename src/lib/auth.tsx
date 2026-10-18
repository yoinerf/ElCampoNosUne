import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { StoreId } from './stores'
import type { UserRole } from './types'

// Sesión y perfil del usuario en un solo lugar: antes App y varias pantallas
// consultaban profiles por su cuenta para saber el rol.

export interface AuthState {
  session: Session | null
  role?: UserRole
  /** Tienda de la marca (profiles.store normalizado a las tiendas conocidas) */
  store: StoreId
  /** Valor real de profiles.store (puede ser una tienda nueva): lo usa el panel del admin de tienda */
  storeId: string
  /** true hasta conocer la sesión inicial y su perfil */
  loading: boolean
  /** Aumenta cada vez que termina de cargarse un perfil (inicio de sesión, cambio de usuario...) */
  profileLoadId: number
}

const initialState: AuthState = { session: null, store: 'campo', storeId: 'campo', loading: true, profileLoadId: 0 }

const AuthContext = createContext<AuthState>(initialState)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)

  useEffect(() => {
    // Solo se aplica la última carga: si la sesión cambia mientras se consulta el perfil
    // (p. ej. cerrar sesión), la respuesta anterior se descarta.
    let latestLoad = 0

    const load = async (session: Session | null) => {
      const loadId = ++latestLoad
      if (!session) {
        setState((prev) => ({ session: null, store: 'campo', storeId: 'campo', loading: false, profileLoadId: prev.profileLoadId + 1 }))
        return
      }

      const { data } = await supabase.from('profiles').select('user_type, store').eq('id', session.user.id).single()
      if (loadId !== latestLoad) return

      setState((prev) => ({
        session,
        role: (data?.user_type as UserRole | undefined) ?? undefined,
        store: data?.store === 'amazonica' ? 'amazonica' : 'campo',
        storeId: data?.store ?? 'campo',
        loading: false,
        profileLoadId: prev.profileLoadId + 1,
      }))
    }

    supabase.auth.getSession().then(({ data: { session } }) => load(session))

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      // La sesión inicial ya la carga getSession
      if (event === 'INITIAL_SESSION') return
      // Al refrescar el token el perfil no cambia: solo se actualiza la sesión
      if (event === 'TOKEN_REFRESHED') {
        setState((prev) => ({ ...prev, session }))
        return
      }
      load(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
