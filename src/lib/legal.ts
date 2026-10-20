// Páginas legales (política de privacidad y condiciones del servicio). Van fuera de las pestañas de
// la app: se abren sin sesión y no dependen del rol (ver App y screens/LegalScreen).

export type LegalPage = 'privacy' | 'terms'

export const LEGAL_PATHS: Record<LegalPage, string> = {
  privacy: '/privacidad',
  terms: '/terminos',
}

/** Página legal de la ruta, o null si la ruta es de la app */
export function legalPageFromPath(pathname: string): LegalPage | null {
  const clean = pathname.replace(/\/+$/, '') || '/'
  if (clean === LEGAL_PATHS.privacy) return 'privacy'
  if (clean === LEGAL_PATHS.terms) return 'terms'
  return null
}
