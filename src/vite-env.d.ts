/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** ID de cliente web de Google (botón oficial de Google; si falta se usa el redirect de Supabase) */
  readonly VITE_GOOGLE_CLIENT_ID?: string
}

/** Versión de package.json, inyectada por Vite (define en vite.config.ts) */
declare const __APP_VERSION__: string
