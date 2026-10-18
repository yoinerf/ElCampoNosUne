// Versión de la app (semver). Se cambia en package.json y se documenta en CHANGELOG.md.
// En las pruebas (Vitest sin el define de Vite) queda como 'dev'.
export const APP_VERSION: string = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : 'dev'
