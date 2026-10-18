// Tipos compartidos por App y las pantallas (antes cada pantalla declaraba su propia versión).

/** Pestañas / pantallas principales de la app */
// 'store' = vitrina de una tienda aliada (cuál, lo indica la tienda que se está viendo)
export const TABS = ['home', 'market', 'tourism', 'profile', 'admin', 'superadmin', 'about', 'store', 'storeadmin'] as const
export type Tab = (typeof TABS)[number]

/** Para valores que llegan como texto (p. ej. user_notifications.link_tab) */
export const isTab = (value: string | null | undefined): value is Tab => TABS.includes(value as Tab)

/** profiles.user_type */
export type UserRole = 'asociacion' | 'turismo' | 'comprador' | 'admin' | 'admin_tienda'

/** Props de navegación que App pasa a cada pantalla */
export interface NavProps {
  onNavigate: (tab: Tab) => void
  activeNav?: Tab
  onProfileClick?: () => void
  userRole?: UserRole | null
}
