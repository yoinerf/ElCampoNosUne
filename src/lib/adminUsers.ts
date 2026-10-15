import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'

// Cliente de la Edge Function "admin-users" (supabase/functions/admin-users).
// La service role key vive solo en Supabase; el navegador envía la sesión del admin.

type AdminUsersResult = { ok: true; user_id?: string } | { ok: false; error: string }

async function callAdminUsers(body: Record<string, unknown>): Promise<AdminUsersResult> {
  const { data, error } = await supabase.functions.invoke('admin-users', { body })
  if (error) {
    // Los errores de la función vienen como { error: "mensaje" } en el cuerpo de la respuesta
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json()
        return { ok: false, error: payload?.error ?? error.message }
      } catch {
        return { ok: false, error: error.message }
      }
    }
    return { ok: false, error: `No se pudo contactar el servicio de usuarios: ${error.message}` }
  }
  return { ok: true, user_id: data?.user_id }
}

export function adminCreateUser(user: {
  email: string
  password: string
  first_name: string
  last_name?: string
  org_name?: string
  phone?: string
  user_type: string
  department?: string
  municipality?: string
  must_change_password?: boolean
}) {
  return callAdminUsers({ action: 'create_user', ...user })
}

export function adminDeleteUser(userId: string) {
  return callAdminUsers({ action: 'delete_user', user_id: userId })
}

export function adminSetTempPassword(userId: string, password: string) {
  return callAdminUsers({ action: 'set_temp_password', user_id: userId, password })
}
