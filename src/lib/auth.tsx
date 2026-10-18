import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { MAIN_STORE, type StoreId } from './stores'
import type { UserRole } from './types'

// Sesión y perfil del usuario en un solo lugar: antes App y varias pantallas
// consultaban profiles por su cuenta para saber el rol.

export interface AuthState {
  session: Session | null
  role?: UserRole
  /** Tienda del usuario (profiles.store): la que gestiona un productor o un admin de tienda */
  store: StoreId
  /**
   * Cuenta creada con Google (u otro proveedor OAuth) que aún no completó su perfil:
   * sin formulario de registro no tiene documento, ubicación ni tipo de cuenta elegido.
   */
  needsProfileCompletion: boolean
  /** true hasta conocer la sesión inicial y su perfil */
  loading: boolean
  /** Aumenta cada vez que termina de cargarse un perfil (inicio de sesión, cambio de usuario...) */
  profileLoadId: number
}

interface AuthContextValue extends AuthState {
  /** Vuelve a leer el perfil (p. ej. después de completarlo) */
  refreshProfile: () => Promise<void>
}

const initialState: AuthState = { session: null, store: MAIN_STORE, needsProfileCompletion: false, loading: true, profileLoadId: 0 }

const AuthContext = createContext<AuthContextValue>({ ...initialState, refreshProfile: async () => {} })

/** Inició sesión con un proveedor externo (Google...) en lugar de correo y contraseña */
const isOAuthUser = (session: Session) => {
  const providers = (session.user.app_metadata?.providers as string[] | undefined) ?? [session.user.app_metadata?.provider as string]
  return providers.some((p) => p && p !== 'email')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(initialState)
  // Solo se aplica la última carga: si la sesión cambia mientras se consulta el perfil
  // (p. ej. cerrar sesión), la respuesta anterior se descarta.
  const latestLoad = useRef(0)

  const load = useCallback(async (session: Session | null) => {
    const loadId = ++latestLoad.current
    if (!session) {
      setState((prev) => ({ ...initialState, loading: false, profileLoadId: prev.profileLoadId + 1 }))
      return
    }

    const { data } = await supabase.from('profiles').select('user_type, store, document_number').eq('id', session.user.id).single()
    if (loadId !== latestLoad.current) return

    const role = (data?.user_type as UserRole | undefined) ?? undefined
    setState((prev) => ({
      session,
      role,
      store: data?.store ?? MAIN_STORE,
      needsProfileCompletion: isOAuthUser(session) && !data?.document_number && role !== 'admin' && role !== 'admin_tienda',
      loading: false,
      profileLoadId: prev.profileLoadId + 1,
    }))
  }, [])

  useEffect(() => {
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
  }, [load])

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, refreshProfile: () => load(state.session) }),
    [state, load],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
