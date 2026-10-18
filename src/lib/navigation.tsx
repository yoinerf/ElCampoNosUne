import { createContext, useContext } from 'react'
import type { StoreId } from './stores'

// Navegación entre tiendas: abre la vitrina de una tienda aliada desde cualquier pantalla
// (header, paneles) sin pasar props por cada nivel. Lo provee App.
export interface AppNavigation {
  openStore: (store: StoreId) => void
}

export const AppNavigationContext = createContext<AppNavigation>({ openStore: () => {} })

export const useAppNavigation = () => useContext(AppNavigationContext)
