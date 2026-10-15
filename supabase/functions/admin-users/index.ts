// Edge Function: admin-users
// Operaciones de usuarios que requieren la service role key. La llave vive SOLO
// aquí (Supabase la inyecta como variable de entorno); nunca llega al navegador.
//
// Acciones (POST con JSON { action, ... }):
//   - create_user        { email, password, first_name, last_name?, org_name?, phone?, user_type, department?, municipality?, must_change_password? }
//   - delete_user        { user_id }
//   - set_temp_password  { user_id, password }
//
// Seguridad: solo usuarios autenticados con profiles.user_type = 'admin'.

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const USER_TYPES = ['asociacion', 'turismo', 'comprador', 'admin']
const MIN_PASSWORD_LENGTH = 8

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function validPassword(password: unknown): password is string {
  return typeof password === 'string'
    && password.length >= MIN_PASSWORD_LENGTH
    && /[A-Za-z]/.test(password)
    && /\d/.test(password)
}

function clean(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 1. Identificar a quien llama a partir de su sesión
  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const { data: { user: caller }, error: callerError } = await userClient.auth.getUser()
  if (callerError || !caller) return json({ error: 'Sesión inválida. Vuelve a iniciar sesión.' }, 401)

  // 2. Verificar que sea admin (con la service key, sin depender de RLS)
  const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: callerProfile } = await admin.from('profiles').select('user_type').eq('id', caller.id).single()
  if (callerProfile?.user_type !== 'admin') return json({ error: 'Solo un administrador puede realizar esta acción.' }, 403)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Solicitud inválida.' }, 400)
  }

  try {
    switch (body.action) {
      // ─── Crear usuario ────────────────────────────────────────────────────
      case 'create_user': {
        const email = clean(body.email)?.toLowerCase()
        const firstName = clean(body.first_name)
        const userType = String(body.user_type ?? '')
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Correo electrónico inválido.' }, 400)
        if (!firstName) return json({ error: 'El nombre es obligatorio.' }, 400)
        if (!USER_TYPES.includes(userType)) return json({ error: 'Rol inválido.' }, 400)
        if (!validPassword(body.password)) {
          return json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres, con letras y números.` }, 400)
        }

        const profileData = {
          first_name: firstName,
          last_name: clean(body.last_name) ?? '',
          org_name: clean(body.org_name),
          phone: clean(body.phone),
          user_type: userType,
          department: clean(body.department),
          municipality: clean(body.municipality),
        }

        const { data: created, error: createError } = await admin.auth.admin.createUser({
          email,
          password: body.password,
          email_confirm: true,
          user_metadata: {
            ...profileData,
            // El usuario deberá crear su propia contraseña al primer ingreso
            must_change_password: body.must_change_password !== false,
          },
        })
        if (createError || !created.user) {
          const msg = createError?.message ?? 'No se pudo crear el usuario.'
          return json({ error: /already been registered|already exists/i.test(msg) ? 'Ya existe un usuario con ese correo.' : msg }, 400)
        }

        const { error: profileError } = await admin.from('profiles').upsert({ id: created.user.id, email, ...profileData })
        if (profileError) {
          // Revertir para no dejar un usuario de Auth sin perfil
          await admin.auth.admin.deleteUser(created.user.id)
          return json({ error: `No se pudo crear el perfil: ${profileError.message}` }, 400)
        }

        return json({ ok: true, user_id: created.user.id })
      }

      // ─── Eliminar usuario ─────────────────────────────────────────────────
      case 'delete_user': {
        const userId = clean(body.user_id)
        if (!userId) return json({ error: 'Falta el usuario.' }, 400)
        if (userId === caller.id) return json({ error: 'No puedes eliminar tu propia cuenta.' }, 400)

        // Borrar en Auth elimina también el perfil (profiles.id ... on delete cascade)
        const { error } = await admin.auth.admin.deleteUser(userId)
        if (error) {
          const blocked = /foreign key|violates|restrict/i.test(error.message)
          return json({
            error: blocked
              ? 'No se puede eliminar: el usuario tiene pedidos u otros registros asociados.'
              : `No se pudo eliminar el usuario: ${error.message}`,
          }, 400)
        }
        return json({ ok: true })
      }

      // ─── Contraseña temporal ──────────────────────────────────────────────
      case 'set_temp_password': {
        const userId = clean(body.user_id)
        if (!userId) return json({ error: 'Falta el usuario.' }, 400)
        if (!validPassword(body.password)) {
          return json({ error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres, con letras y números.` }, 400)
        }

        const { error } = await admin.auth.admin.updateUserById(userId, {
          password: body.password,
          // App.tsx detecta esta marca al iniciar sesión y obliga a cambiarla
          user_metadata: { must_change_password: true },
        })
        if (error) return json({ error: `No se pudo asignar la contraseña: ${error.message}` }, 400)
        return json({ ok: true })
      }

      default:
        return json({ error: 'Acción no reconocida.' }, 400)
    }
  } catch (err) {
    console.error('admin-users error:', err)
    return json({ error: 'Error inesperado en el servidor.' }, 500)
  }
})
