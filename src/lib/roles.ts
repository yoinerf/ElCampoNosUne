import type { UserRole } from './types'
import { validateDocument } from './identity'

// Una cuenta puede tener varios roles (profile_roles): Comprador, Comprador + Asociación o
// Comprador + Turismo. profiles.user_type es el rol principal (el que validan las políticas
// de vendedor). La app trabaja con un "rol activo": el modo en que el usuario está usando la
// app (comprar o administrar su panel). Las reglas reales las aplica la base.

export const ROLE_LABELS: Record<UserRole, string> = {
  comprador: 'Comprador',
  asociacion: 'Asociación',
  turismo: 'Turismo',
  admin: 'Superadministrador',
  admin_tienda: 'Admin de tienda',
}

/** Roles que un comprador puede agregar a su cuenta desde su panel */
export const ADDABLE_ROLES = ['asociacion', 'turismo'] as const
export type AddableRole = (typeof ADDABLE_ROLES)[number]

const ALL_ROLES: UserRole[] = ['comprador', 'asociacion', 'turismo', 'admin', 'admin_tienda']
const isUserRole = (value: unknown): value is UserRole => ALL_ROLES.includes(value as UserRole)

/** Mismas reglas que roles_for_user_type en la base: Asociación y Turismo incluyen Comprador */
export function rolesForUserType(userType: UserRole | undefined): UserRole[] {
  switch (userType) {
    case 'asociacion':
      return ['asociacion', 'comprador']
    case 'turismo':
      return ['turismo', 'comprador']
    case 'comprador':
    case 'admin':
    case 'admin_tienda':
      return [userType]
    default:
      return []
  }
}

/**
 * Roles de la cuenta: los de profile_roles más los que implica el rol principal
 * (por si la migración aún no se aplicó o la consulta falló). Sin duplicados, el principal primero.
 */
export function resolveRoles(primary: UserRole | undefined, rows: readonly { role: string }[] | null | undefined): UserRole[] {
  const roles = [...rolesForUserType(primary), ...(rows ?? []).map((r) => r.role).filter(isUserRole)]
  return [...new Set(roles)]
}

/** Rol de vendedor de la cuenta (si tiene) */
export const sellerRole = (roles: readonly UserRole[]): 'asociacion' | 'turismo' | undefined =>
  roles.includes('asociacion') ? 'asociacion' : roles.includes('turismo') ? 'turismo' : undefined

/** Roles que la cuenta puede agregar: solo una cuenta que es únicamente Comprador */
export function addableRoles(roles: readonly UserRole[]): AddableRole[] {
  return roles.length === 1 && roles[0] === 'comprador' ? [...ADDABLE_ROLES] : []
}

/**
 * Datos obligatorios para agregar un rol (los mismos del registro y de add_my_role en la base).
 * Devuelve el motivo si falta algo, o null si el perfil está completo.
 */
export function roleRequirementsError(profile: {
  first_name?: string | null
  document_type?: string | null
  document_number?: string | null
  department?: string | null
  municipality?: string | null
}): string | null {
  if (!profile.first_name?.trim()) return 'Falta tu nombre.'
  const docError = validateDocument(profile.document_type ?? '', profile.document_number ?? '')
  if (docError) return docError
  if (!profile.department?.trim() || !profile.municipality?.trim()) return 'Falta tu departamento y municipio.'
  return null
}

/** Rol activo: el guardado si la cuenta aún lo tiene; si no, el principal */
export function resolveActiveRole(primary: UserRole | undefined, roles: readonly UserRole[], stored: string | null | undefined): UserRole | undefined {
  if (isUserRole(stored) && roles.includes(stored)) return stored
  return primary
}

// Preferencia del navegador (no es un permiso): con qué rol abrir la app la próxima vez
const activeRoleKey = (userId: string) => `ecnu.activeRole.${userId}`

export function readStoredActiveRole(userId: string): string | null {
  try {
    return localStorage.getItem(activeRoleKey(userId))
  } catch {
    return null
  }
}

export function storeActiveRole(userId: string, role: UserRole) {
  try {
    localStorage.setItem(activeRoleKey(userId), role)
  } catch {
    // Sin almacenamiento (modo privado): solo dura la sesión actual
  }
}
