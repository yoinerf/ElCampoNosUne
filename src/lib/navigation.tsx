import { createContext, useContext } from 'react'
import type { StoreId } from './stores'
import type { UserRole } from './types'

// Navegación entre tiendas: abre la vitrina de una tienda aliada desde cualquier pantalla
// (header, paneles) sin pasar props por cada nivel. Lo provee App.
export interface AppNavigation {
  openStore: (store: StoreId) => void
  /** Cambia el rol activo de una cuenta con varios roles y abre la pantalla principal de ese rol */
  switchRole: (role: UserRole) => void
}

export const AppNavigationContext = createContext<AppNavigation>({ openStore: () => {}, switchRole: () => {} })

export const useAppNavigation = () => useContext(AppNavigationContext)
